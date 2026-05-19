import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { requireRequestRole } from "@/lib/auth";
import { createDevice, upsertAdminAccount } from "@/lib/demo-admin";
import { nowIso } from "@/lib/time";

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
  await requireRequestRole(env, request, "super_admin");
  const form = await request.formData();
  const id = String(form.get("id") || "");
  const familyId = String(form.get("family_id") || "");
  const name = String(form.get("name") || "").trim();

  if (!familyId || !name) {
    return new Response("Family and device name are required.", { status: 400 });
  }

  const barcodeToken = String(form.get("barcode_token") || "") || null;
  const device = id
    ? { id, token: barcodeToken }
    : await createDevice(env, familyId, name, barcodeToken);

  if (id) {
    await env.DB.prepare(
      `update devices
       set family_id = ?, name = ?, barcode_token = coalesce(?, barcode_token), updated_at = ?
       where id = ?`
    )
      .bind(familyId, name, barcodeToken, nowIso(), id)
      .run();
  }

  const accountEmail = String(form.get("account_email") || "").trim().toLowerCase();

  if (accountEmail) {
    await upsertAdminAccount(env, {
      role: "device",
      email: accountEmail,
      displayName: String(form.get("account_name") || name).trim(),
      familyId,
      deviceId: device.id,
      password: String(form.get("password") || "") || null
    });
  }

  return redirect("/admin", 303);
};
