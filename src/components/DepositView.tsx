import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { safeRows } from "../lib/safeExport";
import { validateImageFile } from "../lib/imageFile";
import type { CashDeposit } from "../data/types";
import { todayISO } from "../lib/dates";
import { assetUrl } from "../lib/assets";
import { compressImage } from "../lib/compressImage";
import { readStruk } from "../lib/ocr";
import DateRangeFilter from "./DateRangeFilter";
import Pagination from "./Pagination";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDay = (iso: string) => {
  const dt = new Date(`${String(iso ?? "").slice(0, 10)}T00:00:00`);
  return Number.isNaN(dt.getTime())
    ? "—"
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(dt);
};

interface Props {
  deposits: CashDeposit[];
  stores: { id: string; name: string }[];
  employees?: { id: string; name: string; status?: string }[];
  banks: string[];
  onUpdateBanks: (banks: string[]) => void;
  currentUser?: { id: string; name: string; role: string } | null;
  onSave: (deposits: CashDeposit[]) => void;
  onDelete?: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canBank?: boolean;
}

const empty = (): CashDeposit => ({
  id: `dep-${Date.now()}`,
  storeId: "",
  storeName: "",
  date: todayISO(),
  bank: "",
  amount: 0,
  referenceCode: "",
  notes: "",
  createdByName: "",
});

export default function DepositView({ deposits, stores, employees = [], banks, onUpdateBanks, currentUser, onSave, onDelete, canAdd = true, canEdit = true, canDelete = true, canBank = false }: Props) {
  const [editing, setEditing] = useState<CashDeposit | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [filterStore, setFilterStore] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [bankModal, setBankModal] = useState(false);
  const [newBankName, setNewBankName] = useState("");
  const [editingBankIdx, setEditingBankIdx] = useState<number | null>(null);
  const [editingBankVal, setEditingBankVal] = useState("");
  const [confirmDeleteBank, setConfirmDeleteBank] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrCodes, setOcrCodes] = useState<string[]>([]);
  const [ocrAmount, setOcrAmount] = useState<number | undefined>();
  const [ocrError, setOcrError] = useState("");
  const photoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editing]);

  const resetPage = () => setPage(1);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const activeEmployees = employees.filter(e => e.status !== "inactive");

  const filtered = deposits.filter(e => {
    if (filterStore !== "all" && e.storeId !== filterStore) return false;
    if (dateFrom && (e.date ?? "") < dateFrom) return false;
    if (dateTo && (e.date ?? "") > dateTo) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fileErr = validateImageFile(file);
    if (fileErr) { showToast(fileErr); return; }
    setOcrBusy(true);
    setOcrError("");
    setOcrCodes([]);
    setOcrAmount(undefined);
    compressImage(file, 1600, 0.85)
      .then((dataUrl) => {
        setEditing(prev => prev ? { ...prev, photo: dataUrl } : null);
        return readStruk(dataUrl).catch(err => {
          setOcrError((err as Error)?.message || "Gagal membaca struk (periksa jaringan)");
          return null;
        });
      })
      .then((result) => {
        if (!result) return;
        setOcrCodes(result.suggestions.codes);
        if (result.suggestions.amount) setOcrAmount(result.suggestions.amount);
        setEditing(prev => prev ? { ...prev, referenceCode: prev.referenceCode || (result.suggestions.codes[0] ?? "") } : null);
      })
      .catch((err) => setOcrError((err as Error)?.message || "Gagal membaca gambar"))
      .finally(() => setOcrBusy(false));
  };

  const handleSave = () => {
    if (!editing || !editing.storeId || !editing.bank) return;
    const clean = {
      ...editing,
      storeName: stores.find(s => s.id === editing.storeId)?.name ?? editing.storeName,
      amount: Math.max(0, editing.amount),
    };
    const updated = isNew ? [...deposits, clean] : deposits.map(d => d.id === editing!.id ? clean : d);
    onSave(updated);
    setEditing(null);
    setIsNew(false);
    showToast(isNew ? "Setor tunai dicatat" : "Setor tunai diperbarui");
  };

  const handleDelete = (id: string) => {
    onSave(deposits.filter(d => d.id !== id));
    onDelete?.(id);
    if (editing?.id === id) setEditing(null);
    showToast("Setor tunai dihapus");
  };

  const handleExport = () => {
    if (filtered.length === 0) { showToast("Tidak ada data untuk diekspor"); return; }
    const rows = filtered.map(e => ({
      "Tanggal": e.date ?? "",
      "Toko": (e.storeName ?? "").replace("NAND'S BOUTIQUE - ", ""),
      "Bank": e.bank ?? "",
      "Jumlah": e.amount,
      "Kode Referensi": e.referenceCode ?? "",
      "Keterangan": e.notes ?? "",
      "Dibuat Oleh": e.createdByName ?? "",
      "Bukti Foto": e.photo ? "Ada" : "-",
    })).sort((a, b) => String(a.Tanggal).localeCompare(String(b.Tanggal)) * -1);
    const ws = XLSX.utils.json_to_sheet(safeRows(rows));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Setor Tunai");
    XLSX.writeFile(wb, `nands-boutique-setor-tunai-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("File Excel setor tunai berhasil diunduh");
  };

  const addBank = () => {
    const name = newBankName.trim();
    if (!name || banks.includes(name)) return;
    onUpdateBanks([...banks, name]);
    setNewBankName("");
  };

  const renameBank = (idx: number) => {
    const old = banks[idx];
    const name = editingBankVal.trim();
    if (!name || name === old) { setEditingBankIdx(null); setEditingBankVal(""); return; }
    if (banks.includes(name) && banks[idx] !== name) return;
    const next = banks.map((b, i) => (i === idx ? name : b));
    onUpdateBanks(next);
    onSave(deposits.map(d => (d.bank === old ? { ...d, bank: name } : d)));
    setEditingBankIdx(null);
    setEditingBankVal("");
  };

  const deleteBank = (name: string) => {
    onUpdateBanks(banks.filter(b => b !== name));
    setConfirmDeleteBank(null);
  };

  const employeeNames = new Set(activeEmployees.map(emp => emp.name));
  const editingName = editing?.createdByName ?? "";
  const knownNames = [...activeEmployees.map(emp => emp.name)];
  if (editingName && !employeeNames.has(editingName)) knownNames.push(editingName);

  return (
    <div className="flex flex-col h-full overflow-y-auto lg:overflow-hidden">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>{toast}</div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setLightbox("")}>
          <img src={assetUrl(lightbox)} alt="Bukti setor tunai" className="max-h-[85vh] max-w-[95vw] rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center">✕</button>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Setor Tunai?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Tindakan ini tidak dapat dibatalkan.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => { handleDelete(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden my-6 mx-4" style={{ background: "var(--card)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                {isNew ? "Catat Setor Tunai" : "Edit Setor Tunai"}
              </div>
              <button onClick={() => { setEditing(null); setIsNew(false); }}
                className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Tanggal</div>
                <input type="date" value={editing.date ?? ""} onChange={e => setEditing(p => p ? { ...p, date: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Toko</div>
                <select value={editing.storeId} onChange={e => setEditing(p => p ? { ...p, storeId: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  <option value="">Pilih toko</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Bank Owner (Tujuan Setoran)</div>
                <div className="flex gap-2">
                  <select value={editing.bank} onChange={e => setEditing(p => p ? { ...p, bank: e.target.value } : null)}
                    className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                    <option value="">Pilih bank</option>
                    {banks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {canBank && (
                    <button onClick={() => setBankModal(true)} title="Kelola Bank"
                      className="w-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Jumlah (Rp)</div>
                <input type="number" min={0} value={editing.amount || ""} onChange={e => setEditing(p => p ? { ...p, amount: Number(e.target.value) } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Kode Referensi / ID Transaksi</div>
                <input type="text" value={editing.referenceCode} onChange={e => setEditing(p => p ? { ...p, referenceCode: e.target.value } : null)}
                  placeholder="Terisi otomatis dari OCR struk bank" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                  style={{ background: "var(--muted)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
                {ocrBusy && (
                  <div className="mt-1.5 text-xs flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}>
                    <span className="inline-block w-3 h-3 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
                    Membaca struk bank dengan OCR…
                  </div>
                )}
                {!ocrBusy && ocrError && (
                  <div className="mt-1.5 text-xs" style={{ color: "#ea580c" }}>OCR: {ocrError}</div>
                )}
                {(ocrCodes.length > 0 || ocrAmount !== undefined) && !ocrBusy && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ocrCodes.map((c, i) => (
                      <button key={i} onClick={() => setEditing(p => p ? { ...p, referenceCode: c } : null)}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold"
                        style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
                        Ref: {c}
                      </button>
                    ))}
                    {ocrAmount !== undefined && (
                      <button onClick={() => setEditing(p => p ? { ...p, amount: ocrAmount! } : null)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{ background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe" }}>
                        Jumlah: {fmt(ocrAmount)}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Keterangan</div>
                <textarea value={editing.notes} onChange={e => setEditing(p => p ? { ...p, notes: e.target.value } : null)}
                  rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Karyawan</div>
                <select value={editingName} onChange={e => setEditing(p => p ? { ...p, createdByName: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)", color: "var(--foreground)" }}>
                  <option value="">Pilih karyawan</option>
                  {knownNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Bukti Foto Struk Bank (Kamera)</div>
                <div className="flex flex-col gap-2">
                  {editing.photo ? (
                    <div className="flex items-center gap-3">
                      <img src={assetUrl(editing.photo)} alt="Bukti" className="w-20 h-20 rounded-xl object-cover shrink-0 cursor-pointer" style={{ border: "1.5px solid var(--border)" }} onClick={() => setLightbox(editing.photo ?? "")} />
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => photoRef.current?.click()}
                          className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>Ganti Foto</button>
                        <button onClick={() => setEditing(p => p ? { ...p, photo: undefined } : null)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "#fef2f2", color: "#ef4444" }}>Hapus Foto</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => photoRef.current?.click()}
                      className="w-full py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2" style={{ background: "var(--muted)", border: "1.5px dashed var(--border)", color: "var(--muted-foreground)" }}>
                      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Ambil Foto Struk Bank (Kamera) / Pilih Dari Galeri
                    </button>
                  )}
                  <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
              <button onClick={handleSave} disabled={!editing.storeId || !editing.bank || !(editing.amount > 0)}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: editing.storeId && editing.bank && editing.amount > 0 ? "var(--foreground)" : "var(--muted)", color: editing.storeId && editing.bank && editing.amount > 0 ? "white" : "var(--muted-foreground)" }}>
                Simpan Setor Tunai
              </button>
            </div>
          </div>
        </div>
      )}

      {bankModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-2xl p-5 my-auto mx-4" style={{ background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>Kelola Bank Owner</div>
              <button onClick={() => { setBankModal(false); setEditingBankIdx(null); setEditingBankVal(""); }}
                className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex flex-col gap-1.5 mb-3 max-h-64 overflow-y-auto">
              {banks.length === 0 && (
                <div className="text-sm py-4 text-center" style={{ color: "var(--muted-foreground)" }}>Belum ada bank. Tambahkan bank owner perusahaan.</div>
              )}
              {banks.map((b, idx) => (
                <div key={b} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--muted)" }}>
                  {editingBankIdx === idx ? (
                    <>
                      <input value={editingBankVal} onChange={e => setEditingBankVal(e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg text-sm outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                      <button onClick={() => renameBank(idx)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0" style={{ background: "var(--foreground)" }}>Simpan</button>
                      <button onClick={() => { setEditingBankIdx(null); setEditingBankVal(""); }}
                        className="px-2 py-1.5 rounded-lg text-xs shrink-0" style={{ background: "var(--card)" }}>Batal</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate text-sm font-medium">{b}</span>
                      <button onClick={() => { setEditingBankIdx(idx); setEditingBankVal(b); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--card)" }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                      <button onClick={() => setConfirmDeleteBank(b)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" /></svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            {confirmDeleteBank && (
              <div className="mb-3 p-3 rounded-xl" style={{ background: "#fef2f2" }}>
                <div className="text-xs font-semibold mb-2" style={{ color: "#b91c1c" }}>Hapus Bank "{confirmDeleteBank}"?</div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmDeleteBank(null)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold" style={{ background: "#ffffff", border: "1px solid var(--border)" }}>Batal</button>
                  <button onClick={() => deleteBank(confirmDeleteBank)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold text-white" style={{ background: "#ef4444" }}>Ya, Hapus</button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input value={newBankName} onChange={e => setNewBankName(e.target.value)}
                placeholder="Nama bank baru (mis. BTN, Jenius, SeaBank)"
                className="flex-1 min-w-0 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              <button onClick={addBank} disabled={!newBankName.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: newBankName.trim() ? "var(--accent)" : "var(--muted)", color: newBankName.trim() ? "white" : "var(--muted-foreground)" }}>Tambah</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Setor Tunai</div>
            <div className="flex items-center gap-2 flex-wrap">
              {canAdd && (
                <button onClick={() => { setEditing({ ...empty(), createdByName: currentUser?.name ?? "" }); setIsNew(true); setOcrBusy(false); setOcrCodes([]); setOcrAmount(undefined); setOcrError(""); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                  style={{ background: "var(--accent)", boxShadow: "0 4px 12px rgba(124,58,237,0.25)" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Catat Setor Tunai
                </button>
              )}
              <button onClick={handleExport}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Export Excel
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStore} onChange={e => { setFilterStore(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-medium outline-none" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
              <option value="all">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
            </select>
            <DateRangeFilter
              showPresets
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChangeFrom={v => { setDateFrom(v); setPage(1); }}
              onChangeTo={v => { setDateTo(v); setPage(1); }}
            />
            <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {filtered.length} catatan · Total {fmt(totalAmount)}
            </span>
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            {pageItems.length === 0 && (
              <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {deposits.length === 0 ? "Belum ada catatan setor tunai." : "Tidak ada catatan sesuai filter."}
              </div>
            )}
            {pageItems.map(e => (
              <div key={e.id} className="p-4 rounded-2xl" style={{ background: "var(--card)", border: `1.5px solid ${editing?.id === e.id ? "var(--accent)" : "var(--border)"}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: "#e0e7ff", color: "#4f46e5" }}>
                      ₿
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold">{fmt(e.amount)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>{e.storeName?.replace("NAND'S BOUTIQUE - ", "")}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#eef2ff", color: "#4f46e5" }}>{e.bank}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {fmtDay(e.date)}
                        {e.referenceCode && <span className="ml-1 font-mono">· Ref: {e.referenceCode}</span>}
                        {e.notes && <span className="ml-1">· {e.notes}</span>}
                      </div>
                      {(e.createdByName) && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                          <span className="inline-flex items-center gap-1">
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 017 7H5a7 7 0 017-7z" /></svg>
                            {e.createdByName}
                          </span>
                        </div>
                      )}
                      {e.photo && (
                        <img src={assetUrl(e.photo)} alt="Bukti setor tunai" onClick={() => setLightbox(e.photo ?? "")}
                          className="mt-2 w-16 h-16 rounded-xl object-cover cursor-pointer" style={{ border: "1.5px solid var(--border)" }} />
                      )}
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canEdit && (
                        <button onClick={() => { setEditing({ ...e }); setIsNew(false); setOcrBusy(false); setOcrCodes([]); setOcrAmount(undefined); setOcrError(""); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#f3f4f6" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#374151" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path strokeLinecap="round" strokeLinejoin="round" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setConfirmDelete(e.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
}