import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
import { getAccountByAuthUserId, getSessionFromRequest, roleHome, type AppRole } from "@/lib/auth";

const roleRoutes: Array<[RegExp, AppRole[]]> = [
  [/^\/admin(?:\/|$)/, ["super_admin"]],
  [/^\/dashboard(?:\/|$)/, ["family_member"]],
  [/^\/locations(?:\/|$)/, ["family_member"]],
  [/^\/calendar(?:\/|$)/, ["family_member"]],
  [/^\/settings(?:\/|$)/, ["family_member"]],
  [/^\/device(?:\/|$)/, ["device"]],
  [/^\/place(?:\/|$)/, ["public_place"]],
  [/^\/api\/admin(?:\/|$)/, ["super_admin"]],
  [/^\/api\/locations(?:\/|$)/, ["family_member"]],
  [/^\/api\/videos(?:\/|$)/, ["family_member"]],
  [/^\/api\/settings(?:\/|$)/, ["family_member"]],
  [/^\/api\/playback-logs(?:\/|$)/, ["family_member"]],
  [/^\/api\/push(?:\/|$)/, ["family_member"]],
  [/^\/api\/place(?:\/|$)/, ["public_place"]]
];

const publicPrefixes = ["/api/auth", "/api/dev/seed", "/favicon", "/_astro"];

function isPublicPath(pathname: string) {
  return pathname === "/login" || publicPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function requiredRoles(pathname: string) {
  return roleRoutes.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  context.locals.session = null;
  context.locals.user = null;
  context.locals.currentAccount = null;

  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return next();
  }

  const authSession = await getSessionFromRequest(env, context.request);
  context.locals.session = authSession?.session ?? null;
  context.locals.user = authSession?.user ?? null;

  if (authSession?.user?.id) {
    context.locals.currentAccount = await getAccountByAuthUserId(env, authSession.user.id);
  }

  if (pathname === "/login" && context.locals.currentAccount?.is_active) {
    return context.redirect(roleHome(context.locals.currentAccount.role));
  }

  if (pathname === "/") {
    if (context.locals.currentAccount?.is_active) {
      return context.redirect(roleHome(context.locals.currentAccount.role));
    }

    return context.redirect("/login");
  }

  if (isPublicPath(pathname)) {
    return next();
  }

  const roles = requiredRoles(pathname);
  if (!roles) {
    return next();
  }

  const account = context.locals.currentAccount;
  if (!account?.is_active) {
    const redirect = encodeURIComponent(pathname);
    return context.redirect(`/login?redirect=${redirect}`);
  }

  if (!roles.includes(account.role)) {
    return context.redirect(roleHome(account.role));
  }

  return next();
});
