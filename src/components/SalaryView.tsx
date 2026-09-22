import { useState } from "react";
import type { AttendanceRecord, Employee, SalaryConfig, SalaryRecord, Transaction } from "../data/types";
import { attendanceCountFor, salesTotalFor, computeSalary, upsertRecords, currentMonth } from "../data/salary";
import Pagination from "./Pagination";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n);

interface Props {
  employees: Employee[];
  stores: { id: string; name: string }[];
  attendance: AttendanceRecord[];
  transactions: Transaction[];
  salaryConfig: SalaryConfig[];
  salaryRecords: SalaryRecord[];
  onSaveConfig: (config: SalaryConfig[]) => void;
  onSaveRecords: (records: SalaryRecord[]) => void;
  onSyncBaseSalary?: (employeeId: string, baseSalary: number) => void;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const storeNameOf = (stores: { id: string; name: string }[], id: string) =>
  stores.find(s => s.id === id)?.name.replace("NAND'S BOUTIQUE - ", "") ?? id;

export default function SalaryView({ employees, stores, attendance, transactions, salaryConfig, salaryRecords, onSaveConfig, onSaveRecords, onSyncBaseSalary, canAdd = false, canEdit = false, canDelete = false }: Props) {
  const [month, setMonth] = useState(currentMonth());
  const [configDraft, setConfigDraft] = useState<Record<string, { baseSalary: number; salesTarget: number; bonus: number }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const [cfgPage, setCfgPage] = useState(1);
  const [cfgPageSize, setCfgPageSize] = useState(5);
  const [repPage, setRepPage] = useState(1);
  const [repPageSize, setRepPageSize] = useState(5);

  const showToast = (msg: string, ok = true) => { setToastOk(ok); setToast(msg); setTimeout(() => setToast(""), 3200); };

  const monthRecords = salaryRecords.filter(r => r.month === month);
  const recByEmp = new Map(monthRecords.map(r => [r.employeeId, r]));
  const active = employees.filter(e => e.status === "active");

  const roster = (() => {
    const map = new Map<string, Employee>();
    for (const e of active) map.set(e.id, e);
    for (const r of monthRecords) {
      const emp = employees.find(e => e.id === r.employeeId);
      if (emp) map.set(emp.id, emp);
    }
    return [...map.values()];
  })();

  const draftFor = (emp: Employee) => {
    const existing = configDraft[emp.id];
    if (existing) return existing;
    const cfg = salaryConfig.find(c => c.employeeId === emp.id);
    const base = cfg ? cfg.baseSalary : emp.salary;
    return { baseSalary: base, salesTarget: cfg?.salesTarget ?? 0, bonus: cfg?.bonus ?? 0 };
  };
  const setDraft = (empId: string, patch: Partial<{ baseSalary: number; salesTarget: number; bonus: number }>) => {
    setConfigDraft(prev => ({ ...prev, [empId]: { ...(prev[empId] ?? draftFor(employees.find(e => e.id === empId)!)), ...patch } }));
  };

  const computeOne = (emp: Employee, draft?: { baseSalary: number; salesTarget: number; bonus: number }): SalaryRecord => {
    const d = draft ?? draftFor(emp);
    const store = stores.find(s => s.id === emp.storeId);
    const prev = recByEmp.get(emp.id) ?? null;
    const cfg: SalaryConfig = { employeeId: emp.id, baseSalary: d.baseSalary, salesTarget: d.salesTarget, bonus: d.bonus };
    return computeSalary(cfg, emp, store, month, attendanceCountFor(attendance, emp.id, month), salesTotalFor(transactions, emp.id, month), prev);
  };

  const hitungAll = () => {
    if (!active.length) { showToast("Tidak ada karyawan aktif", false); return; }
    const next = active.map(e => computeOne(e));
    onSaveRecords(upsertRecords(salaryRecords, next));
    showToast(`Laporan gaji ${month} dihitung untuk ${next.length} karyawan`);
  };

  const hitungOne = (emp: Employee) => {
    const rec = computeOne(emp);
    onSaveRecords(upsertRecords(salaryRecords, [rec]));
    showToast(`Gaji ${emp.name} ${month} dihitung`);
  };

  const saveConfig = (emp: Employee) => {
    const d = draftFor(emp);
    if (d.baseSalary <= 0 && d.salesTarget <= 0 && d.bonus <= 0) {
      showToast("Setelahkan minimal gaji pokok atau target", false);
      return;
    }
    const others = salaryConfig.filter(c => c.employeeId !== emp.id);
    onSaveConfig([...others, { employeeId: emp.id, baseSalary: Math.max(0, d.baseSalary), salesTarget: Math.max(0, d.salesTarget), bonus: Math.max(0, d.bonus) }]);
    if (onSyncBaseSalary) onSyncBaseSalary(emp.id, Math.max(0, d.baseSalary));
    const prev = recByEmp.get(emp.id);
    if (prev) {
      const rec = computeOne(emp, d);
      onSaveRecords(upsertRecords(salaryRecords, [rec]));
    }
    showToast("Setelan gaji disimpan");
  };

  const removeConfig = (emp: Employee) => {
    onSaveConfig(salaryConfig.filter(c => c.employeeId !== emp.id));
    showToast("Setelan gaji dihapus");
  };

  const togglePaid = (emp: Employee) => {
    const rec = recByEmp.get(emp.id);
    if (!rec) return;
    const next = { ...rec, paid: !rec.paid, paidAt: !rec.paid ? new Date().toISOString().slice(0, 10) : undefined };
    onSaveRecords(salaryRecords.map(r => r.id === rec.id ? next : r));
    showToast(next.paid ? "Gaji ditandai dibayar" : "Status gaji dikembalikan ke belum bayar");
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    onSaveRecords(salaryRecords.filter(r => r.id !== confirmDelete));
    setConfirmDelete(null);
    showToast("Gaji dihapus");
  };

  const totalGaji = monthRecords.reduce((s, r) => s + r.total, 0);
  const totalBelum = monthRecords.filter(r => !r.paid).reduce((s, r) => s + r.total, 0);
  const mut = canAdd || canEdit;

  const cfgTotal = active.length;
  const cfgCount = Math.max(1, Math.ceil(cfgTotal / cfgPageSize));
  const cfgSafe = Math.min(cfgPage, cfgCount);
  const cfgItems = active.slice((cfgSafe - 1) * cfgPageSize, cfgSafe * cfgPageSize);

  const repTotal = roster.length;
  const repCount = Math.max(1, Math.ceil(repTotal / repPageSize));
  const repSafe = Math.min(repPage, repCount);
  const repItems = roster.slice((repSafe - 1) * repPageSize, repSafe * repPageSize);

  const baseLabel = (v: number) => v === 0 ? "" : String(v);
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    fontSize: 12,
    outline: "none",
    background: "var(--card)",
    border: "1px solid var(--border)",
    fontFamily: "'JetBrains Mono', monospace",
  };
  const cell: React.CSSProperties = {
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "8px 10px",
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: toastOk ? "#16a34a" : "#ef4444" }}>
          {toast}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Gaji?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Laporan gaji bulan ini akan dihapus dari daftar.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={doDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-4 flex flex-col gap-4">
        {/* HEADER */}
        <div className="w-full rounded-2xl p-5" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16 }}>Gaji Karyawan</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Rumus: (Gaji Pokok ÷ 30) × hari masuk · bonus tetap bila omzet capai target</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="month" value={month} onChange={e => { if (e.target.value) { setMonth(e.target.value); setRepPage(1); } }}
                className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
              {mut && (
                <button onClick={hitungAll} className="px-3 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap" style={{ background: "var(--foreground)" }}>
                  Hitung Ulang Semua
                </button>
              )}
            </div>
          </div>
          <div className="grid gap-2 grid-cols-1 sm:grid-cols-3 text-xs">
            <div className="px-3 py-2.5 rounded-xl font-semibold" style={cell}>
              <div style={{ color: "var(--muted-foreground)", fontWeight: 500 }}>Total gaji {month}</div>
              <div className="font-mono mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)", fontWeight: 700 }}>{fmt(totalGaji)}</div>
            </div>
            <div className="px-3 py-2.5 rounded-xl font-semibold" style={cell}>
              <div style={{ color: "var(--muted-foreground)", fontWeight: 500 }}>Belum dibayar</div>
              <div className="font-mono mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#d97706", fontWeight: 700 }}>{fmt(totalBelum)}</div>
            </div>
            <div className="px-3 py-2.5 rounded-xl font-semibold" style={cell}>
              <div style={{ color: "var(--muted-foreground)", fontWeight: 500 }}>Laporan tersimpan</div>
              <div className="font-mono mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{monthRecords.length} bulan {month}</div>
            </div>
          </div>
        </div>

        {/* SETELAN GAJI */}
        <div className="w-full rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="p-5 pb-0">
            <div className="text-sm font-semibold mb-1">Setelan Gaji & Target Penjualan</div>
            <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
              Gaji pokok dibagi 30 hari lalu dikali hari masuk. Omzet penjualan hanya untuk menentukan bonus (bukan sumber gaji pokok).
            </div>
          </div>

          {active.length === 0 ? (
            <div className="px-5 pb-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada karyawan aktif</div>
          ) : (
            <>
              <div className="px-5 pb-1">
                <div className="hidden sm:grid sm:grid-cols-[2fr_1.1fr_1.1fr_0.9fr_auto] gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
                  <span>Karyawan</span>
                  <span>Gaji Pokok /bln</span>
                  <span>Target Penjualan</span>
                  <span>Bonus</span>
                  <span className="text-right">Aksi</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {cfgItems.map(emp => {
                    const d = draftFor(emp);
                    const cfgExists = salaryConfig.some(c => c.employeeId === emp.id);
                    return (
                      <div key={emp.id}>
                        <div className="hidden sm:grid sm:grid-cols-[2fr_1.1fr_1.1fr_0.9fr_auto] gap-2 items-center px-3 py-2 rounded-xl" style={{ background: "var(--background)" }}>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{emp.name}</div>
                            <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, emp.storeId)}</div>
                          </div>
                          <input type="number" min={0} disabled={!mut} placeholder="0" value={baseLabel(d.baseSalary)}
                            onChange={e => setDraft(emp.id, { baseSalary: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full outline-none disabled:opacity-60" style={inputStyle} aria-label={`Gaji pokok ${emp.name}`} />
                          <input type="number" min={0} disabled={!mut} placeholder="0" value={baseLabel(d.salesTarget)}
                            onChange={e => setDraft(emp.id, { salesTarget: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full outline-none disabled:opacity-60" style={inputStyle} aria-label={`Target penjualan ${emp.name}`} />
                          <input type="number" min={0} disabled={!mut} placeholder="0" value={baseLabel(d.bonus)}
                            onChange={e => setDraft(emp.id, { bonus: Math.max(0, Number(e.target.value) || 0) })}
                            className="w-full outline-none disabled:opacity-60" style={inputStyle} aria-label={`Bonus ${emp.name}`} />
                          <div className="flex items-center justify-end gap-1.5">
                            {mut && (
                              <button onClick={() => saveConfig(emp)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white whitespace-nowrap" style={{ background: "var(--foreground)" }}>
                                {cfgExists ? "Simpan" : "Tambah"}
                              </button>
                            )}
                            {canDelete && mut && (
                              <button onClick={() => removeConfig(emp)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }} title="Hapus setelan gaji">
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="sm:hidden p-3 rounded-xl flex flex-col gap-2" style={{ background: "var(--background)" }}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm font-semibold min-w-0">
                              {emp.name}
                              <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full align-middle" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{storeNameOf(stores, emp.storeId)}</span>
                            </div>
                            {canDelete && mut && (
                              <button onClick={() => removeConfig(emp)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#fef2f2", color: "#ef4444" }}>Hapus Setelan</button>
                            )}
                          </div>
                          {[
                            { label: "Gaji Pokok /bln (÷30)", key: "baseSalary" as const },
                            { label: "Target Penjualan /bln", key: "salesTarget" as const },
                            { label: "Bonus bila capai", key: "bonus" as const },
                          ].map(f => (
                            <div key={f.key}>
                              <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
                              <input type="number" min={0} disabled={!mut} placeholder="0" value={baseLabel(d[f.key])}
                                onChange={e => setDraft(emp.id, { [f.key]: Math.max(0, Number(e.target.value) || 0) })}
                                className="w-full outline-none disabled:opacity-60" style={inputStyle} />
                            </div>
                          ))}
                          {mut && (
                            <button onClick={() => saveConfig(emp)} className="px-4 py-2 rounded-xl text-xs font-bold text-white self-start" style={{ background: "var(--foreground)" }}>
                              {salaryConfig.some(c => c.employeeId === emp.id) ? "Simpan Setelan" : "Tambah Setelan"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Pagination total={cfgTotal} page={cfgSafe} pageSize={cfgPageSize} onPageChange={setCfgPage} onPageSizeChange={s => { setCfgPageSize(s); setCfgPage(1); }} pageSizeOptions={[5, 10, 20]} rowLabel="karyawan" />
            </>
          )}
        </div>

        {/* LAPORAN GAJI */}
        <div className="w-full rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="p-5 pb-2">
            <div>
              <div className="text-sm font-semibold">Laporan Gaji — {month}</div>
              <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Hasil dari absensi masuk & pencapaian target penjualan.</div>
            </div>
          </div>

          {roster.length === 0 ? (
            <div className="px-5 pb-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada laporan. Tekan "Hitung Ulang Semua" untuk membuat.</div>
          ) : (
            <>
              <div className="px-5 pb-1">
                <div className="hidden sm:grid sm:grid-cols-[2fr_0.6fr_1.1fr_1.3fr_0.9fr_1fr_1fr_auto] gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
                  <span>Karyawan</span>
                  <span>Masuk</span>
                  <span>Gaji Pokok</span>
                  <span>Omzet / Target</span>
                  <span>Bonus</span>
                  <span>Total</span>
                  <span>Status</span>
                  <span className="text-right">Aksi</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {repItems.map(emp => {
                    const rec = recByEmp.get(emp.id);
                    if (!rec) {
                      return (
                        <div key={emp.id} className="p-3 rounded-xl flex items-center justify-between gap-2 flex-wrap" style={{ background: "var(--background)" }}>
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-xs font-semibold truncate">{emp.name}</span>
                            <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, emp.storeId)}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Belum dihitung</span>
                            {mut && (
                              <button onClick={() => hitungOne(emp)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>Hitung</button>
                            )}
                          </div>
                        </div>
                      );
                    }
                    const reached = rec.salesTarget > 0 && rec.salesTotal >= rec.salesTarget;
                    const statusPill = rec.paid
                      ? { bg: "#f0fdf4", color: "#16a34a", text: "DIBAYAR" + (rec.paidAt ? ` · ${rec.paidAt}` : "") }
                      : { bg: "#fffbeb", color: "#d97706", text: "BELUM BAYAR" };
                    return (
                      <div key={rec.id}>
                        <div className="hidden sm:grid sm:grid-cols-[2fr_0.6fr_1.1fr_1.3fr_0.9fr_1fr_1fr_auto] gap-2 items-center px-3 py-2 rounded-xl" style={{ background: "var(--background)" }}>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{rec.employeeName}</div>
                            <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, rec.storeId)}</div>
                          </div>
                          <div className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.attendanceCount}</div>
                          <div className="font-mono text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(rec.gross)}</div>
                          <div className="font-mono text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: reached ? "#16a34a" : "var(--foreground)" }}>
                            {fmt(rec.salesTotal)} / {fmtNum(rec.salesTarget)}
                            <div className="text-[9px] font-semibold" style={{ color: reached ? "#16a34a" : "var(--muted-foreground)" }}>{reached ? "TARGET TERCAPAI" : "belum capai"}</div>
                          </div>
                          <div className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: rec.bonus > 0 ? "#16a34a" : "var(--foreground)" }}>{fmt(rec.bonus)}</div>
                          <div className="font-mono text-sm font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(rec.total)}</div>
                          <div><span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: statusPill.bg, color: statusPill.color }}>{statusPill.text}</span></div>
                          <div className="flex items-center justify-end gap-1.5">
                            {mut && (
                              <button onClick={() => togglePaid(emp)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap" style={{ background: rec.paid ? "#fffbeb" : "#f0fdf4", border: "1px solid var(--border)" }}>
                                {rec.paid ? "Batal Bayar" : "Tandai Dibayar"}
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => setConfirmDelete(rec.id)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }} title="Hapus gaji">
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="sm:hidden p-3 rounded-xl flex flex-col gap-2" style={{ background: "var(--background)" }}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm font-semibold min-w-0">
                              {rec.employeeName}
                              <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full align-middle" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{storeNameOf(stores, rec.storeId)}</span>
                              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle" style={{ background: statusPill.bg, color: statusPill.color }}>{statusPill.text}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {mut && (
                                <button onClick={() => togglePaid(emp)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: rec.paid ? "#fffbeb" : "#f0fdf4", border: "1px solid var(--border)" }}>
                                  {rec.paid ? "Batal Bayar" : "Tandai Dibayar"}
                                </button>
                              )}
                              {canDelete && (
                                <button onClick={() => setConfirmDelete(rec.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }} title="Hapus gaji">
                                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="grid gap-1.5 grid-cols-2 text-xs">
                            <div className="p-2 rounded-lg" style={cell}>
                              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Masuk</div>
                              <div className="font-mono font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.attendanceCount} hari</div>
                            </div>
                            <div className="p-2 rounded-lg" style={cell}>
                              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Gaji Pokok</div>
                              <div className="font-mono font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(rec.gross)}</div>
                            </div>
                            <div className="p-2 rounded-lg" style={cell}>
                              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Omzet / Target</div>
                              <div className={`font-mono font-bold mt-0.5`} style={{ fontFamily: "'JetBrains Mono', monospace", color: reached ? "#16a34a" : "var(--foreground)" }}>{fmt(rec.salesTotal)} / {fmtNum(rec.salesTarget)}</div>
                              <div className="text-[9px] font-semibold mt-0.5" style={{ color: reached ? "#16a34a" : "var(--muted-foreground)" }}>{reached ? "TARGET TERCAPAI" : "belum capai"}</div>
                            </div>
                            <div className="p-2 rounded-lg" style={cell}>
                              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Bonus</div>
                              <div className="font-mono font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: rec.bonus > 0 ? "#16a34a" : "var(--foreground)" }}>{fmt(rec.bonus)}</div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-lg font-bold text-sm" style={{ ...cell, borderWidth: 1.5 }}>
                            <span>Total Gaji</span>
                            <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(rec.total)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Pagination total={repTotal} page={repSafe} pageSize={repPageSize} onPageChange={setRepPage} onPageSizeChange={s => { setRepPageSize(s); setRepPage(1); }} pageSizeOptions={[5, 10, 20]} rowLabel="karyawan" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}