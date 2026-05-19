import { useState } from "react";
import { ArrowLeft, Play, RotateCcw, Video } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string | null;
  familyName: string;
  locationName: string;
  deviceName: string;
  slotNumber: number;
  streamUrl: string;
};

export function PlacePlayer({ title, description, familyName, locationName, deviceName, slotNumber, streamUrl }: Props) {
  const [status, setStatus] = useState<"loading" | "playing" | "ended" | "paused" | "error">("loading");
  const [showManualPlay, setShowManualPlay] = useState(false);

  return (
    <main className="grid min-h-screen bg-slate-950 text-white lg:grid-rows-[auto_1fr_auto]">
      <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary">
            <Video className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{locationName}</p>
            <p className="truncate text-xs text-white/60">{familyName} · {deviceName} · Slot {slotNumber}</p>
          </div>
        </div>
        <a className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10" href="/place/scanner">
          <ArrowLeft className="mr-2 inline size-4" />
          <span className="i18n-en">Scan again</span><span className="i18n-zh">再次扫描</span>
        </a>
      </header>

      <section className="grid min-h-0 place-items-center px-4 py-5">
        <div className="relative w-full max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-black shadow-sm">
          <video
            className="aspect-video w-full bg-black object-contain"
            src={streamUrl}
            controls
            autoPlay
            playsInline
            onCanPlay={() => setStatus((current) => (current === "loading" ? "paused" : current))}
            onPlay={() => {
              setStatus("playing");
              setShowManualPlay(false);
            }}
            onPause={() => setStatus("paused")}
            onEnded={() => setStatus("ended")}
            onError={() => setStatus("error")}
            onLoadedData={(event) => {
              const video = event.currentTarget;
              void video.play().catch(() => {
                setShowManualPlay(true);
                setStatus("paused");
              });
            }}
          />

          {showManualPlay && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 px-4 text-center">
              <div>
                <p className="text-lg font-bold"><span className="i18n-en">Autoplay was blocked</span><span className="i18n-zh">自动播放已被阻止</span></p>
                <p className="mt-2 text-sm text-white/60"><span className="i18n-en">Press the button to start the video.</span><span className="i18n-zh">点击按钮开始播放视频。</span></p>
                <Button className="mt-4" onClick={() => document.querySelector<HTMLVideoElement>("video")?.play()}>
                  <Play className="size-4" />
                  <span className="i18n-en">Play</span><span className="i18n-zh">播放</span>
                </Button>
              </div>
            </div>
          )}

          {status === "ended" && (
            <div className="absolute inset-0 grid place-items-center bg-black/75 px-4 text-center">
              <div>
                <p className="text-2xl font-bold"><span className="i18n-en">Playback finished</span><span className="i18n-zh">播放结束</span></p>
                <p className="mt-2 text-sm text-white/60"><span className="i18n-en">Return to the scanner for the next scan.</span><span className="i18n-zh">返回扫描器进行下一次扫描。</span></p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Button asChild>
                    <a href="/place/scanner">
                      <ArrowLeft className="size-4" />
                      <span className="i18n-en">Scan again</span><span className="i18n-zh">再次扫描</span>
                    </a>
                  </Button>
                  <Button variant="secondary" onClick={() => document.querySelector<HTMLVideoElement>("video")?.play()}>
                    <RotateCcw className="size-4" />
                    Replay
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-white/50"><span className="i18n-en">Selected video</span><span className="i18n-zh">已选视频</span></p>
            <h1 className="mt-1 text-xl font-bold">{title}</h1>
            {description && <p className="mt-1 max-w-2xl text-sm text-white/60">{description}</p>}
          </div>
          <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/70">
            Status: {status === "loading" ? "Loading" : status === "playing" ? "Playing" : status === "ended" ? "Ended" : status === "error" ? "Error" : "Ready"}
          </p>
        </div>
      </footer>
    </main>
  );
}
