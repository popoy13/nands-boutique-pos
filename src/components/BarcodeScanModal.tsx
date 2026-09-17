import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import type { BarcodeSettings } from "../data/settings";
import { defaultSettings } from "../data/settings";
import { playScanFeedback } from "../lib/barcode";

export interface ScanResult {
  ok: boolean;
  message?: string;
}

interface Props {
  onClose: () => void;
  onResult: (code: string) => ScanResult;
  barcode?: BarcodeSettings;
}

function CameraScanner({ onResult, onDone, onRetry }: { onResult: (code: string) => ScanResult; onDone: (r: ScanResult | null) => void; onRetry: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [flash, setFlash] = useState<string>("");
  const [torch, setTorch] = useState(false);
  const [canUseTorch, setCanUseTorch] = useState(false);

  useEffect(() => {
    if (!videoRef.current) return;
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    const handleResult = (result: { getText: () => string } | null | undefined) => {
      if (cancelled || !result) return;
      const code = result.getText();
      const r = onResult(code);
      if (r.ok) {
        cancelled = true;
        controlsRef.current?.stop();
        onDone(r);
      } else {
        setFlash(r.message || "Kode tidak ditemukan");
        setTimeout(() => setFlash(""), 2500);
      }
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("error");
        onDone(null);
        setFlash("Kamera tidak didukung. Gunakan input kode manual di bawah.");
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.setAttribute("autoplay", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("playsinline", "true");

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      try {
        const controls = await reader.decodeFromConstraints(constraints, video, handleResult);
        if (!cancelled) {
          controlsRef.current = controls;
          streamRef.current = (video.srcObject as MediaStream | null) ?? null;
          const track = streamRef.current?.getVideoTracks()[0];
          setCanUseTorch(Boolean(track?.getCapabilities?.().torch));
          setStatus("ready");
        } else {
          controls.stop();
        }
      } catch {
        try {
          const controls = await reader.decodeFromConstraints(
            { audio: false, video: true },
            video,
            handleResult,
          );
          if (!cancelled) {
            controlsRef.current = controls;
            streamRef.current = (video.srcObject as MediaStream | null) ?? null;
            const track = streamRef.current?.getVideoTracks()[0];
            setCanUseTorch(Boolean(track?.getCapabilities?.().torch));
            setStatus("ready");
          } else {
            controls.stop();
          }
        } catch {
          if (!cancelled) {
            setStatus("error");
            onDone(null);
            setFlash("Tidak ada kamera / izin ditolak. Gunakan input kode manual di bawah.");
          }
          return;
        }
      }
    };

    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || !canUseTorch) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(value => !value);
    } catch {
      setFlash("Senter tidak tersedia pada kamera ini");
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ background: "#0d0f14" }}>
      <video ref={videoRef} muted playsInline className="w-full h-72 sm:h-80 object-cover" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[92%] h-32 rounded-xl" style={{ border: "2px solid rgba(255,255,255,0.95)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)" }} />
      </div>
      {status === "ready" && (
        <>
          <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
            <span className="rounded-full px-3 py-1 text-[11px] font-medium text-white" style={{ background: "rgba(0,0,0,0.58)" }}>
              Arahkan barcode ke dalam kotak
            </span>
          </div>
          {canUseTorch && (
            <button type="button" onClick={toggleTorch} className="absolute right-3 bottom-3 rounded-full px-3 py-2 text-xs font-semibold text-white" style={{ background: "rgba(0,0,0,0.65)" }}>
              {torch ? "Matikan senter" : "Nyalakan senter"}
            </button>
          )}
        </>
      )}
      {status === "starting" && (
        <div className="absolute inset-0 bg-black/60 flex flex-col gap-2 items-center justify-center text-center px-6 text-white text-xs">
          <div className="w-8 h-8 rounded-full border-2 border-white/40 border-t-white animate-spin" />
          <div>Menyalakan kamera...</div>
          <div className="text-white/70">Izinkan akses kamera jika diminta</div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-center px-4 text-white text-xs">
          <div>
            <div>Kamera tidak tersedia / izin ditolak. Gunakan input kode manual di bawah.</div>
            <button onClick={onRetry} className="mt-3 px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "white" }}>
              Coba Kamera Lagi
            </button>
          </div>
        </div>
      )}
      {flash && status !== "error" && (
        <div className="absolute top-2 inset-x-0 flex justify-center pointer-events-none">
          <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>{flash}</span>
        </div>
      )}
    </div>
  );
}

export default function BarcodeScanModal({ onClose, onResult, barcode }: Props) {
  const cfg = barcode ?? defaultSettings.barcode;
  const [success, setSuccess] = useState<ScanResult | null>(null);
  const [round, setRound] = useState(0);
  const [manualCode, setManualCode] = useState("");
  const [manualMsg, setManualMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const process = (raw: string): ScanResult => {
    const r = onResult(raw);
    playScanFeedback(r.ok, cfg);
    return r;
  };

  const handleManual = () => {
    if (!manualCode.trim()) return;
    const r = process(manualCode);
    if (r.ok) {
      setSuccess(r);
      setManualCode("");
      setManualMsg(null);
    } else {
      setManualMsg({ text: r.message || "Kode tidak ditemukan", ok: false });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-md mx-3 my-auto rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--card)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)", color: "var(--accent)" }}>
              <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V4a1 1 0 011-1h3M17 3h3a1 1 0 011 1v3m0 10v3a1 1 0 01-1 1h-3M7 21H4a1 1 0 01-1-1v-3M8 7h1v4H8zM12 7h1v4h-1zM16 7h1v4h-1zM8 13h1v4H8zM12 13h1v4h-1zM16 13h1v4h-1z" /></svg>
            </span>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>Scan Barcode</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--muted)" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5">
          {success ? (
            <div className="flex flex-col items-center py-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: "#dcfce7" }}>
                <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div className="text-sm font-semibold mb-1">Berhasil!</div>
              <div className="text-xs text-center mb-4" style={{ color: "var(--muted-foreground)" }}>{success.message}</div>
              <div className="flex gap-2 w-full">
                <button onClick={() => { setSuccess(null); setRound(r => r + 1); }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "var(--foreground)", color: "white" }}>
                  Scan Lagi
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <>
              <CameraScanner key={round} onResult={process} onDone={r => setSuccess(r)} onRetry={() => setRound(r => r + 1)} />
              <div className="mt-3 rounded-xl px-3 py-2.5 text-center text-[11px]" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
                Pegang HP stabil, gunakan cahaya cukup, lalu dekatkan atau jauhkan sampai garis barcode terlihat tajam.
              </div>

              <div className="mt-4 mb-1.5 flex items-center gap-2">
                <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
                <span className="text-[10px] font-semibold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.08em" }}>ATAU KETIK KODE</span>
                <div className="flex-1" style={{ height: 1, background: "var(--border)" }} />
              </div>

              <div className="flex gap-2">
                <input type="text" placeholder="Contoh: KMJ-OXF-WHT-M" value={manualCode} onChange={e => setManualCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === "Enter" && handleManual()}
                  className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none font-mono"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
                <button onClick={handleManual} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "var(--foreground)", color: "white" }}>
                  Cari
                </button>
              </div>
              {manualMsg && <div className="text-xs mt-2" style={{ color: manualMsg.ok ? "#16a34a" : "#ef4444" }}>{manualMsg.text}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}