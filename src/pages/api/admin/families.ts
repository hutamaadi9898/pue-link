import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRequestRole } from "@/lib/auth";
import { createId } from "@/lib/ids";
import { nowIso } from "@/lib/time";
import { ensureSlotsForAllPairs } from "@/lib/demo-admin";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  await requireRequestRole(env, request, "super_admin");
  const form = await request.formData();
  const id = String(form.get("id") || "");
  const name = String(form.get("name") || "").trim();

  if (!name) {
    return new Response("Family name is required.", { status: 400 });
  }

  const timestamp = nowIso();
  await env.DB.prepare(
    `insert into families (id, name, created_at, updated_at)
     values (?, ?, ?, ?)
     on conflict(id) do update set name = excluded.name, updated_at = excluded.updated_at`
  )
    .bind(id || createId("fam"), name, timestamp, timestamp)
    .run();

  await ensureSlotsForAllPairs(env);
  return redirect("/admin", 303);
};
