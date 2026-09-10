import { useState, useMemo } from "react";
import type { Transaction } from "../data/types";
import type { PrinterSettings } from "../data/settings";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);

interface Props {
  transactions: Transaction[];
  stores: { id: string; name: string }[];
  activeStore: string;
  userRole: string;
  onDelete?: (id: string, reason: string) => void;
  onUpdate?: (t: Transaction) => void;
  brandName?: string;
  printer?: PrinterSettings;
}

const methodLabel: Record<string, string> = { cash: "Tunai", debit: "Debit", qris: "QRIS" };
const methodColor: Record<string, { bg: string; text: string }> = {
  cash:  { bg: "#f0fdf4", text: "#16a34a" },
  debit: { bg: "#eff6ff", text: "#2563eb" },
  qris:  { bg: "#faf5ff", text: "#7c3aed" },
};

export default function HistoryView({ transactions, stores, userRole, onDelete, onUpdate, brandName, printer }: Props) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editingNote, setEditingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const canEditDelete = userRole === "admin" || userRole === "manager" || userRole === "manager_operasional";

  const filtered = useMemo(() => {
    return [...transactions].reverse().filter(t => {
      if (filterStore !== "all" && t.storeId !== filterStore) return false;
      if (filterMethod !== "all" && t.paymentMethod !== filterMethod) return false;
      if (search && !t.id.toLowerCase().includes(search.toLowerCase()) && !t.cashierName.toLowerCase().includes(search.toLowerCase())) return false;
      if (dateFrom) { const from = new Date(dateFrom); from.setHours(0,0,0,0); if (t.date < from) return false; }
      if (dateTo) { const to = new Date(dateTo); to.setHours(23,59,59,999); if (t.date > to) return false; }
      return true;
    });
  }, [transactions, filterStore, filterMethod, search, dateFrom, dateTo]);

  const totalShown = filtered.reduce((s, t) => s + t.total, 0);

  const handlePrint = (t: Transaction) => {
    const w = window.open("", "_blank", "width=300,height=600");
    if (!w) return;
    const width = printer?.paperWidth ?? 72;
    const font = width <= 58 ? 8 : width === 72 ? 10 : 11;
    w.document.write(`<html><head><title>Struk - ${t.id}</title>
    <style>body{font-family:'Courier New',monospace;font-size:${font}px;padding:8mm;width:${width}mm;} .row{display:flex;justify-content:space-between;} hr{border:none;border-top:1px dashed #000;margin:5px 0;} .center{text-align:center;} @page{size:${width}mm auto;margin:0;}</style>
    </head><body>
    <div class="center"><b>${brandName ?? "NAND'S BOUTIQUE"}</b><br>${t.storeName.replace("NAND'S BOUTIQUE - ","")}<br></div>
    <hr><div>No: ${t.id}</div><div>Tgl: ${fmtDate(t.date)}</div><div>Kasir: ${t.cashierName}</div>
    ${t.memberName ? `<div>Member: ${t.memberName}</div>` : ""}
    <hr>
    ${t.items.map(i => `<div>${i.name} (${i.color}/${i.size})</div><div class="row"><span>${i.quantity}x${new Intl.NumberFormat("id-ID").format(i.price)}</span><span>${new Intl.NumberFormat("id-ID").format(i.subtotal)}</span></div>`).join("")}
    <hr>
    <div class="row"><span>Subtotal</span><span>${new Intl.NumberFormat("id-ID").format(t.subtotal)}</span></div>
    ${t.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${new Intl.NumberFormat("id-ID").format(t.discountType === "percent" ? Math.round(t.subtotal * t.discount / 100) : t.discount)}</span></div>` : ""}
    <div class="row"><span>Pajak 10%</span><span>${new Intl.NumberFormat("id-ID").format(t.tax)}</span></div>
    <div class="row"><b><span>TOTAL</span><span>${new Intl.NumberFormat("id-ID").format(t.total)}</span></b></div>
    <div class="row"><span>Bayar (${methodLabel[t.paymentMethod]})</span><span>${new Intl.NumberFormat("id-ID").format(t.payment)}</span></div>
    ${t.change > 0 ? `<div class="row"><span>Kembalian</span><span>${new Intl.NumberFormat("id-ID").format(t.change)}</span></div>` : ""}
    <hr><div class="center">Terima kasih!<br>www.nandsboutique.id</div>
    </body></html>`);
    w.document.close();
    w.print();
  };

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
                onClick={() => { onDelete?.(confirmDelete, deleteReason.trim()); setConfirmDelete(null); setSelected(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: deleteReason.trim() ? "#ef4444" : "var(--muted)", color: deleteReason.trim() ? "white" : "var(--muted-foreground)" }}>
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }} className="mb-3">Riwayat Transaksi</div>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1" style={{ minWidth: 160 }}>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Cari ID atau kasir..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            </div>
            <select value={filterStore} onChange={e => setFilterStore(e.target.value)} className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ","")}</option>)}
            </select>
            <select value={filterMethod} onChange={e => setFilterMethod(e.target.value)} className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Metode</option>
              <option value="cash">Tunai</option>
              <option value="debit">Debit</option>
              <option value="qris">QRIS</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
          </div>
          <div className="flex items-center gap-4 mt-2.5">
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{filtered.length} transaksi</span>
            <span className="text-xs font-mono font-semibold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>Total: {fmt(totalShown)}</span>
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Tidak ada transaksi</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(t => (
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
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: methodColor[t.paymentMethod].bg, color: methodColor[t.paymentMethod].text }}>{methodLabel[t.paymentMethod]}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail */}
      <div className="shrink-0 flex flex-col overflow-hidden w-full lg:w-[340px]" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
        {selected ? (
          <div className="flex flex-col lg:h-full lg:overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>Detail Transaksi</div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => handlePrint(selected)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--foreground)", color: "white" }} title="Cetak Struk">
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                </button>
                {canEditDelete && (
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
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{item.color} / {item.size} · ×{item.quantity}</div>
                    </div>
                    <div className="font-mono text-xs font-bold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.subtotal)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3 flex flex-col gap-1.5" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Subtotal</span><span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.subtotal)}</span></div>
              {selected.discount > 0 && (
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--muted-foreground)" }}>Diskon {selected.discountLabel || ""} {selected.discountType === "percent" ? `${selected.discount}%` : ""}</span>
                  <span className="font-mono" style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(selected.discountType === "percent" ? Math.round(selected.subtotal * selected.discount / 100) : selected.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Pajak (10%)</span><span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.tax)}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                <span>Total</span>
                <span className="font-mono" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.total)}</span>
              </div>
              <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Bayar ({methodLabel[selected.paymentMethod]})</span><span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.payment)}</span></div>
              {selected.change > 0 && <div className="flex justify-between text-xs"><span style={{ color: "var(--muted-foreground)" }}>Kembalian</span><span className="font-mono" style={{ color: "#16a34a", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.change)}</span></div>}
            </div>

            {canEditDelete && (
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
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 lg:h-full py-12">
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth={1.2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>Pilih transaksi untuk detail</p>
          </div>
        )}
      </div>
    </div>
  );
}
