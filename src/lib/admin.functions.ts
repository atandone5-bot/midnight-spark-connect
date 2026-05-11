import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.rpc("admin_dashboard_stats");
    if (error) throw new Error(error.message);
    return data as Record<string, number>;
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.rpc("admin_recent_users", { _limit: 100 });
    if (error) throw new Error(error.message);
    return Array.isArray(data) ? data : [];
  });

const GrantSchema = z.object({ targetUserId: z.string().uuid(), chats: z.number().int().refine(n => n !== 0), note: z.string().max(200).optional() });
export const grantChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GrantSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: bal, error } = await supabaseAdmin.rpc("admin_grant_chats", { _target: data.targetUserId, _chats: data.chats, _note: data.note ?? undefined });
    if (error) throw new Error(error.message);
    return { newBalance: bal as number };
  });

const StatusSchema = z.object({ targetUserId: z.string().uuid(), status: z.enum(["trial_active", "free", "premium_active", "suspended", "banned"]) });
export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StatusSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.rpc("admin_set_status", { _target: data.targetUserId, _status: data.status });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const FreeSchema = z.object({ targetUserId: z.string().uuid(), enabled: z.boolean() });
export const toggleFreeChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => FreeSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.rpc("admin_toggle_free_chats", { _target: data.targetUserId, _enabled: data.enabled });
    if (error) throw new Error(error.message);
    return { enabled: data.enabled };
  });

export const getAdminConversations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data: convos, error } = await supabaseAdmin
      .from("conversations")
      .select("id,user_a,user_b,last_message_at,created_at")
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((convos ?? []).flatMap(c => [c.user_a, c.user_b])));
    const { data: profs } = await supabaseAdmin.from("profiles").select("id,nickname").in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const map = new Map((profs ?? []).map(p => [p.id, p.nickname]));
    return (convos ?? []).map(c => ({
      id: c.id,
      a: { id: c.user_a, nickname: map.get(c.user_a) ?? "?" },
      b: { id: c.user_b, nickname: map.get(c.user_b) ?? "?" },
      last_message_at: c.last_message_at,
    }));
  });

const ConvoIdSchema = z.object({ conversationId: z.string().uuid() });
export const getAdminMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ConvoIdSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: msgs, error } = await supabaseAdmin
      .from("messages")
      .select("id,sender_id,body,created_at,read_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return msgs ?? [];
  });

