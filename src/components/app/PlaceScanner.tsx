import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, Loader2, Play, QrCode, RotateCcw, ScanLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ScanResult = {
  playbackSessionId: string;
  playbackUrl: string;
  streamUrl: string;
  family: { id: string; name: string };
  location: { id: string; name: string };
  device: { id: string; name: string };
  video: {
    id: string;
    title: string;
    description: string | null;
    slotNumber: number;
    playCount: number;
    mimeType: string;
  };
};

type Props = {
  accountName: string;
  locationName: string;
  defaultMachineId?: string;
};

function suggestedMachineId(locationName: string) {
  const normalized = locationName.toLowerCase();
  if (normalized.includes("taman")) return "taman-gate";
  if (normalized.includes("minimarket")) return "minimarket-front";
  return "kiosk-main";
}

function currentLanguage() {
  return document.documentElement.dataset.language === "zh" ? "zh" : "en";
}

function message(en: string, zh: string) {
  return currentLanguage() === "zh" ? zh : en;
}

export function PlaceScanner({ accountName, locationName, defaultMachineId }: Props) {
  const [token, setToken] = useState("");
  const [machineId, setMachineId] = useState(defaultMachineId || suggestedMachineId(locationName));
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const detectedTokenRef = useRef<string | null>(null);
  const canUseCamera = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);

  async function submitScan(nextToken = token) {
    const barcodeToken = nextToken.trim();
    if (!barcodeToken || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/place/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          barcode_token: barcodeToken,
          machine_id: machineId.trim() || null
        })
      });
      const payload = (await response.json()) as { ok: boolean; data?: ScanResult; error?: string };

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error || message("Scan could not be processed.", "无法处理扫描。"));
      }

      setResult(payload.data);
      setToken("");
      stopCamera();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : message("Scan could not be processed.", "无法处理扫描。"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function stopCamera() {
    zxingControlsRef.current?.stop();
    zxingControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectedTokenRef.current = null;
    setIsScanning(false);
  }

  async function startCamera() {
    if (!canUseCamera || isScanning || !videoRef.current) return;

    setCameraMessage(null);
    setError(null);

    try {
      setIsScanning(true);
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      const reader = new BrowserMultiFormatReader();

      zxingControlsRef.current = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (scanResult, _scanError, controls) => {
          const rawValue = scanResult?.getText()?.trim();
          if (!rawValue || detectedTokenRef.current) return;

          detectedTokenRef.current = rawValue;
          controls.stop();
          zxingControlsRef.current = null;
          setToken(rawValue);
          void submitScan(rawValue);
        }
      );
    } catch {
      setCameraMessage(message("Camera scanner is unavailable in this browser. Enter the token manually.", "此浏览器无法使用摄像头扫描。请手动输入令牌。"));
      stopCamera();
    }
  }

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-primary">
            <ScanLine className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">Pue Link Kiosk</p>
            <p className="truncate text-xs text-white/60">{accountName} · {locationName}</p>
          </div>
        </div>
        <a className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10" href="/logout">
          <span className="i18n-en">Sign out</span><span className="i18n-zh">退出</span>
        </a>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-4 py-6 lg:grid-cols-[1fr_22rem]">
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Badge className="bg-white/10 text-white" variant="outline">
                <span className="i18n-en">Public scanner</span><span className="i18n-zh">公共扫描器</span>
              </Badge>
              <h1 className="mt-3 text-2xl font-bold tracking-normal sm:text-3xl">
                <span className="i18n-en">Scan a family bracelet</span><span className="i18n-zh">扫描家庭手环</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                <span className="i18n-en">The kiosk selects the active video with the lowest play count for this location.</span>
                <span className="i18n-zh">自助机将为此地点选择播放次数最少的可用视频。</span>
              </p>
            </div>
            <div className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm">
              <p className="text-xs font-semibold uppercase text-white/50">Machine ID</p>
              <Input
                className="mt-2 h-9 border-white/10 bg-white text-slate-950"
                value={machineId}
                onChange={(event) => setMachineId(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-black">
            <video ref={videoRef} className={isScanning ? "aspect-video w-full object-cover" : "hidden"} muted playsInline />
            {!isScanning && (
              <div className="grid aspect-video place-items-center bg-slate-900 px-6 text-center">
                <div>
                  <QrCode className="mx-auto size-16 text-primary" />
                  <p className="mt-4 text-lg font-bold"><span className="i18n-en">Camera ready</span><span className="i18n-zh">摄像头已就绪</span></p>
                  <p className="mt-2 text-sm leading-6 text-white/55">
                    <span className="i18n-en">Use the camera to scan the QR code, or enter the token from the bracelet screen manually.</span>
                    <span className="i18n-zh">使用摄像头扫描二维码，或手动输入手环屏幕上的令牌。</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              className="h-11 border-white/10 bg-white text-slate-950"
              placeholder="Enter barcode token manually"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitScan();
              }}
            />
            <Button type="button" variant="secondary" onClick={startCamera} disabled={!canUseCamera || isScanning || isSubmitting}>
              <Camera className="size-4" />
              <span className="i18n-en">Camera</span><span className="i18n-zh">摄像头</span>
            </Button>
            <Button type="button" onClick={() => submitScan()} disabled={!token.trim() || isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              <span className="i18n-en">Start</span><span className="i18n-zh">开始</span>
            </Button>
          </div>

          {isScanning && (
            <Button className="mt-3" type="button" variant="secondary" onClick={stopCamera}>
              <RotateCcw className="size-4" />
              <span className="i18n-en">Stop camera</span><span className="i18n-zh">停止摄像头</span>
            </Button>
          )}

          {(error || cameraMessage) && (
            <div className="mt-4 flex gap-3 rounded-md border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{error || cameraMessage}</p>
            </div>
          )}
        </div>

        <aside className="rounded-lg border border-white/10 bg-white/[0.04] p-4 shadow-sm sm:p-5">
          <p className="text-xs font-bold uppercase text-white/50"><span className="i18n-en">Scan result</span><span className="i18n-zh">扫描结果</span></p>
          {result ? (
            <div className="mt-4 grid gap-4">
              <div className="rounded-md border border-emerald-400/20 bg-emerald-400/10 p-3">
                <div className="flex items-center gap-2 text-emerald-100">
                  <CheckCircle2 className="size-4" />
                  <p className="text-sm font-bold"><span className="i18n-en">Video ready to play</span><span className="i18n-zh">视频可播放</span></p>
                </div>
                <p className="mt-2 text-xs leading-5 text-emerald-100/80">
                  {result.family.name} · {result.device.name}
                </p>
              </div>

              <div className="rounded-md border border-white/10 bg-slate-900 p-3">
                <p className="text-xs font-semibold uppercase text-white/50">Slot {result.video.slotNumber}</p>
                <h2 className="mt-2 text-lg font-bold">{result.video.title}</h2>
                <p className="mt-2 text-sm text-white/60">
                  <span className="i18n-en">Played {result.video.playCount} times after this scan.</span>
                  <span className="i18n-zh">本次扫描后已播放 {result.video.playCount} 次。</span>
                </p>
              </div>

              <Button asChild className="w-full">
                <a href={result.playbackUrl}>
                  <Play className="size-4" />
                  <span className="i18n-en">Open player</span><span className="i18n-zh">打开播放器</span>
                </a>
              </Button>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-white/10 bg-slate-900 p-4 text-sm leading-6 text-white/60">
              <span className="i18n-en">No result yet. After a valid token is processed, the kiosk shows the video, slot, family, and player button.</span>
              <span className="i18n-zh">暂无结果。有效令牌处理后，自助机会显示视频、槽位、家庭和播放器按钮。</span>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
