import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { submitPhotoForReview } from "@/server/photos.functions";
import { CheckCircle2, Clock, XCircle } from "lucide-react";

export const Route = createFileRoute("/profile")({ component: ProfilePage });

const schema = z.object({
  nickname: z.string().trim().min(2).max(40),
  bio: z.string().trim().max(280).optional().or(z.literal("")),
  gender: z.enum(["male", "female", "other"]),
  preference: z.enum(["male", "female", "both"]),
  intent: z.enum(["hosting", "traveling", "need_room", "chill"]),
  city: z.string().trim().max(80).optional().or(z.literal("")),
});

function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav({ to: "/login" }); return; }
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      setProfile(data);
      setPhotoUrl(data?.photo_url ?? null);
      setLoading(false);
    });
  }, [user, authLoading, nav]);

  const submitPhoto = useServerFn(submitPhotoForReview);

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Image only"); return; }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    try {
      const result = await submitPhoto({ data: { storagePath: path } });
      const { data: fresh } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(fresh);
      setPhotoUrl(fresh?.photo_url ?? null);
      if (result.status === "approved") toast.success("Photo approved");
      else toast.error(`Photo rejected — ${result.reason}`);
    } catch (err: any) {
      toast.error(err?.message ?? "Moderation failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nickname: parsed.data.nickname,
        bio: parsed.data.bio || null,
        gender: parsed.data.gender,
        preference: parsed.data.preference,
        intent: parsed.data.intent,
        city: parsed.data.city || null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    nav({ to: "/discover" });
  }

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const trialMs = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() - Date.now() : 0;
  const trialDays = Math.max(0, Math.ceil(trialMs / 86400000));

  return (
    <div className="min-h-screen relative px-4 py-8">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 h-[400px] w-[700px] rounded-full bg-primary/15 blur-[120px]" />
      </div>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <Link to="/"><Logo /></Link>
          <Link to="/discover" className="text-sm text-muted-foreground hover:text-foreground">Skip →</Link>
        </div>

        <div className="glass rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold">Set up your profile</h1>
              <p className="text-sm text-muted-foreground">First impressions matter, especially after dark.</p>
            </div>
            {profile?.status === "trial_active" && (
              <span className="rounded-full bg-success/10 text-success px-3 py-1 text-xs font-semibold">
                {trialDays}d trial left
              </span>
            )}
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex items-center gap-5">
              <div className="relative h-24 w-24 rounded-2xl overflow-hidden bg-gradient-to-br from-card to-secondary border border-border flex items-center justify-center shrink-0">
                {photoUrl ? (
                  <img src={photoUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-3xl font-bold text-muted-foreground/50">
                    {(profile?.nickname?.[0] ?? "?").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-block cursor-pointer rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-card transition">
                  {uploading ? "Reviewing…" : photoUrl ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} disabled={uploading} />
                </label>
                <p className="mt-2 text-xs text-muted-foreground">JPG/PNG, max 5MB. Face only — no nudity in profile pics. Auto-reviewed before going live.</p>
                {profile?.photo_status === "approved" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approved & visible
                  </p>
                )}
                {profile?.photo_status === "pending" && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Pending review
                  </p>
                )}
                {profile?.photo_status === "rejected" && (
                  <p className="mt-2 inline-flex items-start gap-1.5 text-xs font-semibold text-primary">
                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Rejected: {profile.photo_rejection_reason || "Try a different photo."}
                  </p>
                )}
              </div>
            </div>

            <Input label="Nickname" name="nickname" defaultValue={profile?.nickname ?? ""} required />
            <Textarea label="Bio" name="bio" placeholder="A line or two about you…" defaultValue={profile?.bio ?? ""} />

            <div className="grid grid-cols-2 gap-4">
              <Select label="Gender" name="gender" defaultValue={profile?.gender ?? ""}
                options={[["", "Select…"], ["male", "Male"], ["female", "Female"], ["other", "Other"]]} required />
              <Select label="Interested in" name="preference" defaultValue={profile?.preference ?? ""}
                options={[["", "Select…"], ["male", "Men"], ["female", "Women"], ["both", "Both"]]} required />
            </div>

            <Select label="Tonight you're…" name="intent" defaultValue={profile?.intent ?? ""}
              options={[
                ["", "Select intent…"],
                ["hosting", "Hosting (I have a place)"],
                ["traveling", "Traveling (I can come to you)"],
                ["need_room", "Need a room"],
                ["chill", "Just chatting"],
              ]} required />

            <Input label="City (optional)" name="city" defaultValue={profile?.city ?? ""} placeholder="Nairobi" />

            <button disabled={saving} className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition">
              {saving ? "Saving…" : "Save & continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <input {...props} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition" />
    </label>
  );
}

function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <textarea {...props} rows={3} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition resize-none" />
    </label>
  );
}

function Select({ label, options, ...props }: { label: string; options: [string, string][] } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <select {...props} className="mt-1.5 w-full rounded-xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
