export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const allowedVideoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const extensionsByMimeType: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov"
};

export function isAllowedVideoType(type: string) {
  return allowedVideoTypes.has(type);
}

export function videoExtension(type: string, fallbackName?: string) {
  if (extensionsByMimeType[type]) return extensionsByMimeType[type];
  const extension = fallbackName?.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "mp4";
}

export function videoObjectKey(input: { familyId: string; locationId: string; slotNumber: number; videoId: string; extension: string }) {
  return `families/${input.familyId}/locations/${input.locationId}/slots/${input.slotNumber}/${input.videoId}.${input.extension}`;
}
