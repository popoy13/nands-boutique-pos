import { useState, useMemo, useRef } from "react";
import type { Transaction, DeletedTransaction } from "../data/types";
import type { PrinterSettings, PaymentSettings } from "../data/settings";
import DateRangeFilter, { todayISO } from "./DateRangeFilter";
import { escapeHtml } from "../lib/sanitize";
import { verifyPin } from "../lib/auth";
import Pagination from "./Pagination";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n);

interface Props {
  transactions: Transaction[];
  stores: { id: string; name: string }[];
  activeStore: string;
  canDelete?: boolean;
  canPrint?: boolean;
  canViewDeleted?: boolean;
  deletedTransactions?: DeletedTransaction[];
  onDelete?: (id: string, reason: string) => void;
  onUpdate?: (t: Transaction) => void;
  onPermanentDelete?: (id: string) => void;
  brandName?: string;
  printer?: PrinterSettings;
  payments?: PaymentSettings;
  currentUser?: { id: string; pin: string } | null;
}

const BUILTIN_LABELS: Record<string, string> = { cash: "Tunai", debit: "Kartu Debit", qris: "QRIS" };
const BUILTIN_COLORS: Record<string, { bg: string; text: string }> = {
  cash:  { bg: "#f0fdf4", text: "#16a34a" },
  debit: { bg: "#eff6ff", text: "#2563eb" },
  qris:  { bg: "#faf5ff", text: "#7c3aed" },
};
const labelOf = (m: string, payments?: PaymentSettings) =>
  payments?.methods.find(p => p.id === m)?.label ?? BUILTIN_LABELS[m] ?? m;
const colorOf = (m: string, payments?: PaymentSettings) =>
  BUILTIN_COLORS[m] ?? { bg: "#f3f4f6", text: "#4b5563" };

export default function HistoryView({ transactions, stores, canDelete = false, canPrint = true, canViewDeleted = false, deletedTransactions = [], onDelete, onUpdate, onPermanentDelete, brandName, printer, payments, currentUser }: Props) {
  const [tab, setTab] = useState<"active" | "deleted">("active");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [selDeleted, setSelDeleted] = useState<DeletedTransaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [editNote, setEditNote] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmPermDel, setConfirmPermDel] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [pinVerify, setPinVerify] = useState(false);
  const [pinVerifyInput, setPinVerifyInput] = useState("");
  const [pinVerifyError, setPinVerifyError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetPage = () => setPage(1);

  const switchTab = (next: "active" | "deleted") => {
    if (next === tab) return;
    setTab(next);
    setSelected(null);
    setSelDeleted(null);
    resetPage();
  };

  const deletingRef = useRef(false);

  const submitDeleteWithPin = async () => {
    if (!confirmDelete || !deleteReason.trim()) return;
    if (deletingRef.current) return;
    if (!currentUser) {
      deletingRef.current = true;
      try {
      onDelete?.(confirmDelete, deleteReason.trim());
      setConfirmDelete(null);
      setSelected(null);
      } finally { deletingRef.current = false; }
      return;
    }
    if (!pinVerify) { setPinVerifyError(""); setPinVerifyInput(""); setPinVerify(true); return; }
    if (!pinVerifyInput) return;
    deletingRef.current = true;
    try {
    const pinOk = /^[a-f0-9]{64}$/i.test(currentUser.pin) || currentUser.pin.startsWith("pbkdf2$")
      ? await verifyPin(pinVerifyInput, currentUser.pin)
      : pinVerifyInput === currentUser.pin;
    if (pinOk) {
      onDelete?.(confirmDelete, deleteReason.trim());
      setConfirmDelete(null);
      setPinVerify(false);
      setPinVerifyInput("");
      setSelected(null);
    } else {
      setPinVerifyError("PIN Anda salah");
      setPinVerifyInput("");
    }
    } finally { deletingRef.current = false; }
  };

  const filtered = useMemo(() => {
    return [...transactions].reverse().filter(t => {
      if (filterStore !== "all" && t.storeId !== filterStore) return false;
      if (filterMethod !== "all" && t.paymentMethod !== filterMethod) return false;
      if (search && !t.id.toLowerCase().includes(search.toLowerCase()) && !(t.cashierName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom) { const from = new Date(dateFrom); from.setHours(0,0,0,0); if (t.date < from) return false; }
      if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); if (t.date > to) return false; }
      return true;
    });
  }, [transactions, filterStore, filterMethod, search, dateFrom, dateTo]);

  const filteredDeleted = useMemo(() => {
    return [...deletedTransactions].reverse().filter(d => {
      const t = d.transaction;
      if (filterStore !== "all" && t.storeId !== filterStore) return false;
      if (search && !t.id.toLowerCase().includes(search.toLowerCase()) && !(t.cashierName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom) { const from = new Date(dateFrom); from.setHours(0,0,0,0); if (d.deletedAt < from) return false; }
      if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); if (d.deletedAt > to) return false; }
      return true;
    });
  }, [deletedTransactions, filterStore, search, dateFrom, dateTo]);

  const activeTotalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const activeSafePage = Math.min(page, activeTotalPages);
  const pageItems = useMemo(() => filtered.slice((activeSafePage - 1) * pageSize, activeSafePage * pageSize), [filtered, activeSafePage, pageSize]);

  const deletedTotalPages = Math.max(1, Math.ceil(filteredDeleted.length / pageSize));
  const deletedSafePage = Math.min(page, deletedTotalPages);
  const deletedPageItems = useMemo(() => filteredDeleted.slice((deletedSafePage - 1) * pageSize, deletedSafePage * pageSize), [filteredDeleted, deletedSafePage, pageSize]);

  const totalShown = filtered.reduce((s, t) => s + t.total, 0);

  const handlePrint = (t: Transaction) => {
    const w = window.open("", "_blank", "width=300,height=600");
    if (!w) return;
    const width = printer?.paperWidth ?? 72;
    const font = width <= 58 ? 8 : width === 72 ? 10 : 11;
    w.document.write(`<html><head><title>Struk - ${escapeHtml(t.id)}</title>
    <style>body{font-family:'Courier New',monospace;font-size:${font}px;padding:8mm;width:${width}mm;} .row{display:flex;justify-content:space-between;} hr{border:none;border-top:1px dashed #000;margin:5px 0;} .center{text-align:center;} .logo{max-width:${Math.max(30, width - 14)}mm;max-height:${Math.round(width * 0.32)}mm;object-fit:contain;} @page{size:${width}mm auto;margin:0;}</style>
    </head><body>
    ${printer?.receiptLogo ? `<div class="center"><img class="logo" src="${escapeHtml(printer.receiptLogo)}" alt="" /></div>` : ""}
    <div class="center"><b>${escapeHtml(brandName ?? "NAND'S BOUTIQUE")}</b><br>${escapeHtml((t.storeName || "").replace("NAND'S BOUTIQUE - ", ""))}<br></div>
    <hr><div>No: ${escapeHtml(t.id)}</div>
    ${printer?.showDate !== false ? `<div>Tgl: ${fmtDate(t.date)}</div>` : ""}
    ${printer?.showTime !== false ? `<div>Jam: ${new Date(t.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>` : ""}
    ${printer?.showCashier !== false ? `<div>Kasir: ${escapeHtml(t.cashierName ?? "")}</div>` : ""}
    ${t.memberName ? `<div>Member: ${escapeHtml(t.memberName)}</div>` : ""}
    <hr>
    ${t.items.map(i => `<div>${escapeHtml(i.name)}${[i.color, i.size].filter(Boolean).length ? ` (${escapeHtml([i.color, i.size].filter(Boolean).join("/"))})` : ""}</div><div class="row"><span>${i.quantity}x${fmtNum(i.price)}</span><span>${fmtNum(i.subtotal)}</span></div>`).join("")}
    <hr>
    <div class="row"><span>Subtotal</span><span>${fmtNum(t.subtotal)}</span></div>
    ${t.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${fmtNum(t.discountType === "percent" ? Math.round(t.subtotal * t.discount / 100) : t.discount)}</span></div>` : ""}
    ${printer?.showTax !== false ? `<div class="row"><span>${escapeHtml(payments?.tax?.label ?? "Pajak 10%")}</span><span>${fmtNum(t.tax)}</span></div>` : ""}
    ${(() => { const rd = t.total - t.subtotal + (t.discountType === "percent" ? Math.round(t.subtotal * t.discount / 100) : t.discount) - t.tax; return rd !== 0 ? `<div class="row"><span>Pembulatan</span><span>+${fmtNum(rd)}</span></div>` : ""; })()}
    <div class="row"><b><span>TOTAL</span><span>${fmtNum(t.total)}</span></b></div>
    <div class="row"><span>Bayar (${escapeHtml(labelOf(t.paymentMethod, payments))})</span><span>${fmtNum(t.payment)}</span></div>
    ${t.change > 0 && printer?.showChange !== false ? `<div class="row"><span>Kembalian</span><span>${fmtNum(t.change)}</span></div>` : ""}
    ${printer?.footerText ? `<hr><div class="center">${escapeHtml(printer.footerText).split("\n").join("<br>")}</div>` : ""}
    </body></html>`);
    w.document.close();
    w.print();
  };

  const totalsBlock = (t: Transaction) => (
    <div className="border-t pt-3 flex flex-col gap-1.5" style={{ borderColor: "var(--border)" }}>
      <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Subtotal</span><span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.subtotal)}</span></div>
      {t.discount > 0 && (
        <div className="flex justify-between text-xs">
          <span style={{ color: "var(--muted-foreground)" }}>Diskon {t.discountLabel || ""} {t.discountType === "percent" ? `${t.discount}%` : ""}</span>
          <span className="font-mono" style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(t.discountType === "percent" ? Math.round(t.subtotal * t.discount / 100) : t.discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>{payments?.tax?.enabled !== false ? `Pajak (${payments?.tax?.rate ?? 10}%)` : "Pajak"}</span><span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.tax)}</span></div>
      {(() => { const rd = t.total - (t.subtotal - (t.discountType === "percent" ? Math.round(t.subtotal * t.discount / 100) : t.discount) + t.tax); return rd !== 0 ? (
        <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Pembulatan</span><span className="font-mono" style={{ color: "#16a34a", fontFamily: "'JetBrains Mono', monospace" }}>+{fmt(rd)}</span></div>
      ) : null; })()}
      <div className="flex justify-between font-bold pt-2 border-t" style={{ borderColor: "var(--border)" }}>
        <span>Total</span>
        <span className="font-mono" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.total)}</span>
      </div>
      <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Bayar ({labelOf(t.paymentMethod, payments)})</span><span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.payment)}</span></div>
      {t.change > 0 && <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Kembalian</span><span className="font-mono" style={{ color: "#16a34a", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.change)}</span></div>}
    </div>
  );

  const detailBody = selected && (
    <div className="flex flex-col">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>Detail Transaksi</div>
        <div className="flex items-center gap-1.5">
          {canPrint && (
            <button onClick={() => handlePrint(selected)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--foreground)", color: "white" }} title="Cetak Struk">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </button>
          )}
          {canDelete && (
            <button onClick={() => { setConfirmDelete(selected.id); setDeleteReason(""); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }} title="Hapus">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
          <button onClick={() => setSelected(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      <div className="p-3 rounded-xl mb-4" style={{ background: "var(--background)" }}>
        <div className="font-mono text-xs font-bold mb-1" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{selected.id}</div>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{fmtDate(selected.date)}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{selected.storeName}</div>
        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Kasir: {selected.cashierName}</div>
        {selected.memberName && <div className="text-xs mt-0.5" style={{ color: "#ca8a04" }}>Member: {selected.memberName} {selected.pointsEarned ? `(+${selected.pointsEarned} pts)` : ""}</div>}
      </div>

      <div className="mb-4">
        <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>ITEM PEMBELIAN</div>
        <div className="flex flex-col gap-2">
          {selected.items.map(item => (
            <div key={item.variantSku} className="flex gap-3 p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
              <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{item.name}</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{[item.color, item.size].filter(Boolean).join(" / ") || "Tanpa varian"} · ×{item.quantity}</div>
              </div>
              <div className="font-mono text-xs font-bold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.subtotal)}</div>
            </div>
          ))}
        </div>
      </div>

      {totalsBlock(selected)}

      {canDelete && (
        <div className="mt-4">
          <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>CATATAN</div>
          {editingNote ? (
            <div className="flex gap-2">
              <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
              <button onClick={() => { onUpdate?.({ ...selected, note: editNote }); setSelected(p => p ? { ...p, note: editNote } : null); setEditingNote(false); }}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>Simpan</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer" style={{ background: "var(--background)" }} onClick={() => { setEditNote(selected.note); setEditingNote(true); }}>
              <span className="text-xs flex-1" style={{ color: selected.note ? "var(--foreground)" : "var(--muted-foreground)" }}>{selected.note || "Klik untuk tambah catatan..."}</span>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const deletedBody = selDeleted && (() => {
    const t = selDeleted.transaction;
    return (
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>Riwayat Transaksi Dihapus</div>
          <div className="flex items-center gap-1.5">
            {canDelete && (
              <button onClick={() => setConfirmPermDel(selDeleted.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }} title="Hapus permanen">
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
            <button onClick={() => setSelDeleted(null)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--muted)" }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="p-3 rounded-xl mb-4" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <div className="font-mono text-xs font-bold mb-1" style={{ color: "#b91c1c", fontFamily: "'JetBrains Mono', monospace" }}>{t.id}</div>
          <div className="text-xs mb-0.5" style={{ color: "#7f1d1d" }}>Dihapus: {fmtDate(selDeleted.deletedAt)}</div>
          <div className="text-xs mb-0.5" style={{ color: "#7f1d1d" }}>Oleh: {selDeleted.deletedBy}</div>
          <div className="text-xs" style={{ color: "#7f1d1d" }}>Alasan: {selDeleted.reason || "—"}</div>
        </div>

        <div className="p-3 rounded-xl mb-4" style={{ background: "var(--background)" }}>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Transaksi: {fmtDate(t.date)}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{t.storeName}</div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Kasir: {t.cashierName}</div>
          {t.memberName && <div className="text-xs mt-0.5" style={{ color: "#ca8a04" }}>Member: {t.memberName} {t.pointsEarned ? `(+${t.pointsEarned} pts)` : ""}</div>}
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>ITEM PEMBELIAN</div>
          <div className="flex flex-col gap-2">
            {t.items.map(item => (
              <div key={item.variantSku} className="flex gap-3 p-2.5 rounded-lg" style={{ background: "var(--background)" }}>
                <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{item.name}</div>
                  <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{[item.color, item.size].filter(Boolean).join(" / ") || "Tanpa varian"} · ×{item.quantity}</div>
                </div>
                <div className="font-mono text-xs font-bold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.subtotal)}</div>
              </div>
            ))}
          </div>
        </div>

        {totalsBlock(t)}
      </div>
    );
  })();

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Transaksi?</div>
            <div className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>Transaksi akan dicatat pada laporan. Isi alasan penghapusan:</div>
            <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} rows={3} placeholder="Contoh: pembayaran gagal / salah input / retur..."
              className="w-full px-3 py-2.5 rounded-xl text-xs outline-none resize-none mb-5" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button disabled={!deleteReason.trim()}
                onClick={() => { setPinVerify(false); void submitDeleteWithPin(); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: deleteReason.trim() ? "#ef4444" : "var(--muted)", color: deleteReason.trim() ? "white" : "var(--muted-foreground)" }}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPermDel && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Permanen?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Riwayat transaksi terhapus ini akan dihapus selamanya dari aplikasi dan database. Tindakan ini tidak dapat dibatalkan.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmPermDel(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => { onPermanentDelete?.(confirmPermDel); setConfirmPermDel(null); setSelDeleted(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}

      {pinVerify && confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Konfirmasi PIN</div>
            <div className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>Masukkan PIN Anda untuk menghapus transaksi.</div>
            {pinVerifyError && <div className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>{pinVerifyError}</div>}
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinVerifyInput}
              onChange={e => { setPinVerifyInput(e.target.value.replace(/\D/g, "")); setPinVerifyError(""); }}
              onKeyDown={e => { if (e.key === "Enter" && pinVerifyInput.length === 4) void submitDeleteWithPin(); }}
              autoFocus
              className="w-full text-center text-xl px-3 py-3 rounded-xl mb-4 outline-none"
              style={{ background: "var(--background)", border: "1.5px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }}
            />
            <div className="flex gap-2">
              <button onClick={() => { setPinVerify(false); setPinVerifyInput(""); setPinVerifyError(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Batal</button>
              <button onClick={() => void submitDeleteWithPin()} disabled={pinVerifyInput.length !== 4} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: pinVerifyInput.length === 4 ? "#ef4444" : "#d1d5db" }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Riwayat Transaksi</div>
            {canViewDeleted && (
              <div className="flex rounded-xl p-1 gap-1" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <button onClick={() => switchTab("active")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: tab === "active" ? "var(--foreground)" : "transparent", color: tab === "active" ? "white" : "var(--muted-foreground)" }}>
                  Aktif ({filtered.length})
                </button>
                <button onClick={() => switchTab("deleted")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: tab === "deleted" ? "#b91c1c" : "transparent", color: tab === "deleted" ? "white" : "var(--muted-foreground)" }}>
                  Terhapus ({filteredDeleted.length})
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1" style={{ minWidth: 160 }}>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Cari ID atau kasir..." value={search} onChange={e => { setSearch(e.target.value); resetPage(); }}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            </div>
            <select value={filterStore} onChange={e => { setFilterStore(e.target.value); resetPage(); }} className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ","")}</option>)}
            </select>
            {tab === "active" && (
              <select value={filterMethod} onChange={e => { setFilterMethod(e.target.value); resetPage(); }} className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                <option value="all">Semua Metode</option>
                {(payments?.methods ?? [{ id: "cash", label: "Tunai" }, { id: "debit", label: "Debit" }, { id: "qris", label: "QRIS" }]).map(m => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            )}
            <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={v => { setDateFrom(v); resetPage(); }} onChangeTo={v => { setDateTo(v); resetPage(); }} />
          </div>
          <div className="flex items-center gap-4 mt-2.5">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{tab === "active" ? filtered.length : filteredDeleted.length} {tab === "active" ? "transaksi" : "transaksi terhapus"}</span>
            {tab === "active" && (
              <span className="text-xs font-mono font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>Total: {fmt(totalShown)}</span>
            )}
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto px-4 sm:px-6 py-4">
          {(tab === "active" ? pageItems : deletedPageItems).length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>{tab === "active" ? "Tidak ada transaksi" : "Tidak ada transaksi terhapus"}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {tab === "active" ? pageItems.map(t => (
                <button key={t.id} onClick={() => setSelected(t)}
                  className="w-full text-left p-4 rounded-xl transition-all duration-150 hover:-translate-y-0.5"
                  style={{ background: selected?.id === t.id ? "rgba(124,58,237,0.05)" : "var(--card)", border: `1.5px solid ${selected?.id === t.id ? "var(--accent)" : "var(--border)"}` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs font-semibold mb-1" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{t.id}</div>
                      <div className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>{fmtDate(t.date)}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {t.storeName.replace("NAND'S BOUTIQUE - ","")} · {t.cashierName} · {t.items.length} item
                        {t.memberName && <span className="ml-1 text-yellow-600">· {t.memberName}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="font-mono font-bold text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.total)}</div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: colorOf(t.paymentMethod).bg, color: colorOf(t.paymentMethod).text }}>{labelOf(t.paymentMethod, payments)}</span>
                    </div>
                  </div>
                </button>
              )) : deletedPageItems.map(d => {
                const t = d.transaction;
                return (
                  <button key={d.id} onClick={() => setSelDeleted(d)}
                    className="w-full text-left p-4 rounded-xl transition-all duration-150 hover:-translate-y-0.5"
                    style={{ background: selDeleted?.id === d.id ? "rgba(239,68,68,0.05)" : "var(--card)", border: `1.5px solid ${selDeleted?.id === d.id ? "#b91c1c" : "var(--border)"}` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs font-semibold mb-1" style={{ color: "#b91c1c", fontFamily: "'JetBrains Mono', monospace" }}>{t.id}</div>
                        <div className="text-xs mb-0.5" style={{ color: "var(--muted-foreground)" }}>Transaksi: {fmtDate(t.date)} · Dihapus: {fmtDate(d.deletedAt)}</div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {t.storeName.replace("NAND'S BOUTIQUE - ","")} · Kasir {t.cashierName} · oleh {d.deletedBy}
                        </div>
                        <div className="text-xs mt-1 truncate" style={{ color: "#b91c1c" }}>Alasan: {d.reason || "—"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="font-mono font-bold text-sm" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.total)}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fee2e2", color: "#b91c1c" }}>Dihapus</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Pagination
          total={tab === "active" ? filtered.length : filteredDeleted.length}
          page={tab === "active" ? activeSafePage : deletedSafePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowLabel="transaksi"
        />
      </div>

      {/* Detail - desktop sidebar */}
      <div className="hidden lg:flex shrink-0 flex-col overflow-hidden w-[340px]" style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}>
        {tab === "deleted" ? (
          selDeleted ? (
            <div className="flex flex-col h-full overflow-y-auto p-5">
              {deletedBody}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 h-full py-12">
              <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#fca5a5" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Pilih transaksi terhapus untuk detail</p>
            </div>
          )
        ) : selected ? (
          <div className="flex flex-col h-full overflow-y-auto p-5">
            {detailBody}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 h-full py-12">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Pilih transaksi untuk detail</p>
          </div>
        )}
      </div>

      {/* Detail - mobile floating overlay */}
      {(tab === "deleted" ? selDeleted : selected) && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => tab === "deleted" ? setSelDeleted(null) : setSelected(null)} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden flex flex-col" style={{ background: "var(--card)", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-2.5 shrink-0" style={{ background: "var(--border)" }} />
            <div className="flex flex-col max-h-[85vh] overflow-y-auto p-5">
              {tab === "deleted" ? deletedBody : detailBody}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}