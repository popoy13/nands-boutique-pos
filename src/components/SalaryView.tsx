import { useState } from "react";
import type { AttendanceRecord, Employee, SalaryConfig, SalaryRecord, Transaction } from "../data/types";
import { attendanceCountFor, salesTotalFor, computeSalary, upsertRecords, currentMonth } from "../data/salary";

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
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const storeNameOf = (stores: { id: string; name: string }[], id: string) =>
  stores.find(s => s.id === id)?.name.replace("NAND'S BOUTIQUE - ", "") ?? id;

export default function SalaryView({ employees, stores, attendance, transactions, salaryConfig, salaryRecords, onSaveConfig, onSaveRecords, canAdd = false, canEdit = false, canDelete = false }: Props) {
  const [month, setMonth] = useState(currentMonth());
  const [configDraft, setConfigDraft] = useState<Record<string, { baseSalary: number; salesTarget: number; bonus: number }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);

  const showToast = (msg: string, ok = true) => { setToastOk(ok); setToast(msg); setTimeout(() => setToast(""), 3200); };

  const monthRecords = salaryRecords.filter(r => r.month === month);
  const recByEmp = new Map(monthRecords.map(r => [r.employeeId, r]));
  const active = employees.filter(e => e.status === "active");

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

  const updateRecordField = (emp: Employee, field: "baseSalary" | "bonus", value: number) => {
    const prev = recByEmp.get(emp.id);
    if (!prev) { setDraft(emp.id, { [field]: value }); return; }
    const d = draftFor(emp);
    const rec = computeOne(emp, { ...d, [field]: value });
    onSaveRecords(salaryRecords.map(r => r.id === rec.id ? rec : r));
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

      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Gaji Karyawan</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Rumus: (Gaji Pokok ÷ 30) × jumlah absensi masuk · bonus bila omzet capai target</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="month" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }}
              className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            {mut && (
              <button onClick={hitungAll} className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                Hitung Ulang Semua
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap text-xs">
          <span className="px-3 py-1.5 rounded-xl font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            Total gaji: <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(totalGaji)}</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            Belum dibayar: <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#d97706" }}>{fmt(totalBelum)}</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl font-semibold" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {monthRecords.length} laporan
          </span>
        </div>
      </div>

      {/* SETELAN GAJI */}
      <div className="px-4 sm:px-6 py-4">
        <div className="w-full rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="p-5 pb-0">
            <div className="text-sm font-semibold mb-1">Setelan Gaji & Target Penjualan</div>
            <div className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
              Atur gaji pokok, target omzet bulanan, dan bonus jika omzet mencapai target. Gaji pokok dihitung dari absensi (bukan dari transaksi penjualan).
            </div>
          </div>
          <div className="px-5 pb-5 flex flex-col gap-2" style={{ borderTop: "1.5px solid var(--border)", paddingTop: 14 }}>
            {active.map(emp => {
              const d = draftFor(emp);
              return (
                <div key={emp.id} className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="text-sm font-semibold min-w-0">
                      {emp.name}
                      <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full align-middle" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{storeNameOf(stores, emp.storeId)}</span>
                    </div>
                    {canDelete && mut && (
                      <button onClick={() => removeConfig(emp)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "#fef2f2", color: "#ef4444" }}>
                        Hapus Setelan
                      </button>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { label: "Gaji Pokok / bulan", key: "baseSalary" as const, hint: "Dibagi 30 hari" },
                      { label: "Target Penjualan / bulan", key: "salesTarget" as const, hint: "Omzet minimum" },
                      { label: "Bonus bila capai target", key: "bonus" as const, hint: "Nominal bonus" },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
                        <input
                          type="number" min={0}
                          disabled={!mut}
                          value={d[f.key] === 0 ? "" : String(d[f.key])}
                          placeholder="0"
                          onChange={e => setDraft(emp.id, { [f.key]: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full px-3 py-2 rounded-xl text-xs outline-none disabled:opacity-60"
                          style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                        <div className="text-[9px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{f.hint}</div>
                      </div>
                    ))}
                  </div>
                  {mut && (
                    <button onClick={() => saveConfig(emp)} className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                      Simpan Setelan
                    </button>
                  )}
                </div>
              );
            })}
            {active.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada karyawan aktif</div>
            )}
          </div>
        </div>
      </div>

      {/* LAPORAN GAJI */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="w-full rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="p-5 pb-2 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm font-semibold">Laporan Gaji — {month}</div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Hasil perhitungan dari absensi masuk & pencapaian target.</div>
            </div>
          </div>
          <div className="px-5 pb-5 flex flex-col gap-2" style={{ borderTop: "1.5px solid var(--border)", paddingTop: 14 }}>
            {active.map(emp => {
              const rec = recByEmp.get(emp.id);
              if (!rec) {
                return (
                  <div key={emp.id} className="p-3 rounded-xl flex items-center justify-between gap-2 flex-wrap" style={{ background: "var(--background)" }}>
                    <div className="text-sm font-semibold">{emp.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Belum dihitung</span>
                      {mut && (
                        <button onClick={() => hitungOne(emp)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                          Hitung
                        </button>
                      )}
                    </div>
                  </div>
                );
              }
              const reached = rec.salesTarget > 0 && rec.salesTotal >= rec.salesTarget;
              return (
                <div key={rec.id} className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div className="text-sm font-semibold min-w-0">
                      {rec.employeeName}
                      <span className="ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full align-middle" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>{storeNameOf(stores, rec.storeId)}</span>
                      {rec.paid ? (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle" style={{ background: "#f0fdf4", color: "#16a34a" }}>DIBAYAR{rec.paidAt ? ` · ${rec.paidAt}` : ""}</span>
                      ) : (
                        <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full align-middle" style={{ background: "#fffbeb", color: "#d97706" }}>BELUM BAYAR</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {mut && (
                        <button onClick={() => togglePaid(emp)} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: rec.paid ? "#fffbeb" : "#f0fdf4", border: "1px solid var(--border)" }}>
                          {rec.paid ? "Batal Bayar" : "Tandai Dibayar"}
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setConfirmDelete(rec.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }} title="Hapus gaji">
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-1.5 sm:grid-cols-4 text-xs">
                    <div className="p-2 rounded-lg" style={{ background: "var(--card)" }}>
                      <div style={{ color: "var(--muted-foreground)" }}>Masuk (hari)</div>
                      <div className="font-mono font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{rec.attendanceCount}</div>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: "var(--card)" }}>
                      <div style={{ color: "var(--muted-foreground)" }}>Pokok ({fmtNum(rec.attendanceCount)} × {fmtNum(Math.round(rec.baseSalary / 30))})</div>
                      <div className="font-mono font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(rec.gross)}</div>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: "var(--card)" }}>
                      <div style={{ color: "var(--muted-foreground)" }}>Omzet / Target</div>
                      <div className={`font-mono font-bold ${reached ? "" : ""}`} style={{ fontFamily: "'JetBrains Mono', monospace", color: reached ? "#16a34a" : "var(--foreground)" }}>
                        {fmt(rec.salesTotal)} / {fmtNum(rec.salesTarget)}
                      </div>
                      <div className="text-[9px]" style={{ color: reached ? "#16a34a" : "var(--muted-foreground)" }}>{reached ? "TARGET TERCAPAI" : "belum capai"}</div>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: "var(--card)" }}>
                      <div style={{ color: "var(--muted-foreground)" }}>Bonus</div>
                      <div className="font-mono font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: rec.bonus > 0 ? "#16a34a" : "var(--foreground)" }}>{fmt(rec.bonus)}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 p-2 rounded-lg font-bold text-sm" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <span>Total Gaji</span>
                    <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(rec.total)}</span>
                  </div>
                </div>
              );
            })}
            {active.length === 0 && (
              <div className="text-center py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada karyawan aktif</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}