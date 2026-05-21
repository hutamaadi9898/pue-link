import { nowIso } from "@/lib/time";

const ONESIGNAL_API_URL = "https://api.onesignal.com/notifications";

type NotificationInput = {
  familyId: string;
  title: string | Record<string, string>;
  body: string | Record<string, string>;
  url: string;
};

type SubscriptionRow = {
  onesignal_player_id: string;
};

type OneSignalCreateResponse = {
  id?: string;
  recipients?: number;
  errors?: {
    invalid_player_ids?: string[];
    invalid_subscription_ids?: string[];
    [key: string]: unknown;
  } | string[] | string;
};

export type NotificationLanguage = "en" | "zh";

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

export function notificationLanguageKey(familyId: string) {
  return `family:${familyId}:notification_language`;
}

export function normalizeNotificationLanguage(value: unknown): NotificationLanguage {
  return value === "zh" ? "zh" : "en";
}

export async function getFamilyNotificationLanguage(env: Env, familyId: string) {
  const row = await env.DB.prepare(`select value from settings where key = ? limit 1`)
    .bind(notificationLanguageKey(familyId))
    .first<{ value: string }>();
  return normalizeNotificationLanguage(row?.value);
}

export async function setFamilyNotificationLanguage(env: Env, familyId: string, language: NotificationLanguage) {
  const timestamp = nowIso();
  await env.DB.prepare(
    `insert into settings (key, value, updated_at)
     values (?, ?, ?)
     on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`
  )
    .bind(notificationLanguageKey(familyId), language, timestamp)
    .run();
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

async function disablePushSubscriptionIds(env: Env, familyId: string, subscriptionIds: string[]) {
  if (subscriptionIds.length === 0) return;

  const timestamp = nowIso();
  await env.DB.batch(
    subscriptionIds.map((subscriptionId) =>
      env.DB.prepare(
        `update push_subscriptions
         set enabled = 0, updated_at = ?
         where family_id = ? and onesignal_player_id = ?`
      ).bind(timestamp, familyId, subscriptionId)
    )
  );
}

function invalidSubscriptionIds(errors: OneSignalCreateResponse["errors"]) {
  if (!errors || Array.isArray(errors) || typeof errors === "string") return [];
  return [
    ...(Array.isArray(errors.invalid_player_ids) ? errors.invalid_player_ids : []),
    ...(Array.isArray(errors.invalid_subscription_ids) ? errors.invalid_subscription_ids : [])
  ];
}

export async function sendOneSignalNotification(env: Env, input: NotificationInput) {
  const appId = getOneSignalAppId(env);
  const apiKey = env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey) {
    return { ok: false, skipped: true, error: "OneSignal REST API key is not configured." };
  }

  const response = await fetch(ONESIGNAL_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      app_id: appId,
      target_channel: "push",
      include_aliases: {
        external_id: [input.familyId]
      },
      isAnyWeb: true,
      headings: typeof input.title === "string" ? { en: input.title } : input.title,
      contents: typeof input.body === "string" ? { en: input.body } : input.body,
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
    const invalidIds = invalidSubscriptionIds(parsed.errors);
    if (invalidIds.length > 0) {
      await disablePushSubscriptionIds(env, input.familyId, invalidIds);
      return {
        ok: false,
        skipped: false,
        error: "The saved browser subscription expired or belongs to another browser. It was removed; click Enable notifications or Sync subscription, then send the test again.",
        invalidSubscriptionIds: invalidIds
      };
    }

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
  const language = await getFamilyNotificationLanguage(env, input.familyId);
  const copy = language === "zh"
    ? {
        title: "视频需要更新",
        body: `${input.locationName} 第 ${input.slotNumber} 槽已播放 ${input.playCount} 次。`
      }
    : {
        title: "Video needs refresh",
        body: `${input.locationName} slot ${input.slotNumber} has been played ${input.playCount} times.`
      };

  return sendOneSignalNotification(env, {
    familyId: input.familyId,
    title: copy.title,
    body: copy.body,
    url: `/locations/${input.locationId}`
  });
}
