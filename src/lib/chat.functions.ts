import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PairSchema = z.object({ otherUserId: z.string().uuid() });
const ResolveSchema = z.object({ targetId: z.string().uuid() });
const SendSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().trim().min(1).max(2000),
  replyToId: z.string().uuid().nullable().optional(),
});
const MarkReadSchema = z.object({ conversationId: z.string().uuid() });
const ReactSchema = z.object({ messageId: z.string().uuid(), emoji: z.string().min(1).max(8) });

async function ensureConversationRecord(me: string, otherUserId: string) {
  if (me === otherUserId) throw new Error("Cannot chat with yourself");
  const [a, b] = me < otherUserId ? [me, otherUserId] : [otherUserId, me];
  const existing = await supabaseAdmin.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  if (existing.data?.id) return existing.data.id;

  const ins = await supabaseAdmin.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
  if (ins.error) throw new Error(ins.error.message);
  return ins.data.id;
}

export const openConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PairSchema.parse(i))
  .handler(async ({ data, context }) => {
    const id = await ensureConversationRecord(context.userId, data.otherUserId);
    return { id };
  });

export const resolveConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ResolveSchema.parse(i))
  .handler(async ({ data, context }) => {
    const me = context.userId;

    const directConversation = await supabaseAdmin
      .from("conversations")
      .select("id,user_a,user_b")
      .eq("id", data.targetId)
      .maybeSingle();

    if (directConversation.data && [directConversation.data.user_a, directConversation.data.user_b].includes(me)) {
      return {
        id: directConversation.data.id,
        otherUserId: directConversation.data.user_a === me ? directConversation.data.user_b : directConversation.data.user_a,
      };
    }

    const otherProfile = await supabaseAdmin
      .from("profiles")
      .select("id,status")
      .eq("id", data.targetId)
      .maybeSingle();

    if (!otherProfile.data || ["suspended", "banned"].includes(otherProfile.data.status)) {
      throw new Error("This profile is not available for chat right now");
    }

    const id = await ensureConversationRecord(me, otherProfile.data.id);
    return { id, otherUserId: otherProfile.data.id };
  });

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SendSchema.parse(i))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    const convo = await supabaseAdmin.from("conversations").select("user_a,user_b").eq("id", data.conversationId).maybeSingle();
    if (!convo.data) throw new Error("Conversation not found");
    if (![convo.data.user_a, convo.data.user_b].includes(me)) throw new Error("Forbidden");

    // Atomic debit (throws INSUFFICIENT_CHATS if zero & not premium)
    const { error: debitErr } = await supabaseAdmin.rpc("debit_chat", { _user: me });
    if (debitErr) {
      if (debitErr.message.includes("INSUFFICIENT_CHATS")) {
        return { ok: false as const, code: "INSUFFICIENT_CHATS" as const };
      }
      throw new Error(debitErr.message);
    }

    const ins = await supabaseAdmin.from("messages").insert({
      conversation_id: data.conversationId, sender_id: me, body: data.body,
      reply_to_id: data.replyToId ?? null,
    }).select("id, created_at").single();
    if (ins.error) throw new Error(ins.error.message);
    await supabaseAdmin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", data.conversationId);
    return { ok: true as const, id: ins.data.id };
  });

export const toggleReaction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReactSchema.parse(i))
  .handler(async ({ data, context }) => {
    const me = context.userId;
    const msg = await supabaseAdmin.from("messages").select("id, reactions, conversation_id").eq("id", data.messageId).maybeSingle();
    if (!msg.data) throw new Error("Message not found");
    const convo = await supabaseAdmin.from("conversations").select("user_a,user_b").eq("id", msg.data.conversation_id).maybeSingle();
    if (!convo.data || ![convo.data.user_a, convo.data.user_b].includes(me)) throw new Error("Forbidden");
    const reactions: Record<string, string[]> = (msg.data.reactions as any) ?? {};
    const list = new Set(reactions[data.emoji] ?? []);
    if (list.has(me)) list.delete(me); else list.add(me);
    if (list.size === 0) delete reactions[data.emoji]; else reactions[data.emoji] = [...list];
    const upd = await supabaseAdmin.from("messages").update({ reactions }).eq("id", data.messageId);
    if (upd.error) throw new Error(upd.error.message);
    return { ok: true };
  });

export const markRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => MarkReadSchema.parse(i))
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", data.conversationId)
      .neq("sender_id", context.userId)
      .is("read_at", null);
    return { ok: true };
  });
