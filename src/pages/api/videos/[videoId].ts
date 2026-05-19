import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { nowIso } from "@/lib/time";

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

export const DELETE: APIRoute = async ({ params, locals }) => {
  const account = requireRole(locals.currentAccount, "family_member");
  const familyId = account.family_id;
  const videoId = params.videoId;

  if (!familyId || !videoId) {
    return json({ ok: false, error: "Video is invalid." }, { status: 400 });
  }

  const video = await env.DB.prepare(
    `select id, slot_id, r2_key
     from videos
     where id = ? and family_id = ?
     limit 1`
  )
    .bind(videoId, familyId)
    .first<{ id: string; slot_id: string; r2_key: string }>();

  if (!video) {
    return json({ ok: false, error: "Video not found." }, { status: 404 });
  }

  await env.DB.batch([
    env.DB.prepare(`update video_slots set video_id = null, updated_at = ? where id = ? and family_id = ?`).bind(nowIso(), video.slot_id, familyId),
    env.DB.prepare(`delete from videos where id = ? and family_id = ?`).bind(videoId, familyId)
  ]);

  await env.VIDEOS_BUCKET.delete(video.r2_key);

  return json({ ok: true, data: { id: videoId } });
};
