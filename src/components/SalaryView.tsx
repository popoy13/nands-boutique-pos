import { useState } from "react";
import type { AttendanceRecord, Employee, SalaryConfig, SalaryRecord, Transaction, Kasbon } from "../data/types";
import type { AppSettings } from "../data/settings";
import { attendanceCountFor, salesTotalFor, computeSalary, upsertRecords, currentMonth } from "../data/salary";
import { assetUrl } from "../lib/assets";
import Pagination from "./Pagination";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

interface Props {
  employees: Employee[];
  stores: { id: string; name: string }[];
  attendance: AttendanceRecord[];
  transactions: Transaction[];
  salaryConfig: SalaryConfig[];
  salaryRecords: SalaryRecord[];
  kasbon: Kasbon[];
  onSaveConfig: (config: SalaryConfig[]) => void;
  onSaveRecords: (records: SalaryRecord[]) => void;
  onSaveKasbon: (kasbon: Kasbon[]) => void;
  onSyncBaseSalary?: (employeeId: string, baseSalary: number) => void;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  settings?: AppSettings;
}

const storeNameOf = (stores: { id: string; name: string }[], id: string) =>
  stores.find(s => s.id === id)?.name.replace("NAND'S BOUTIQUE - ", "") ?? id;

const esc = (s: string) => s.replace(/[<>&"]/g, c => (c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : "&quot;"));

export default function SalaryView({ employees, stores, attendance, transactions, salaryConfig, salaryRecords, kasbon, onSaveConfig, onSaveRecords, onSaveKasbon, onSyncBaseSalary, canAdd = false, canEdit = false, canDelete = false, settings }: Props) {
  const [month, setMonth] = useState(currentMonth());
  const [configDraft, setConfigDraft] = useState<Record<string, { baseSalary: number; salesTarget: number; bonus: number }>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const [cfgPage, setCfgPage] = useState(1);
  const [cfgPageSize, setCfgPageSize] = useState(5);
  const [pickOpen, setPickOpen] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [laporEmp, setLaporEmp] = useState<Employee | null>(null);
  const [slipRec, setSlipRec] = useState<SalaryRecord | null>(null);
  const [kasbonEmp, setKasbonEmp] = useState<Employee | null>(null);
  const [kasbonAmount, setKasbonAmount] = useState("");
  const [kasbonDate, setKasbonDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [kasbonNote, setKasbonNote] = useState("");
  const [confirmKasbonId, setConfirmKasbonId] = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => { setToastOk(ok); setToast(msg); setTimeout(() => setToast(""), 3200); };

  type SlipToggle = "showName" | "showPosition" | "showDate" | "showLocation" | "showAttendance" | "showSales" | "showTarget" | "showBonus" | "showAcknowledge";
  const slipShow = (k: SlipToggle) => settings?.salarySlip?.[k] !== false;

  const monthRecords = salaryRecords.filter(r => r.month === month);
  const recByEmp = new Map(monthRecords.map(r => [r.employeeId, r]));
  const active = employees.filter(e => e.status === "active");

  const outstandingFor = (empId: string) =>
    kasbon.filter(k => k.employeeId === empId && !k.settled).reduce((s, k) => s + (k.amount || 0), 0);
  const totalKasbonOutstanding = kasbon.filter(k => !k.settled).reduce((s, k) => s + (k.amount || 0), 0);

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
      return false;
    }
    const others = salaryConfig.filter(c => c.employeeId !== emp.id);
    onSaveConfig([...others, { employeeId: emp.id, baseSalary: Math.max(0, d.baseSalary), salesTarget: Math.max(0, d.salesTarget), bonus: Math.max(0, d.bonus) }]);
    if (onSyncBaseSalary) onSyncBaseSalary(emp.id, Math.max(0, d.baseSalary));
    const prev = recByEmp.get(emp.id);
    if (prev) {
      const rec = computeOne(emp, d);
      onSaveRecords(upsertRecords(salaryRecords, [rec]));
    }
    return true;
  };

  const saveConfigModal = (emp: Employee) => {
    if (!saveConfig(emp)) return;
    setEditEmp(null);
    if (salaryConfig.some(c => c.employeeId === emp.id)) showToast("Setelan gaji disimpan");
    else showToast("Setelan gaji ditambahkan");
  };

  const removeConfig = (emp: Employee) => {
    onSaveConfig(salaryConfig.filter(c => c.employeeId !== emp.id));
    showToast("Setelan gaji dihapus");
  };

  const togglePaid = (emp: Employee) => {
    const rec = recByEmp.get(emp.id);
    if (!rec) return;
    const paying = !rec.paid;
    const today = new Date().toISOString().slice(0, 10);
    const next = { ...rec, paid: paying, paidAt: paying ? today : undefined };
    onSaveRecords(salaryRecords.map(r => r.id === rec.id ? next : r));
    if (paying) {
      onSaveKasbon(kasbon.map(k => k.employeeId === emp.id && !k.settled ? { ...k, settled: true, settledAt: today, settlementMonth: month } : k));
    } else {
      onSaveKasbon(kasbon.map(k => k.settlementMonth === month ? { ...k, settled: false, settledAt: undefined, settlementMonth: undefined } : k));
    }
    showToast(paying ? "Gaji ditandai dibayar · kasbon lunas" : "Status gaji dikembalikan ke belum bayar");
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    onSaveRecords(salaryRecords.filter(r => r.id !== confirmDelete));
    setConfirmDelete(null);
    showToast("Gaji dihapus");
  };

  const addKasbon = (emp: Employee) => {
    const amount = Math.round(Number(kasbonAmount));
    if (!amount || amount <= 0) { showToast("Isi nominal kasbon", false); return; }
    const entry: Kasbon = {
      id: `KB-${emp.id}-${Date.now()}`,
      employeeId: emp.id,
      date: kasbonDate || new Date().toISOString().slice(0, 10),
      amount,
      note: kasbonNote.trim() || undefined,
      settled: false,
    };
    onSaveKasbon([...kasbon, entry]);
    setKasbonAmount("");
    setKasbonNote("");
    setKasbonDate(new Date().toISOString().slice(0, 10));
    showToast(`Kasbon ${emp.name} sebesar ${fmt(entry.amount)} dicatat`);
  };

  const deleteKasbon = (id: string) => {
    const k = kasbon.find(x => x.id === id);
    onSaveKasbon(kasbon.filter(x => x.id !== id));
    setConfirmKasbonId(null);
    showToast(k ? `Kasbon ${fmt(k.amount)} dihapus` : "Catatan kasbon dihapus");
  };

  const openLapor = (emp: Employee) => {
    setLaporEmp(emp);
    if (!recByEmp.get(emp.id)) {
      onSaveRecords(upsertRecords(salaryRecords, [computeOne(emp)]));
      showToast("Gaji dihitung otomatis");
    }
  };

  const printSlip = (rec: SalaryRecord) => {
    const w = window.open("", "_blank", "width=820,height=760");
    if (!w) { showToast("Izinkan pop-up untuk mencetak slip", false); return; }
    const brand = settings?.brand;
    const company = brand?.name || "NAND'S BOUTIQUE";
    const tagline = brand?.tagline || "";
    const logo = assetUrl(brand?.logo || "");
    const logoSrc = logo && !/^[a-z][a-z0-9+.-]*:/i.test(logo) ? new URL(logo, window.location.href).href : logo;
    const storeClean = storeNameOf(stores, rec.storeId);
    const roleKey = employees.find(e => e.id === rec.employeeId)?.role;
    const roleLabel = (roleKey && settings?.roles?.[roleKey]?.label) || roleKey || "—";
    const [yy, mm] = rec.month.split("-");
    const monthName = `${MONTHS_ID[Number(mm) - 1] || mm} ${yy}`;
    const today = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
    const R = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
    const N = (n: number) => new Intl.NumberFormat("id-ID").format(n);
    const daily = Math.round(rec.baseSalary / 30);
    const reached = rec.salesTarget > 0 && rec.salesTotal >= rec.salesTarget;
    const potongan = outstandingFor(rec.employeeId);
    const net = Math.max(0, rec.total - potongan);
    const metaRows: [string, string][] = [];
    if (slipShow("showName")) metaRows.push(["Nama Karyawan", rec.employeeName]);
    if (slipShow("showPosition")) metaRows.push(["Jabatan", roleLabel]);
    if (slipShow("showLocation")) metaRows.push(["Lokasi Kerja", storeClean]);
    if (slipShow("showDate")) metaRows.push(["Periode", monthName]);
    if (slipShow("showDate")) metaRows.push(["Tanggal Cetak", today]);
    const detRows: string[] = [];
    detRows.push(`<tr><td>Gaji Pokok</td><td class="num">${N(rec.baseSalary)} ÷ 30 hari</td><td class="num">${R(rec.baseSalary)}</td></tr>`);
    if (slipShow("showAttendance")) detRows.push(`<tr><td>Hari Masuk</td><td class="num">${rec.attendanceCount} hari</td><td class="num"></td></tr>`);
    detRows.push(`<tr><td>Gaji Pokok Diterima</td><td class="num">${N(rec.attendanceCount)} × ${N(daily)}</td><td class="num">${R(rec.gross)}</td></tr>`);
    if (slipShow("showSales")) detRows.push(`<tr><td>Omzet Penjualan</td><td class="num"></td><td class="num">${R(rec.salesTotal)}</td></tr>`);
    if (slipShow("showTarget")) detRows.push(`<tr><td>Target Penjualan</td><td class="num"></td><td class="num">${N(rec.salesTarget)}</td></tr>`);
    if (slipShow("showBonus")) detRows.push(`<tr><td>Bonus Capai Target</td><td class="num">${reached ? "Tercapai" : "Belum tercapai"}</td><td class="num">${R(rec.bonus)}</td></tr>`);
    detRows.push(`<tr class="grand"><td colspan="2">TOTAL GAJI</td><td class="num">${R(rec.total)}</td></tr>`);
    detRows.push(`<tr><td>Potongan Kasbon</td><td class="num">${potongan ? "Belum lunas" : "Tidak ada"}</td><td class="num">${potongan ? "− " + R(potongan) : "0"}</td></tr>`);
    detRows.push(`<tr class="grand"><td colspan="2">TOTAL DITERIMA</td><td class="num">${R(net)}</td></tr>`);
    detRows.push(`<tr><td>Status Pembayaran</td><td class="num">${rec.paid ? "Dibayar" + (rec.paidAt ? " " + esc(rec.paidAt) : "") : "Belum dibayar"}</td><td class="num"></td></tr>`);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Slip Gaji ${esc(rec.employeeName)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#e5e7eb}
  .page{width:190mm;min-height:150mm;margin:10mm auto;background:#fff;padding:14mm;box-shadow:0 2px 14px rgba(0,0,0,.15)}
  .head{display:flex;align-items:center;gap:5mm;border-bottom:2px solid #111;padding-bottom:4mm}
  .head img{height:18mm;max-width:60mm;object-fit:contain}
  .logo-ph{width:18mm;height:18mm;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:9pt}
  .brand{flex:1}
  .brand h1{font-size:17pt;letter-spacing:.5px;line-height:1.1}
  .brand div{font-size:9pt;color:#555;margin-top:1mm}
  .title{font-size:14pt;font-weight:700;text-align:center;border-bottom:1.5px solid #111;padding:3mm 0;margin-top:5mm;letter-spacing:1px}
  table.meta{width:100%;margin-top:5mm;font-size:10pt;border-collapse:collapse}
  table.meta td{padding:1.2mm 0}
  .sec{font-weight:700;margin:6mm 0 2mm;font-size:10.5pt}
  table.det{width:100%;border-collapse:collapse;font-size:10pt}
  table.det th,table.det td{border:1px solid #222;padding:2mm;text-align:left}
  table.det th{background:#f1f1f1}
  .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
  .grand td{font-weight:700;background:#f7f7f7;font-size:11pt}
  .sign{display:flex;justify-content:space-between;margin-top:20mm}
  .sign div{width:38%;text-align:center;font-size:10pt;font-weight:600}
  .sign .lin{margin-top:16mm;border-top:1px solid #111;padding-top:1.5mm}
  .foot{font-size:8pt;color:#777;text-align:center;margin-top:10mm;border-top:1px dashed #aaa;padding-top:2mm}
  @page{size:A4;margin:0}
  @media print{body{background:#fff}.page{margin:0;box-shadow:none}}
</style></head><body>
  <div class="page">
    <div class="head">
      ${logoSrc ? `<img src="${esc(logoSrc)}" alt="Logo"/>` : `<div class="logo-ph">${esc(company.charAt(0))}</div>`}
      <div class="brand"><h1>${esc(company)}</h1><div>${esc(tagline)}${tagline && storeClean ? " • " : ""}${storeClean ? "Cabang " + esc(storeClean) : ""}</div></div>
      <div><span style="font-size:9pt;padding:1mm 3mm;border:1.5px solid #111;font-weight:700">${rec.paid ? "LUNAS" : "BELUM DIBAYAR"}</span></div>
    </div>
    <div class="title">SLIP GAJI KARYAWAN</div>
    <table class="meta">
      ${metaRows.length ? metaRows.map(([k, v]) => `<tr><td width="26%"><b>${esc(k)}</b></td><td width="26%">${esc(v)}</td><td width="24%"></td><td></td></tr>`).join("") : ""}
    </table>
    <div class="sec">Rincian Gaji</div>
    <table class="det">
      <tr><th>Uraian</th><th style="width:24%">Perhitungan</th><th style="width:22%">Jumlah</th></tr>
      ${detRows.join("")}
    </table>
    ${slipShow("showAcknowledge") ? `<div class="sign">
      <div><div>Diterima oleh,</div><div class="lin">${esc(rec.employeeName)}</div></div>
      <div><div>Mengetahui,</div><div class="lin">DIREKTUR UTAMA</div></div>
    </div>` : ""}
    <div class="foot">Dicetak otomatis dari ${esc(company)} Point of Sale</div>
  </div>
</body></html>`;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  const totalGaji = monthRecords.reduce((s, r) => s + r.total, 0);
  const totalBelum = monthRecords.filter(r => !r.paid).reduce((s, r) => s + r.total, 0);
  const mut = canAdd || canEdit;

  const cfgTotal = active.length;
  const cfgCount = Math.max(1, Math.ceil(cfgTotal / cfgPageSize));
  const cfgSafe = Math.min(cfgPage, cfgCount);
  const cfgItems = active.slice((cfgSafe - 1) * cfgPageSize, cfgSafe * cfgPageSize);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    borderRadius: 10,
    fontSize: 12,
    outline: "none",
    background: "var(--background)",
    border: "1px solid var(--border)",
    fontFamily: "'JetBrains Mono', monospace",
  };
  const cell: React.CSSProperties = {
    background: "var(--background)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "8px 10px",
  };

  const editDraft = editEmp ? draftFor(editEmp) : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: toastOk ? "#16a34a" : "#ef4444" }}>
          {toast}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
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

      {/* OVERLAY: PILIH KARYAWAN — edit / laporan */}
      {editEmp && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-1">Setelan Gaji — {editEmp.name}</div>
            <div className="text-[11px] mb-4" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, editEmp.storeId)} · Gaji pokok dibagi 30 hari × hari masuk</div>
            {editDraft && [
              { label: "Gaji Pokok / bulan", key: "baseSalary" as const },
              { label: "Target Penjualan / bulan", key: "salesTarget" as const },
              { label: "Bonus bila capai target", key: "bonus" as const },
            ].map(f => (
              <div key={f.key} className="mb-3">
                <label className="block text-[10px] font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
                <input type="number" min={0} placeholder="0" value={editDraft[f.key] === 0 ? "" : String(editDraft[f.key])}
                  onChange={e => setDraft(editEmp.id, { [f.key]: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-full outline-none" style={inputStyle} />
              </div>
            ))}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditEmp(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Batal</button>
              <button onClick={() => saveConfigModal(editEmp)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "var(--foreground)" }}>
                {salaryConfig.some(c => c.employeeId === editEmp.id) ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: SLIP GAJI */}
      {slipRec && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="rounded-2xl my-auto max-w-[90vw] w-[420px]" style={{ background: "var(--card)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="text-sm">Slip Gaji — {slipRec.employeeName}</div>
              <button onClick={() => setSlipRec(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="rounded-xl" style={{ background: "#fff", color: "#111", fontFamily: "'Courier New', monospace", fontSize: 11, border: "1px solid #d1d5db" }}>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {assetUrl(settings?.brand?.logo || "") ? (
                        <img src={assetUrl(settings?.brand?.logo || "")} alt="logo" className="h-8 w-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold">{String(settings?.brand?.name || "N").charAt(0)}</div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>{settings?.brand?.name || "NAND'S BOUTIQUE"}</div>
                        <div className="text-[9px] truncate">{storeNameOf(stores, slipRec.storeId)}</div>
                      </div>
                    </div>
                    <div className="text-[9px] px-1.5 py-0.5 border-2 border-black font-bold shrink-0">{slipRec.paid ? "LUNAS" : "BELUM DIBAYAR"}</div>
                  </div>
                  <div className="text-center font-bold mb-2 text-[12px] tracking-widest">SLIP GAJI KARYAWAN</div>
                  {[
                    ...(slipShow("showName") ? [["Nama Karyawan", slipRec.employeeName]] : []),
                    ...(slipShow("showPosition") ? [["Jabatan", (() => { const rk = employees.find(e => e.id === slipRec.employeeId)?.role; return (rk && settings?.roles?.[rk]?.label) || rk || "—"; })()]] : []),
                    ...(slipShow("showLocation") ? [["Lokasi Kerja", storeNameOf(stores, slipRec.storeId)]] : []),
                    ...(slipShow("showDate") ? [["Periode", `${month.split("-")[1]}/${month.split("-")[0]}`], ["Tanggal", new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5"><span>{k}</span><span>{v}</span></div>
                  ))}
                  <div className="my-2 border-t border-dashed border-black" />
                  {[
                    ["Gaji Pokok", fmt(slipRec.baseSalary)],
                    ...(slipShow("showAttendance") ? [["Hari Masuk", `${slipRec.attendanceCount} hari`]] : []),
                    ["Gaji Pokok Diterima", fmt(slipRec.gross)],
                    ...(slipShow("showSales") ? [["Omzet Penjualan", fmt(slipRec.salesTotal)]] : []),
                    ...(slipShow("showTarget") ? [["Target Penjualan", fmtNum(slipRec.salesTarget)]] : []),
                    ...(slipShow("showBonus") ? [["Bonus", fmt(slipRec.bonus)]] : []),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5"><span>{k}</span><span>{v}</span></div>
                  ))}
                  <div className="my-2 border-t border-dashed border-black" />
                  <div className="flex justify-between font-bold text-sm"><span>Total Gaji</span><span>{fmt(slipRec.total)}</span></div>
                  {outstandingFor(slipRec.employeeId) > 0 && (
                    <div className="flex justify-between py-0.5" style={{ color: "#dc2626" }}><span>Potongan Kasbon</span><span>- {fmt(outstandingFor(slipRec.employeeId))}</span></div>
                  )}
                  <div className="flex justify-between font-bold text-sm" style={{ borderTop: "1px solid #000", paddingTop: 4 }}>
                    <span>Total Diterima</span><span>{fmt(Math.max(0, slipRec.total - outstandingFor(slipRec.employeeId)))}</span>
                  </div>
                  {slipShow("showAcknowledge") && (
                    <div className="flex justify-between gap-4 mt-7">
                      <div className="text-center text-[9px] w-[45%]"><div>Yang Menerima,</div><div className="mt-7 border-t border-black pt-0.5 truncate">( {slipRec.employeeName} )</div></div>
                      <div className="text-center text-[9px] w-[45%]"><div>Mengetahui,</div><div className="mt-7 border-t border-black pt-0.5">DIREKTUR UTAMA</div></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setSlipRec(null)} className="flex-1 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tutup</button>
                <button onClick={() => printSlip(slipRec)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2" style={{ background: "var(--foreground)" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" /></svg>
                  Cetak Slip
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY: LAPORAN GAJI PER KARYAWAN */}
      {laporEmp && (() => {
        const rec = recByEmp.get(laporEmp.id) ?? null;
        const reached = rec ? rec.salesTarget > 0 && rec.salesTotal >= rec.salesTarget : false;
        const statusPill = rec
          ? rec.paid
            ? { bg: "#f0fdf4", color: "#16a34a", text: "DIBAYAR" + (rec.paidAt ? ` · ${rec.paidAt}` : "") }
            : { bg: "#fffbeb", color: "#d97706", text: "BELUM BAYAR" }
          : null;
        return (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="rounded-2xl my-auto w-[420px] max-w-[90vw]" style={{ background: "var(--card)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="text-sm">Laporan Gaji — {laporEmp.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, laporEmp.storeId)} · {month}</div>
                </div>
                <button onClick={() => setLaporEmp(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5">
                {!rec ? (
                  <div className="text-center py-6">
                    <div className="text-sm mb-1">Belum ada laporan gaji untuk {month}</div>
                    <div className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Absensi & omzet karyawan akan dihitung otomatis saat tombol diklik.</div>
                    <button onClick={() => hitungOne(laporEmp)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: "var(--accent)" }}>Hitung Sekarang</button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: statusPill!.bg, color: statusPill!.color }}>{statusPill!.text}</span>
                    </div>
                    <div className="grid gap-1.5">
                      {[
                        ["Hari Masuk", `${rec.attendanceCount} hari`],
                        ["Gaji Pokok Diterima", fmt(rec.gross)],
                        ["Omzet Penjualan", fmt(rec.salesTotal)],
                        ["Target Penjualan", fmtNum(rec.salesTarget)],
                        ["Bonus Capai Target", reached ? fmt(rec.bonus) : "—"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center px-3 py-2 rounded-lg" style={cell}>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{k}</span>
                          <span className="font-mono text-xs font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
                        </div>
                      ))}
                      {outstandingFor(laporEmp.id) > 0 && (
                        <div className="flex justify-between items-center px-3 py-2 rounded-lg" style={cell}>
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Potongan Kasbon</span>
                          <span className="font-mono text-xs font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#dc2626" }}>- {fmt(outstandingFor(laporEmp.id))}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center px-3 py-2.5 rounded-lg font-bold" style={{ ...cell, borderWidth: 1.5 }}>
                        <span className="text-xs">Total Diterima</span>
                        <span className="font-mono text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(Math.max(0, rec.total - outstandingFor(laporEmp.id)))}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-4">
                      <div className="flex gap-2">
                        {mut && (
                          <button onClick={() => togglePaid(laporEmp)} className="flex-1 py-2.5 rounded-xl text-xs font-bold" style={{ background: rec.paid ? "#fffbeb" : "#f0fdf4", border: "1px solid var(--border)", color: rec.paid ? "#d97706" : "#16a34a" }}>
                            {rec.paid ? "Batal Bayar" : "Tandai Dibayar"}
                          </button>
                        )}
                        <button onClick={() => setSlipRec(rec)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2" style={{ background: "var(--foreground)" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H7v4a2 2 0 002 2z" /></svg>
                          Cetak Slip
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setLaporEmp(null)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tutup</button>
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(rec.id)} className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5" style={{ background: "#fef2f2", color: "#ef4444" }}>
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Hapus Gaji
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* OVERLAY: KASBON PER KARYAWAN */}
      {kasbonEmp && (() => {
        const list = kasbon.filter(k => k.employeeId === kasbonEmp.id).sort((a, b) => b.date.localeCompare(a.date));
        const outstanding = list.filter(k => !k.settled).reduce((s, k) => s + (k.amount || 0), 0);
        const totalTaken = list.reduce((s, k) => s + (k.amount || 0), 0);
        return (
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="rounded-2xl my-auto w-[440px] max-w-[92vw]" style={{ background: "var(--card)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="text-sm">Kasbon — {kasbonEmp.name}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, kasbonEmp.storeId)} · Potongan otomatis dari slip gaji saat dibayar</div>
                </div>
                <button onClick={() => { setKasbonEmp(null); setConfirmKasbonId(null); }} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="px-3 py-3 rounded-xl" style={cell}>
                    <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Sisa belum lunas</div>
                    <div className="font-mono text-sm font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: outstanding > 0 ? "#d97706" : "#16a34a" }}>{fmt(outstanding)}</div>
                  </div>
                  <div className="px-3 py-3 rounded-xl" style={cell}>
                    <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Total kasbon dicatat</div>
                    <div className="font-mono text-sm font-bold mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalTaken)}</div>
                  </div>
                </div>

                {mut && (
                  <div className="rounded-xl p-3 mb-4" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Catat Kasbon Baru</div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <div className="text-[10px] mb-1" style={{ color: "var(--muted-foreground)" }}>Nominal (Rp)</div>
                        <input inputMode="numeric" placeholder="0" value={kasbonAmount}
                          onChange={e => setKasbonAmount(e.target.value.replace(/[^\d]/g, ""))}
                          className="px-2.5 py-2 rounded-lg text-xs w-full outline-none"
                          style={inputStyle} />
                      </div>
                      <div>
                        <div className="text-[10px] mb-1" style={{ color: "var(--muted-foreground)" }}>Tanggal</div>
                        <input type="date" value={kasbonDate} onChange={e => setKasbonDate(e.target.value)} className="px-2.5 py-2 rounded-lg text-xs w-full outline-none" style={inputStyle} />
                      </div>
                    </div>
                    <div className="text-[10px] mb-1" style={{ color: "var(--muted-foreground)" }}>Catatan (opsional)</div>
                    <input placeholder="Mis. Kasbon keperluan keluarga" value={kasbonNote} onChange={e => setKasbonNote(e.target.value)} className="px-2.5 py-2 rounded-lg text-xs w-full outline-none mb-2" style={inputStyle} />
                    <button onClick={() => addKasbon(kasbonEmp)} className="w-full py-2.5 rounded-xl text-xs font-bold text-white" style={{ background: "var(--foreground)" }}>
                      + Catat Kasbon
                    </button>
                  </div>
                )}

                <div className="text-xs font-semibold mb-2">Riwayat Kasbon</div>
                {list.length === 0 ? (
                  <div className="text-center text-xs py-6" style={{ color: "var(--muted-foreground)" }}>Belum ada kasbon untuk karyawan ini.</div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {list.map(k => (
                      <div key={k.id} className="px-3 py-2.5 rounded-xl flex items-center justify-between gap-2" style={{ background: "var(--background)" }}>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(k.amount)}</span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={k.settled ? { background: "#f0fdf4", color: "#16a34a" } : { background: "#fffbeb", color: "#d97706" }}>
                              {k.settled ? "LUNAS" : "BELUM"}
                            </span>
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                            {k.date}{k.note ? ` · ${k.note}` : ""}{k.settled && k.settledAt ? ` · Lunas ${k.settledAt}` : ""}
                          </div>
                        </div>
                        {canDelete && (
                          confirmKasbonId === k.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => deleteKasbon(k.id)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ background: "#ef4444" }}>Ya, hapus</button>
                              <button onClick={() => setConfirmKasbonId(null)} className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>Ga jadi</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmKasbonId(k.id)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }} title="Hapus kasbon">
                              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6 py-4 flex flex-col gap-4">
        {/* HEADER */}
        <div className="w-full rounded-2xl p-5" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="relative flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16 }}>Gaji Karyawan</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Rumus: (Gaji Pokok ÷ 30) × hari masuk · bonus tetap bila omzet capai target</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input type="month" value={month} onChange={e => { if (e.target.value) { setMonth(e.target.value); } }}
                className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
              {mut && (
                <button onClick={hitungAll} className="px-3 py-2 rounded-xl text-xs font-semibold text-white whitespace-nowrap transition-all" style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(124,58,237,0.25)" }}>
                  Hitung Ulang Semua
                </button>
              )}
              <div className="relative">
                <button onClick={() => setPickOpen(v => !v)} title="Menu karyawan"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
                  style={{ background: pickOpen ? "var(--foreground)" : "var(--background)", border: "1px solid var(--border)", color: pickOpen ? "#fff" : "var(--foreground)" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Karyawan
                  <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>

                {pickOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setPickOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 z-40 w-80 max-h-[55vh] overflow-y-auto rounded-2xl p-2" style={{ background: "var(--card)", border: "1.5px solid var(--border)", boxShadow: "0 18px 50px rgba(0,0,0,0.2)" }}>
                      <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>Daftar Karyawan</div>
                      {active.length === 0 && <div className="px-2 py-6 text-center text-xs" style={{ color: "var(--muted-foreground)" }}>Belum ada karyawan aktif</div>}
                      {active.map(emp => (
                        <div key={emp.id} className="flex items-center justify-between gap-2 px-2 py-2 rounded-xl mb-1" style={{ background: "var(--background)" }}>
                          <div className="min-w-0 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "var(--foreground)" }}>
                              {emp.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold truncate">{emp.name}</div>
                              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, emp.storeId)}</div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            {mut && (
                              <button onClick={() => { setEditEmp(emp); setPickOpen(false); }}
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                                Edit
                              </button>
                            )}
                            <button onClick={() => { openLapor(emp); setPickOpen(false); }}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white" style={{ background: "var(--accent)" }}>
                              Laporan
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4 text-xs">
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
            <div className="px-3 py-2.5 rounded-xl font-semibold" style={cell}>
              <div style={{ color: "var(--muted-foreground)", fontWeight: 500 }}>Kasbon belum lunas</div>
              <div className="font-mono mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace", color: totalKasbonOutstanding > 0 ? "#d97706" : "#16a34a", fontWeight: 700 }}>{fmt(totalKasbonOutstanding)}</div>
            </div>
          </div>
        </div>

        {/* SETELAN GAJI */}
        <div className="w-full rounded-2xl overflow-hidden" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="p-5 pb-0">
            <div className="text-sm font-semibold mb-1">Gaji & Target Penjualan</div>
            <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
              Klik <b>Edit</b> untuk mengubah gaji pokok, target & bonus, <b>Laporan</b> untuk membuka laporan gaji per karyawan, atau <b>Kasbon</b> untuk mencatat uang muka yang dipotong dari gaji.
            </div>
          </div>

          {active.length === 0 ? (
            <div className="px-5 pb-6 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada karyawan aktif</div>
          ) : (
            <>
              <div className="px-5 pb-1">
                <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
                  <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider items-center" style={{ background: "var(--background)", color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>
                    <span>Karyawan</span>
                    <span className="text-right">Gaji Pokok</span>
                    <span className="text-right">Target</span>
                    <span className="text-right">Bonus</span>
                    <span className="text-right">Aksi</span>
                  </div>
                  <div className="flex flex-col">
                    {cfgItems.map((emp, i) => {
                      const d = draftFor(emp);
                      const last = i === cfgItems.length - 1;
                      return (
                        <div key={emp.id} className="px-4 py-2.5" style={{ borderBottom: last ? "none" : "1px solid var(--border)" }}>
                          <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center text-xs">
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{emp.name}</div>
                              <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, emp.storeId)}</div>
                            </div>
                            <div className="font-mono font-semibold text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(d.baseSalary)}</div>
                            <div className="font-mono text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmtNum(d.salesTarget)}</div>
                            <div className="font-mono text-right" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(d.bonus)}</div>
                            <div className="flex items-center justify-end gap-1.5">
                              {mut && (
                                <button onClick={() => setEditEmp(emp)} className="h-8 px-3 rounded-lg text-xs font-bold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                                  Edit
                                </button>
                              )}
                              <button onClick={() => openLapor(emp)} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap" style={{ background: "#eef2ff", color: "#4f46e5" }}>
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17h6m-6-4h6m-6-4h6M5 21h14a2 2 0 002-2V7.5L15.5 3H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                Laporan
                              </button>
                              <button onClick={() => setKasbonEmp(emp)} className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap" style={{ background: "#fefce8", color: "#a16207" }}>
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>
                                Kasbon
                              </button>
                              {canDelete && mut && (
                                <button onClick={() => removeConfig(emp)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }} title="Hapus setelan gaji">
                                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="sm:hidden">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{emp.name}</div>
                                <div className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{storeNameOf(stores, emp.storeId)}</div>
                              </div>
                            </div>
                            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                              {[
                                { label: "Gaji Pokok", val: fmt(d.baseSalary) },
                                { label: "Target", val: fmtNum(d.salesTarget) },
                                { label: "Bonus", val: fmt(d.bonus) },
                              ].map((c) => (
                                <div key={c.label} className="px-2.5 py-2 rounded-lg min-w-0" style={{ background: "var(--card)" }}>
                                  <div className="text-[9px]" style={{ color: "var(--muted-foreground)" }}>{c.label}</div>
                                  <div className="font-mono font-semibold text-[11px] mt-0.5 truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{c.val}</div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2.5 flex items-center justify-end gap-1.5 flex-wrap">
                              {mut && (
                                <button onClick={() => setEditEmp(emp)} className="h-8 px-3 rounded-lg text-xs font-bold" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>Edit</button>
                              )}
                              <button onClick={() => openLapor(emp)} className="h-8 px-3 rounded-lg text-xs font-bold" style={{ background: "#eef2ff", color: "#4f46e5" }}>Laporan</button>
                              <button onClick={() => setKasbonEmp(emp)} className="h-8 px-3 rounded-lg text-xs font-bold" style={{ background: "#fefce8", color: "#a16207" }}>Kasbon</button>
                              {canDelete && mut && (
                                <button onClick={() => removeConfig(emp)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }} title="Hapus setelan gaji">
                                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <Pagination total={cfgTotal} page={cfgSafe} pageSize={cfgPageSize} onPageChange={setCfgPage} onPageSizeChange={s => { setCfgPageSize(s); setCfgPage(1); }} pageSizeOptions={[5, 10, 20]} rowLabel="karyawan" />
            </>
          )}
        </div>

        </div>
    </div>
  );
}