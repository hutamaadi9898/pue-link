import { createAuth, type AppRole } from "@/lib/auth";
import { createBarcodeToken, createId } from "@/lib/ids";
import { hashPassword } from "@/lib/password";
import { nowIso } from "@/lib/time";

const DEFAULT_PASSWORD = "password123";

export type AdminAccountInput = {
  id?: string | null;
  role: AppRole;
  email: string;
  displayName: string;
  familyId?: string | null;
  locationId?: string | null;
  deviceId?: string | null;
  password?: string | null;
};

export async function ensureAuthUser(env: Env, email: string, name: string, password = DEFAULT_PASSWORD) {
  const existing = await env.DB.prepare(`select id from user where email = ? limit 1`).bind(email).first<{ id: string }>();
  if (existing) {
    const timestamp = Date.now();
    const credential = await env.DB.prepare(`select id from account where userId = ? and providerId = 'credential' limit 1`)
      .bind(existing.id)
      .first<{ id: string }>();

    const passwordHash = await hashPassword(password);
    const accountStatement = credential
      ? env.DB.prepare(`update account set password = ?, updatedAt = ? where id = ?`).bind(passwordHash, timestamp, credential.id)
      : env.DB.prepare(
          `insert into account (id, userId, accountId, providerId, password, createdAt, updatedAt)
           values (?, ?, ?, 'credential', ?, ?, ?)`
        ).bind(`credential_${existing.id}`, existing.id, existing.id, passwordHash, timestamp, timestamp);

    await env.DB.batch([env.DB.prepare(`update user set name = ?, updatedAt = ? where id = ?`).bind(name, timestamp, existing.id), accountStatement]);
    return existing.id;
  }

  const auth = createAuth(env);
  const created = await auth.api.signUpEmail({
    body: {
      email,
      name,
      password
    }
  });

  return created.user.id;
}

export async function ensureSlotsForFamilyLocation(env: Env, familyId: string, locationId: string) {
  const timestamp = nowIso();
  await env.DB.batch(
    [1, 2, 3].map((slotNumber) =>
      env.DB.prepare(
        `insert or ignore into video_slots (id, family_id, location_id, slot_number, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?)`
      ).bind(createId("slot"), familyId, locationId, slotNumber, timestamp, timestamp)
    )
  );
}

export async function ensureSlotsForAllPairs(env: Env) {
  const families = await env.DB.prepare(`select id from families`).all<{ id: string }>();
  const locations = await env.DB.prepare(`select id from locations where is_active = 1`).all<{ id: string }>();

  for (const family of families.results ?? []) {
    for (const location of locations.results ?? []) {
      await ensureSlotsForFamilyLocation(env, family.id, location.id);
    }
  }
}

export async function upsertAdminAccount(env: Env, input: AdminAccountInput) {
  const timestamp = nowIso();
  const authUserId = await ensureAuthUser(env, input.email, input.displayName, input.password || DEFAULT_PASSWORD);
  const id = input.id || createId("acct");

  await env.DB.prepare(
    `insert into accounts (
       id, auth_user_id, role, email, display_name, family_id, location_id, device_id, is_active, created_at, updated_at
     )
     values (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
     on conflict(id) do update set
       role = excluded.role,
       email = excluded.email,
       display_name = excluded.display_name,
       family_id = excluded.family_id,
       location_id = excluded.location_id,
       device_id = excluded.device_id,
       is_active = 1,
       updated_at = excluded.updated_at`
  )
    .bind(
      id,
      authUserId,
      input.role,
      input.email,
      input.displayName,
      input.familyId || null,
      input.locationId || null,
      input.deviceId || null,
      timestamp,
      timestamp
    )
    .run();

  return id;
}

export async function createDevice(env: Env, familyId: string, name: string, barcodeToken?: string | null) {
  const timestamp = nowIso();
  const id = createId("dev");
  const token = barcodeToken?.trim() || createBarcodeToken();

  await env.DB.prepare(
    `insert into devices (id, family_id, name, barcode_token, is_active, created_at, updated_at)
     values (?, ?, ?, ?, 1, ?, ?)`
  )
    .bind(id, familyId, name, token, timestamp, timestamp)
    .run();

  return { id, token };
}
