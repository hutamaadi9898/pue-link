import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRequestRole, type AppRole } from "@/lib/auth";
import { upsertAdminAccount } from "@/lib/demo-admin";

export const prerender = false;

const roles = new Set<AppRole>(["super_admin", "family_member", "device", "public_place"]);

export const POST: APIRoute = async ({ request, redirect }) => {
  await requireRequestRole(env, request, "super_admin");
  const form = await request.formData();
  const role = String(form.get("role") || "") as AppRole;

  if (!roles.has(role)) {
    return new Response("Account role is invalid.", { status: 400 });
  }

  const email = String(form.get("email") || "").trim().toLowerCase();
  const displayName = String(form.get("display_name") || "").trim();
  if (!email || !displayName) {
    return new Response("Email and display name are required.", { status: 400 });
  }

  await upsertAdminAccount(env, {
    id: String(form.get("id") || "") || null,
    role,
    email,
    displayName,
    familyId: String(form.get("family_id") || "") || null,
    locationId: String(form.get("location_id") || "") || null,
    deviceId: String(form.get("device_id") || "") || null,
    password: String(form.get("password") || "") || null
  });

  return redirect("/admin", 303);
};
