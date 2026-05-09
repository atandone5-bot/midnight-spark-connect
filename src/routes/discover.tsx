import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { useServerFn } from "@tanstack/react-start";
import { resolveConversation } from "@/lib/chat.functions";
import { LogOut, MapPin, User as UserIcon, Navigation, MessageCircle, Sparkles, Crown, Shield } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/discover")({ component: Discover });

type NearbyRow = {
  id: string; nickname: string; age: number;
  intent: string | null; city: string | null; bio: string | null;
  photo_url: string | null; online_status: boolean;
  last_seen: string; distance_km: number;
};

function Discover() {
  const { user, loading: authLoading, signOut } = useAuth();
  const nav = useNavigate();
  const [me, setMe] = useState<any>(null);
  const [wallet, setWallet] = useState<{ chats_balance: number; is_premium: boolean; premium_ends_at: string | null } | null>(null);
  const [nearby, setNearby] = useState<NearbyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const openConvo = useServerFn(resolveConversation);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { nav({ to: "/login" }); return; }
    Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("wallets").select("chats_balance,is_premium,premium_ends_at").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(),
    ]).then(([p, w, r]) => { setMe(p.data); setWallet(w.data as any); setIsAdmin(!!r.data); setLoading(false); });
  }, [user, authLoading, nav]);

  // Geolocation — AWAIT the update so it actually fires
  useEffect(() => {
    if (!user) return;
    if (!("geolocation" in navigator)) { setGeoError("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        const { error } = await supabase.from("profiles")
          .update({ latitude: c.lat, longitude: c.lng, last_seen: new Date().toISOString(), online_status: true })
          .eq("id", user.id);
        if (error) console.error("location update failed", error);
      },
      (err) => setGeoError(err.message || "Location blocked"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    );
  }, [user]);

  // Presence heartbeat — AWAIT
  useEffect(() => {
    if (!user) return;
    const beat = async () => {
      await supabase.from("profiles").update({ online_status: true, last_seen: new Date().toISOString() }).eq("id", user.id);
    };
    beat();
    const id = setInterval(beat, 30_000);
    const goOffline = async () => { await supabase.from("profiles").update({ online_status: false }).eq("id", user.id); };
    const onVis = () => { if (document.hidden) goOffline(); else beat(); };
    window.addEventListener("beforeunload", goOffline);
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); window.removeEventListener("beforeunload", goOffline); document.removeEventListener("visibilitychange", onVis); goOffline(); };
  }, [user]);

  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("profiles-presence")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => refreshRef.current())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    if (!user || !coords) return;
    const load = async () => {
      const { data, error } = await supabase.rpc("nearby_profiles", {
        _lat: coords.lat, _lng: coords.lng, _radius_km: radius, _limit: 60,
      });
      if (error) { toast.error(error.message); return; }
      setNearby((data ?? []) as NearbyRow[]);
    };
    refreshRef.current = load;
    load();
  }, [user, coords, radius]);

  async function startChat(otherId: string) {
    try {
      const res = await openConvo({ data: { targetId: otherId } });
      nav({ to: "/chat/$id", params: { id: res.id } });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not open chat");
    }
  }

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading nearby…</div>;
  }

  const isPremium = !!wallet?.is_premium && !!wallet.premium_ends_at && new Date(wallet.premium_ends_at) > new Date();

  return (
    <div className="min-h-screen relative">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-10%] right-[-10%] h-[400px] w-[600px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/"><Logo /></Link>
          <div className="flex items-center gap-2">
            <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-full glass px-3 py-1.5 text-xs font-bold hover:border-primary/50 transition">
              {isPremium ? <><Crown className="h-3.5 w-3.5 text-primary" /> Premium</> : <><Sparkles className="h-3.5 w-3.5 text-primary" /> {wallet?.chats_balance ?? 0} chats</>}
            </Link>
            {isAdmin && <Link to="/admin" className="rounded-xl border border-border p-2 hover:bg-card transition" title="Admin"><Shield className="h-4 w-4 text-primary" /></Link>}
            <Link to="/profile" className="rounded-xl border border-border p-2 hover:bg-card transition"><UserIcon className="h-4 w-4" /></Link>
            <button onClick={() => { signOut().then(() => nav({ to: "/" })); }}
              className="rounded-xl border border-border p-2 hover:bg-card transition"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold">
            Hey {me?.nickname ?? "there"} <span className="text-primary">👋</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Here's who's around tonight.</p>
        </div>

        <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Navigation className="h-4 w-4 text-primary" />
            {coords ? `Within ${radius} km` : geoError ? "Location off" : "Locating…"}
          </div>
          <input type="range" min={1} max={200} step={1} value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="flex-1 accent-primary" disabled={!coords} />
          <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">{nearby.length} nearby</span>
        </div>

        {!coords && geoError && (
          <div className="glass rounded-2xl p-6 mb-6 text-sm text-muted-foreground">
            Allow location access to see who's nearby. Your exact position is never shown — only approximate distance.
          </div>
        )}

        {coords && nearby.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center">
            <p className="text-muted-foreground">No one within {radius} km yet. Try a wider radius.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {nearby.map((p) => <ProfileCard key={p.id} p={p} onMessage={() => startChat(p.id)} />)}
          </div>
        )}
      </main>
    </div>
  );
}

function ProfileCard({ p, onMessage }: { p: NearbyRow; onMessage: () => void }) {
  const initial = (p.nickname?.[0] ?? "?").toUpperCase();
  const intentLabel: Record<string, string> = {
    hosting: "Hosting", traveling: "Traveling", need_room: "Needs room", chill: "Chatting",
  };
  const dist = p.distance_km < 1 ? "<1 km" : `${p.distance_km.toFixed(1)} km`;
  return (
    <div className="glass rounded-2xl overflow-hidden hover:border-primary/40 transition group">
      <div className="aspect-square relative bg-gradient-to-br from-card to-secondary flex items-center justify-center">
        {p.photo_url ? (
          <img src={p.photo_url} alt={p.nickname} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <span className="font-display text-5xl font-bold text-muted-foreground/40">{initial}</span>
        )}
        {p.online_status && (
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-success/20 backdrop-blur px-2 py-1 text-[10px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />Online
          </span>
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-background/70 backdrop-blur px-2 py-1 text-[10px] font-semibold flex items-center gap-1">
          <MapPin className="h-3 w-3" />{dist}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold truncate">{p.nickname}, {p.age}</h3>
        {p.intent && <p className="mt-1 text-xs text-primary font-medium">{intentLabel[p.intent]}</p>}
        {p.city && <p className="mt-0.5 text-xs text-muted-foreground truncate">{p.city}</p>}
        <button onClick={onMessage}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 transition">
          <MessageCircle className="h-3.5 w-3.5" /> Message
        </button>
      </div>
    </div>
  );
}
