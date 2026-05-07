import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const InputSchema = z.object({
  storagePath: z.string().min(1).max(500).regex(/^[a-zA-Z0-9/_.-]+$/),
});

type ModerationVerdict = {
  approved: boolean;
  reason: string;
};

async function moderateWithAI(imageDataUrl: string): Promise<ModerationVerdict> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a profile-photo moderator for an 18+ adult social platform. APPROVE photos that show a real person — selfies, mirror shots, group photos, full-body clothed shots, swimwear, gym pics, or stylized portraits are all fine. REJECT only: explicit nudity, exposed genitals, sexual acts, anyone who looks under 18, weapons, illegal content, obvious memes/screenshots/cartoons, blank/black images, or photos of celebrities. When in doubt, approve. Respond with strict JSON: {\"approved\": boolean, \"reason\": string} where reason is one short sentence the user will see.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Moderate this profile photo." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("AI moderation failed:", res.status, t);
    return { approved: false, reason: "Could not auto-review photo. Try again." };
  }

  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      approved: Boolean(parsed.approved),
      reason: String(parsed.reason ?? "").slice(0, 240) || (parsed.approved ? "Approved" : "Rejected"),
    };
  } catch {
    return { approved: false, reason: "Could not parse moderation result." };
  }
}

export const submitPhotoForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    // Path must live under the user's own folder
    if (!data.storagePath.startsWith(`${userId}/`)) {
      throw new Error("Invalid path");
    }

    // 1. Mark pending using admin (bypasses moderation trigger)
    await supabaseAdmin
      .from("profiles")
      .update({
        photo_status: "pending",
        photo_pending_path: data.storagePath,
        photo_rejection_reason: null,
      })
      .eq("id", userId);

    // 2. Download image as bytes via signed URL
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("photos")
      .createSignedUrl(data.storagePath, 60);
    if (signErr || !signed?.signedUrl) {
      return { ok: false, status: "rejected" as const, reason: "Could not read uploaded file." };
    }
    const imgRes = await fetch(signed.signedUrl);
    if (!imgRes.ok) {
      return { ok: false, status: "rejected" as const, reason: "Could not read uploaded file." };
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.byteLength > 6 * 1024 * 1024) {
      return { ok: false, status: "rejected" as const, reason: "File too large (max 5MB)." };
    }
    const mime = imgRes.headers.get("content-type") ?? "image/jpeg";
    const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

    // 3. AI moderation
    const verdict = await moderateWithAI(dataUrl);

    // 4. Persist verdict
    const reviewedAt = new Date().toISOString();
    if (verdict.approved) {
      const { data: longSigned } = await supabaseAdmin.storage
        .from("photos")
        .createSignedUrl(data.storagePath, 60 * 60 * 24 * 365);
      await supabaseAdmin
        .from("profiles")
        .update({
          photo_url: longSigned?.signedUrl ?? null,
          photo_status: "approved",
          photo_rejection_reason: null,
          photo_reviewed_at: reviewedAt,
        })
        .eq("id", userId);
    } else {
      // Remove rejected file from storage
      await supabaseAdmin.storage.from("photos").remove([data.storagePath]);
      await supabaseAdmin
        .from("profiles")
        .update({
          photo_url: null,
          photo_status: "rejected",
          photo_rejection_reason: verdict.reason,
          photo_pending_path: null,
          photo_reviewed_at: reviewedAt,
        })
        .eq("id", userId);
    }

    await supabaseAdmin.from("photo_moderation_log").insert({
      user_id: userId,
      storage_path: data.storagePath,
      status: verdict.approved ? "approved" : "rejected",
      reason: verdict.reason,
      reviewer: "ai-gemini-2.5-flash",
    });

    return {
      ok: true,
      status: verdict.approved ? ("approved" as const) : ("rejected" as const),
      reason: verdict.reason,
    };
  });
