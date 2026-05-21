import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createId } from "@/lib/ids";
import { json } from "@/lib/place-playback";
import { nowIso } from "@/lib/time";
import { requireRole } from "@/lib/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const account = requireRole(locals.currentAccount, "family_member");
  if (!account.family_id) {
    return json({ ok: false, error: "Family account is not linked to a family." }, { status: 400 });
  }

  let body: { onesignal_player_id?: unknown; subscription_id?: unknown; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const playerId = String(body.onesignal_player_id || body.subscription_id || "").trim();
  if (!playerId) {
    return json({ ok: false, error: "OneSignal subscription ID is required." }, { status: 400 });
  }

  const enabled = body.enabled === false ? 0 : 1;
  const timestamp = nowIso();
  const existing = await env.DB.prepare(
    `select id
     from push_subscriptions
     where family_id = ? and onesignal_player_id = ?
     limit 1`
  )
    .bind(account.family_id, playerId)
    .first<{ id: string }>();

  if (existing) {
    await env.DB.prepare(
      `update push_subscriptions
       set enabled = ?, updated_at = ?
       where id = ? and family_id = ?`
    )
      .bind(enabled, timestamp, existing.id, account.family_id)
      .run();
  } else {
    await env.DB.prepare(
      `insert into push_subscriptions (id, family_id, onesignal_player_id, enabled, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?)`
    )
      .bind(createId("push"), account.family_id, playerId, enabled, timestamp, timestamp)
      .run();
  }

  return json({ ok: true, data: { onesignalPlayerId: playerId, enabled: Boolean(enabled) } });
};
