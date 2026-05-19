import type { APIRoute } from "astro";
import { getEnv, json } from "@/lib/db";
import { seedDemoData } from "@/lib/demo-seed";

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  const env = getEnv(locals);

  if (env.PUE_LINK_ALLOW_SEED !== "true") {
    return json({ ok: false, error: "Demo seed is disabled." }, { status: 403 });
  }

  try {
    const data = await seedDemoData(env);
    return json({ ok: true, data });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Demo seed failed."
      },
      { status: 500 }
    );
  }
};
