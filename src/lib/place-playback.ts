import { createId } from "@/lib/ids";
import { sendVideoRefreshNotification } from "@/lib/onesignal";
import { resolveOveruseThreshold } from "@/lib/thresholds";
import { addMinutesIso, nowIso } from "@/lib/time";

export type SelectedPlaybackVideo = {
  id: string;
  title: string;
  description: string | null;
  slot_id: string;
  slot_number: number;
  family_id: string;
  location_id: string;
  r2_key: string;
  mime_type: string;
  file_size: number;
  play_count: number;
  last_played_at: string | null;
  overuse_threshold: number | null;
  location_overuse_threshold: number | null;
  global_overuse_threshold: number | null;
  needs_refresh: number;
  last_overuse_notified_at: string | null;
  location_name: string;
  created_at: string;
};

export type PlaybackSessionRow = {
  id: string;
  family_id: string;
  location_id: string;
  device_id: string;
  public_place_account_id: string;
  slot_id: string;
  video_id: string;
  playback_log_id: string;
  expires_at: string;
  created_at: string;
  title: string;
  description: string | null;
  slot_number: number;
  mime_type: string;
  file_size: number;
  r2_key: string;
  location_name: string;
  family_name: string;
  device_name: string;
};

export function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers
    }
  });
}

export async function selectNextPlaybackVideo(env: Env, input: { familyId: string; locationId: string }) {
  return env.DB.prepare(
    `select v.id, v.title, v.description, v.slot_id, vs.slot_number, v.family_id, v.location_id,
            v.r2_key, v.mime_type, v.file_size, v.play_count, v.last_played_at,
            v.overuse_threshold, l.overuse_threshold as location_overuse_threshold,
            cast(s.value as integer) as global_overuse_threshold, v.needs_refresh,
            v.last_overuse_notified_at, l.name as location_name, v.created_at
     from videos v
     join video_slots vs on vs.id = v.slot_id and vs.video_id = v.id
     join locations l on l.id = v.location_id
     left join settings s on s.key = 'global_overuse_threshold'
     where v.family_id = ? and v.location_id = ?
     order by v.play_count asc,
              case when v.last_played_at is null then 0 else 1 end asc,
              v.last_played_at asc,
              v.created_at asc
     limit 1`
  )
    .bind(input.familyId, input.locationId)
    .first<SelectedPlaybackVideo>();
}

export async function createPlaybackSession(env: Env, input: {
  accountId: string;
  deviceId: string;
  video: SelectedPlaybackVideo;
  machineId: string | null;
  userAgent: string | null;
}) {
  const timestamp = nowIso();
  const logId = createId("log");
  const sessionId = createId("play");
  const nextPlayCount = input.video.play_count + 1;
  const threshold = resolveOveruseThreshold({
    videoThreshold: input.video.overuse_threshold,
    locationThreshold: input.video.location_overuse_threshold,
    globalThreshold: input.video.global_overuse_threshold
  }).threshold;
  const needsRefresh = nextPlayCount >= threshold ? 1 : input.video.needs_refresh;
  const shouldNotify = nextPlayCount >= threshold && !input.video.last_overuse_notified_at;

  await env.DB.batch([
    env.DB.prepare(
      `update videos
       set play_count = ?, last_played_at = ?, needs_refresh = ?, updated_at = ?
       where id = ? and family_id = ? and location_id = ?`
    ).bind(nextPlayCount, timestamp, needsRefresh, timestamp, input.video.id, input.video.family_id, input.video.location_id),
    env.DB.prepare(
      `insert into playback_logs (
         id, family_id, location_id, device_id, public_place_account_id, slot_id, video_id, machine_id, played_at, user_agent
       )
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      logId,
      input.video.family_id,
      input.video.location_id,
      input.deviceId,
      input.accountId,
      input.video.slot_id,
      input.video.id,
      input.machineId,
      timestamp,
      input.userAgent
    ),
    env.DB.prepare(
      `insert into playback_sessions (
         id, family_id, location_id, device_id, public_place_account_id, slot_id, video_id, playback_log_id, expires_at, created_at
       )
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sessionId,
      input.video.family_id,
      input.video.location_id,
      input.deviceId,
      input.accountId,
      input.video.slot_id,
      input.video.id,
      logId,
      addMinutesIso(30),
      timestamp
    )
  ]);

  if (shouldNotify) {
    const notification = await sendVideoRefreshNotification(env, {
      familyId: input.video.family_id,
      locationId: input.video.location_id,
      locationName: input.video.location_name,
      slotNumber: input.video.slot_number,
      playCount: nextPlayCount
    });

    if (notification.ok && notification.sentAt) {
      await env.DB.prepare(
        `update videos
         set last_overuse_notified_at = ?, updated_at = ?
         where id = ? and family_id = ? and location_id = ?`
      )
        .bind(notification.sentAt, notification.sentAt, input.video.id, input.video.family_id, input.video.location_id)
        .run();
    }
  }

  return { sessionId, logId, playCount: nextPlayCount, playedAt: timestamp, threshold, needsRefresh: Boolean(needsRefresh) };
}

export async function getPlaybackSession(env: Env, input: { sessionId: string; accountId: string }) {
  return env.DB.prepare(
    `select ps.id, ps.family_id, ps.location_id, ps.device_id, ps.public_place_account_id,
            ps.slot_id, ps.video_id, ps.playback_log_id, ps.expires_at, ps.created_at,
            v.title, v.description, v.mime_type, v.file_size, v.r2_key,
            vs.slot_number, l.name as location_name, f.name as family_name, d.name as device_name
     from playback_sessions ps
     join videos v on v.id = ps.video_id
     join video_slots vs on vs.id = ps.slot_id
     join locations l on l.id = ps.location_id
     join families f on f.id = ps.family_id
     join devices d on d.id = ps.device_id
     where ps.id = ? and ps.public_place_account_id = ?
     limit 1`
  )
    .bind(input.sessionId, input.accountId)
    .first<PlaybackSessionRow>();
}

export function isPlaybackSessionExpired(session: Pick<PlaybackSessionRow, "expires_at">) {
  return Date.parse(session.expires_at) <= Date.now();
}
