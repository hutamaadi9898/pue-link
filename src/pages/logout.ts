import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { splitSetCookieHeader } from "better-auth/cookies";
import { createAuth } from "@/lib/auth";

export const prerender = false;

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookies(cookieHeader: string | null) {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;

    cookies.set(trimmed.slice(0, separator), decodeCookieValue(trimmed.slice(separator + 1)));
  }

  return cookies;
}

function unsignedToken(value: string | undefined) {
  return value?.split(".")[0] || null;
}

function appendAuthSetCookies(target: Response, source: Response) {
  const setCookie = source.headers.get("set-cookie");
  for (const cookie of splitSetCookieHeader(setCookie || "")) {
    target.headers.append("Set-Cookie", cookie);
  }
}

async function revokeSessionFallback(cookies: Map<string, string>) {
  const tokens = new Set<string>();

  for (const [name, value] of cookies) {
    if (/^(?:__Secure-|__Host-)?better-auth[.-]session_token$/.test(name)) {
      const token = unsignedToken(value);
      if (token) tokens.add(token);
    }
  }

  await Promise.all(
    [...tokens].map((token) => env.DB.prepare(`delete from session where token = ?`).bind(token).run())
  );
}

function appendFallbackCookieDeletes(response: Response, cookies: Map<string, string>) {
  const cookieNames = new Set([
    "better-auth.session_token",
    "better-auth.session_data",
    "better-auth.account_data",
    "better-auth.dont_remember",
    "better-auth.oauth_state",
    "better-auth-session_token",
    "better-auth-session_data",
    "better-auth-account_data",
    "better-auth-dont_remember",
    "__Secure-better-auth.session_token",
    "__Secure-better-auth.session_data",
    "__Secure-better-auth.account_data",
    "__Secure-better-auth.dont_remember",
    "__Secure-better-auth.oauth_state",
    "__Secure-better-auth-session_token",
    "__Secure-better-auth-session_data",
    "__Secure-better-auth-account_data",
    "__Secure-better-auth-dont_remember",
    "__Host-better-auth.session_token",
    "__Host-better-auth.session_data",
    "__Host-better-auth.account_data",
    "__Host-better-auth.dont_remember"
  ]);

  for (const name of cookies.keys()) {
    if (/^(?:__Secure-|__Host-)?better-auth[.-]/.test(name)) {
      cookieNames.add(name);
    }
  }

  for (const name of cookieNames) {
    const secure = name.startsWith("__Secure-") || name.startsWith("__Host-");
    const attributes = [
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      secure ? "Secure" : null
    ]
      .filter(Boolean)
      .join("; ");

    response.headers.append("Set-Cookie", `${name}=; ${attributes}`);
  }
}

async function signOutAndRedirect(request: Request, redirect: APIRoute["redirect"]) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const response = redirect("/login", 303);

  try {
    const signOutResponse = await createAuth(env).handler(
      new Request(new URL("/api/auth/sign-out", request.url), {
        method: "POST",
        headers: request.headers
      })
    );
    appendAuthSetCookies(response, signOutResponse);
  } catch {
    // The fallback below still revokes the database row and clears known auth cookies.
  }

  try {
    await revokeSessionFallback(cookies);
  } catch {
    // Cookie cleanup below is still enough to remove the browser session state.
  }

  appendFallbackCookieDeletes(response, cookies);

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");

  return response;
}

export const GET: APIRoute = async ({ request, redirect }) => signOutAndRedirect(request, redirect);

export const POST: APIRoute = async ({ request, redirect }) => signOutAndRedirect(request, redirect);
