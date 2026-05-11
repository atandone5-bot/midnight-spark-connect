import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats, getAdminUsers, grantChats, setUserStatus, toggleFreeChats, getAdminConversations, getAdminMessages } from "@/lib/admin.functions";
import { toast } from "sonner";
import { ArrowLeft, Crown, Users, Wifi, MessageSquare, ShieldAlert, ImageIcon, DollarSign, Loader2, Plus, Minus, Ban, RotateCcw, Pause, Play, Eye, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin")({ component: AdminPage });

type Stats = Record<string, number>;
type Row = {
  id: string; nickname: string; age: number; status: string;
  photo_status: string | null; online_status: boolean; last_seen: string;
  chats_balance: number; is_premium: boolean; free_chats_enabled: boolean; created_at: string;
};

function AdminPage() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const fetchStats = useServerFn(getAdminStats);
  const fetchUsers = useServerFn(getAdminUsers);
  const grant = useServerFn(grantChats);
  const setStatus = useServerFn(setUserStatus);
  const toggleFree = useServerFn(toggleFreeChats);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle().then(({ data }) => {
      if (!data) { setAllowed(false); return; }
      setAllowed(true);
      void refresh();
    });
  }, [user, loading, nav]);

  async function refresh() {
    try {
      const [s, u] = await Promise.all([fetchStats(), fetchUsers()]);
      setStats(s); setUsers(Array.isArray(u) ? (u as Row[]) : []);
    } catch (err: any) { toast.error(err?.message ?? "Load failed"); }
  }

  async function onToggleFree(id: string, enabled: boolean) {
    setBusy(id);
    try { await toggleFree({ data: { targetUserId: id, enabled } }); toast.success(enabled ? "Free chats restored" : "Free chats paused"); await refresh(); }
    catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  async function onGrant(id: string, n: number) {
    setBusy(id);
    try { const { newBalance } = await grant({ data: { targetUserId: id, chats: n } }); toast.success(`Granted ${n} → balance ${newBalance}`); await refresh(); }
    catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setBusy(null); }
  }
  async function onStatus(id: string, status: any) {
    setBusy(id);
    try { await setStatus({ data: { targetUserId: id, status } }); toast.success(`Status: ${status}`); await refresh(); }
    catch (err: any) { toast.error(err?.message ?? "Failed"); }
    finally { setBusy(null); }
  }

  if (loading || allowed === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!allowed) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <ShieldAlert className="h-10 w-10 text-primary mb-3" />
      <h1 className="font-display text-2xl font-bold">Admins only</h1>
      <p className="text-sm text-muted-foreground mt-1">Your account doesn't have admin access.</p>
      <Link to="/discover" className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to Discover</Link>
    </div>
  );

  const filtered = users.filter(u => !filter || u.nickname.toLowerCase().includes(filter.toLowerCase()) || u.id.includes(filter));

  return (
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/discover" className="p-2 rounded-xl hover:bg-card"><ArrowLeft className="h-4 w-4" /></Link>
            <h1 className="font-display text-xl font-bold flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /> Admin</h1>
          </div>
          <button onClick={refresh} className="text-xs glass rounded-full px-3 py-1.5 font-semibold">Refresh</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Stat icon={<Users className="h-4 w-4" />} label="Users" value={stats?.users_total ?? 0} />
          <Stat icon={<Wifi className="h-4 w-4 text-success" />} label="Online" value={stats?.users_online ?? 0} />
          <Stat icon={<Crown className="h-4 w-4 text-primary" />} label="Premium" value={stats?.users_premium ?? 0} />
          <Stat icon={<MessageSquare className="h-4 w-4" />} label="Msgs / 24h" value={stats?.msgs_today ?? 0} />
          <Stat icon={<MessageSquare className="h-4 w-4 opacity-60" />} label="Msgs total" value={stats?.msgs_total ?? 0} />
          <Stat icon={<DollarSign className="h-4 w-4 text-success" />} label="Revenue today" value={`KES ${stats?.revenue_kes_today ?? 0}`} />
          <Stat icon={<DollarSign className="h-4 w-4" />} label="Revenue total" value={`KES ${stats?.revenue_kes_total ?? 0}`} />
          <Stat icon={<ImageIcon className="h-4 w-4 text-yellow-400" />} label="Photos pending" value={stats?.photos_pending ?? 0} />
          <Stat icon={<ImageIcon className="h-4 w-4 text-destructive" />} label="Photos rejected" value={stats?.photos_rejected ?? 0} />
          <Stat icon={<Ban className="h-4 w-4 text-destructive" />} label="Suspended" value={stats?.suspended ?? 0} />
        </section>

        <section className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="font-semibold">Recent users</h2>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search nickname or id…"
              className="rounded-xl bg-card border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="text-left px-2 py-2">User</th>
                  <th className="text-left px-2 py-2">Status</th>
                  <th className="text-left px-2 py-2">Photo</th>
                  <th className="text-right px-2 py-2">Chats</th>
                  <th className="text-center px-2 py-2">Premium</th>
                  <th className="text-center px-2 py-2">Free</th>
                  <th className="text-right px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-t border-border/50">
                    <td className="px-2 py-3">
                      <div className="font-semibold">{u.nickname}, {u.age}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{u.id.slice(0, 8)}…</div>
                    </td>
                    <td className="px-2 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${u.status === "banned" || u.status === "suspended" ? "bg-destructive/20 text-destructive" : "bg-success/15 text-success"}`}>{u.status}</span></td>
                    <td className="px-2 py-3 text-xs">{u.photo_status ?? "—"}</td>
                    <td className="px-2 py-3 text-right tabular-nums font-semibold">{u.chats_balance}</td>
                    <td className="px-2 py-3 text-center">{u.is_premium ? "👑" : "—"}</td>
                    <td className="px-2 py-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.free_chats_enabled ? "bg-success/15 text-success" : "bg-yellow-500/15 text-yellow-400"}`}>
                        {u.free_chats_enabled ? "ON" : "PAUSED"}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <IconBtn disabled={busy === u.id} onClick={() => onGrant(u.id, 5)} title="+5 chats"><Plus className="h-3 w-3" />5</IconBtn>
                        <IconBtn disabled={busy === u.id} onClick={() => onGrant(u.id, 50)} title="+50 chats"><Plus className="h-3 w-3" />50</IconBtn>
                        <IconBtn disabled={busy === u.id} onClick={() => { const n = Number(prompt("How many chats? (negative to remove)")); if (Number.isFinite(n) && n !== 0) onGrant(u.id, n); }} title="Custom"><Minus className="h-3 w-3" />/<Plus className="h-3 w-3" /></IconBtn>
                        {u.free_chats_enabled ? (
                          <IconBtn disabled={busy === u.id} onClick={() => { if (confirm(`Pause free chats for ${u.nickname}?`)) onToggleFree(u.id, false); }} title="Pause free chats" danger><Pause className="h-3 w-3" /></IconBtn>
                        ) : (
                          <IconBtn disabled={busy === u.id} onClick={() => onToggleFree(u.id, true)} title="Resume free chats"><Play className="h-3 w-3" /></IconBtn>
                        )}
                        {u.status === "suspended" || u.status === "banned" ? (
                          <IconBtn disabled={busy === u.id} onClick={() => onStatus(u.id, "free")} title="Restore account"><RotateCcw className="h-3 w-3" /></IconBtn>
                        ) : (
                          <IconBtn disabled={busy === u.id} onClick={() => { if (confirm(`Suspend ${u.nickname}?`)) onStatus(u.id, "suspended"); }} title="Suspend account" danger><Ban className="h-3 w-3" /></IconBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No users.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1.5 font-display text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function IconBtn({ children, danger, ...rest }: { children: React.ReactNode; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...rest} className={`inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-xs font-semibold border transition disabled:opacity-50 ${danger ? "border-destructive/40 text-destructive hover:bg-destructive/10" : "border-border hover:bg-card"}`}>{children}</button>;
}
