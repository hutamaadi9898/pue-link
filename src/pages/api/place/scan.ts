import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { createPlaybackSession, json, selectNextPlaybackVideo } from "@/lib/place-playback";

export const prerender = false;

type DeviceRow = {
  id: string;
  name: string;
  family_id: string;
  family_name: string;
};

export const POST: APIRoute = async ({ request, locals }) => {
  const account = requireRole(locals.currentAccount, "public_place");

  if (!account.location_id) {
    return json({ ok: false, error: "This kiosk account is not linked to a location." }, { status: 400 });
  }

  let body: { barcode_token?: unknown; machine_id?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const barcodeToken = String(body.barcode_token || "").trim();
  const machineId = String(body.machine_id || "").trim() || null;

  if (!barcodeToken) {
    return json({ ok: false, error: "Barcode token is required." }, { status: 400 });
  }

  const location = await env.DB.prepare(`select id, name from locations where id = ? and is_active = 1 limit 1`)
    .bind(account.location_id)
    .first<{ id: string; name: string }>();

  if (!location) {
    return json({ ok: false, error: "The kiosk location is inactive or was not found." }, { status: 404 });
  }

  const device = await env.DB.prepare(
    `select d.id, d.name, d.family_id, f.name as family_name
     from devices d
     join families f on f.id = d.family_id
     where d.barcode_token = ? and d.is_active = 1
     limit 1`
  )
    .bind(barcodeToken)
    .first<DeviceRow>();

  if (!device) {
    return json({ ok: false, error: "Bracelet barcode was not recognized." }, { status: 404 });
  }

  const video = await selectNextPlaybackVideo(env, {
    familyId: device.family_id,
    locationId: location.id
  });

  if (!video) {
    return json(
      {
        ok: false,
        error: "No video is available for this family at this location.",
        data: {
          familyName: device.family_name,
          locationName: location.name
        }
      },
      { status: 404 }
    );
  }

  const playback = await createPlaybackSession(env, {
    accountId: account.id,
    deviceId: device.id,
    video,
    machineId,
    userAgent: request.headers.get("user-agent")
  });

  return json({
    ok: true,
    data: {
      playbackSessionId: playback.sessionId,
      playbackUrl: `/place/play/${playback.sessionId}`,
      streamUrl: `/api/place/play/${playback.sessionId}/stream`,
      playedAt: playback.playedAt,
      machineId,
      family: {
        id: device.family_id,
        name: device.family_name
      },
      location,
      device: {
        id: device.id,
        name: device.name
      },
      video: {
        id: video.id,
        title: video.title,
        description: video.description,
        slotNumber: video.slot_number,
        playCount: playback.playCount,
        threshold: playback.threshold,
        needsRefresh: playback.needsRefresh,
        mimeType: video.mime_type
      }
    }
  });
};
