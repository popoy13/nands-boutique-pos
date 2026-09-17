import { useState, useEffect } from "react";
import type { Discount } from "../data/types";
import { todayISO } from "../lib/dates";
import Pagination from "./Pagination";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface Props {
  discounts: Discount[];
  stores: { id: string; name: string }[];
  onSave: (discounts: Discount[]) => void;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const empty = (): Discount => {
  const t = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const start = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  const end = new Date(t.getTime() + 30 * 86400000);
  return {
    id: `d-${Date.now()}`,
    name: "",
    type: "percent",
    value: 10,
    minPurchase: 0,
    code: "",
    startDate: start,
    endDate: `${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}`,
    storeId: "all",
    usageLimit: 0,
    usedCount: 0,
    active: true,
  };
};

const TYPE_LABEL = { percent: "Persen (%)", amount: "Nominal (Rp)", voucher: "Voucher Kode" };
const TYPE_COLOR: Record<string, { bg: string; text: string }> = {
  percent: { bg: "#eff6ff", text: "#2563eb" },
  amount:  { bg: "#f0fdf4", text: "#16a34a" },
  voucher: { bg: "#fdf4ff", text: "#7c3aed" },
};

export default function DiscountView({ discounts, stores, onSave, canAdd = true, canEdit = true, canDelete = true }: Props) {
  const [editing, setEditing] = useState<Discount | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editing]);
  const [isNew, setIsNew] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetPage = () => setPage(1);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const filtered = discounts.filter(d => filterType === "all" || d.type === filterType);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleSave = () => {
    if (!editing?.name.trim()) return;
    const value = editing.type === "percent" || (editing.type === "voucher" && editing.value <= 100)
      ? Math.min(100, Math.max(0, editing.value))
      : Math.max(0, editing.value);
    const clean = { ...editing, value, minPurchase: Math.max(0, editing.minPurchase), usageLimit: Math.max(0, editing.usageLimit) };
    const updated = isNew ? [...discounts, clean] : discounts.map(d => d.id === editing!.id ? clean : d);
    onSave(updated);
    setEditing(null);
    setIsNew(false);
    showToast("Diskon disimpan");
  };

  const handleDelete = (id: string) => {
    onSave(discounts.filter(d => d.id !== id));
    if (editing?.id === id) setEditing(null);
    showToast("Diskon dihapus");
  };

  const handleToggle = (id: string) => {
    onSave(discounts.map(d => d.id === id ? { ...d, active: !d.active } : d));
  };

  const isExpired = (d: Discount) => d.endDate < todayISO();
  const isLimitReached = (d: Discount) => d.usageLimit > 0 && d.usedCount >= d.usageLimit;

  const editBody = editing && (canEdit || canAdd) ? (
    <>
      <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>{isNew ? "Buat Diskon" : "Edit Diskon"}</div>
        <button onClick={() => setEditing(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>NAMA DISKON</label>
          <input type="text" value={editing.name} onChange={e => setEditing(p => p ? { ...p, name: e.target.value } : null)}
            placeholder="Contoh: Diskon Weekend 15%" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>TIPE DISKON</label>
          <div className="grid grid-cols-3 gap-2">
            {(["percent", "amount", "voucher"] as const).map(t => (
              <button key={t} onClick={() => setEditing(p => p ? { ...p, type: t } : null)}
                className="py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: editing.type === t ? "var(--foreground)" : "var(--background)", color: editing.type === t ? "white" : "var(--muted-foreground)", border: `1px solid ${editing.type === t ? "var(--foreground)" : "var(--border)"}` }}>
                {t === "percent" ? "Persen" : t === "amount" ? "Nominal" : "Voucher"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>
            NILAI {editing.type === "percent" ? "(%)": editing.type === "voucher" && editing.value <= 100 ? "(% atau Rp)" : "(Rp)"}
          </label>
          <input type="number" value={editing.value} onChange={e => setEditing(p => p ? { ...p, value: Number(e.target.value) } : null)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
          {editing.type === "voucher" && (
            <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>≤ 100 = persen, &gt; 100 = nominal Rp</p>
          )}
        </div>

        {editing.type === "voucher" && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>KODE VOUCHER</label>
            <input type="text" value={editing.code ?? ""} onChange={e => setEditing(p => p ? { ...p, code: e.target.value.toUpperCase() } : null)}
              placeholder="CONTOH: NANDS50K" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
              style={{ background: "var(--background)", border: "1.5px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>MINIMAL BELANJA (Rp)</label>
          <input type="number" value={editing.minPurchase} onChange={e => setEditing(p => p ? { ...p, minPurchase: Number(e.target.value) } : null)}
            placeholder="0 = tidak ada minimal" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>MULAI</label>
            <input type="date" value={editing.startDate} onChange={e => setEditing(p => p ? { ...p, startDate: e.target.value } : null)}
              className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>BERAKHIR</label>
            <input type="date" value={editing.endDate} onChange={e => setEditing(p => p ? { ...p, endDate: e.target.value } : null)}
              className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>TOKO</label>
          <select value={editing.storeId} onChange={e => setEditing(p => p ? { ...p, storeId: e.target.value } : null)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}>
            <option value="all">Semua Toko</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>BATAS PENGGUNAAN (0 = tidak terbatas)</label>
          <input type="number" value={editing.usageLimit} onChange={e => setEditing(p => p ? { ...p, usageLimit: Number(e.target.value) } : null)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>STATUS</label>
          <div className="flex gap-2">
            {([true, false] as const).map(v => (
              <button key={String(v)} onClick={() => setEditing(p => p ? { ...p, active: v } : null)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: editing.active === v ? "var(--foreground)" : "var(--background)", color: editing.active === v ? "white" : "var(--muted-foreground)", border: `1px solid ${editing.active === v ? "var(--foreground)" : "var(--border)"}` }}>
                {v ? "Aktif" : "Nonaktif"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <button onClick={handleSave} disabled={!editing.name.trim()}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: editing.name.trim() ? "var(--foreground)" : "var(--muted)", color: editing.name.trim() ? "white" : "var(--muted-foreground)" }}>
          Simpan Diskon
        </button>
      </div>
    </>
  ) : null;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>{toast}</div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Diskon?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Tindakan ini tidak dapat dibatalkan.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => { handleDelete(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Diskon & Voucher</div>
            {canAdd && (
              <button onClick={() => { setEditing(empty()); setIsNew(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: "var(--foreground)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Buat Diskon
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "percent", "amount", "voucher"].map(t => (
              <button key={t} onClick={() => { setFilterType(t); resetPage(); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{ background: filterType === t ? "var(--foreground)" : "var(--card)", color: filterType === t ? "white" : "var(--muted-foreground)", border: `1px solid ${filterType === t ? "var(--foreground)" : "var(--border)"}` }}>
                {t === "all" ? "Semua" : TYPE_LABEL[t as keyof typeof TYPE_LABEL]}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto p-4 sm:p-6">
          <div className="flex flex-col gap-3">
            {pageItems.map(d => {
              const expired = isExpired(d);
              const limitReached = isLimitReached(d);
              const inactive = !d.active || expired || limitReached;

              return (
                <div key={d.id} className="p-4 rounded-2xl transition-all"
                  style={{ background: "var(--card)", border: `1.5px solid ${editing?.id === d.id ? "var(--accent)" : "var(--border)"}`, opacity: inactive ? 0.65 : 1 }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Type badge */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base">
                        {d.type === "percent" ? "%" : d.type === "amount" ? "Rp" : "🎫"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-semibold">{d.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: TYPE_COLOR[d.type]?.bg ?? "#f3f4f6", color: TYPE_COLOR[d.type]?.text ?? "#6b7280" }}>{TYPE_LABEL[d.type]}</span>
                          {d.code && <span className="font-mono text-xs px-2 py-0.5 rounded-lg font-bold" style={{ background: "#f3f4f6", fontFamily: "'JetBrains Mono', monospace" }}>{d.code}</span>}
                        </div>
                        <div className="text-xs font-bold mb-1" style={{ color: "var(--accent)" }}>
                          {d.type === "percent" || (d.type === "voucher" && d.value <= 100) ? `${d.value}% off` : fmt(d.value) + " off"}
                          {d.minPurchase > 0 && <span className="font-normal ml-1" style={{ color: "var(--muted-foreground)" }}>· min. {fmt(d.minPurchase)}</span>}
                        </div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                          {d.startDate} s/d {d.endDate}
                          {d.usageLimit > 0 && ` · ${d.usedCount}/${d.usageLimit} digunakan`}
                          {d.storeId !== "all" && ` · ${stores.find(s => s.id === d.storeId)?.name?.replace("NAND'S BOUTIQUE - ", "")}`}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {expired && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#ef4444" }}>Kedaluwarsa</span>}
                          {limitReached && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#ef4444" }}>Limit Tercapai</span>}
                          {!expired && !limitReached && (
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: d.active ? "#f0fdf4" : "#f3f4f6", color: d.active ? "#16a34a" : "#6b7280" }}>
                              {d.active ? "Aktif" : "Nonaktif"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {(canEdit || canDelete) && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!expired && !limitReached && canEdit && (
                          <button onClick={() => handleToggle(d.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ background: d.active ? "#f0fdf4" : "#f3f4f6" }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={d.active ? "#16a34a" : "#9ca3af"} strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => { setEditing({ ...d }); setIsNew(false); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(d.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada diskon</div>
            )}
          </div>
        </div>

        <Pagination
          total={filtered.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowLabel="diskon"
        />
      </div>

      {/* Edit Panel - desktop */}
      {editBody && (
        <div className="hidden lg:flex shrink-0 flex-col overflow-hidden w-[360px]" style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}>
          <div className="flex flex-col h-full overflow-y-auto">{editBody}</div>
        </div>
      )}

      {/* Edit Panel - mobile */}
      {editBody && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setEditing(null)} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden flex flex-col" style={{ background: "var(--card)", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-2.5 shrink-0" style={{ background: "var(--border)" }} />
            <div className="flex flex-col max-h-[88vh] overflow-y-auto">{editBody}</div>
          </div>
        </div>
      )}
    </div>
  );
}
