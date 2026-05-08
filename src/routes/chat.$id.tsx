import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { sendMessage, markRead, resolveConversation } from "@/lib/chat.functions";
import { toast } from "sonner";
import { ArrowLeft, Send, Lock, Check, CheckCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/chat/$id")({ component: ChatRoom });

type Msg = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

function ChatRoom() {
  const { id } = useParams({ from: "/chat/$id" });
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [other, setOther] = useState<{ id: string; nickname: string; photo_url: string | null; online_status: boolean } | null>(null);
  const [wallet, setWallet] = useState<{ chats_balance: number; is_premium: boolean; premium_ends_at: string | null } | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useServerFn(sendMessage);
  const mark = useServerFn(markRead);
  const resolve = useServerFn(resolveConversation);

  const isPremium = !!wallet?.is_premium && !!wallet.premium_ends_at && new Date(wallet.premium_ends_at) > new Date();
  const canRead = isPremium || (wallet?.chats_balance ?? 0) > 0;

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    (async () => {
      const resolved = await resolve({ data: { targetId: id } });
      setConversationId(resolved.id);
      const otherId = resolved.otherUserId;
      const [{ data: prof }, { data: w }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id,nickname,photo_url,photo_status,online_status").eq("id", otherId).maybeSingle(),
        supabase.from("wallets").select("chats_balance,is_premium,premium_ends_at").eq("user_id", user.id).maybeSingle(),
        supabase.from("messages").select("id,sender_id,body,created_at,read_at").eq("conversation_id", resolved.id).order("created_at", { ascending: true }),
      ]);
      setOther(prof ? { id: prof.id, nickname: prof.nickname, photo_url: prof.photo_status === "approved" ? prof.photo_url : null, online_status: prof.online_status } : null);
      setWallet(w as any);
      setMessages((msgs ?? []) as Msg[]);
    })().catch((err: any) => {
      toast.error(err?.message ?? "Conversation not found");
      nav({ to: "/discover" });
    });
  }, [id, user, loading, nav, resolve]);

  // Realtime new messages + read receipts
  useEffect(() => {
    if (!user || !conversationId) return;
    const ch = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((m) => [...m, payload.new as Msg]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((m) => m.map(x => x.id === (payload.new as Msg).id ? payload.new as Msg : x)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, user]);

  // Mark read when viewing & has access
  useEffect(() => {
    if (!user || !canRead || messages.length === 0 || !conversationId) return;
    const hasUnread = messages.some(m => m.sender_id !== user.id && !m.read_at);
    if (hasUnread) mark({ data: { conversationId } }).catch(() => {});
  }, [messages, user, canRead, conversationId, mark]);

  // Auto-scroll
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending || !conversationId) return;
    setSending(true);
    try {
      const res = await send({ data: { conversationId, body: body.trim() } });
      if (!res.ok && res.code === "INSUFFICIENT_CHATS") {
        toast.error("Out of chats — top up to keep talking");
        nav({ to: "/pricing" });
        return;
      }
      setBody("");
      // Refresh wallet
      const { data: w } = await supabase.from("wallets").select("chats_balance,is_premium,premium_ends_at").eq("user_id", user!.id).maybeSingle();
      setWallet(w as any);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  }

  if (loading || !other) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link to="/discover" className="p-2 rounded-xl hover:bg-card"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-10 w-10 rounded-full overflow-hidden bg-card border border-border flex items-center justify-center shrink-0">
            {other.photo_url ? <img src={other.photo_url} alt="" className="h-full w-full object-cover" />
              : <span className="font-bold text-sm text-muted-foreground">{other.nickname[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{other.nickname}</p>
            <p className="text-xs text-muted-foreground">{other.online_status ? <span className="text-success">● Online</span> : "Offline"}</p>
          </div>
          <Link to="/pricing" className="text-xs glass rounded-full px-3 py-1.5 font-semibold whitespace-nowrap">
            {isPremium ? "👑 Premium" : `💬 ${wallet?.chats_balance ?? 0}`}
          </Link>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">Say hi 👋 — first message costs 1 chat (KES 0.25).</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user!.id;
            const showLocked = !mine && !canRead;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "glass"}`}>
                  {showLocked ? (
                    <span className="inline-flex items-center gap-1.5 italic text-muted-foreground"><Lock className="h-3 w-3" /> Buy chats to read</span>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  )}
                  <div className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && (m.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!canRead && (
        <div className="bg-primary/10 border-t border-primary/30 px-4 py-3 text-center text-sm">
          You're out of chats. <Link to="/pricing" className="font-bold text-primary underline">Buy more →</Link>
        </div>
      )}

      <form onSubmit={onSend} className="border-t border-border bg-background/70 backdrop-blur-xl p-3">
        <div className="mx-auto max-w-3xl flex items-center gap-2">
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…" maxLength={2000}
            className="flex-1 rounded-2xl bg-card border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary" />
          <button disabled={sending || !body.trim()} className="rounded-2xl bg-primary p-3 text-primary-foreground disabled:opacity-50">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        {!isPremium && (
          <p className="mx-auto max-w-3xl mt-1.5 text-[10px] text-muted-foreground text-center">
            1 message = 1 chat (KES 0.25) · {wallet?.chats_balance ?? 0} left
          </p>
        )}
      </form>
    </div>
  );
}
