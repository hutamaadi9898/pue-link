import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { getPlaybackSession, isPlaybackSessionExpired } from "@/lib/place-playback";

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  const account = requireRole(locals.currentAccount, "public_place");
  const sessionId = params.playbackSessionId;

  if (!sessionId) {
    return new Response("Invalid playback session.", { status: 400 });
  }

  const session = await getPlaybackSession(env, { sessionId, accountId: account.id });
  if (!session) {
    return new Response("Playback session not found.", { status: 404 });
  }

  if (isPlaybackSessionExpired(session)) {
    return new Response("Playback session has expired.", { status: 410 });
  }

  const object = await env.VIDEOS_BUCKET.get(session.r2_key);
  if (!object?.body) {
    return new Response("Video object not found.", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", session.mime_type);
  headers.set("content-length", String(session.file_size));
  headers.set("cache-control", "private, max-age=60");
  headers.set("accept-ranges", "bytes");

  return new Response(object.body, { headers });
};
