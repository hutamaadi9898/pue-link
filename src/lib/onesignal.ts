import { nowIso } from "@/lib/time";

const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

type NotificationInput = {
  familyId: string;
  title: string;
  body: string;
  url: string;
};

type SubscriptionRow = {
  onesignal_player_id: string;
};

type OneSignalCreateResponse = {
  id?: string;
  recipients?: number;
  errors?: unknown;
};

export function getOneSignalAppId(env: Env) {
  return env.PUBLIC_ONESIGNAL_APP_ID || "";
}

export function isOneSignalConfigured(env: Env) {
  return Boolean(getOneSignalAppId(env) && env.ONESIGNAL_REST_API_KEY);
}

function notificationUrl(env: Env, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const baseUrl = env.BETTER_AUTH_URL?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}` : pathOrUrl;
}

export async function listEnabledPushSubscriptionIds(env: Env, familyId: string) {
  const result = await env.DB.prepare(
    `select onesignal_player_id
     from push_subscriptions
     where family_id = ? and enabled = 1
     order by updated_at desc`
  )
    .bind(familyId)
    .all<SubscriptionRow>();

  return (result.results ?? []).map((row) => row.onesignal_player_id).filter(Boolean);
}

export async function sendOneSignalNotification(env: Env, input: NotificationInput) {
  const appId = getOneSignalAppId(env);
  const apiKey = env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return { ok: false, skipped: true, error: "OneSignal REST API key is not configured." };
  }

  const subscriptionIds = await listEnabledPushSubscriptionIds(env, input.familyId);
  if (subscriptionIds.length === 0) {
    return { ok: false, skipped: true, error: "No enabled push subscriptions." };
  }

  const response = await fetch(ONESIGNAL_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      app_id: appId,
      include_subscription_ids: subscriptionIds,
      target_channel: "push",
      isAnyWeb: true,
      headings: { en: input.title },
      contents: { en: input.body },
      url: notificationUrl(env, input.url)
    })
  });

  const responseBody = await response.text();
  let parsed: OneSignalCreateResponse | null = null;
  try {
    parsed = JSON.parse(responseBody) as OneSignalCreateResponse;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    return { ok: false, skipped: false, error: responseBody || `OneSignal returned ${response.status}.` };
  }

  if (parsed?.errors) {
    return { ok: false, skipped: false, error: JSON.stringify(parsed.errors) };
  }

  if (parsed?.recipients === 0) {
    return {
      ok: false,
      skipped: false,
      error: "OneSignal accepted the request, but it had 0 recipients. Re-sync the browser subscription, then try again.",
      notificationId: parsed.id,
      recipients: 0
    };
  }

  return {
    ok: true,
    skipped: false,
    sentAt: nowIso(),
    notificationId: parsed?.id,
    recipients: parsed?.recipients,
    responseBody
  };
}

export async function sendVideoRefreshNotification(env: Env, input: {
  familyId: string;
  locationId: string;
  locationName: string;
  slotNumber: number;
  playCount: number;
}) {
  return sendOneSignalNotification(env, {
    familyId: input.familyId,
    title: "Video perlu diperbarui",
    body: `${input.locationName} slot ${input.slotNumber} sudah diputar ${input.playCount} kali.`,
    url: `/locations/${input.locationId}`
  });
}
