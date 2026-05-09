import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { sendMessage, markRead, resolveConversation, toggleReaction } from "@/lib/chat.functions";
import { CHAT_THEMES, EMOJIS, PICKUP_LINES, QUICK_REACTIONS, type ChatTheme } from "@/lib/chat-extras";
import { toast } from "sonner";
import { ArrowLeft, Send, Lock, Check, CheckCheck, Loader2, Smile, Sparkles, Reply, X, Palette, Moon } from "lucide-react";

export const Route = createFileRoute("/chat/$id")({ component: ChatRoom });

type Msg = { id: string; sender_id: string; body: string; created_at: string; read_at: string | null; reply_to_id: string | null; reactions: Record<string, string[]> };

const THEME_KEY = "chat_theme_id";

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
  const [bootError, setBootError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPickup, setShowPickup] = useState(false);
  const [showThemes, setShowThemes] = useState(false);
  const [theme, setTheme] = useState<ChatTheme>(() => {
    if (typeof window === "undefined") return CHAT_THEMES[0];
    const saved = window.localStorage.getItem(THEME_KEY);
    return CHAT_THEMES.find(t => t.id === saved) ?? CHAT_THEMES[0];
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = useServerFn(sendMessage);
  const mark = useServerFn(markRead);
  const resolve = useServerFn(resolveConversation);
  const react = useServerFn(toggleReaction);

  const isPremium = !!wallet?.is_premium && !!wallet.premium_ends_at && new Date(wallet.premium_ends_at) > new Date();
  const canRead = isPremium || (wallet?.chats_balance ?? 0) > 0;

  useEffect(() => { if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, theme.id); }, [theme]);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav({ to: "/login" }); return; }
    let cancelled = false;
    (async () => {
      try {
        const resolved = await resolve({ data: { targetId: id } });
        if (cancelled) return;
        setConversationId(resolved.id);
        const otherId = resolved.otherUserId;
        const [{ data: prof }, { data: w }, { data: msgs }] = await Promise.all([
          supabase.from("profiles").select("id,nickname,photo_url,photo_status,online_status").eq("id", otherId).maybeSingle(),
          supabase.from("wallets").select("chats_balance,is_premium,premium_ends_at").eq("user_id", user.id).maybeSingle(),
          supabase.from("messages").select("id,sender_id,body,created_at,read_at,reply_to_id,reactions").eq("conversation_id", resolved.id).order("created_at", { ascending: true }),
        ]);
        if (cancelled) return;
        setOther(prof ? { id: prof.id, nickname: prof.nickname, photo_url: prof.photo_status === "approved" ? prof.photo_url : null, online_status: prof.online_status } : { id: otherId, nickname: "User", photo_url: null, online_status: false });
        setWallet(w as any);
        setMessages((msgs ?? []) as any);
      } catch (err: any) {
        if (!cancelled) setBootError(err?.message ?? "Could not open chat");
      }
    })();
    return () => { cancelled = true; };
  }, [id, user, loading, nav, resolve]);

  useEffect(() => {
    if (!user || !conversationId) return;
    const ch = supabase.channel(`chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((m) => m.some(x => x.id === (payload.new as any).id) ? m : [...m, payload.new as any]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => setMessages((m) => m.map(x => x.id === (payload.new as any).id ? payload.new as any : x)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, user]);

  useEffect(() => {
    if (!user || !canRead || messages.length === 0 || !conversationId) return;
    const hasUnread = messages.some(m => m.sender_id !== user.id && !m.read_at);
    if (hasUnread) mark({ data: { conversationId } }).catch(() => {});
  }, [messages, user, canRead, conversationId, mark]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const msgIndex = useMemo(() => Object.fromEntries(messages.map(m => [m.id, m])), [messages]);

  async function doSend(text: string) {
    if (!text.trim() || sending || !conversationId) return;
    setSending(true);
    try {
      const res = await send({ data: { conversationId, body: text.trim(), replyToId: replyTo?.id ?? null } });
      if (!res.ok && res.code === "INSUFFICIENT_CHATS") {
        toast.error("Out of chats — top up to keep talking");
        nav({ to: "/pricing" });
        return;
      }
      setBody(""); setReplyTo(null); setShowEmoji(false); setShowPickup(false);
      const { data: w } = await supabase.from("wallets").select("chats_balance,is_premium,premium_ends_at").eq("user_id", user!.id).maybeSingle();
      setWallet(w as any);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send");
    } finally { setSending(false); }
  }

  async function onReact(messageId: string, emoji: string) {
    try { await react({ data: { messageId, emoji } }); }
    catch (err: any) { toast.error(err?.message ?? "Reaction failed"); }
  }

  if (loading) return <Loading />;
  if (bootError) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <p className="text-destructive font-semibold">{bootError}</p>
      <Link to="/discover" className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Back to Discover</Link>
    </div>
  );
  if (!other || !conversationId) return <Loading />;

  return (
    <div className={`min-h-screen flex flex-col ${theme.bg}`}>
      <Moon className="pointer-events-none absolute top-20 right-6 h-40 w-40 text-white/[0.04]" />

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/60 border-b border-white/10">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link to="/discover" className="p-2 rounded-xl hover:bg-white/10"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
            {other.photo_url ? <img src={other.photo_url} alt="" className="h-full w-full object-cover" />
              : <span className="font-bold text-sm">{other.nickname[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{other.nickname}</p>
            <p className="text-xs opacity-70">{other.online_status ? <span className="text-success">● Online</span> : "Offline"}</p>
          </div>
          <button onClick={() => setShowThemes(v => !v)} className="p-2 rounded-xl hover:bg-white/10" title="Theme"><Palette className="h-4 w-4" /></button>
          <Link to="/pricing" className="text-xs glass rounded-full px-3 py-1.5 font-semibold whitespace-nowrap">
            {isPremium ? "👑" : `💬 ${wallet?.chats_balance ?? 0}`}
          </Link>
        </div>
        {showThemes && (
          <div className="mx-auto max-w-3xl px-4 pb-3 flex gap-2 flex-wrap">
            {CHAT_THEMES.map(t => (
              <button key={t.id} onClick={() => { setTheme(t); setShowThemes(false); }}
                className={`text-xs px-3 py-1.5 rounded-full border ${theme.id === t.id ? "border-primary bg-primary/20" : "border-white/20 hover:bg-white/10"}`}>{t.name}</button>
            ))}
          </div>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 relative">
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm opacity-70 py-12">Say hi 👋 — first message costs 1 chat (KES 0.25).</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === user!.id;
            const showLocked = !mine && !canRead;
            const replied = m.reply_to_id ? msgIndex[m.reply_to_id] : null;
            return (
              <div key={m.id} id={`msg-${m.id}`} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[78%] flex flex-col gap-1">
                  <div className={`relative rounded-2xl px-4 py-2 text-sm ${mine ? theme.bubbleMine : theme.bubbleTheirs}`}>
                    {replied && (
                      <button type="button" onClick={() => document.getElementById(`msg-${replied.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
                        className="block w-full text-left mb-1 rounded-lg bg-black/20 px-2 py-1 border-l-2 border-primary text-[11px] opacity-90 truncate">
                        ↪ {replied.body.slice(0, 80)}
                      </button>
                    )}
                    {showLocked ? (
                      <span className="inline-flex items-center gap-1.5 italic opacity-70"><Lock className="h-3 w-3" /> Buy chats to read</span>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <div className={`mt-1 flex items-center gap-1 text-[10px] opacity-70 ${mine ? "justify-end" : ""}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {mine && (m.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                    </div>
                    {/* Quick actions */}
                    <div className={`absolute -top-3 ${mine ? "left-2" : "right-2"} hidden group-hover:flex items-center gap-1 bg-background/90 backdrop-blur-md rounded-full border border-white/20 px-1 py-0.5 shadow-lg`}>
                      <button onClick={() => setReplyTo(m)} title="Reply" className="p-1 hover:bg-white/10 rounded-full"><Reply className="h-3 w-3" /></button>
                      {QUICK_REACTIONS.map(e => (
                        <button key={e} onClick={() => onReact(m.id, e)} className="px-1 text-sm hover:scale-125 transition">{e}</button>
                      ))}
                    </div>
                  </div>
                  {/* Reactions row */}
                  {m.reactions && Object.keys(m.reactions).length > 0 && (
                    <div className={`flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                      {Object.entries(m.reactions).map(([e, users]) => {
                        const mineReact = (users as string[]).includes(user!.id);
                        return (
                          <button key={e} onClick={() => onReact(m.id, e)}
                            className={`text-[11px] px-1.5 py-0.5 rounded-full border backdrop-blur ${mineReact ? "bg-primary/30 border-primary/60" : "bg-black/30 border-white/15"}`}>
                            {e} {(users as string[]).length}
                          </button>
                        );
                      })}
                    </div>
                  )}
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

      {/* Reply preview */}
      {replyTo && (
        <div className="border-t border-white/10 bg-background/70 backdrop-blur-xl px-4 py-2">
          <div className="mx-auto max-w-3xl flex items-center gap-2 text-xs">
            <Reply className="h-3 w-3 text-primary shrink-0" />
            <span className="opacity-70 shrink-0">Replying to</span>
            <span className="truncate">{replyTo.body.slice(0, 100)}</span>
            <button onClick={() => setReplyTo(null)} className="ml-auto p-1 hover:bg-white/10 rounded"><X className="h-3 w-3" /></button>
          </div>
        </div>
      )}

      {/* Pickup lines */}
      {showPickup && (
        <div className="border-t border-white/10 bg-background/80 backdrop-blur-xl p-3 max-h-56 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider opacity-60">Tap to send · pickup lines</p>
            {PICKUP_LINES.map((line, i) => (
              <button key={i} onClick={() => doSend(line)} disabled={sending}
                className="block w-full text-left text-sm rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2 transition disabled:opacity-50">
                {line}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="border-t border-white/10 bg-background/80 backdrop-blur-xl p-3 max-h-44 overflow-y-auto">
          <div className="mx-auto max-w-3xl grid grid-cols-10 gap-1">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setBody(b => b + e)} className="text-xl p-1.5 rounded-lg hover:bg-white/10 transition">{e}</button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); doSend(body); }} className="border-t border-white/10 bg-background/70 backdrop-blur-xl p-3">
        <div className="mx-auto max-w-3xl flex items-center gap-2">
          <button type="button" onClick={() => { setShowPickup(v => !v); setShowEmoji(false); }} title="Pickup lines"
            className={`p-2.5 rounded-2xl border border-white/15 ${showPickup ? "bg-primary/20 text-primary" : "hover:bg-white/10"}`}><Sparkles className="h-4 w-4" /></button>
          <button type="button" onClick={() => { setShowEmoji(v => !v); setShowPickup(false); }} title="Emoji"
            className={`p-2.5 rounded-2xl border border-white/15 ${showEmoji ? "bg-primary/20 text-primary" : "hover:bg-white/10"}`}><Smile className="h-4 w-4" /></button>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…" maxLength={2000}
            className="flex-1 rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-sm focus:outline-none focus:border-primary placeholder:text-foreground/50" />
          <button disabled={sending || !body.trim()} className="rounded-2xl bg-primary p-3 text-primary-foreground disabled:opacity-50">
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        {!isPremium && (
          <p className="mx-auto max-w-3xl mt-1.5 text-[10px] opacity-60 text-center">
            1 message = 1 chat (KES 0.25) · {wallet?.chats_balance ?? 0} left
          </p>
        )}
      </form>
    </div>
  );
}

function Loading() {
  return <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <p className="text-sm">Opening chat…</p>
  </div>;
}
