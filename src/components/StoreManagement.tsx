import { useState } from "react";
import type { Store } from "../data/types";

interface Props {
  stores: Store[];
  onSave: (stores: Store[]) => void;
  canEdit: boolean;
}

const empty = (): Store => ({ id: `s-${Date.now()}`, name: "NAND'S BOUTIQUE - ", address: "", phone: "", openHour: "08:00", closeHour: "21:00" });

export default function StoreManagement({ stores, onSave, canEdit }: Props) {
  const [editing, setEditing] = useState<Store | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSave = () => {
    if (!editing?.name.trim() || !editing?.address.trim()) return;
    if (isNew) onSave([...stores, editing]);
    else onSave(stores.map(s => s.id === editing!.id ? editing! : s));
    setEditing(null);
    setIsNew(false);
    showToast("Data toko disimpan");
  };

  const handleDelete = (id: string) => {
    if (stores.length <= 1) { showToast("Minimal 1 toko harus ada", false); return; }
    onSave(stores.filter(s => s.id !== id));
    setConfirmDelete(null);
    if (editing?.id === id) setEditing(null);
    showToast("Toko dihapus");
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>
          {toast}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }} className="mb-2">Hapus Toko?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Tindakan ini tidak dapat dibatalkan. Semua data terkait toko ini akan tetap ada.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between">
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Manajemen Toko</div>
            {canEdit && (
              <button onClick={() => { setEditing(empty()); setIsNew(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white"
                style={{ background: "var(--foreground)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Tambah Toko
              </button>
            )}
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto p-5">
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {stores.map((store, i) => (
              <div key={store.id} className="p-5 rounded-2xl transition-all"
                style={{ background: "var(--card)", border: `1.5px solid ${editing?.id === store.id ? "var(--accent)" : "var(--border)"}` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0" style={{ background: ["#7c3aed", "#2563eb", "#7c3aed", "#16a34a"][i % 4] }}>
                    {i + 1}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditing({ ...store }); setIsNew(false); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setConfirmDelete(store.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }}>
                        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }} className="mb-1">{store.name}</div>
                <div className="flex items-start gap-2 mb-1">
                  <svg width="12" height="12" className="shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{store.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg width="12" height="12" className="shrink-0" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{store.phone}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <svg width="12" height="12" className="shrink-0" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Operasional: <b className="font-mono">{store.openHour ?? "08:00"} – {store.closeHour ?? "21:00"}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Panel */}
      {editing && canEdit && (
        <div className="shrink-0 flex flex-col w-full lg:w-[340px]" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>{isNew ? "Tambah Toko" : "Edit Toko"}</div>
            <button onClick={() => setEditing(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="lg:flex-1 lg:overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {[
              { label: "Nama Toko", key: "name", placeholder: "NAND'S BOUTIQUE - Lokasi" },
              { label: "Alamat Lengkap", key: "address", placeholder: "Jl. ..." },
              { label: "No. Telepon", key: "phone", placeholder: "021-xxxxxxx" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
                <input
                  type="text"
                  value={(editing as any)[f.key]}
                  onChange={e => setEditing(prev => prev ? { ...prev, [f.key]: e.target.value } : null)}
                  placeholder={f.placeholder}
className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
              />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JAM BUKA</label>
                <input type="time" value={editing.openHour ?? "08:00"}
                  onChange={e => setEditing(prev => prev ? { ...prev, openHour: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                  style={{ background: "var(--background)", border: "1.5px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JAM TUTUP</label>
                <input type="time" value={editing.closeHour ?? "21:00"}
                  onChange={e => setEditing(prev => prev ? { ...prev, closeHour: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                  style={{ background: "var(--background)", border: "1.5px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={handleSave}
              disabled={!editing.name.trim() || !editing.address.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: editing.name.trim() && editing.address.trim() ? "var(--foreground)" : "var(--muted)", color: editing.name.trim() && editing.address.trim() ? "white" : "var(--muted-foreground)" }}
            >
              Simpan Toko
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
