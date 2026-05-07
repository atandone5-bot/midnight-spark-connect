import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PackId = "starter" | "popular" | "pro" | "mega" | "premium";

export const PACKAGES: Record<PackId, { label: string; amount: number; chats: number; premium?: boolean; tagline: string }> = {
  starter: { label: "Starter", amount: 50, chats: 200, tagline: "Try the night out" },
  popular: { label: "Popular", amount: 100, chats: 450, tagline: "Best value" },
  pro:     { label: "Pro",     amount: 250, chats: 1200, tagline: "For active flirts" },
  mega:    { label: "Mega",    amount: 500, chats: 2500, tagline: "Power user" },
  premium: { label: "Premium Unlimited", amount: 1500, chats: 0, premium: true, tagline: "30 days · unlimited chats" },
};

const InitSchema = z.object({
  packId: z.enum(["starter", "popular", "pro", "mega", "premium"]),
  phone: z.string().trim().regex(/^(?:\+?254|0)?(7|1)\d{8}$/, "Enter a valid Kenyan phone"),
});

function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("254")) return d;
  if (d.startsWith("0")) return "254" + d.slice(1);
  if (d.startsWith("7") || d.startsWith("1")) return "254" + d;
  return d;
}

export const initiateStkPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InitSchema.parse(i))
  .handler(async ({ data, context }) => {
    const pkg = PACKAGES[data.packId];
    const phone = normalizePhone(data.phone);
    const ref = `AD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // STUB — In Phase 4 this hits Daraja STK Push API.
    // For now we record a pending tx and immediately succeed (sandbox).
    await supabaseAdmin.from("transactions").insert({
      user_id: context.userId,
      kind: pkg.premium ? "premium" : "topup",
      amount_kes: pkg.amount,
      chats_delta: pkg.chats,
      status: "pending",
      reference: ref,
      meta: { phone, pack: data.packId, sandbox: true },
    });

    // Simulate STK callback success
    await new Promise(r => setTimeout(r, 1200));

    if (pkg.premium) {
      await supabaseAdmin.rpc("activate_premium", { _user: context.userId, _amount: pkg.amount, _ref: ref });
    } else {
      await supabaseAdmin.rpc("credit_wallet", { _user: context.userId, _chats: pkg.chats, _amount: pkg.amount, _ref: ref });
    }

    return { ok: true as const, reference: ref, sandbox: true };
  });
