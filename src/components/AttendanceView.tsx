import { useEffect, useRef, useState } from "react";
import type { AttendanceRecord, Employee } from "../data/types";
import { compressImage } from "../lib/compressImage";
import { validateImageFile } from "../lib/imageFile";
import { todayISO } from "../lib/dates";
import { assetUrl } from "../lib/assets";

interface Props {
  records: AttendanceRecord[];
  stores: { id: string; name: string; openHour?: string; closeHour?: string }[];
  employees: Employee[];
  currentUser: Employee;
  onClock: (record: AttendanceRecord) => void;
}

const fmtDate = (d: string) => {
  const clean = String(d ?? "").slice(0, 10);
  const [y, m, day] = clean.split("-");
  if (!y || !m || !day) return "—";
  return `${day}-${m}-${y}`;
};

const fmtTime = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const padHM = (t: string): string => {
  const m = String(t ?? "").match(/(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
};

const isLateFor = (clockIn: string, openHour?: string) => {
  const a = padHM(clockIn);
  if (!a) return false;
  return a > (padHM(openHour ?? "") || "08:00");
};

function CameraCapture({ onCapture, onNeedFallback }: { onCapture: (dataUrl: string) => void; onNeedFallback: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErr("Kamera tidak didukung browser ini.");
        onNeedFallback();
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 360 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        } else {
          stream.getTracks().forEach(t => t.stop());
        }
      } catch {
        setErr("Izin kamera ditolak atau kamera tidak tersedia.");
        onNeedFallback();
      }
    };
    start();
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    onCapture(canvas.toDataURL("image/jpeg", 0.6));
  };

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden" style={{ background: "#0f1115", border: "1.5px dashed var(--border)" }}>
        <video ref={videoRef} muted playsInline className="w-full aspect-video object-cover" style={{ display: ready ? "block" : "none" }} />
        {!ready && !err && (
          <div className="aspect-video flex flex-col items-center justify-center gap-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <div className="animate-pulse">Menyiapkan kamera...</div>
          </div>
        )}
        {err && (
          <div className="aspect-video flex items-center justify-center px-6 text-center text-xs" style={{ color: "#ef4444" }}>{err}</div>
        )}
      </div>
      {ready && (
        <button
          onClick={capture}
          className="w-full mt-2 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "var(--foreground)", color: "white" }}
        >
          Ambil Foto Selfie
        </button>
      )}
    </div>
  );
}

export default function AttendanceView({ records, stores, employees, currentUser, onClock }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [usingFile, setUsingFile] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [attStore, setAttStore] = useState(currentUser.storeId);
  const [now, setNow] = useState(new Date());
  const [cameraKey, setCameraKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const clockStores = stores;
  const selStoreId = clockStores.some(s => s.id === attStore) ? attStore : clockStores[0]?.id ?? currentUser.storeId;

  const todayStr = todayISO();
  const todayRecord = records.find(r => r.employeeId === currentUser.id && r.date === todayStr);

  const attStoreObj = todayRecord
    ? (stores.find(s => s.id === todayRecord.storeId) ?? null)
    : (clockStores.find(s => s.id === selStoreId) ?? null);
  const attStoreName = attStoreObj?.name ?? todayRecord?.storeName ?? "—";
  const openHour = attStoreObj?.openHour ?? "08:00";
  const closeHour = attStoreObj?.closeHour ?? "21:00";
  const liveTime = now.toLocaleTimeString("en-GB", { hour12: false });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileErr = validateImageFile(file);
    if (fileErr) { showToast(fileErr); return; }
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
      setUsingFile(true);
    } catch {
      showToast("Gagal memproses gambar");
    }
    e.target.value = "";
  };

  const handleClockIn = () => {
    if (todayRecord) { showToast("Anda sudah absen masuk hari ini"); return; }
    if (!photo) { showToast("Ambil foto dulu sebelum absen masuk"); return; }
    onClock({
      id: `att-${Date.now()}`,
      employeeId: currentUser.id,
      employeeName: currentUser.name,
      role: currentUser.role,
      storeId: selStoreId,
      storeName: attStoreName,
      date: todayStr,
      clockIn: fmtTime(),
      photoIn: photo,
      note: note.trim() || undefined,
    });
    setPhoto(null); setUsingFile(false); setNote("");
    showToast(`Absen masuk tercatat di ${attStoreName.replace("NAND'S BOUTIQUE - ", "")}`);
  };

  const handleClockOut = () => {
    if (!todayRecord) return;
    if (!photo) { showToast("Ambil foto dulu sebelum absen pulang"); return; }
    onClock({ ...todayRecord, clockOut: fmtTime(), photoOut: photo, note: note.trim() || todayRecord.note });
    setPhoto(null); setUsingFile(false); setNote("");
    showToast("Absen pulang tercatat");
  };

  const photoArea = (
    <div className="mb-3">
      {photo ? (
        <img src={assetUrl(photo)} alt="Foto absensi" className="w-full aspect-video object-cover rounded-xl" style={{ border: "1.5px solid var(--border)" }} />
      ) : usingFile ? (
        <div className="text-xs py-8 text-center rounded-xl" style={{ background: "var(--background)", border: "1.5px dashed var(--border)", color: "var(--muted-foreground)" }}>
          Kamera tidak tersedia. Pilih foto dari perangkat, atau coba kamera kembali.
        </div>
      ) : (
        <CameraCapture key={cameraKey} onCapture={setPhoto} onNeedFallback={() => setUsingFile(true)} />
      )}
    </div>
  );

  const uploadButtons = (
    <div className="flex gap-2 mb-3">
      <button onClick={() => fileRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        Unggah Foto dari Perangkat
      </button>
      <button onClick={() => { setUsingFile(false); setCameraKey(k => k + 1); }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
        Coba Kamera
      </button>
    </div>
  );

  const actionArea = !todayRecord ? (
    <>
      {photoArea}
      {usingFile && !photo && uploadButtons}
    </>
  ) : todayRecord.clockOut ? (
    <div className="text-center py-6 rounded-xl" style={{ background: "var(--secondary)" }}>
      <div className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center text-white" style={{ background: "#16a34a" }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <div className="text-sm font-semibold">Absensi hari ini selesai</div>
      <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Masuk {todayRecord.clockIn} · Pulang {todayRecord.clockOut}</div>
    </div>
  ) : (
    <>
      {photoArea}
      {usingFile && !photo && uploadButtons}
    </>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto" style={{ background: "var(--background)" }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>
          {toast}
        </div>
      )}

      <div className="w-full max-w-[420px] mx-auto px-4 py-6 lg:py-10 flex flex-col flex-1">
        <div className="rounded-3xl overflow-hidden" style={{ background: "var(--card)", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
          <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Absensi Hari Ini</div>
            <div className="text-xs mt-0.5 flex flex-wrap items-center gap-x-2" style={{ color: "var(--muted-foreground)" }}>
              <span>{fmtDate(todayStr)} · {attStoreName.replace("NAND'S BOUTIQUE - ", "")}</span>
              <span className="font-mono font-bold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{liveTime}</span>
              <span className="px-2 py-0.5 rounded-full" style={{ background: "var(--secondary)", fontSize: 9 }}>Jam {openHour} – {closeHour}</span>
            </div>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-3 mb-4">
              {currentUser.photo ? (
                <img src={assetUrl(currentUser.photo)} alt={currentUser.name} className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--accent)" }}>{currentUser.name.charAt(0)}</div>
              )}
              <div>
                <div className="text-sm font-semibold">{currentUser.name}</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {todayRecord ? <span>Masuk {todayRecord.clockIn}{todayRecord.clockOut ? ` · Pulang ${todayRecord.clockOut}` : ""}</span> : "Belum absen hari ini"}
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 rounded-xl" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>LOKASI ABSENSI</label>
              {clockStores.length > 1 ? (
                <select value={todayRecord ? todayRecord.storeId : selStoreId} disabled={!!todayRecord} onChange={e => { setAttStore(e.target.value); setPhoto(null); setUsingFile(false); }}
                  className="w-full px-3 py-2 rounded-xl text-xs outline-none disabled:opacity-60" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  {clockStores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
                </select>
              ) : (
                <div className="text-sm font-semibold">{attStoreName.replace("NAND'S BOUTIQUE - ", "")}</div>
              )}
              <div className="text-xs mt-1.5 flex items-center justify-between flex-wrap gap-1">
                <span>Jam operasional: <b className="font-mono">{openHour} – {closeHour}</b></span>
                <span style={{ color: isLateFor(liveTime, openHour) ? "#d97706" : "#16a34a" }}>{isLateFor(liveTime, openHour) ? "Terlambat" : "Tepat waktu"}</span>
              </div>
            </div>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

            {actionArea}

            <input
              type="text"
              placeholder="Catatan (opsional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full mt-3 px-3 py-2.5 rounded-xl text-xs outline-none"
              style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
            />

            {!todayRecord && (
              <button
                onClick={handleClockIn}
                disabled={!photo}
                className="w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: photo ? "var(--accent)" : "var(--muted)", color: photo ? "white" : "var(--muted-foreground)", boxShadow: photo ? "0 4px 12px rgba(124,58,237,0.25)" : "none" }}
              >
                Absen Masuk
              </button>
            )}
            {todayRecord && !todayRecord.clockOut && (
              <button
                onClick={handleClockOut}
                disabled={!photo}
                className="w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: photo ? "var(--accent)" : "var(--muted)", color: photo ? "white" : "var(--muted-foreground)" }}
              >
                Absen Pulang
              </button>
            )}

            {photo && !todayRecord?.clockOut && (
              <button
                onClick={() => { setPhoto(null); setUsingFile(false); setCameraKey(k => k + 1); }}
                className="w-full mt-2 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--secondary)" }}
              >
                Ulangi Foto
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
