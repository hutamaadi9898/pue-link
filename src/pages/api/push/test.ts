import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { json } from "@/lib/place-playback";
import { getFamilyNotificationLanguage, sendOneSignalNotification } from "@/lib/onesignal";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const account = requireRole(locals.currentAccount, "family_member");
  if (!account.family_id) {
    return json({ ok: false, error: "Family account is not linked to a family." }, { status: 400 });
  }

  const language = await getFamilyNotificationLanguage(env, account.family_id);
  const result = await sendOneSignalNotification(env, {
    familyId: account.family_id,
    title: language === "zh" ? "Pue Link 测试通知" : "Pue Link test notification",
    body: language === "zh" ? "家庭提醒会发送到此家庭账户已订阅的所有浏览器。" : "Family alerts are sent to every subscribed browser for this family account.",
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
