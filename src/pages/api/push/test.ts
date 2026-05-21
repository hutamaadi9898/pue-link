import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { json } from "@/lib/place-playback";
import { sendOneSignalNotification } from "@/lib/onesignal";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const account = requireRole(locals.currentAccount, "family_member");
  if (!account.family_id) {
    return json({ ok: false, error: "Family account is not linked to a family." }, { status: 400 });
  }

  const result = await sendOneSignalNotification(env, {
    familyId: account.family_id,
    title: "Video perlu diperbarui",
    body: "Test notification from Pue Link.",
    url: "/settings"
  });

  if (!result.ok) {
    return json({ ok: false, error: result.error }, { status: result.skipped ? 400 : 502 });
  }

  return json({
    ok: true,
    data: {
      sentAt: result.sentAt,
      notificationId: result.notificationId,
      recipients: result.recipients
    }
  });
};
