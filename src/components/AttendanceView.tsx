import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { AttendanceRecord, Employee, UserRole } from "../data/types";
import { compressImage } from "../lib/compressImage";

interface Props {
  records: AttendanceRecord[];
  stores: { id: string; name: string; openHour?: string; closeHour?: string }[];
  currentUser: Employee;
  onClock: (record: AttendanceRecord) => void;
  onDelete?: (id: string) => void;
}

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
};

const fmtTime = () => new Date().toLocaleTimeString("id-ID", { hour12: false });

const isLateFor = (clockIn: string, openHour?: string) => (clockIn || "") > `${openHour || "08:00"}:00`;

const CAN_VIEW_ALL: UserRole[] = ["admin", "manager", "manager_operasional"];

const ROLE_LABEL: Record<string, string> = { admin: "Admin", manager: "Manager Toko", manager_operasional: "Manager Operasional", kasir: "Kasir", staff: "Staff" };

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

export default function AttendanceView({ records, stores, currentUser, onClock, onDelete }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [usingFile, setUsingFile] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterEmp, setFilterEmp] = useState("all");
  const [attStore, setAttStore] = useState(currentUser.storeId);
  const [now, setNow] = useState(new Date());
  const [cameraKey, setCameraKey] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const viewAll = CAN_VIEW_ALL.includes(currentUser.role);
  const clockStores = stores;
  const selStoreId = clockStores.some(s => s.id === attStore) ? attStore : clockStores[0]?.id ?? currentUser.storeId;
  const attStoreObj = clockStores.find(s => s.id === selStoreId);
  const attStoreName = attStoreObj?.name ?? "—";
  const openHour = attStoreObj?.openHour ?? "08:00";
  const closeHour = attStoreObj?.closeHour ?? "21:00";
  const liveTime = now.toLocaleTimeString("en-GB", { hour12: false });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find(r => r.employeeId === currentUser.id && r.date === todayStr && r.storeId === selStoreId);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("File harus berupa gambar"); return; }
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

  const openHourFor = (storeId: string) => stores.find(s => s.id === storeId)?.openHour ?? "08:00";

  const statusRec = (r: AttendanceRecord) => {
    const oh = openHourFor(r.storeId);
    if (r.clockOut) return { label: isLateFor(r.clockIn, oh) ? "Telat" : "Hadir", bg: isLateFor(r.clockIn, oh) ? "#fef3c7" : "#f0fdf4", text: isLateFor(r.clockIn, oh) ? "#d97706" : "#16a34a" };
    return { label: "Menunggu Pulang", bg: "#fff7ed", text: "#ea580c" };
  };

  const handleExport = () => {
    if (filtered.length === 0) { showToast("Tidak ada data untuk diexport"); return; }
    const rows = filtered.map(r => ({
      "Tanggal": r.date,
      "Nama": r.employeeName,
      "Jabatan": ROLE_LABEL[r.role],
      "Toko": r.storeName,
      "Jam Masuk": r.clockIn,
      "Jam Pulang": r.clockOut ?? "",
      "Status": isLateFor(r.clockIn, openHourFor(r.storeId)) ? "Telat" : r.clockOut ? "Hadir" : "Menunggu Pulang",
      "Catatan": r.note ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `nostra-absensi-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("File Excel laporan absensi berhasil diunduh");
  };

  const filtered = records
    .filter(r => viewAll || r.employeeId === currentUser.id)
    .filter(r => !filterDate || r.date === filterDate)
    .filter(r => filterStore === "all" || r.storeId === filterStore)
    .filter(r => filterEmp === "all" || r.employeeId === filterEmp)
    .sort((a, b) => (a.date + a.clockIn).localeCompare(b.date + b.clockIn) * -1);

  const empOptions = records
    .filter(r => viewAll || r.employeeId === currentUser.id)
    .reduce<AttendanceRecord[]>((acc, r) => acc.some(x => x.employeeId === r.employeeId) ? acc : [...acc, r], []);

  const photoArea = (
    <div className="mb-3">
      {photo ? (
        <img src={photo} alt="Foto absensi" className="w-full aspect-video object-cover rounded-xl" style={{ border: "1.5px solid var(--border)" }} />
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
      <div className="text-3xl mb-2">✓</div>
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
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>
          {toast}
        </div>
      )}

      {/* Left: absen hari ini */}
      <div className="shrink-0 flex flex-col w-full lg:w-[380px] lg:overflow-y-auto" style={{ background: "var(--card)", borderRight: "1px solid var(--border)" }}>
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
              <img src={currentUser.photo} alt={currentUser.name} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--foreground)" }}>{currentUser.name.charAt(0)}</div>
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
              <select value={selStoreId} onChange={e => { setAttStore(e.target.value); setPhoto(null); setUsingFile(false); }}
                className="w-full px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                {clockStores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
              </select>
            ) : (
              <div className="text-sm font-semibold">{attStoreName.replace("NAND'S BOUTIQUE - ", "")}</div>
            )}
            <div className="text-xs mt-1.5 flex items-center justify-between flex-wrap gap-1">
              <span>Jam operasional: <b className="font-mono">{openHour} – {closeHour}</b></span>
              <span style={{ color: isLateFor(liveTime + ":00", openHour) ? "#d97706" : "#16a34a" }}>{isLateFor(liveTime + ":00", openHour) ? "Terlambat" : "Tepat waktu"}</span>
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
              style={{ background: photo ? "var(--foreground)" : "var(--muted)", color: photo ? "white" : "var(--muted-foreground)" }}
            >
              Absen Masuk
            </button>
          )}
          {todayRecord && !todayRecord.clockOut && (
            <button
              onClick={handleClockOut}
              disabled={!photo}
              className="w-full mt-3 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: photo ? "#ea580c" : "var(--muted)", color: photo ? "white" : "var(--muted-foreground)" }}
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

      {/* Right: riwayat */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Riwayat Absensi</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {viewAll ? "Semua karyawan" : `Riwayat ${currentUser.name}`} · {filtered.length} catatan
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export
              </button>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="text-xs rounded-xl px-3 py-2 outline-none"
                style={{ background: "var(--card)", border: "1px solid var(--border)" }}
              />
              <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
                className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <option value="all">Semua Toko</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
              </select>
              {viewAll && (
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)}
                  className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <option value="all">Semua Karyawan</option>
                  {empOptions.map(r => <option key={r.employeeId} value={r.employeeId}>{r.employeeName}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Tidak ada catatan absensi</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(r => {
                const st = statusRec(r);
                return (
                  <div key={r.id} className="p-4 rounded-xl flex items-center gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    {r.photoIn ? (
                      <img src={r.photoIn} alt="Foto masuk" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "var(--accent)" }}>{r.employeeName.charAt(0)}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-semibold">{viewAll ? r.employeeName : currentUser.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {fmtDate(r.date)} · Masuk <span className="font-mono">{r.clockIn}</span> · Pulang <span className="font-mono">{r.clockOut ?? "—"}</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{r.storeName}</div>
                      {r.note && (
                        <div className="text-xs mt-1 flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}>
                          <svg width="11" height="11" className="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          <span className="italic">Catatan: {r.note}</span>
                        </div>
                      )}
                    </div>
                    {r.photoOut && <img src={r.photoOut} alt="Foto pulang" className="w-8 h-8 rounded-lg object-cover shrink-0" title="Foto pulang" />}
                    {onDelete && (
                      <button onClick={() => setDeleteTarget(r)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all hover:bg-red-50"
                        title="Hapus catatan">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Catatan Absensi?</div>
            <div className="text-sm mb-1" style={{ color: "var(--muted-foreground)" }}>
              <b>{deleteTarget.employeeName}</b> — {fmtDate(deleteTarget.date)}, masuk <span className="font-mono">{deleteTarget.clockIn}</span>
            </div>
            <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Data yang dihapus tidak dapat dikembalikan.</div>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Batal</button>
              <button onClick={() => { onDelete!(deleteTarget.id); setDeleteTarget(null); showToast("Catatan absensi dihapus"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}