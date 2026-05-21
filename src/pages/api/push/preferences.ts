import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { json } from "@/lib/place-playback";
import { normalizeNotificationLanguage, setFamilyNotificationLanguage } from "@/lib/onesignal";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const account = requireRole(locals.currentAccount, "family_member");
  if (!account.family_id) {
    return json({ ok: false, error: "Family account is not linked to a family." }, { status: 400 });
  }

  let body: { language?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const language = normalizeNotificationLanguage(body.language);
  await setFamilyNotificationLanguage(env, account.family_id, language);

  return json({ ok: true, data: { language } });
};
