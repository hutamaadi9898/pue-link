import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Play, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { videoRefreshStatus } from "@/lib/thresholds";
import { FAMILY_VIDEO_QUOTA_LABEL, MAX_VIDEO_SIZE, MAX_VIDEO_SIZE_LABEL } from "@/lib/videos";

const allowedTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);

type Slot = {
  id: string;
  slot_number: number;
  video_id: string | null;
  title: string | null;
  description: string | null;
  play_count: number | null;
  file_size: number | null;
  mime_type: string | null;
  last_played_at: string | null;
  needs_refresh: number | null;
  threshold: number;
};

type Props = {
  locationId: string;
  slots: Slot[];
  quotaUsedBytes: number;
  quotaMaxBytes: number;
};

function formatSize(size: number | null) {
  if (size === null) return "size unavailable";
  if (size === 0) return "0 MB";
  if (size >= 1024 * 1024 * 1024) return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${Math.max(1, Math.round(size / 1024 / 1024))} MB`;
}

function status(slot: Slot) {
  const count = slot.play_count ?? 0;
  const refreshStatus = videoRefreshStatus({ playCount: count, threshold: slot.threshold, needsRefresh: slot.needs_refresh });
  if (refreshStatus === "needs_refresh") return { en: "Needs refresh", zh: "需更新", className: "bg-destructive/10 text-destructive", icon: AlertTriangle };
  if (slot.video_id && refreshStatus === "near_threshold") return { en: "Near limit", zh: "接近上限", className: "bg-amber-50 text-amber-700", icon: AlertTriangle };
  if (slot.video_id) return { en: "Active", zh: "使用中", className: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 };
  return { en: "Empty", zh: "空位", className: "bg-muted text-muted-foreground", icon: UploadCloud };
}

export function LocationSlots({ locationId, slots, quotaUsedBytes, quotaMaxBytes }: Props) {
  const [busySlot, setBusySlot] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const orderedSlots = useMemo(() => [...slots].sort((a, b) => a.slot_number - b.slot_number), [slots]);
  const quotaPercent = Math.min(100, Math.round((quotaUsedBytes / quotaMaxBytes) * 100));

  function upload(slot: Slot, form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("video");

    if (!(file instanceof File) || file.size === 0) {
      setErrors((current) => ({ ...current, [slot.slot_number]: "Choose a video file first." }));
      return;
    }

    if (!allowedTypes.has(file.type)) {
      setErrors((current) => ({ ...current, [slot.slot_number]: "Use MP4, WebM, or QuickTime." }));
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setErrors((current) => ({ ...current, [slot.slot_number]: `Maximum video size is ${MAX_VIDEO_SIZE_LABEL}.` }));
      return;
    }

    const projectedBytes = quotaUsedBytes - (slot.file_size ?? 0) + file.size;
    if (projectedBytes > quotaMaxBytes) {
      setErrors((current) => ({ ...current, [slot.slot_number]: `Family video storage quota is ${FAMILY_VIDEO_QUOTA_LABEL}. Remove or replace a larger video before uploading.` }));
      return;
    }

    setBusySlot(slot.slot_number);
    setErrors((current) => ({ ...current, [slot.slot_number]: "" }));
    setProgress((current) => ({ ...current, [slot.slot_number]: 0 }));

    const request = new XMLHttpRequest();
    request.open("POST", `/api/locations/${locationId}/slots/${slot.slot_number}/video`);
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        setProgress((current) => ({ ...current, [slot.slot_number]: Math.round((event.loaded / event.total) * 100) }));
      }
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300 && request.response?.ok) {
        window.location.reload();
        return;
      }

      setBusySlot(null);
      setErrors((current) => ({ ...current, [slot.slot_number]: request.response?.error || "Upload failed." }));
    };
    request.onerror = () => {
      setBusySlot(null);
      setErrors((current) => ({ ...current, [slot.slot_number]: "Upload connection failed." }));
    };
    request.send(data);
  }

  async function remove(videoId: string, slotNumber: number) {
    if (!window.confirm("Remove this slot video?")) return;
    setBusySlot(slotNumber);
    setErrors((current) => ({ ...current, [slotNumber]: "" }));

    const response = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => null);
    if (response.ok && payload?.ok) {
      window.location.reload();
      return;
    }

    setBusySlot(null);
    setErrors((current) => ({ ...current, [slotNumber]: payload?.error || "Failed to remove video." }));
  }

  return (
    <section className="grid min-w-0 gap-3 sm:gap-4">
      <div className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-bold"><span className="i18n-en">Family video quota</span><span className="i18n-zh">家庭视频配额</span></p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="i18n-en">Each video can be up to {MAX_VIDEO_SIZE_LABEL}. Family storage is capped at {FAMILY_VIDEO_QUOTA_LABEL}.</span>
              <span className="i18n-zh">每个视频最大 {MAX_VIDEO_SIZE_LABEL}。家庭存储上限为 {FAMILY_VIDEO_QUOTA_LABEL}。</span>
            </p>
          </div>
          <p className="text-sm font-semibold">{formatSize(quotaUsedBytes)} / {formatSize(quotaMaxBytes)}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-sm bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${quotaPercent}%` }} />
        </div>
      </div>

      <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {orderedSlots.map((slot) => {
        const count = slot.play_count ?? 0;
        const itemStatus = status(slot);
        const StatusIcon = itemStatus.icon;
        const isBusy = busySlot === slot.slot_number;
        const currentProgress = progress[slot.slot_number] ?? 0;

        return (
          <article className="min-w-0 rounded-lg border bg-card p-4 shadow-sm sm:p-5" key={slot.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-muted-foreground">Slot {slot.slot_number}</p>
                <h2 className="mt-2 break-words text-lg font-bold">{slot.title ?? <><span className="i18n-en">Empty slot</span><span className="i18n-zh">空槽位</span></>}</h2>
              </div>
              <span className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${itemStatus.className}`}>
                <StatusIcon className="size-3.5" />
                <span className="i18n-en">{itemStatus.en}</span><span className="i18n-zh">{itemStatus.zh}</span>
              </span>
            </div>

            {slot.video_id ? (
              <div className="mt-5 grid gap-3 text-sm">
                <p className="break-words leading-6 text-muted-foreground">{slot.description ?? <><span className="i18n-en">No description.</span><span className="i18n-zh">无描述。</span></>}</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-md border bg-background p-3">
                    <p className="font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground"><span className="i18n-en">Plays</span><span className="i18n-zh">播放</span></p>
                  </div>
                  <div className="rounded-md border bg-background p-3">
                    <p className="font-bold">{slot.threshold}</p>
                    <p className="text-xs text-muted-foreground"><span className="i18n-en">Limit</span><span className="i18n-zh">上限</span></p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Format: {slot.mime_type} · {formatSize(slot.file_size)}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="i18n-en">Last played</span><span className="i18n-zh">上次播放</span>: {slot.last_played_at ? new Date(slot.last_played_at).toLocaleString("en-US") : <><span className="i18n-en">never</span><span className="i18n-zh">从未</span></>}
                </p>
                <a
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold"
                  href={`/api/videos/${slot.video_id}/stream`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Play className="size-4" />
                  <span className="i18n-en">Preview</span><span className="i18n-zh">预览</span>
                </a>
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed bg-background p-4">
                <p className="text-sm font-semibold"><span className="i18n-en">Ready for upload</span><span className="i18n-zh">准备上传</span></p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground"><span className="i18n-en">MP4, WebM, or QuickTime. Max {MAX_VIDEO_SIZE_LABEL}.</span><span className="i18n-zh">MP4、WebM 或 QuickTime。最大 {MAX_VIDEO_SIZE_LABEL}。</span></p>
              </div>
            )}

            <form
              className="mt-5 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                upload(slot, event.currentTarget);
              }}
            >
              <Input name="title" placeholder="Video title" defaultValue={slot.title ?? ""} required />
              <Input name="description" placeholder="Short description" defaultValue={slot.description ?? ""} />
              <Input name="video" type="file" accept="video/mp4,video/webm,video/quicktime" required />
              {isBusy ? (
                <div className="rounded-md border bg-background p-2">
                  <div className="h-2 overflow-hidden rounded-sm bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${currentProgress}%` }} />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">{currentProgress || "Starting"}% <span className="i18n-en">uploaded</span><span className="i18n-zh">已上传</span></p>
                </div>
              ) : null}
              {errors[slot.slot_number] ? <p className="rounded-md border border-destructive/30 bg-red-50 px-3 py-2 text-sm text-destructive">{errors[slot.slot_number]}</p> : null}
              <Button type="submit" disabled={isBusy}>
                {isBusy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                {slot.video_id ? <><span className="i18n-en">Replace video</span><span className="i18n-zh">替换视频</span></> : <><span className="i18n-en">Upload video</span><span className="i18n-zh">上传视频</span></>}
              </Button>
              {slot.video_id ? (
                <Button type="button" variant="outline" disabled={isBusy} onClick={() => remove(slot.video_id!, slot.slot_number)}>
                  <Trash2 className="size-4" />
                  <span className="i18n-en">Remove video</span><span className="i18n-zh">删除视频</span>
                </Button>
              ) : null}
            </form>
          </article>
        );
      })}
      </div>
    </section>
  );
}
