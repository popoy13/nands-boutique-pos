import { useEffect, useState } from "react";
import type { Expense } from "../data/types";
import { todayISO } from "../lib/dates";
import Pagination from "./Pagination";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface Props {
  expenses: Expense[];
  stores: { id: string; name: string }[];
  onSave: (expenses: Expense[]) => void;
  onDelete?: (id: string) => void;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const empty = (): Expense => ({
  id: `exp-${Date.now()}`,
  storeId: "",
  storeName: "",
  amount: 0,
  description: "",
  createdByName: "",
  date: todayISO(),
});

export default function ExpenseView({ expenses, stores, onSave, onDelete, canAdd = true, canEdit = true, canDelete = true }: Props) {
  const [editing, setEditing] = useState<Expense | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editing]);
  const [isNew, setIsNew] = useState(false);
  const [filterStore, setFilterStore] = useState("all");
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetPage = () => setPage(1);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const filtered = expenses.filter(e => filterStore === "all" || e.storeId === filterStore);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const totalAmount = filtered.reduce((s, e) => s + e.amount, 0);

  const handleSave = () => {
    if (!editing || !editing.storeId) return;
    const clean = { ...editing, storeName: stores.find(s => s.id === editing.storeId)?.name ?? editing.storeName, amount: Math.max(0, editing.amount) };
    const updated = isNew ? [...expenses, clean] : expenses.map(e => e.id === editing!.id ? clean : e);
    onSave(updated);
    setEditing(null);
    setIsNew(false);
    showToast(isNew ? "Pengeluaran ditambahkan" : "Pengeluaran diperbarui");
  };

  const handleDelete = (id: string) => {
    onSave(expenses.filter(e => e.id !== id));
    onDelete?.(id);
    if (editing?.id === id) setEditing(null);
    showToast("Pengeluaran dihapus");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>{toast}</div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Pengeluaran?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Tindakan ini tidak dapat dibatalkan.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => { handleDelete(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden my-6 mx-4" style={{ background: "var(--card)" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }}>
                {isNew ? "Tambah Pengeluaran" : "Edit Pengeluaran"}
              </div>
              <button onClick={() => { setEditing(null); setIsNew(false); }}
                className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Tanggal</div>
                <input type="date" value={editing.date} onChange={e => setEditing(p => p ? { ...p, date: e.target.value } : null)}
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
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Jumlah (Rp)</div>
                <input type="number" min={0} value={editing.amount || ""} onChange={e => setEditing(p => p ? { ...p, amount: Number(e.target.value) } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Keterangan</div>
                <textarea value={editing.description} onChange={e => setEditing(p => p ? { ...p, description: e.target.value } : null)}
                  rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              </div>
              <div>
                <div className="text-xs font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>Dibuat oleh</div>
                <input type="text" value={editing.createdByName} onChange={e => setEditing(p => p ? { ...p, createdByName: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }} />
              </div>
            </div>

            <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
              <button onClick={handleSave} disabled={!editing.storeId}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: editing.storeId ? "var(--foreground)" : "var(--muted)", color: editing.storeId ? "white" : "var(--muted-foreground)" }}>
                Simpan Pengeluaran
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Pengeluaran</div>
            {canAdd && (
              <button onClick={() => { setEditing(empty()); setIsNew(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: "var(--foreground)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Catat Pengeluaran
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStore} onChange={e => { setFilterStore(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-medium outline-none" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
              <option value="all">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
            </select>
            <span className="text-xs px-3 py-1.5 rounded-full font-medium" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
              {filtered.length} catatan Â· Total {fmt(totalAmount)}
            </span>
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto p-5">
          <div className="flex flex-col gap-3">
            {pageItems.length === 0 && (
              <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>
                Belum ada catatan pengeluaran.
              </div>
            )}
            {pageItems.map(e => (
              <div key={e.id} className="p-4 rounded-2xl" style={{ background: "var(--card)", border: `1.5px solid ${editing?.id === e.id ? "var(--accent)" : "var(--border)"}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base" style={{ background: "#fef3c7", color: "#d97706" }}>
                      Rp
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold">{fmt(e.amount)}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>{e.storeName?.replace("NAND'S BOUTIQUE - ", "")}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {e.date}
                        {e.description && <span className="ml-1">Â· {e.description}</span>}
                      </div>
                      {(e.photo || e.createdByName) && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                          {e.createdByName && <span>Oleh {e.createdByName}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canEdit && (
                        <button onClick={() => { setEditing({ ...e }); setIsNew(false); }}
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

        {filtered.length > pageSize && (
          <div className="px-5 py-3 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center justify-between gap-3">
              <Pagination current={safePage} total={totalPages} onPageChange={setPage} />
              <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="px-2 py-1.5 rounded-lg text-xs outline-none" style={{ background: "var(--muted)", color: "var(--foreground)" }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
