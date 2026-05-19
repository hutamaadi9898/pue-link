import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRequestRole } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { nowIso } from "@/lib/time";
import { ensureSlotsForAllPairs, upsertAdminAccount } from "@/lib/demo-admin";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  await requireRequestRole(env, request, "super_admin");
  const form = await request.formData();
  const id = String(form.get("id") || "") || createId("loc");
  const name = String(form.get("name") || "").trim();
  const kind = String(form.get("kind") || "").trim() || null;
  const address = String(form.get("address") || "").trim() || null;
  const threshold = Math.max(1, Number(form.get("overuse_threshold") || 5));

  if (!name) {
    return new Response("Location name is required.", { status: 400 });
  }

  const timestamp = nowIso();
  await env.DB.prepare(
    `insert into locations (id, name, kind, address, overuse_threshold, is_active, created_at, updated_at)
     values (?, ?, ?, ?, ?, 1, ?, ?)
     on conflict(id) do update set
       name = excluded.name,
       kind = excluded.kind,
       address = excluded.address,
       overuse_threshold = excluded.overuse_threshold,
       is_active = 1,
       updated_at = excluded.updated_at`
  )
    .bind(id, name, kind, address, threshold, timestamp, timestamp)
    .run();

  await ensureSlotsForAllPairs(env);

  const accountEmail = String(form.get("account_email") || "").trim().toLowerCase();
  if (accountEmail) {
    await upsertAdminAccount(env, {
      role: "public_place",
      email: accountEmail,
      displayName: String(form.get("account_name") || `${name} Kiosk`).trim(),
      locationId: id,
      password: String(form.get("password") || "") || null
    });
  }

  return redirect("/admin", 303);
};
