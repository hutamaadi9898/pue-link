import { createAuth } from "@/lib/auth";
import { nowIso } from "@/lib/time";

const DEMO_PASSWORD = "password123";
const SUPER_ADMIN_EMAIL = "admin@puelink.test";
const FAMILY_EMAIL = "family@puelink.test";
const DEVICE_EMAIL = "device-oma@puelink.test";
const MINIMARKET_EMAIL = "minimarket@puelink.test";
const TAMAN_EMAIL = "taman@puelink.test";

async function ensureAuthUser(env: Env, email: string, name: string) {
  const existing = await env.DB.prepare(`select id from user where email = ? limit 1`).bind(email).first<{ id: string }>();
  if (existing) return existing.id;

  const auth = createAuth(env);
  const created = await auth.api.signUpEmail({
    body: {
      email,
      name,
      password: DEMO_PASSWORD
    }
  });

  return created.user.id;
}

export async function seedDemoData(env: Env) {
  const db = env.DB;
  const timestamp = nowIso();
  const authUsers = {
    superAdmin: await ensureAuthUser(env, SUPER_ADMIN_EMAIL, "Super Admin Demo"),
    familyMember: await ensureAuthUser(env, FAMILY_EMAIL, "Anggota Keluarga Demo"),
    device: await ensureAuthUser(env, DEVICE_EMAIL, "Gelang Demo"),
    minimarket: await ensureAuthUser(env, MINIMARKET_EMAIL, "Mesin Minimarket"),
    taman: await ensureAuthUser(env, TAMAN_EMAIL, "Mesin Taman")
  };

  await db.batch([
    db.prepare(
      `insert or ignore into families (id, name, created_at, updated_at)
       values (?, ?, ?, ?)`
    ).bind("fam_demo", "Keluarga Demo", timestamp, timestamp),
    db.prepare(
      `insert or ignore into devices (id, family_id, name, barcode_token, is_active, created_at, updated_at)
       values (?, ?, ?, ?, 1, ?, ?)`
    ).bind("dev_bracelet_001", "fam_demo", "Gelang Demo 001", "pue_DEMO_BRACELET_001", timestamp, timestamp),
    db.prepare(
      `insert or ignore into locations (id, name, kind, address, overuse_threshold, is_active, created_at, updated_at)
       values (?, ?, ?, ?, 5, 1, ?, ?)`
    ).bind("loc_minimarket", "Minimarket", "minimarket", "Demo minimarket counter", timestamp, timestamp),
    db.prepare(
      `insert or ignore into locations (id, name, kind, address, overuse_threshold, is_active, created_at, updated_at)
       values (?, ?, ?, ?, 5, 1, ?, ?)`
    ).bind("loc_taman", "Taman", "park", "Demo taman gate", timestamp, timestamp),
    db.prepare(
      `insert into accounts (id, auth_user_id, role, email, display_name, is_active, created_at, updated_at)
       values (?, ?, 'super_admin', ?, ?, 1, ?, ?)
       on conflict(id) do update set auth_user_id = excluded.auth_user_id, email = excluded.email, display_name = excluded.display_name, updated_at = excluded.updated_at`
    ).bind("acct_super_admin", authUsers.superAdmin, SUPER_ADMIN_EMAIL, "Super Admin Demo", timestamp, timestamp),
    db.prepare(
      `insert into accounts (id, auth_user_id, role, email, display_name, family_id, is_active, created_at, updated_at)
       values (?, ?, 'family_member', ?, ?, ?, 1, ?, ?)
       on conflict(id) do update set auth_user_id = excluded.auth_user_id, email = excluded.email, display_name = excluded.display_name, family_id = excluded.family_id, updated_at = excluded.updated_at`
    ).bind("acct_family_member", authUsers.familyMember, FAMILY_EMAIL, "Anggota Keluarga Demo", "fam_demo", timestamp, timestamp),
    db.prepare(
      `insert into accounts (id, auth_user_id, role, email, display_name, family_id, device_id, is_active, created_at, updated_at)
       values (?, ?, 'device', ?, ?, ?, ?, 1, ?, ?)
       on conflict(id) do update set auth_user_id = excluded.auth_user_id, email = excluded.email, display_name = excluded.display_name, family_id = excluded.family_id, device_id = excluded.device_id, updated_at = excluded.updated_at`
    ).bind("acct_device", authUsers.device, DEVICE_EMAIL, "Gelang Demo", "fam_demo", "dev_bracelet_001", timestamp, timestamp),
    db.prepare(
      `insert into accounts (id, auth_user_id, role, email, display_name, location_id, is_active, created_at, updated_at)
       values (?, ?, 'public_place', ?, ?, ?, 1, ?, ?)
       on conflict(id) do update set auth_user_id = excluded.auth_user_id, email = excluded.email, display_name = excluded.display_name, location_id = excluded.location_id, updated_at = excluded.updated_at`
    ).bind("acct_place_minimarket", authUsers.minimarket, MINIMARKET_EMAIL, "Mesin Minimarket", "loc_minimarket", timestamp, timestamp),
    db.prepare(
      `insert into accounts (id, auth_user_id, role, email, display_name, location_id, is_active, created_at, updated_at)
       values (?, ?, 'public_place', ?, ?, ?, 1, ?, ?)
       on conflict(id) do update set auth_user_id = excluded.auth_user_id, email = excluded.email, display_name = excluded.display_name, location_id = excluded.location_id, updated_at = excluded.updated_at`
    ).bind("acct_place_taman", authUsers.taman, TAMAN_EMAIL, "Mesin Taman", "loc_taman", timestamp, timestamp)
  ]);

  const slotStatements = ["loc_minimarket", "loc_taman"].flatMap((locationId) =>
    [1, 2, 3].map((slotNumber) =>
      db.prepare(
        `insert or ignore into video_slots (id, family_id, location_id, slot_number, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?)`
      ).bind(`slot_${locationId}_${slotNumber}`, "fam_demo", locationId, slotNumber, timestamp, timestamp)
    )
  );

  await db.batch(slotStatements);

  return {
    password: DEMO_PASSWORD,
    accounts: {
      superAdmin: SUPER_ADMIN_EMAIL,
      familyMember: FAMILY_EMAIL,
      device: DEVICE_EMAIL,
      minimarket: MINIMARKET_EMAIL,
      taman: TAMAN_EMAIL
    },
    deviceBarcodeToken: "pue_DEMO_BRACELET_001"
  };
}
