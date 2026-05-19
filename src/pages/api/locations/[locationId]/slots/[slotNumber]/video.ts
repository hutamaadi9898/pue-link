import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { nowIso } from "@/lib/time";
import { isAllowedVideoType, MAX_VIDEO_SIZE, videoExtension, videoObjectKey } from "@/lib/videos";

export const prerender = false;

function json(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers
    }
  });
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  const account = requireRole(locals.currentAccount, "family_member");
  const familyId = account.family_id;
  const locationId = params.locationId;
  const slotNumber = Number(params.slotNumber);

  if (!familyId || !locationId || !Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > 3) {
    return json({ ok: false, error: "Location or slot is invalid." }, { status: 400 });
  }

  const slot = await env.DB.prepare(
    `select vs.id, vs.video_id, old.r2_key as old_r2_key
     from video_slots vs
     left join videos old on old.id = vs.video_id
     where vs.family_id = ? and vs.location_id = ? and vs.slot_number = ?
     limit 1`
  )
    .bind(familyId, locationId, slotNumber)
    .first<{ id: string; video_id: string | null; old_r2_key: string | null }>();

  if (!slot) {
    return json({ ok: false, error: "Video slot was not found for this family." }, { status: 404 });
  }

  const form = await request.formData();
  const file = form.get("video");
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();

  if (!(file instanceof File)) {
    return json({ ok: false, error: "Choose a video file first." }, { status: 400 });
  }

  if (!isAllowedVideoType(file.type)) {
    return json({ ok: false, error: "Video format must be MP4, WebM, or QuickTime." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_VIDEO_SIZE) {
    return json({ ok: false, error: "Maximum video size is 50 MB." }, { status: 400 });
  }

  const timestamp = nowIso();
  const videoId = createId("vid");
  const extension = videoExtension(file.type, file.name);
  const r2Key = videoObjectKey({ familyId, locationId, slotNumber, videoId, extension });

  await env.VIDEOS_BUCKET.put(r2Key, file.stream(), {
    httpMetadata: {
      contentType: file.type
    },
    customMetadata: {
      originalName: file.name,
      familyId,
      locationId,
      slotNumber: String(slotNumber)
    }
  });

  try {
    const statements = [
      env.DB.prepare(
        `insert into videos (
           id, family_id, location_id, slot_id, title, description, r2_key, mime_type, file_size,
           duration_seconds, play_count, last_played_at, overuse_threshold, needs_refresh,
           last_overuse_notified_at, created_at, updated_at
         )
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, null, 0, null, null, 0, null, ?, ?)`
      ).bind(videoId, familyId, locationId, slot.id, title || file.name, description || null, r2Key, file.type, file.size, timestamp, timestamp),
      env.DB.prepare(`update video_slots set video_id = ?, updated_at = ? where id = ? and family_id = ?`).bind(videoId, timestamp, slot.id, familyId)
    ];

    if (slot.video_id) {
      statements.push(env.DB.prepare(`delete from videos where id = ? and family_id = ?`).bind(slot.video_id, familyId));
    }

    await env.DB.batch(statements);
  } catch (error) {
    await env.VIDEOS_BUCKET.delete(r2Key);
    return json({ ok: false, error: error instanceof Error ? error.message : "Upload could not be saved." }, { status: 500 });
  }

  if (slot.old_r2_key) {
    await env.VIDEOS_BUCKET.delete(slot.old_r2_key);
  }

  return json({
    ok: true,
    data: {
      id: videoId,
      title: title || file.name,
      r2Key,
      playCount: 0
    }
  });
};
