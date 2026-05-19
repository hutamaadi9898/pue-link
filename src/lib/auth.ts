import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export function createAuth(env: Env) {
  return betterAuth({
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET || "pue-link-local-demo-secret-change-me",
    baseURL: {
      allowedHosts: ["localhost:4321", "127.0.0.1:4321", "*.workers.dev"],
      fallback: env.BETTER_AUTH_URL || "http://127.0.0.1:4321",
      protocol: "auto"
    },
    trustedOrigins: [
      env.BETTER_AUTH_URL,
      "http://127.0.0.1:4321",
      "http://localhost:4321",
      "https://*.workers.dev"
    ].filter(Boolean),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: false,
      password: {
        hash: hashPassword,
        verify: verifyPassword
      }
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60
      }
    }
  });
}

export type AppRole = "super_admin" | "family_member" | "device" | "public_place";

export type CurrentAccount = {
  id: string;
  auth_user_id: string;
  role: AppRole;
  email: string;
  display_name: string;
  family_id: string | null;
  location_id: string | null;
  device_id: string | null;
  is_active: number;
};

export type Family = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export function roleHome(role: AppRole) {
  if (role === "super_admin") return "/admin";
  if (role === "family_member") return "/dashboard";
  if (role === "device") return "/device/barcode";
  return "/place/scanner";
}

export async function getSessionFromRequest(env: Env, request: Request) {
  const auth = createAuth(env);
  return auth.api.getSession({
    headers: request.headers
  });
}

export async function getAccountByAuthUserId(env: Env, authUserId: string) {
  return env.DB.prepare(
    `select id, auth_user_id, role, email, display_name, family_id, location_id, device_id, is_active
     from accounts
     where auth_user_id = ?
     limit 1`
  )
    .bind(authUserId)
    .first<CurrentAccount>();
}

export function getCurrentAccount(locals: App.Locals) {
  return locals.currentAccount;
}

export async function getCurrentFamily(env: Env, account: CurrentAccount | null) {
  if (!account?.family_id) return null;

  return env.DB.prepare(`select id, name, created_at, updated_at from families where id = ? limit 1`)
    .bind(account.family_id)
    .first<Family>();
}

export function requireRole(account: CurrentAccount | null, roles: AppRole | AppRole[]) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!account?.is_active || !allowed.includes(account.role)) {
    throw new Response("Forbidden", { status: 403 });
  }

  return account;
}
