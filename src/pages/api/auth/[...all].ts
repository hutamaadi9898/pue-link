import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth";

export const prerender = false;

export const ALL: APIRoute = async ({ request }) => {
  return createAuth(env).handler(request);
};
