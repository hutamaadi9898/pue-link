import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRole } from "@/lib/auth";
import { GLOBAL_OVERUSE_THRESHOLD_KEY, normalizeThreshold } from "@/lib/thresholds";
import { nowIso } from "@/lib/time";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  requireRole(locals.currentAccount, "family_member");

  const form = await request.formData();
  const timestamp = nowIso();
  const globalThreshold = normalizeThreshold(form.get("global_threshold")) ?? 5;
  const locationIds = form.getAll("location_id").map((value) => String(value));

  const statements: D1PreparedStatement[] = [
    env.DB.prepare(
      `insert into settings (key, value, updated_at)
       values (?, ?, ?)
       on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`
    ).bind(GLOBAL_OVERUSE_THRESHOLD_KEY, String(globalThreshold), timestamp)
  ];

  for (const locationId of locationIds) {
    const threshold = normalizeThreshold(form.get(`location_threshold_${locationId}`));
    if (!threshold) continue;

    statements.push(
      env.DB.prepare(`update locations set overuse_threshold = ?, updated_at = ? where id = ? and is_active = 1`).bind(
        threshold,
        timestamp,
        locationId
      )
    );
  }

  await env.DB.batch(statements);

  return redirect("/settings?saved=1");
};
