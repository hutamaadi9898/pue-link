import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { createAuth } from "@/lib/auth";

export const prerender = false;

export const GET: APIRoute = async ({ request, redirect }) => {
  try {
    await createAuth(env).api.signOut({
      headers: request.headers
    });
  } catch {
    // A failed sign-out should still send the user back to the login page.
  }

  return redirect("/login");
};
