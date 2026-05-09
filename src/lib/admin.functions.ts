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
    return data ?? [];
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
