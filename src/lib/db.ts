export type JsonResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

export function getEnv(_locals?: App.Locals) {
  return env;
}

export function getDb(env: Pick<Env, "DB">) {
  return env.DB;
}

export async function first<T>(statement: D1PreparedStatement) {
  return (await statement.first<T>()) ?? null;
}

export function json<T>(payload: JsonResponse<T>, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers
    }
  });
}
import { env } from "cloudflare:workers";
