import { useState } from "react";
import type { Member } from "../data/types";
import { TIER_COLOR, getTier, generateMemberId } from "../data/members";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface Props {
  members: Member[];
  stores: { id: string; name: string }[];
  onSave: (members: Member[]) => void;
  canEdit: boolean;
}

const TIER_LABEL = { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum" };

const empty = (storeId: string): Member => ({
  id: generateMemberId(),
  name: "",
  phone: "",
  email: "",
  tier: "bronze",
  points: 0,
  totalSpend: 0,
  joinDate: new Date().toISOString().slice(0, 10),
  storeId,
  note: "",
});

export default function MemberView({ members, stores, onSave, canEdit }: Props) {
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const filtered = members.filter(m =>
    (filterTier === "all" || m.tier === filterTier) &&
    (filterStore === "all" || m.storeId === filterStore) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search))
  );

  const handleSave = () => {
    if (!editing?.name.trim() || !editing.phone.trim()) return;
    const updated = { ...editing, tier: getTier(editing.totalSpend) };
    const saves = isNew ? [...members, updated] : members.map(m => m.id === updated.id ? updated : m);
    onSave(saves);
    setEditing(null);
    setIsNew(false);
    showToast("Data member disimpan");
  };

  const handleDelete = (id: string) => {
    onSave(members.filter(m => m.id !== id));
    if (editing?.id === id) setEditing(null);
    showToast("Member dihapus");
  };

  const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  members.forEach(m => { tierCounts[m.tier]++; });

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>{toast}</div>}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Member?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Tindakan ini tidak dapat dibatalkan.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => { handleDelete(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Program Member</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{members.length} total member</div>
            </div>
            {canEdit && (
              <button onClick={() => { setEditing(empty(stores[0]?.id ?? "s1")); setIsNew(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Daftar Member
              </button>
            )}
          </div>

          {/* Tier summary */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {(["bronze", "silver", "gold", "platinum"] as const).map(tier => (
              <div key={tier} className="p-2.5 rounded-xl text-center" style={{ background: TIER_COLOR[tier].bg, border: `1px solid ${TIER_COLOR[tier].border}20` }}>
                <div className="text-lg font-bold" style={{ color: TIER_COLOR[tier].text }}>{tierCounts[tier]}</div>
                <div className="text-xs font-medium" style={{ color: TIER_COLOR[tier].text }}>{TIER_LABEL[tier]}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1" style={{ minWidth: 160 }}>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Cari nama atau no. HP..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            </div>
            <select value={filterTier} onChange={e => setFilterTier(e.target.value)}
              className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Tier</option>
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="platinum">Platinum</option>
            </select>
            <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
              className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada member</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(m => {
                const tc = TIER_COLOR[m.tier];
                return (
                  <div key={m.id} className="p-4 rounded-xl flex items-center gap-4 transition-all"
                    style={{ background: editing?.id === m.id ? "rgba(124,58,237,0.04)" : "var(--card)", border: `1.5px solid ${editing?.id === m.id ? "var(--accent)" : "var(--border)"}` }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: tc.bg, color: tc.text, border: `2px solid ${tc.border}` }}>
                      {m.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-sm font-semibold">{m.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: tc.bg, color: tc.text }}>{TIER_LABEL[m.tier]}</span>
                      </div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{m.phone} · {m.email}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                        ID: <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.id}</span>
                        {" · "}Total: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{fmt(m.totalSpend)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="font-mono font-bold text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{m.points} pts</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>bergabung {m.joinDate}</div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => { setEditing({ ...m }); setIsNew(false); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setConfirmDelete(m.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      {editing && (
        <div className="shrink-0 flex flex-col overflow-hidden w-full lg:w-[340px]" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>{isNew ? "Daftar Member" : "Edit Member"}</div>
            <button onClick={() => setEditing(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {[
              { label: "Nama Lengkap", key: "name", type: "text" },
              { label: "No. HP", key: "phone", type: "text" },
              { label: "Email", key: "email", type: "email" },
              { label: "Tanggal Bergabung", key: "joinDate", type: "date" },
              { label: "Total Belanja (Rp)", key: "totalSpend", type: "number" },
              { label: "Poin", key: "points", type: "number" },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
                <input type={f.type} value={(editing as any)[f.key]}
                  onChange={e => setEditing(p => p ? { ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>TOKO ASAL</label>
              <select value={editing.storeId} onChange={e => setEditing(p => p ? { ...p, storeId: e.target.value } : null)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>CATATAN</label>
              <textarea value={editing.note} onChange={e => setEditing(p => p ? { ...p, note: e.target.value } : null)}
                rows={2} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
            </div>

            {/* Tier preview */}
            <div className="p-3 rounded-xl" style={{ background: TIER_COLOR[getTier(editing.totalSpend)].bg }}>
              <div className="text-xs font-semibold mb-0.5" style={{ color: TIER_COLOR[getTier(editing.totalSpend)].text }}>
                Tier: {TIER_LABEL[getTier(editing.totalSpend)]}
              </div>
              <div className="text-xs" style={{ color: TIER_COLOR[getTier(editing.totalSpend)].text, opacity: 0.8 }}>
                Berdasarkan total belanja {fmt(editing.totalSpend)}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <button onClick={handleSave} disabled={!editing.name.trim() || !editing.phone.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: editing.name.trim() && editing.phone.trim() ? "var(--foreground)" : "var(--muted)", color: editing.name.trim() && editing.phone.trim() ? "white" : "var(--muted-foreground)" }}>
              Simpan Member
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
