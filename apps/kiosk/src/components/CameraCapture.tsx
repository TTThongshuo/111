import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  onCaptured: (dataUrl: string) => void;
};

export function CameraCapture({ onCaptured }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const canShoot = useMemo(() => countdown === null, [countdown]);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        setErr(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        if (cancelled) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "camera_error");
      }
    }
    void start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
      streamRef.current = null;
    };
  }, []);

  function captureFrame(): string | null {
    const video = videoRef.current;
    if (!video) return null;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.92);
  }

  function startCountdown() {
    if (!canShoot) return;
    setCountdown(5);
    let n = 5;
    const timer = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(timer);
        setCountdown(null);
        const dataUrl = captureFrame();
        if (dataUrl) onCaptured(dataUrl);
        return;
      }
      setCountdown(n);
    }, 1000);
  }

  return (
    <div style={{ marginTop: 12 }}>
      {err ? (
        <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", color: "#fecaca" }}>
          摄像头不可用：{err}
        </div>
      ) : null}

      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,.10)" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "auto", display: "block", background: "#000" }} />

        {countdown !== null ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(0,0,0,.45)",
              backdropFilter: "blur(2px)"
            }}
          >
            <div style={{ fontSize: 120, fontWeight: 900, color: "#fff", textShadow: "0 10px 40px rgba(0,0,0,.6)" }}>
              {countdown}
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button
          className="kiosk-btn primary"
          style={{ width: 260, textAlign: "center" }}
          onClick={startCountdown}
          disabled={!canShoot}
        >
          拍照
        </button>
      </div>
    </div>
  );
}

