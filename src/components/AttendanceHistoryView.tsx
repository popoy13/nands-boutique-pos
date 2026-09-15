import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import type { AttendanceRecord, Employee } from "../data/types";
import type { RoleConfig } from "../data/roles";
import { getRoleLabel } from "../data/roles";
import { todayISO } from "../lib/dates";
import Pagination from "./Pagination";

const fmtDate = (d: string) => {
  const clean = String(d ?? "").slice(0, 10);
  const [y, m, day] = clean.split("-");
  if (!y || !m || !day) return "—";
  return `${day}-${m}-${y}`;
};

const isLateFor = (clockIn: string, openHour?: string) => (clockIn || "").slice(0, 5) > (openHour || "08:00");

interface Props {
  records: AttendanceRecord[];
  stores: { id: string; name: string; openHour?: string }[];
  employees: Employee[];
  currentUser: Employee;
  onDelete?: (id: string) => void;
  roles?: Record<string, RoleConfig>;
  canViewAll?: boolean;
}

export default function AttendanceHistoryView({ records, stores, employees, currentUser, onDelete, roles, canViewAll }: Props) {
  const [datePreset, setDatePreset] = useState<"today" | "week" | "custom" | "all">("today");
  const [filterDate, setFilterDate] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterEmp, setFilterEmp] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(null);
  const [selected, setSelected] = useState<AttendanceRecord | null>(null);

  const resetPage = () => setPage(1);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const viewAll = canViewAll === true;
  const today = todayISO();
  const weekStart = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0, 10); })();
  const inDateRange = (r: AttendanceRecord) => {
    if (datePreset === "today") return r.date === today;
    if (datePreset === "week") return r.date >= weekStart && r.date <= today;
    if (datePreset === "custom") return r.date === filterDate;
    return true;
  };

  const openHourFor = (storeId: string) => stores.find(s => s.id === storeId)?.openHour ?? "08:00";

  const statusRec = (r: AttendanceRecord) => {
    const oh = openHourFor(r.storeId);
    if (r.clockOut) return { label: isLateFor(r.clockIn, oh) ? "Telat" : "Hadir", bg: isLateFor(r.clockIn, oh) ? "#fef3c7" : "#f0fdf4", text: isLateFor(r.clockIn, oh) ? "#d97706" : "#16a34a" };
    if (r.date < todayISO()) return { label: "Tidak Catat Pulang", bg: "#fef2f2", text: "#ef4444" };
    return { label: "Menunggu Pulang", bg: "#fff7ed", text: "#ea580c" };
  };

  const filtered = useMemo(() => {
    return records
      .filter(r => viewAll || r.employeeId === currentUser.id)
      .filter(inDateRange)
      .filter(r => filterStore === "all" || r.storeId === filterStore)
      .filter(r => filterEmp === "all" || r.employeeId === filterEmp)
      .sort((a, b) => (a.date + a.clockIn).localeCompare(b.date + b.clockIn) * -1);
  }, [records, viewAll, currentUser.id, datePreset, filterDate, filterStore, filterEmp]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => filtered.slice((safePage - 1) * pageSize, safePage * pageSize), [filtered, safePage, pageSize]);

  const empOptions = employees.filter(e => e.status === "active");

  const handleExport = () => {
    if (filtered.length === 0) { showToast("Tidak ada data untuk diexport"); return; }
    const rows = filtered.map(r => ({
      "Tanggal": r.date,
      "Nama": r.employeeName,
      "Jabatan": getRoleLabel(r.role, roles),
      "Toko": r.storeName,
      "Jam Masuk": r.clockIn,
      "Jam Pulang": r.clockOut ?? "",
      "Status": r.clockOut ? (isLateFor(r.clockIn, openHourFor(r.storeId)) ? "Telat" : "Hadir") : r.date < todayISO() ? "Tidak Catat Pulang" : "Menunggu Pulang",
      "Catatan": r.note ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `nands-boutique-absensi-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("File Excel laporan absensi berhasil diunduh");
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto lg:overflow-hidden" style={{ background: "var(--background)" }}>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>
          {toast}
        </div>
      )}

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
              <button onClick={() => { onDelete!(deleteTarget.id); setDeleteTarget(null); setSelected(null); showToast("Catatan absensi dihapus"); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile detail overlay */}
      {selected && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSelected(null)} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden flex flex-col" style={{ background: "var(--card)", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-2.5 shrink-0" style={{ background: "var(--border)" }} />
            <div className="flex flex-col max-h-[85vh] overflow-y-auto p-5">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>Detail Absensi</div>
                <div className="flex items-center gap-1.5">
                  {onDelete && (
                    <button onClick={() => { setDeleteTarget(selected); setSelected(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }} title="Hapus">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                  <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--muted)" }}>
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              {(() => {
                const st = statusRec(selected);
                return (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      {selected.photoIn ? (
                        <img src={selected.photoIn} alt="Foto masuk" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "var(--accent)" }}>{selected.employeeName.charAt(0)}</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{selected.employeeName}</div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{getRoleLabel(selected.role, roles)}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl mb-3" style={{ background: "var(--background)" }}>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Tanggal</div>
                      <div className="text-sm font-semibold">{fmtDate(selected.date)}</div>
                    </div>

                    <div className="p-3 rounded-xl mb-3" style={{ background: "var(--background)" }}>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Toko</div>
                      <div className="text-sm font-semibold">{selected.storeName}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Jam Masuk</div>
                        <div className="text-sm font-bold font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selected.clockIn}</div>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Jam Pulang</div>
                        <div className="text-sm font-bold font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selected.clockOut ?? "—"}</div>
                      </div>
                    </div>

                    {selected.photoOut && (
                      <div className="mb-3">
                        <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>FOTO PULANG</div>
                        <img src={selected.photoOut} alt="Foto pulang" className="w-full aspect-video object-cover rounded-xl" style={{ border: "1px solid var(--border)" }} />
                      </div>
                    )}

                    {selected.note && (
                      <div className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                        <div className="text-xs font-semibold mb-0.5" style={{ color: "var(--muted-foreground)" }}>Catatan</div>
                        <div className="text-xs italic">{selected.note}</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
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
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setDatePreset("today"); resetPage(); }}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: datePreset === "today" ? "var(--accent)" : "var(--card)", color: datePreset === "today" ? "white" : "var(--muted-foreground)", border: `1px solid ${datePreset === "today" ? "var(--accent)" : "var(--border)"}` }}>
                Hari Ini
              </button>
              <button onClick={() => { setDatePreset("week"); resetPage(); }}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: datePreset === "week" ? "var(--accent)" : "var(--card)", color: datePreset === "week" ? "white" : "var(--muted-foreground)", border: `1px solid ${datePreset === "week" ? "var(--accent)" : "var(--border)"}` }}>
                7 Hari Terakhir
              </button>
              <button onClick={() => { setDatePreset("all"); resetPage(); }}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: datePreset === "all" ? "var(--accent)" : "var(--card)", color: datePreset === "all" ? "white" : "var(--muted-foreground)", border: `1px solid ${datePreset === "all" ? "var(--accent)" : "var(--border)"}` }}>
                Semua Tanggal
              </button>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold leading-none" style={{ color: "var(--muted-foreground)" }}>TANGGAL</span>
              <input type="date" value={datePreset === "custom" ? filterDate : ""}
                onChange={e => { setDatePreset("custom"); setFilterDate(e.target.value); resetPage(); }}
                className="text-xs rounded-xl px-2.5 py-2 outline-none"
                style={{ background: "var(--card)", border: `1px solid ${datePreset === "custom" ? "var(--accent)" : "var(--border)"}` }} />
            </label>
            <select value={filterStore} onChange={e => { setFilterStore(e.target.value); resetPage(); }}
              className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
            </select>
            {viewAll && (
              <select value={filterEmp} onChange={e => { setFilterEmp(e.target.value); resetPage(); }}
                className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <option value="all">Semua Karyawan</option>
                {empOptions.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 lg:overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Tidak ada catatan absensi</div>
        ) : (
          <div className="flex flex-col gap-2">
            {pageItems.map(r => {
              const st = statusRec(r);
              return (
                <button key={r.id} onClick={() => setSelected(r)}
                  className="w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all duration-150 hover:-translate-y-0.5"
                  style={{ background: selected?.id === r.id ? "rgba(124,58,237,0.05)" : "var(--card)", border: `1.5px solid ${selected?.id === r.id ? "var(--accent)" : "var(--border)"}` }}>
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
                  </div>
                  {r.photoOut && <img src={r.photoOut} alt="Foto pulang" className="w-8 h-8 rounded-lg object-cover shrink-0" title="Foto pulang" />}
                  {onDelete && (
                    <button onClick={e => { e.stopPropagation(); setDeleteTarget(r); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all hover:bg-red-50"
                      title="Hapus catatan">
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Pagination
        total={filtered.length}
        page={safePage}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        rowLabel="catatan"
      />
    </div>
  );
}
