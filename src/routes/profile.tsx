import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";

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

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Image only"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("photos").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setUploading(false); toast.error(upErr.message); return; }
    const { data: signed } = await supabase.storage.from("photos").createSignedUrl(path, 60 * 60 * 24 * 365);
    const url = signed?.signedUrl ?? null;
    await supabase.from("profiles").update({ photo_url: url }).eq("id", user.id);
    setPhotoUrl(url);
    setUploading(false);
    toast.success("Photo updated");
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
