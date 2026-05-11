import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/messages")({ component: Inbox });

type Row = {
  id: string;
  other: { id: string; nickname: string; photo_url: string | null; online_status: boolean };
  last: { body: string; created_at: string; mine: boolean } | null;
  unread: number;
  last_message_at: string;
};

function Inbox() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    let cancelled = false;
    (async () => {
      const { data: convos } = await supabase
        .from("conversations")
        .select("id,user_a,user_b,last_message_at")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false })
        .limit(100);
      const list = convos ?? [];
      if (list.length === 0) { if (!cancelled) setRows([]); return; }

      const otherIds = Array.from(new Set(list.map(c => c.user_a === user.id ? c.user_b : c.user_a)));
      const convoIds = list.map(c => c.id);

      const [{ data: profs }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id,nickname,photo_url,photo_status,online_status").in("id", otherIds),
        supabase.from("messages").select("id,conversation_id,sender_id,body,created_at,read_at")
          .in("conversation_id", convoIds).order("created_at", { ascending: false }).limit(500),
      ]);

      const profMap = new Map((profs ?? []).map(p => [p.id, p]));
      const lastByConvo = new Map<string, any>();
      const unreadByConvo = new Map<string, number>();
      for (const m of msgs ?? []) {
        if (!lastByConvo.has(m.conversation_id)) lastByConvo.set(m.conversation_id, m);
        if (m.sender_id !== user.id && !m.read_at) {
          unreadByConvo.set(m.conversation_id, (unreadByConvo.get(m.conversation_id) ?? 0) + 1);
        }
      }

      const out: Row[] = list.map(c => {
        const otherId = c.user_a === user.id ? c.user_b : c.user_a;
        const p = profMap.get(otherId);
        const last = lastByConvo.get(c.id);
        return {
          id: c.id,
          other: {
            id: otherId,
            nickname: p?.nickname ?? "User",
            photo_url: p?.photo_status === "approved" ? p.photo_url : null,
            online_status: !!p?.online_status,
          },
          last: last ? { body: last.body, created_at: last.created_at, mine: last.sender_id === user.id } : null,
          unread: unreadByConvo.get(c.id) ?? 0,
          last_message_at: c.last_message_at,
        };
      });
      if (!cancelled) setRows(out);
    })();
    return () => { cancelled = true; };
  }, [user, loading, nav]);

  return (
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center gap-3">
          <Link to="/discover" className="p-2 rounded-xl hover:bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="font-display text-xl font-bold flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> Messages</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {rows === null && (
          <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        )}
        {rows && rows.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted-foreground text-sm">No conversations yet.</p>
            <Link to="/discover" className="mt-4 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Find people nearby</Link>
          </div>
        )}
        {rows && rows.length > 0 && (
          <ul className="glass rounded-2xl divide-y divide-border/60 overflow-hidden">
            {rows.map(r => (
              <li key={r.id}>
                <Link to="/chat/$id" params={{ id: r.id }} className="flex items-center gap-3 p-3 hover:bg-card/60 transition">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden bg-card border border-border shrink-0 flex items-center justify-center">
                    {r.other.photo_url
                      ? <img src={r.other.photo_url} alt="" className="h-full w-full object-cover" />
                      : <span className="font-bold text-sm">{r.other.nickname[0]?.toUpperCase()}</span>}
                    {r.other.online_status && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-background" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold truncate">{r.other.nickname}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(r.last_message_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${r.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {r.last ? `${r.last.mine ? "You: " : ""}${r.last.body}` : "Tap to start chatting"}
                      </p>
                      {r.unread > 0 && (
                        <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 shrink-0">{r.unread}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
