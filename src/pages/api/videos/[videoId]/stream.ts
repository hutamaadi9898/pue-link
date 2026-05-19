import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals, request }) => {
  const account = requireRole(locals.currentAccount, "family_member");
  const familyId = account.family_id;
  const videoId = params.videoId;

  if (!familyId || !videoId) {
    return new Response("Video is invalid.", { status: 400 });
  }

  const video = await env.DB.prepare(
    `select r2_key, mime_type, file_size
     from videos
     where id = ? and family_id = ?
     limit 1`
  )
    .bind(videoId, familyId)
    .first<{ r2_key: string; mime_type: string; file_size: number }>();

  if (!video) {
    return new Response("Video not found.", { status: 404 });
  }

  const object = await env.VIDEOS_BUCKET.get(video.r2_key);
  if (!object?.body) {
    return new Response("Video object not found.", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", video.mime_type);
  headers.set("content-length", String(video.file_size));
  headers.set("cache-control", "private, max-age=60");
  headers.set("accept-ranges", "bytes");

  if (request.method === "HEAD") {
    return new Response(null, { headers });
  }

  return new Response(object.body, { headers });
};
