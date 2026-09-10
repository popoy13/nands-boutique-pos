import { useState, useRef, useEffect } from "react";
import type { Store, Employee } from "../data/types";
import type { AppSettings } from "../data/settings";
import { defaultSettings } from "../data/settings";
import { ensureRoles, isBuiltinRole, MENU_ITEMS, slugifyRoleKey, ACTION_ITEMS, ACTION_LABELS, defaultPermissionsForMenus } from "../data/roles";

interface Props {
  settings: AppSettings;
  stores: Store[];
  employees: Employee[];
  onSaveSettings: (s: AppSettings) => void;
  onSaveStores: (stores: Store[]) => void;
  canEdit: boolean;
  permissions?: Record<string, string[]>;
}

type Tab = "printer" | "attendance" | "brand" | "roles" | "barcode";

const field = {
  background: "var(--background)",
  border: "1.5px solid var(--border)",
} as const;

const PALETTE = ["#7c3aed", "#2563eb", "#0d9488", "#16a34a", "#ea580c", "#db2777", "#ca8a04", "#4f46e5"];

export default function SettingsView({ settings, stores, employees, onSaveSettings, onSaveStores, canEdit, permissions }: Props) {
  const [tab, setTab] = useState<Tab>("printer");
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const logoRef = useRef<HTMLInputElement>(null);

  const canOpenTab = (id: Tab): boolean => {
    const acts = permissions?.settings;
    return !acts || acts.includes(id);
  };
  const allTabs: Tab[] = ["printer", "attendance", "roles", "barcode", "brand"];

  useEffect(() => {
    const acts = permissions?.settings;
    if (!acts) return;
    if (!acts.includes(tab)) {
      const first = allTabs.find(t => acts.includes(t));
      if (first) setTab(first);
    }
  }, [permissions, tab]);

  const [draftPrinter, setDraftPrinter] = useState({ ...settings.printer });
  const [draftBrand, setDraftBrand] = useState({ ...settings.brand });
  const [draftStores, setDraftStores] = useState<Store[]>(stores.map(s => ({ ...s, openHour: s.openHour ?? "08:00", closeHour: s.closeHour ?? "21:00" })));
  const [draftRoles, setDraftRoles] = useState(() => ensureRoles(settings.roles));
  const [draftBarcode, setDraftBarcode] = useState({ ...defaultSettings.barcode, ...settings.barcode });
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast(msg);
    setToastOk(ok);
    setTimeout(() => setToast(""), 3000);
  };

  if (!canEdit) {
    return (
      <div className="h-full overflow-y-auto px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Setelan</div>
        </div>
        <div className="max-w-2xl p-6 rounded-2xl text-center" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="text-3xl mb-2">🔒</div>
          <div className="text-sm font-semibold mb-1">Akses Terbatas</div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Hanya Admin atau Manager yang dapat mengubah setelan aplikasi.</div>
        </div>
      </div>
    );
  }

  const savePrinter = () => { onSaveSettings({ ...settings, printer: { ...draftPrinter, paperWidth: Number(draftPrinter.paperWidth) } }); showToast("Setelan printer disimpan"); };
  const saveBrand = () => { onSaveSettings({ ...settings, brand: draftBrand }); showToast("Menu utama diperbarui"); };
  const saveAttendance = () => { onSaveStores(draftStores); showToast("Jam operasional toko tersimpan"); };
  const saveRoles = () => { onSaveSettings({ ...settings, roles: draftRoles }); showToast("Role & otorisasi menu disimpan"); };
  const saveBarcode = () => { onSaveSettings({ ...settings, barcode: draftBarcode }); showToast("Setelan perangkat barcode disimpan"); };

  const setStoreDraft = (id: string, key: keyof Store, val: string) => {
    setDraftStores(prev => prev.map(s => s.id === id ? ({ ...s, [key]: val } as Store) : s));
  };

  const toggleMenu = (roleKey: string, menu: string) => {
    setDraftRoles(prev => {
      const cfg = prev[roleKey];
      if (!cfg) return prev;
      const locked = roleKey === "admin" && (menu === "settings" || menu === "employee");
      const has = cfg.menus.includes(menu);
      if (locked) return prev;
      const permissions = { ...(cfg.permissions ?? {}) };
      if (!has && !permissions[menu] && (ACTION_ITEMS[menu]?.length ?? 0) > 0) {
        permissions[menu] = [...ACTION_ITEMS[menu]];
      }
      return { ...prev, [roleKey]: { ...cfg, menus: has ? cfg.menus.filter(m => m !== menu) : [...cfg.menus, menu], permissions } };
    });
  };

  const toggleAction = (roleKey: string, menu: string, action: string) => {
    setDraftRoles(prev => {
      const cfg = prev[roleKey];
      if (!cfg) return prev;
      const locked = roleKey === "admin" && menu === "settings";
      if (locked) return prev;
      const permissions = { ...(cfg.permissions ?? {}) };
      const acts = permissions[menu] ? [...permissions[menu]] : [...(ACTION_ITEMS[menu] ?? [])];
      const has = acts.includes(action);
      permissions[menu] = has ? acts.filter(a => a !== action) : [...acts, action];
      return { ...prev, [roleKey]: { ...cfg, permissions } };
    });
  };

  const setRoleColor = (roleKey: string, color: string) => {
    setDraftRoles(prev => {
      const cfg = prev[roleKey];
      if (!cfg) return prev;
      return { ...prev, [roleKey]: { ...cfg, color } };
    });
  };

  const setRoleLabel = (roleKey: string, label: string) => {
    setDraftRoles(prev => {
      const cfg = prev[roleKey];
      if (!cfg) return prev;
      return { ...prev, [roleKey]: { ...cfg, label } };
    });
  };

  const handleAddRole = () => {
    const label = newRoleLabel.trim();
    const key = slugifyRoleKey(label);
    if (!key || !label) { showToast("Isi nama role terlebih dahulu", false); return; }
    if (key in draftRoles) { showToast(`Role "${label}" sudah ada`, false); return; }
    setDraftRoles(prev => ({ ...prev, [key]: { label, color: PALETTE[(Object.keys(prev).length) % PALETTE.length], menus: ["pos", "attendance"], permissions: defaultPermissionsForMenus(["pos", "attendance"]) } }));
    setNewRoleLabel("");
    showToast(`Role "${label}" ditambahkan`);
  };

  const handleDeleteRole = (roleKey: string) => {
    if (isBuiltinRole(roleKey)) { showToast("Role bawaan tidak dapat dihapus", false); return; }
    if (employees.some(e => e.role === roleKey)) { showToast("Role sedang dipakai karyawan. Ubah dulu jabatannya.", false); return; }
    setDraftRoles(prev => { const next = { ...prev }; delete next[roleKey]; return next; });
    showToast("Role dihapus");
  };

  const armDelete = (roleKey: string) => {
    if (confirmDel === roleKey) {
      handleDeleteRole(roleKey);
      setConfirmDel(null);
      if (confirmTimer.current) { clearTimeout(confirmTimer.current); confirmTimer.current = null; }
      return;
    }
    setConfirmDel(roleKey);
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirmDel(null), 2500);
  };

  const filteredRoles = Object.entries(draftRoles).filter(([key, cfg]) => {
    const q = roleSearch.trim().toLowerCase();
    if (!q) return true;
    return cfg.label.toLowerCase().includes(q) || key.toLowerCase().includes(q);
  });

  const toggle = (on: boolean, onChange: (v: boolean) => void) => (
    <button onClick={() => onChange(!on)}
      className="w-11 h-6 rounded-full relative transition-all shrink-0"
      style={{ background: on ? "var(--accent)" : "var(--muted)" }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all" style={{ left: on ? 22 : 2, background: "white" }} />
    </button>
  );

  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: toastOk ? "#16a34a" : "#ef4444" }}>
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Setelan</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {([
          { id: "printer", label: "Printer", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> },
          { id: "attendance", label: "Absensi", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
          { id: "roles", label: "Role & Menu", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
          { id: "barcode", label: "Perangkat Barcode", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V4a1 1 0 011-1h3M17 3h3a1 1 0 011 1v3m0 10v3a1 1 0 01-1 1h-3M7 21H4a1 1 0 01-1-1v-3M8 7h1v4H8zM12 7h1v4h-1zM16 7h1v4h-1zM8 13h1v4H8zM12 13h1v4h-1zM16 13h1v4h-1z" /></svg> },
          { id: "brand", label: "Menu Utama", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[])
          .filter(t => canOpenTab(t.id))
          .map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: tab === t.id ? "var(--foreground)" : "var(--card)", color: tab === t.id ? "white" : "var(--muted-foreground)", border: `1.5px solid ${tab === t.id ? "var(--foreground)" : "var(--border)"}` }}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* PRINTER */}
      {tab === "printer" && (
        <div className="max-w-2xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Setelan Printer</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Pengaturan pencetakan struk untuk kasir.</div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>NAMA PRINTER</label>
            <input type="text" value={draftPrinter.printerName} onChange={e => setDraftPrinter(p => ({ ...p, printerName: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>LEBAR KERTAS (MM)</label>
              <select value={draftPrinter.paperWidth} onChange={e => setDraftPrinter(p => ({ ...p, paperWidth: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field}>
                {[58, 72, 80].map(w => <option key={w} value={w}>{w} mm</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JUMLAH SALINAN</label>
              <select value={draftPrinter.copies} onChange={e => setDraftPrinter(p => ({ ...p, copies: Number(e.target.value) }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field}>
                {[1, 2, 3].map(c => <option key={c} value={c}>{c}x</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl mb-4" style={{ background: "var(--background)" }}>
            <div>
              <div className="text-sm font-semibold">Cetak otomatis</div>
              <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Struk langsung dicetak setelah pembayaran berhasil</div>
            </div>
            {toggle(draftPrinter.autoPrint, v => setDraftPrinter(p => ({ ...p, autoPrint: v })))}
          </div>

          <button onClick={savePrinter} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Setelan Printer
          </button>
        </div>
      )}

      {/* ATTENDANCE */}
      {tab === "attendance" && (
        <div className="max-w-2xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Jam Operasional Toko</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Atur jam buka/tutup tiap toko. Dipakai untuk menilai absensi karyawan di penempatannya.</div>

          <div className="flex flex-col gap-3 mb-5">
            {draftStores.map(s => (
              <div key={s.id} className="p-4 rounded-xl" style={{ background: "var(--background)" }}>
                <div className="text-sm font-semibold mb-3">{s.name.replace("NAND'S BOUTIQUE - ", "")}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JAM BUKA</label>
                    <input type="time" value={s.openHour} onChange={e => setStoreDraft(s.id, "openHour", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={field} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>JAM TUTUP</label>
                    <input type="time" value={s.closeHour} onChange={e => setStoreDraft(s.id, "closeHour", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={field} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={saveAttendance} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Jam Operasional
          </button>
        </div>
      )}

      {/* ROLE & MENU */}
      {tab === "roles" && (
        <div className="max-w-3xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Role & Otorisasi Menu</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>
            Tambah role karyawan baru dan atur menu mana saja yang boleh dilihat tiap role. Perubahan berlaku otomatis ke semua perangkat.
          </div>

          <div className="flex gap-2 mb-3">
            <input type="text" placeholder="Nama role baru (mis. Supervisor)" value={newRoleLabel}
              onChange={e => setNewRoleLabel(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddRole()}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
            <button onClick={handleAddRole} className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Tambah Role
            </button>
          </div>

          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Cari role..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)}
              className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none" style={field} />
            {roleSearch && (
              <button onClick={() => setRoleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }} title="Bersihkan">
                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-bold" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>DAFTAR ROLE</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>{filteredRoles.length} role</span>
          </div>

          <div className="flex flex-col gap-2">
            {filteredRoles.length === 0 && (
              <div className="text-center text-xs py-8 rounded-xl" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
                Role tidak ditemukan untuk kata kunci "{roleSearch.trim()}".
              </div>
            )}

            {filteredRoles.map(([roleKey, cfg]) => {
              const builtin = isBuiltinRole(roleKey);
              const inUse = employees.some(e => e.role === roleKey);
              const menuCount = MENU_ITEMS.filter(m => cfg.menus.includes(m.id)).length;
              const armed = confirmDel === roleKey;
              return (
                <div key={roleKey} className="p-3.5 rounded-xl flex items-center gap-3" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                  <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: cfg.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{cfg.label}</div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{roleKey}</span>
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>{menuCount} menu</span>
                      {builtin && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#2563eb" }}>Bawaan</span>}
                      {!builtin && inUse && <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#fef3c7", color: "#d97706" }}>dipakai {employees.filter(e => e.role === roleKey).length} karyawan</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setEditingRole(roleKey)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all"
                      style={{ background: "var(--foreground)" }}>
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Edit
                    </button>
                    {!builtin && (
                      <button onClick={() => armDelete(roleKey)} disabled={inUse}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: inUse ? "var(--muted)" : armed ? "#ef4444" : "#fef2f2", color: inUse ? "#9ca3af" : armed ? "white" : "#ef4444" }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        {armed ? "Yakin?" : "Hapus"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-4 z-10 flex justify-end mt-5">
            <button onClick={saveRoles}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all"
              style={{ background: "var(--foreground)", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)" }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
              Simpan Role & Otorisasi Menu
            </button>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {tab === "roles" && editingRole && draftRoles[editingRole] && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3" onClick={() => setEditingRole(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
          <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl p-5" style={{ background: "var(--card)", border: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16 }}>Edit Role</div>
              <button onClick={() => setEditingRole(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="text-xs mb-4 flex items-center gap-2" style={{ color: "var(--muted-foreground)" }}>
              <span className="w-3 h-3 rounded-full inline-block" style={{ background: draftRoles[editingRole].color }} />
              <span className="font-semibold" style={{ color: "var(--foreground)" }}>{draftRoles[editingRole].label}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>{editingRole}</span>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-bold mb-1.5" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>NAMA ROLE & WARNA</label>
              <div className="flex items-center gap-2.5 mb-2.5">
                <input type="text" value={draftRoles[editingRole].label} onChange={e => setRoleLabel(editingRole, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold outline-none" style={field} />
                <input type="color" value={draftRoles[editingRole].color} onChange={e => setRoleColor(editingRole, e.target.value)}
                  className="w-9 h-9 rounded-lg border-0 cursor-pointer shrink-0" style={{ background: "transparent" }} title="Warna custom" />
              </div>
              <div className="flex items-center gap-2">
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setRoleColor(editingRole, c)}
                    className="w-6 h-6 rounded-full transition-all"
                    style={{ background: c, outline: draftRoles[editingRole].color === c ? "2px solid var(--foreground)" : "2px solid transparent", outlineOffset: 2 }} />
                ))}
              </div>
            </div>

            <div className="text-[10px] font-bold mb-2" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>MENU YANG DITAMPILKAN</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
              {MENU_ITEMS.map(menu => {
                const on = draftRoles[editingRole].menus.includes(menu.id);
                const locked = editingRole === "admin" && (menu.id === "settings" || menu.id === "employee");
                return (
                  <div key={menu.id} onClick={locked ? undefined : () => toggleMenu(editingRole, menu.id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all select-none"
                    style={{ cursor: locked ? "not-allowed" : "pointer", background: on ? `${draftRoles[editingRole].color}14` : "var(--background)", border: `1px solid ${on ? draftRoles[editingRole].color : "var(--border)"}`, opacity: locked ? 0.75 : 1 }}>
                    <span className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0"
                      style={{ background: on ? draftRoles[editingRole].color : "var(--card)", border: `1.5px solid ${on ? draftRoles[editingRole].color : "var(--border)"}` }}>
                      {on && <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <span className="flex-1 text-[12px] font-semibold" style={{ color: on ? draftRoles[editingRole].color : "var(--foreground)" }}>{menu.label}</span>
                    {locked && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>Wajib</span>}
                  </div>
                );
              })}
            </div>

            {MENU_ITEMS.some(m => draftRoles[editingRole].menus.includes(m.id) && (ACTION_ITEMS[m.id]?.length ?? 0) > 0) && (
              <>
                <div className="text-[10px] font-bold mb-2" style={{ color: "var(--muted-foreground)", letterSpacing: "0.06em" }}>IZIN AKSES TOMBOL</div>
                <div className="flex flex-col gap-2 mb-4">
                  {MENU_ITEMS.filter(m => draftRoles[editingRole].menus.includes(m.id) && (ACTION_ITEMS[m.id]?.length ?? 0) > 0).map(menu => {
                    const acts = draftRoles[editingRole].permissions?.[menu.id];
                    const actList = ACTION_ITEMS[menu.id];
                    const locked = editingRole === "admin" && menu.id === "settings";
                    const enabledCount = actList.filter(a => acts?.includes(a) ?? true).length;
                    return (
                      <div key={menu.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", opacity: locked ? 0.7 : 1 }}>
                        <div className="flex items-center justify-between px-3 py-2" style={{ background: `${draftRoles[editingRole].color}10` }}>
                          <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: draftRoles[editingRole].color }}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: draftRoles[editingRole].color }} />
                            <span className="uppercase">{menu.label}</span>
                          </div>
                          <span className="text-[9px] font-semibold" style={{ color: locked ? "var(--muted-foreground)" : draftRoles[editingRole].color }}>
                            {locked ? "Wajib" : `${enabledCount}/${actList.length}`}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2" style={{ background: "var(--card)" }}>
                          {actList.map(action => {
                            const on = acts?.includes(action) ?? true;
                            return (
                              <button key={action} onClick={() => toggleAction(editingRole, menu.id, action)} disabled={locked}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-medium text-left transition-all select-none disabled:cursor-not-allowed"
                                style={{ background: on ? `${draftRoles[editingRole].color}12` : "var(--background)", border: `1px solid ${on ? draftRoles[editingRole].color : "var(--border)"}`, color: on ? draftRoles[editingRole].color : "var(--muted-foreground)" }}>
                                <span className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                                  style={{ background: on ? draftRoles[editingRole].color : "transparent", border: `1.5px solid ${on ? draftRoles[editingRole].color : "var(--border)"}` }}>
                                  {on && <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                </span>
                                <span className="flex-1 truncate">{ACTION_LABELS[menu.id]?.[action] ?? action}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Perubahan otomatis tampil pada tombol "Simpan Role"</span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditingRole(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{ background: "var(--muted)", color: "var(--foreground)" }}>Batal</button>
                <button onClick={() => { setEditingRole(null); showToast("Perubahan role disimpan"); }} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>Selesai</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARCODE DEVICE */}
      {tab === "barcode" && (
        <div className="max-w-2xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Perangkat Barcode</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>
            Atur cara barcode dibaca saat transaksi di menu Kasir (scan barcode).
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>METODE PEMINDAIAN</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { id: "camera", label: "Kamera", desc: "Pindai lewat kamera HP/tablet (modal scan)" },
                { id: "keyboard", label: "Scanner Eksternal", desc: "Perangkat USB/Bluetooth tipe keyboard-wedge" },
              ] as { id: "camera" | "keyboard"; label: string; desc: string }[]).map(m => (
                <button key={m.id} onClick={() => setDraftBarcode(b => ({ ...b, mode: m.id }))}
                  className="flex-1 flex flex-col gap-0.5 p-3.5 rounded-xl text-left transition-all"
                  style={{ background: draftBarcode.mode === m.id ? "var(--foreground)" : "var(--background)", border: `1.5px solid ${draftBarcode.mode === m.id ? "var(--foreground)" : "var(--border)"}`, color: draftBarcode.mode === m.id ? "white" : "var(--foreground)" }}>
                  <span className="text-sm font-semibold">{m.label}</span>
                  <span className="text-[11px]" style={{ color: draftBarcode.mode === m.id ? "rgba(255,255,255,0.6)" : "var(--muted-foreground)" }}>{m.desc}</span>
                </button>
              ))}
            </div>
            <div className="text-[11px] mt-2 px-3 py-2 rounded-lg" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
              Mode Scanner Eksternal: arahkan scanner ke code barcode di mana saja di menu Kasir — otomatis ditambahkan ke keranjang tanpa perlu klik.
            </div>
          </div>

          <div className="flex flex-col gap-3 mb-5">
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div>
                <div className="text-sm font-semibold">Bip suara</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Bunyi pendek saat barcode berhasil terbaca</div>
              </div>
              {toggle(draftBarcode.beep, v => setDraftBarcode(b => ({ ...b, beep: v })))}
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div>
                <div className="text-sm font-semibold">Getar</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Perangkat bergetar saat barcode berhasil terbaca</div>
              </div>
              {toggle(draftBarcode.vibrate, v => setDraftBarcode(b => ({ ...b, vibrate: v })))}
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div>
                <div className="text-sm font-semibold">Enter mengakhiri scan</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Scanner keyboard-wedge yang mengirim Enter di akhir kode</div>
              </div>
              {toggle(draftBarcode.enterEndsScan, v => setDraftBarcode(b => ({ ...b, enterEndsScan: v })))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>AWALAN DIBUANG</label>
              <input type="text" placeholder="contoh: A1" value={draftBarcode.stripPrefix} onChange={e => setDraftBarcode(b => ({ ...b, stripPrefix: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={field} />
              <div className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>Karakter di awal kode yang diabaikan</div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>AKHIRAN DIBUANG</label>
              <input type="text" placeholder="contoh: ZZ" value={draftBarcode.stripSuffix} onChange={e => setDraftBarcode(b => ({ ...b, stripSuffix: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={field} />
              <div className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>Karakter di akhir kode yang diabaikan</div>
            </div>
          </div>

          <button onClick={saveBarcode} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Setelan Perangkat Barcode
          </button>
        </div>
      )}

      {/* BRAND / MAIN MENU */}
      {tab === "brand" && (
        <div className="max-w-2xl p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Menu Utama</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Ubah logo, nama, dan deskripsi aplikasi.</div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>LOGO</label>
            <div className="flex items-center gap-4">
              <img src={draftBrand.logo} alt="Logo" className="w-16 h-16 rounded-2xl object-cover shrink-0" style={{ background: "var(--secondary)" }} />
              <div className="flex flex-col gap-2">
                <input ref={logoRef} type="file" accept="image/*" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => { setDraftBrand(b => ({ ...b, logo: ev.target?.result as string })); };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }} />
                <button onClick={() => logoRef.current?.click()} className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                  Unggah Logo
                </button>
                <button onClick={() => setDraftBrand(b => ({ ...b, logo: defaultSettings.brand.logo }))}
                  className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--secondary)" }}>
                  Reset Logo
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>NAMA APLIKASI</label>
            <input type="text" value={draftBrand.name} onChange={e => setDraftBrand(b => ({ ...b, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>DESKRIPSI / TAGLINE</label>
            <input type="text" value={draftBrand.tagline} onChange={e => setDraftBrand(b => ({ ...b, tagline: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
          </div>

          <button onClick={saveBrand} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Menu Utama
          </button>
        </div>
      )}
    </div>
  );
}