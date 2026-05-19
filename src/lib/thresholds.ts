export const GLOBAL_OVERUSE_THRESHOLD_KEY = "global_overuse_threshold";
export const FALLBACK_OVERUSE_THRESHOLD = 5;

export type ThresholdSource = "video" | "location" | "global" | "fallback";

export type ThresholdInput = {
  videoThreshold?: number | null;
  locationThreshold?: number | null;
  globalThreshold?: number | null;
};

export type ThresholdResolution = {
  threshold: number;
  source: ThresholdSource;
};

export function normalizeThreshold(value: unknown) {
  const threshold = Number(value);
  if (!Number.isFinite(threshold)) return null;
  const normalized = Math.floor(threshold);
  return normalized >= 1 ? normalized : null;
}

export function resolveOveruseThreshold(input: ThresholdInput): ThresholdResolution {
  const video = normalizeThreshold(input.videoThreshold);
  if (video) return { threshold: video, source: "video" };

  const location = normalizeThreshold(input.locationThreshold);
  if (location) return { threshold: location, source: "location" };

  const global = normalizeThreshold(input.globalThreshold);
  if (global) return { threshold: global, source: "global" };

  return { threshold: FALLBACK_OVERUSE_THRESHOLD, source: "fallback" };
}

export async function getGlobalOveruseThreshold(env: Pick<Env, "DB">) {
  const row = await env.DB.prepare(`select value from settings where key = ? limit 1`)
    .bind(GLOBAL_OVERUSE_THRESHOLD_KEY)
    .first<{ value: string }>();

  return normalizeThreshold(row?.value) ?? FALLBACK_OVERUSE_THRESHOLD;
}

export function videoRefreshStatus(input: { playCount: number; threshold: number; needsRefresh?: number | boolean | null }) {
  if (input.needsRefresh || input.playCount >= input.threshold) return "needs_refresh";
  if (input.playCount >= Math.max(1, input.threshold - 1)) return "near_threshold";
  return "normal";
}
