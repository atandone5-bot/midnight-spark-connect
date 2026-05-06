import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { LogOut, MapPin, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/discover")({ component: Discover });

function Discover() {
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav({ to: "/login" }); return; }
    Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").neq("id", user.id).order("last_seen", { ascending: false }).limit(50),
    ]).then(([{ data: meData }, { data: list }]) => {
      setMe(meData);
      setProfiles(list ?? []);
      setLoading(false);
    });
  }, [user, authLoading, nav]);

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading nearby…</div>;
  }

  const trialMs = me?.trial_ends_at ? new Date(me.trial_ends_at).getTime() - Date.now() : 0;
  const trialDays = Math.max(0, Math.ceil(trialMs / 86400000));

  return (
    <div className="min-h-screen relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-3">
            {me?.status === "trial_active" && (
              <span className="hidden sm:inline-flex rounded-full bg-success/10 text-success px-3 py-1 text-xs font-semibold">
                {trialDays}d trial
              </span>
            )}
            <Link to="/profile" className="rounded-xl border border-border p-2 hover:bg-card transition">
              <UserIcon className="h-4 w-4" />
            </Link>
            <button onClick={() => { signOut().then(() => nav({ to: "/" })); }}
              className="rounded-xl border border-border p-2 hover:bg-card transition">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">
            Hey {me?.nickname ?? "there"} <span className="text-primary">👋</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Here's who's around tonight.</p>
        </div>

        {profiles.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <p className="text-muted-foreground">No one nearby yet. Be the first — invite a friend.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {profiles.map((p) => <ProfileCard key={p.id} p={p} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function ProfileCard({ p }: { p: any }) {
  const initial = (p.nickname?.[0] ?? "?").toUpperCase();
  const intentLabel: Record<string, string> = {
    hosting: "Hosting", traveling: "Traveling", need_room: "Needs room", chill: "Chatting",
  };
  return (
    <div className="glass rounded-2xl overflow-hidden hover:border-primary/40 transition group cursor-pointer">
      <div className="aspect-square relative bg-gradient-to-br from-card to-secondary flex items-center justify-center">
        <span className="font-display text-5xl font-bold text-muted-foreground/40">{initial}</span>
        {p.online_status && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-success/20 backdrop-blur px-2 py-1 text-[10px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Online
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">{p.nickname}, {p.age}</h3>
        </div>
        {p.intent && (
          <p className="mt-1 text-xs text-primary font-medium">{intentLabel[p.intent]}</p>
        )}
        {p.city && (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{p.city}
          </p>
        )}
      </div>
    </div>
  );
}
