import { useState, useRef, useEffect } from "react";
import type { Store, Employee, Product, Member, Discount, Transaction, AttendanceRecord, DeletedTransaction } from "../data/types";
import type { AppSettings, PrinterSettings, PaymentMethodKind, PaymentSettings } from "../data/settings";
import { defaultSettings } from "../data/settings";
import { ensureRoles, isBuiltinRole, MENU_ITEMS, slugifyRoleKey, ACTION_ITEMS, ACTION_LABELS, defaultPermissionsForMenus } from "../data/roles";
import { compressImage } from "../lib/compressImage";
import { validateImageFile } from "../lib/imageFile";
import { assetUrl } from "../lib/assets";
import type { ResetResult } from "../data/sync";

interface Props {
  settings: AppSettings;
  stores: Store[];
  employees: Employee[];
  onSaveSettings: (s: AppSettings) => void;
  onSaveStores: (stores: Store[]) => void;
  canEdit: boolean;
  currentUser?: Employee | null;
  permissions?: Record<string, string[]>;
  products: Product[];
  members: Member[];
  discounts: Discount[];
  transactions: Transaction[];
  deletedTransactions: DeletedTransaction[];
  attendance: AttendanceRecord[];
  onResetProducts: () => Promise<ResetResult>;
  onResetMembers: () => Promise<ResetResult>;
  onResetDiscounts: () => Promise<ResetResult>;
  onResetStores: () => Promise<ResetResult>;
  onResetEmployees: () => Promise<ResetResult>;
  onResetTransactions: (ids: string[]) => Promise<ResetResult>;
  onResetDeletedTransactions: () => Promise<ResetResult>;
  onResetAttendance: (ids: string[]) => Promise<ResetResult>;
  onResetChat: () => Promise<ResetResult>;
}

type Tab = "printer" | "attendance" | "pembayaran" | "brand" | "roles" | "barcode" | "reset";

const field = {
  background: "var(--background)",
  border: "1.5px solid var(--border)",
} as const;

const PALETTE = ["#7c3aed", "#2563eb", "#0d9488", "#16a34a", "#ea580c", "#db2777", "#ca8a04", "#4f46e5"];

function ResetButton({ label, onReset }: { label: string; onReset: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button onClick={() => {
      if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 3000); return; }
      setArmed(false);
      void onReset();
    }}
      className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all shrink-0"
      style={{ background: armed ? "#dc2626" : "#ef4444" }}>
      {armed ? "Yakin? Tekan lagi" : label}
    </button>
  );
}

const isoDay = (dt: Date): string =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

function ReceiptPreview({ printer, brandName }: { printer: PrinterSettings; brandName: string }) {
  const now = new Date();
  const width = printer.paperWidth || 80;
  const pxPerMm = 3.7795;
  const scale = Math.min(1, 400 / (width * pxPerMm));
  const px = Math.round(width * pxPerMm * scale);
  const fontPx = Math.max(7, Math.round((width <= 58 ? 0.11 : 0.13) * width * scale));
  const items = [
    { name: "Kaos Polos Premium", color: "Putih", size: "L", qty: 2, price: 85000, subtotal: 170000 },
    { name: "Jeans Slim Fit", color: "Navy", size: "32", qty: 1, price: 185000, subtotal: 185000 },
  ];
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const discount = 15000;
  const tax = Math.round((subtotal - discount) * 0.1);
  const total = subtotal - discount + tax;
  const payment = 400000;
  const change = payment - total;
  const fmt = (n: number) => n.toLocaleString("id-ID");
  const div = <div style={{ borderTop: "1px dashed rgba(0,0,0,0.7)", margin: "5px 0" }} />;
  return (
    <div className="font-mono" style={{ width: px, background: "#fff", color: "#000", fontSize: `${fontPx}px`, lineHeight: 1.55, padding: `${Math.round(9 * scale)}px`, boxShadow: "0 8px 24px rgba(0,0,0,0.22)", borderRadius: 5 }}>
      {printer.receiptLogo && (
        <div className="text-center"><img src={assetUrl(printer.receiptLogo)} alt="Logo" style={{ maxWidth: "72%", maxHeight: Math.max(24, Math.round(40 * scale)), objectFit: "contain" }} /></div>
      )}
      <div className="text-center"><b>{brandName}</b><br />TOKO CENTRAL<br /></div>
      {div}
      <div>No: TRX-20260916-0001</div>
      {printer.showDate !== false && <div>Tgl: {now.toLocaleDateString("id-ID")}</div>}
      {printer.showTime !== false && <div>Jam: {now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>}
      {printer.showCashier !== false && <div>Kasir: Andi</div>}
      {div}
      {items.map(i => (
        <div key={i.name}>
          <div>{i.name} ({i.color}/{i.size})</div>
          <div className="flex justify-between"><span>{i.qty} x {fmt(i.price)}</span><span>{fmt(i.subtotal)}</span></div>
        </div>
      ))}
      {div}
      <div className="flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
      <div className="flex justify-between"><span>Diskon</span><span>-{fmt(discount)}</span></div>
      {printer.showTax !== false && <div className="flex justify-between"><span>Pajak 10%</span><span>{fmt(tax)}</span></div>}
      <div className="flex justify-between font-bold"><span>TOTAL</span><span>{fmt(total)}</span></div>
      <div className="flex justify-between"><span>Bayar (Tunai)</span><span>{fmt(payment)}</span></div>
      {printer.showChange !== false && <div className="flex justify-between"><span>Kembalian</span><span>{fmt(change)}</span></div>}
      {printer.footerText && (
        <>
          {div}
          <div className="text-center">{printer.footerText.split("\n").map((l, i) => <div key={i}>{l}</div>)}</div>
        </>
      )}
    </div>
  );
}

export default function SettingsView({ settings, stores, employees, onSaveSettings, onSaveStores, canEdit, currentUser, permissions, products, members, discounts, transactions, deletedTransactions, attendance, onResetProducts, onResetMembers, onResetDiscounts, onResetStores, onResetEmployees, onResetTransactions, onResetDeletedTransactions, onResetAttendance, onResetChat }: Props) {
  const [tab, setTab] = useState<Tab>("printer");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const logoRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef<HTMLInputElement>(null);
  const receiptLogoRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.role === "admin";

  const canOpenTab = (id: Tab): boolean => {
    if (id === "reset") return isAdmin;
    const acts = permissions?.settings;
    return !acts || acts.includes(id);
  };
  const allTabs: Tab[] = ["printer", "attendance", "roles", "barcode", "pembayaran", "brand", "reset"];

  useEffect(() => {
    if (tab === "reset" && isAdmin) return;
    const acts = permissions?.settings;
    if (!acts) return;
    if (!acts.includes(tab)) {
      const first = allTabs.find(t => t !== "reset" && acts.includes(t));
      if (first) setTab(first);
    }
  }, [permissions, tab, isAdmin]);

  const [draftPrinter, setDraftPrinter] = useState({ ...settings.printer });
  const [draftBrand, setDraftBrand] = useState({ ...settings.brand });
  const [draftPayments, setDraftPayments] = useState<PaymentSettings>(() => ({
    methods: settings.payments.methods.map(m => ({ ...m })),
    tax: { ...settings.payments.tax },
    rounding: { ...settings.payments.rounding },
  }));
  const [payLabel, setPayLabel] = useState("");
  const [payKind, setPayKind] = useState<PaymentMethodKind>("cash");
  const [draftStores, setDraftStores] = useState<Store[]>(stores.map(s => ({ ...s, openHour: s.openHour ?? "08:00", closeHour: s.closeHour ?? "21:00" })));
  const [draftRoles, setDraftRoles] = useState(() => ensureRoles(settings.roles));
  const [draftBarcode, setDraftBarcode] = useState({ ...defaultSettings.barcode, ...settings.barcode });
  const [resetTrxFrom, setResetTrxFrom] = useState("");
  const [resetTrxTo, setResetTrxTo] = useState("");
  const [resetAttFrom, setResetAttFrom] = useState("");
  const [resetAttTo, setResetAttTo] = useState("");
  const [resetAttEmp, setResetAttEmp] = useState("");
  const [resetAttStore, setResetAttStore] = useState("");

  // Sinkronkan draft dengan data terbaru dari perangkat lain (realtime broadcast),
  // tanpa merusak nilai yang baru saja disimpan.
  useEffect(() => { setDraftPrinter({ ...settings.printer }); }, [settings.printer]);
  useEffect(() => { setDraftBrand({ ...settings.brand }); }, [settings.brand]);
  useEffect(() => {
    setDraftPayments({
      methods: settings.payments.methods.map(m => ({ ...m })),
      tax: { ...settings.payments.tax },
      rounding: { ...settings.payments.rounding },
    });
  }, [settings.payments]);
  useEffect(() => { setDraftBarcode({ ...defaultSettings.barcode, ...settings.barcode }); }, [settings.barcode]);
  useEffect(() => {
    setDraftStores(stores.map(s => ({ ...s, openHour: s.openHour ?? "08:00", closeHour: s.closeHour ?? "21:00" })));
  }, [stores]);
  useEffect(() => { setDraftRoles(ensureRoles(settings.roles)); }, [settings.roles]);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const showToast = (msg: string, ok = true) => {
    setToast(msg);
    setToastOk(ok);
    setTimeout(() => setToast(""), 3000);
  };

  if (!canEdit) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-5">
          <div className="mb-4" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Setelan</div>
          <div className="w-full p-6 rounded-2xl text-center" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <div className="text-3xl mb-2">🔒</div>
            <div className="text-sm font-semibold mb-1">Akses Terbatas</div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Hanya Admin atau Manager yang dapat mengubah setelan aplikasi.</div>
          </div>
        </div>
      </div>
    );
  }

  const savePrinter = () => { onSaveSettings({ ...settings, printer: { ...draftPrinter, paperWidth: Number(draftPrinter.paperWidth) } }); showToast("Setelan printer disimpan"); };
  const saveBrand = () => { onSaveSettings({ ...settings, brand: draftBrand }); showToast("Menu utama diperbarui"); };
  const saveAttendance = () => { onSaveStores(draftStores); showToast("Jam operasional toko tersimpan"); };
  const saveBarcode = () => { onSaveSettings({ ...settings, barcode: draftBarcode }); showToast("Setelan perangkat barcode disimpan"); };
  const savePayments = () => {
    const label = draftPayments.tax.enabled ? `Pajak ${draftPayments.tax.rate}%` : "Pajak";
    const withLabel: PaymentSettings = {
      methods: draftPayments.methods.filter(m => m.label.trim() !== ""),
      tax: { ...draftPayments.tax, rate: Math.max(0, Math.min(100, Math.round(Number(draftPayments.tax.rate) || 0))), label },
      rounding: { enabled: draftPayments.rounding.enabled, step: Number(draftPayments.rounding.step) || 0 },
    };
    if (withLabel.methods.filter(m => m.enabled).length === 0) { showToast("Minimal satu metode pembayaran aktif", false); return; }
    onSaveSettings({ ...settings, payments: withLabel });
    showToast("Setelan pembayaran disimpan");
  };

  const addPaymentMethod = () => {
    const label = payLabel.trim();
    if (!label) { showToast("Masukkan nama metode pembayaran", false); return; }
    if (draftPayments.methods.some(m => m.label.trim().toLowerCase() === label.toLowerCase())) { showToast("Metode tersebut sudah ada", false); return; }
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "metode";
    let id = base;
    let i = 1;
    while (draftPayments.methods.some(m => m.id === id)) { id = `${base}_${i}`; i++; }
    setDraftPayments(p => ({ ...p, methods: [...p.methods, { id, label, kind: payKind, enabled: true }] }));
    setPayLabel("");
    showToast(`Metode "${label}" ditambahkan`);
  };

  const updatePayMethod = (id: string, patch: Partial<{ label: string; kind: PaymentMethodKind; enabled: boolean }>) =>
    setDraftPayments(p => ({ ...p, methods: p.methods.map(m => m.id === id ? { ...m, ...patch } : m) }));

  const deletePayMethod = (id: string) => {
    if (draftPayments.methods.filter(m => m.enabled).length <= 1 && draftPayments.methods.find(m => m.id === id)?.enabled) {
      showToast("Minimal satu metode pembayaran aktif", false);
      return;
    }
    setDraftPayments(p => ({ ...p, methods: p.methods.filter(m => m.id !== id) }));
  };

  const finishReset = (res: ResetResult, okMsg: string) =>
    showToast(res.ok ? okMsg : (res.msg || "Gagal menghapus data"), res.ok);

  const resetTrxAll = () => {
    if (!transactions.length && !deletedTransactions.length) { showToast("Tidak ada data transaksi untuk dihapus", false); return; }
    void onResetTransactions(transactions.map(t => t.id))
      .then(res => {
        finishReset(res, `Semua transaksi (${transactions.length}) dihapus`);
        if (res.ok) return onResetDeletedTransactions();
      })
      .then(r2 => { if (r2 && !r2.ok) showToast(r2.msg || "Gagal menghapus riwayat terhapus", false); });
  };

  const resetDeletedAll = () =>
    void onResetDeletedTransactions()
      .then(res => finishReset(res, `Semua riwayat terhapus (${deletedTransactions.length}) dihapus permanen`));

  const resetTrxRange = () => {
    const from = resetTrxFrom.trim(), to = resetTrxTo.trim();
    if (!from || !to) { showToast("Isi tanggal awal dan akhir terlebih dahulu", false); return; }
    if (from > to) { showToast("Tanggal awal harus sebelum tanggal akhir", false); return; }
    const ids = transactions.filter(t => { const k = isoDay(t.date); return k >= from && k <= to; }).map(t => t.id);
    if (!ids.length) { showToast("Tidak ada transaksi pada rentang tanggal tersebut", false); return; }
    void onResetTransactions(ids).then(res => finishReset(res, `Transaksi (${ids.length}) dihapus`));
  };

  const resetAttAll = () =>
    void onResetAttendance(attendance.map(r => r.id))
      .then(res => finishReset(res, `Semua riwayat absensi (${attendance.length}) dihapus`));

  const resetAttRange = () => {
    const from = resetAttFrom.trim(), to = resetAttTo.trim();
    if (!from || !to) { showToast("Isi tanggal awal dan akhir terlebih dahulu", false); return; }
    if (from > to) { showToast("Tanggal awal harus sebelum tanggal akhir", false); return; }
    const ids = attendance.filter(r => {
      if (r.date < from || r.date > to) return false;
      if (resetAttEmp && r.employeeId !== resetAttEmp) return false;
      if (resetAttStore && r.storeId !== resetAttStore) return false;
      return true;
    }).map(r => r.id);
    if (!ids.length) { showToast("Tidak ada riwayat absensi sesuai filter", false); return; }
    void onResetAttendance(ids).then(res => finishReset(res, `Riwayat absensi (${ids.length}) dihapus`));
  };

  const resetOne = (label: string, fn: () => Promise<ResetResult>) =>
    void fn().then(res => finishReset(res, `${label} berhasil dihapus`));

  const commitRoles = (updated: AppSettings["roles"]) => {
    setDraftRoles(updated);
    onSaveSettings({ ...settingsRef.current, roles: updated });
  };

  const setStoreDraft = (id: string, key: keyof Store, val: string) => {
    setDraftStores(prev => prev.map(s => s.id === id ? ({ ...s, [key]: val } as Store) : s));
  };

  const toggleMenu = (roleKey: string, menu: string) => {
    const cfg = draftRoles[roleKey];
    if (!cfg) return;
    const has = cfg.menus.includes(menu);
    const permissions = { ...(cfg.permissions ?? {}) };
    if (!has && !permissions[menu] && (ACTION_ITEMS[menu]?.length ?? 0) > 0) {
      permissions[menu] = [...ACTION_ITEMS[menu]];
    }
    commitRoles({ ...draftRoles, [roleKey]: { ...cfg, menus: has ? cfg.menus.filter(m => m !== menu) : [...cfg.menus, menu], permissions } });
  };

  const toggleAction = (roleKey: string, menu: string, action: string) => {
    const cfg = draftRoles[roleKey];
    if (!cfg) return;
    const permissions = { ...(cfg.permissions ?? {}) };
    const acts = permissions[menu] ? [...permissions[menu]] : [...(ACTION_ITEMS[menu] ?? [])];
    const has = acts.includes(action);
    permissions[menu] = has ? acts.filter(a => a !== action) : [...acts, action];
    commitRoles({ ...draftRoles, [roleKey]: { ...cfg, permissions } });
  };

  const setRoleColor = (roleKey: string, color: string) => {
    const cfg = draftRoles[roleKey];
    if (!cfg) return;
    commitRoles({ ...draftRoles, [roleKey]: { ...cfg, color } });
  };

  const setRoleLabel = (roleKey: string, label: string) => {
    const cfg = draftRoles[roleKey];
    if (!cfg) return;
    commitRoles({ ...draftRoles, [roleKey]: { ...cfg, label } });
  };

  const handleAddRole = () => {
    const label = newRoleLabel.trim();
    const key = slugifyRoleKey(label);
    if (!key || !label) { showToast("Isi nama role terlebih dahulu", false); return; }
    if (key in draftRoles) { showToast(`Role "${label}" sudah ada`, false); return; }
    commitRoles({ ...draftRoles, [key]: { label, color: PALETTE[Object.keys(draftRoles).length % PALETTE.length], menus: ["pos", "attendance"], permissions: defaultPermissionsForMenus(["pos", "attendance"]) } });
    setNewRoleLabel("");
    showToast(`Role "${label}" ditambahkan`);
  };

  const handleDeleteRole = (roleKey: string) => {
    if (isBuiltinRole(roleKey)) { showToast("Role bawaan tidak dapat dihapus", false); return; }
    if (employees.some(e => e.role === roleKey)) { showToast("Role sedang dipakai karyawan. Ubah dulu jabatannya.", false); return; }
    const next = { ...draftRoles };
    delete next[roleKey];
    commitRoles(next);
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

  const tabDefs = ([
    { id: "printer", label: "Printer", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg> },
    { id: "attendance", label: "Absensi", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { id: "roles", label: "Role & Menu", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: "barcode", label: "Perangkat Barcode", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V4a1 1 0 011-1h3M17 3h3a1 1 0 011 1v3m0 10v3a1 1 0 01-1 1h-3M7 21H4a1 1 0 01-1-1v-3M8 7h1v4H8zM12 7h1v4h-1zM16 7h1v4h-1zM8 13h1v4H8zM12 13h1v4h-1zM16 13h1v4h-1z" /></svg> },
    { id: "pembayaran", label: "Pembayaran", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm4 8h4" /></svg> },
    { id: "brand", label: "Menu Utama", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
    { id: "reset", label: "Reset Data", icon: <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> },
  ] as { id: Tab; label: string; icon: React.ReactNode }[]).filter(t => canOpenTab(t.id));

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {toast && (
        <div className="fixed bottom-24 lg:bottom-6 left-1/2 lg:left-auto -translate-x-1/2 lg:translate-x-0 lg:right-6 z-[80] px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: toastOk ? "#16a34a" : "#ef4444" }}>
          {toast}
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex flex-col shrink-0 w-60 overflow-y-auto px-3 py-5 border-r" style={{ borderColor: "var(--border)" }}>
        <div className="px-2 mb-4" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Setelan</div>
        <nav className="flex flex-col gap-1">
          {tabDefs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all text-left"
              style={{ background: tab === t.id ? "var(--foreground)" : "transparent", color: tab === t.id ? "white" : "var(--muted-foreground)" }}>
              <span className="shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header + tabs (mobile) */}
        <div className="lg:hidden shrink-0 px-4 pt-5">
          <div className="mb-3" style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Setelan</div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3">
            {tabDefs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 whitespace-nowrap"
                style={{ background: tab === t.id ? "var(--foreground)" : "var(--card)", color: tab === t.id ? "white" : "var(--muted-foreground)", border: `1.5px solid ${tab === t.id ? "var(--foreground)" : "var(--border)"}` }}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-5">

      {/* PRINTER */}
      {tab === "printer" && (
        <div className="w-full p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Setelan Printer</div>
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Pengaturan pencetakan struk untuk kasir.</div>
            <button onClick={() => setPreviewOpen(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all"
              style={{ background: "rgba(124,58,237,0.1)", color: "var(--accent)", border: "1.5px solid rgba(124,58,237,0.25)" }}>
              Lihat Pratinjau Struk
            </button>
          </div>

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

          <div className="mb-5">
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>LOGO CETAK STRUK</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                {draftPrinter.receiptLogo ? (
                  <img src={assetUrl(draftPrinter.receiptLogo)} alt="Logo struk" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-[9px] px-1 text-center" style={{ color: "var(--muted-foreground)" }}>Tanpa logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input ref={receiptLogoRef} type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const imgErr = validateImageFile(file);
                    if (imgErr) { showToast(imgErr, false); e.target.value = ""; return; }
                    try {
                      const dataUrl = await compressImage(file, 320, 0.8);
                      setDraftPrinter(p => ({ ...p, receiptLogo: dataUrl }));
                    } catch {
                      showToast("Gagal membaca gambar", false);
                    }
                    e.target.value = "";
                  }} />
                <button onClick={() => receiptLogoRef.current?.click()} className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                  Unggah Logo
                </button>
                {draftPrinter.receiptLogo && (
                  <button onClick={() => setDraftPrinter(p => ({ ...p, receiptLogo: defaultSettings.printer.receiptLogo }))}
                    className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--secondary)" }}>
                    Hapus Logo
                  </button>
                )}
              </div>
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: "var(--muted-foreground)" }}>Tampil di bagian atas struk. Kosong = logo tidak dicetak.</div>
          </div>

          <div className="mb-5">
            <div className="text-xs font-semibold mb-2.5" style={{ color: "var(--muted-foreground)" }}>TAMPILAN DI STRUK</div>
            <div className="rounded-2xl" style={{ border: "1px solid var(--border)" }}>
              {([
                { key: "showTax", label: "Pajak", desc: "Baris pajak di bagian rincian" },
                { key: "showCashier", label: "Kasir", desc: "Nama kasir di bagian atas struk" },
                { key: "showDate", label: "Tanggal", desc: "Tanggal transaksi di bagian atas struk" },
                { key: "showTime", label: "Jam", desc: "Jam transaksi di bagian atas struk" },
                { key: "showChange", label: "Kembalian", desc: "Baris kembalian di bagian rincian" },
              ] as { key: keyof PrinterSettings; label: string; desc: string }[]).map((row, i) => (
                <div key={row.key} className="flex items-center justify-between p-3" style={{ borderBottom: i < 4 ? "1px solid var(--border)" : "none" }}>
                  <div>
                    <div className="text-sm font-semibold">{row.label}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{row.desc}</div>
                  </div>
                  {toggle(draftPrinter[row.key] as boolean, v => setDraftPrinter(p => ({ ...p, [row.key]: v })))}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>DESKRIPSI BAWAH STRUK</label>
            <textarea value={draftPrinter.footerText} onChange={e => setDraftPrinter(p => ({ ...p, footerText: e.target.value }))}
              rows={3} placeholder="Contoh: Terima kasih telah berbelanja!" className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none" style={field} />
            <div className="text-[10px] mt-1.5" style={{ color: "var(--muted-foreground)" }}>Teks di bagian bawah struk. Tiap baris otomatis menjadi baris baru.</div>
          </div>

          <button onClick={savePrinter} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Setelan Printer
          </button>
        </div>
      )}

      {/* PRATINJAU STRUK — floating overlay (always available, independent of active tab) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }} onClick={() => setPreviewOpen(false)}>
          <div className="w-full sm:w-auto rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92dvh] overflow-hidden flex flex-col" style={{ background: "var(--card)" }} onClick={e => e.stopPropagation()}>
            <div className="pt-2.5 pb-1 flex justify-center shrink-0 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--muted)" }} />
            </div>
            <div className="px-5 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>Pratinjau Struk</div>
              <button onClick={() => setPreviewOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-5 flex justify-center" style={{ background: "var(--background)" }}>
              <ReceiptPreview printer={draftPrinter} brandName={draftBrand.name} />
            </div>
          </div>
        </div>
      )}

      {/* PEMBAYARAN */}
      {tab === "pembayaran" && (
        <div className="w-full p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Setelan Pembayaran</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Atur metode pembayaran, pajak, dan pembulatan total saat checkout kasir.</div>

            <div className="flex flex-col gap-5">
              {/* Metode pembayaran */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }}>Metode Pembayaran</div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
                    {draftPayments.methods.filter(m => m.enabled).length}/{draftPayments.methods.length} aktif
                  </span>
                </div>
                <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Atur cara pembayaran yang muncul saat checkout kasir.</div>

                <div className="flex flex-col gap-2 mb-3">
                  {draftPayments.methods.map(m => (
                    <div key={m.id} className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "var(--background)", border: `1.5px solid ${m.enabled ? "var(--border)" : "var(--border)"}`, opacity: m.enabled ? 1 : 0.65 }}>
                      <input type="text" value={m.label} onChange={e => updatePayMethod(m.id, { label: e.target.value })}
                        placeholder="Nama metode" className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                      <select value={m.kind} onChange={e => updatePayMethod(m.id, { kind: e.target.value as PaymentMethodKind })}
                        className="text-xs rounded-lg px-2 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                        <option value="cash">Tunai</option>
                        <option value="card">Nominal tetap</option>
                      </select>
                      {toggle(m.enabled, v => updatePayMethod(m.id, { enabled: v }))}
                      <button onClick={() => deletePayMethod(m.id)} className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }} title="Hapus">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 rounded-xl flex flex-wrap items-center gap-2" style={{ background: "var(--background)", border: "1px dashed var(--border)" }}>
                  <input type="text" placeholder="Nama metode baru (mis. E-Wallet)" value={payLabel}
                    onChange={e => setPayLabel(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addPaymentMethod()}
                    className="flex-1 min-w-[140px] px-3 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                  <select value={payKind} onChange={e => setPayKind(e.target.value as PaymentMethodKind)}
                    className="text-xs rounded-lg px-2 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <option value="cash">Tunai</option>
                    <option value="card">Nominal tetap</option>
                  </select>
                  <button onClick={addPaymentMethod} className="px-3 py-2 rounded-lg text-xs font-semibold text-white shrink-0" style={{ background: "var(--foreground)" }}>
                    + Tambah
                  </button>
                </div>
                <div className="text-[10px] mt-1.5" style={{ color: "var(--muted-foreground)" }}>
                  "Tunai" = kasir memasukkan nominal bayar & ada kembalian. "Nominal tetap" = dibayar sesuai total.
                </div>
              </div>

              <div style={{ borderTop: "1.5px solid var(--border)" }} />
              {/* Pajak */}
              <div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Pajak</div>
                <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Persentase pajak yang diterapkan di bawah diskon pada tiap transaksi.</div>
                <div className="flex items-center justify-between p-3 rounded-xl mb-2.5" style={{ background: "var(--background)" }}>
                  <div>
                    <div className="text-sm font-semibold">Aktifkan pajak</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Pajak dihitung otomatis saat checkout</div>
                  </div>
                  {toggle(draftPayments.tax.enabled, v => setDraftPayments(p => ({ ...p, tax: { ...p.tax, enabled: v } })))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>TARIF PAJAK (%)</label>
                    <input type="number" min={0} max={100} value={draftPayments.tax.rate} onChange={e => setDraftPayments(p => ({ ...p, tax: { ...p.tax, rate: Number(e.target.value) } }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>TAMPILAN DI STRUK</label>
                    <div className="w-full px-3 py-2.5 rounded-xl text-sm" style={{ background: "var(--secondary)" }}>
                      {draftPayments.tax.enabled ? `Pajak ${draftPayments.tax.rate}%` : "Pajak (nonaktif)"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: "1.5px solid var(--border)" }} />
              {/* Pembulatan */}
              <div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Pembulatan Total</div>
                <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Bulatkan total tagihan ke nilai terdekat yang mudah untuk kembalian (biasanya untuk bayar tunai).</div>
                <div className="flex items-center justify-between p-3 rounded-xl mb-2.5" style={{ background: "var(--background)" }}>
                  <div>
                    <div className="text-sm font-semibold">Aktifkan pembulatan</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Total dibulatkan ke atas sesuai kelipatan</div>
                  </div>
                  {toggle(draftPayments.rounding.enabled, v => setDraftPayments(p => ({ ...p, rounding: { ...p.rounding, enabled: v } })))}
                </div>
                {draftPayments.rounding.enabled && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>KELIPATAN PEMBULATAN</label>
                    <select value={draftPayments.rounding.step} onChange={e => setDraftPayments(p => ({ ...p, rounding: { ...p.rounding, step: Number(e.target.value) } }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field}>
                      {[100, 500, 1000, 2000, 5000].map(s => <option key={s} value={s}>Rp {s.toLocaleString("id-ID")}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <button onClick={savePayments} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
                Simpan Setelan Pembayaran
              </button>
            </div>
        </div>
      )}

      {/* ATTENDANCE */}
      {tab === "attendance" && (
        <div className="w-full p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
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
        <div className="w-full p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
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
                return (
                  <div key={menu.id} onClick={() => toggleMenu(editingRole, menu.id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all select-none"
                    style={{ cursor: "pointer", background: on ? `${draftRoles[editingRole].color}14` : "var(--background)", border: `1px solid ${on ? draftRoles[editingRole].color : "var(--border)"}` }}>
                    <span className="w-[18px] h-[18px] rounded-md flex items-center justify-center shrink-0"
                      style={{ background: on ? draftRoles[editingRole].color : "var(--card)", border: `1.5px solid ${on ? draftRoles[editingRole].color : "var(--border)"}` }}>
                      {on && <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </span>
                    <span className="flex-1 text-[12px] font-semibold" style={{ color: on ? draftRoles[editingRole].color : "var(--foreground)" }}>{menu.label}</span>
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
                    const enabledCount = actList.filter(a => acts?.includes(a) ?? true).length;
                    return (
                      <div key={menu.id} className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between px-3 py-2" style={{ background: `${draftRoles[editingRole].color}10` }}>
                          <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: draftRoles[editingRole].color }}>
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: draftRoles[editingRole].color }} />
                            <span className="uppercase">{menu.label}</span>
                          </div>
                          <span className="text-[9px] font-semibold" style={{ color: draftRoles[editingRole].color }}>
                            {enabledCount}/{actList.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-2" style={{ background: "var(--card)" }}>
                          {actList.map(action => {
                            const on = acts?.includes(action) ?? true;
                            return (
                              <button key={action} onClick={() => toggleAction(editingRole, menu.id, action)}
                                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[11px] font-medium text-left transition-all select-none"
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
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>Perubahan langsung tersimpan otomatis</span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditingRole(null)} className="px-4 py-2.5 rounded-xl text-xs font-semibold transition-all" style={{ background: "var(--muted)", color: "var(--foreground)" }}>Batal</button>
                <button onClick={() => { setEditingRole(null); showToast("Role disimpan"); }} className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARCODE DEVICE */}
      {tab === "barcode" && (
        <div className="w-full p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
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
        <div className="w-full p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-1">Menu Utama</div>
          <div className="text-xs mb-5" style={{ color: "var(--muted-foreground)" }}>Ubah logo, nama, deskripsi aplikasi, dan loading screen.</div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>LOGO</label>
            <div className="flex items-center gap-4">
              <img src={assetUrl(draftBrand.logo)} alt="Logo" className="w-16 h-16 rounded-2xl object-cover shrink-0" style={{ background: "var(--secondary)" }} />
              <div className="flex flex-col gap-2">
                <input ref={logoRef} type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const imgErr = validateImageFile(file);
                    if (imgErr) { showToast(imgErr, false); e.target.value = ""; return; }
                    try {
                      const dataUrl = await compressImage(file, 512, 0.82);
                      setDraftBrand(b => ({ ...b, logo: dataUrl }));
                    } catch {
                      showToast("Gagal membaca gambar", false);
                    }
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

          <div className="mb-4" style={{ paddingTop: 14, borderTop: "1.5px solid var(--border)" }}>
            <label className="block text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>GAMBAR LOADING SCREEN</label>
            <div className="flex items-center gap-4">
              <img src={assetUrl(draftBrand.loadingImage)} alt="Loading screen" className="w-16 h-16 rounded-2xl object-cover shrink-0" style={{ background: "var(--secondary)" }} />
              <div className="flex flex-col gap-2">
                <input ref={loadingRef} type="file" accept="image/*" className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const imgErr = validateImageFile(file);
                    if (imgErr) { showToast(imgErr, false); e.target.value = ""; return; }
                    try {
                      const dataUrl = await compressImage(file, 1024, 0.85);
                      setDraftBrand(b => ({ ...b, loadingImage: dataUrl }));
                    } catch {
                      showToast("Gagal membaca gambar", false);
                    }
                    e.target.value = "";
                  }} />
                <button onClick={() => loadingRef.current?.click()} className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                  Unggah Gambar
                </button>
                <button onClick={() => setDraftBrand(b => ({ ...b, loadingImage: defaultSettings.brand.loadingImage }))}
                  className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--secondary)" }}>
                  Reset Gambar
                </button>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>DESKRIPSI LOADING SCREEN</label>
            <input type="text" value={draftBrand.loadingDescription} onChange={e => setDraftBrand(b => ({ ...b, loadingDescription: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={field} />
            <div className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>Teks yang tampil di bawah logo saat aplikasi sedang memuat</div>
          </div>

          <button onClick={saveBrand} className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all" style={{ background: "var(--foreground)" }}>
            Simpan Menu Utama
          </button>
        </div>
      )}

      {/* RESET DATA (admin only) */}
      {tab === "reset" && isAdmin && (
        <div className="w-full rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div className="p-5 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }}>Reset Data</div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "#dc2626" }}>HANYA ADMIN</span>
            </div>
            <div className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
              Hapus data secara permanen dari aplikasi dan database. Tindakan ini tidak dapat dibatalkan.
            </div>
          </div>

          {/* TRANSACTIONS */}
          <div className="px-5 pb-5" style={{ borderTop: "1.5px solid var(--border)", paddingTop: 16 }}>
            <div className="text-sm font-semibold mb-1">Transaksi Penjualan</div>
            <div className="text-[11px] mb-3" style={{ color: "var(--muted-foreground)" }}>{transactions.length} transaksi tersimpan</div>
            <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Hapus Semua Transaksi</div>
              <ResetButton label="Hapus Semua" onReset={resetTrxAll} />
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>Hapus Berdasarkan Rentang Tanggal</div>
              <div className="flex flex-wrap items-center gap-2">
                <input type="date" value={resetTrxFrom} onChange={e => setResetTrxFrom(e.target.value)} className="px-2 py-1.5 rounded-xl text-xs outline-none" style={field} />
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>s.d.</span>
                <input type="date" value={resetTrxTo} onChange={e => setResetTrxTo(e.target.value)} className="px-2 py-1.5 rounded-xl text-xs outline-none" style={field} />
                <ResetButton label="Hapus Rentang" onReset={resetTrxRange} />
              </div>
            </div>
          </div>

{/* DELETED TRANSACTIONS */}
          <div className="px-5 pb-5" style={{ borderTop: "1.5px solid var(--border)", paddingTop: 16 }}>
            <div className="text-sm font-semibold mb-1">Riwayat Transaksi Terhapus</div>
            <div className="text-[11px] mb-3" style={{ color: "var(--muted-foreground)" }}>{deletedTransactions.length} riwayat terhapus tersimpan</div>
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Hapus Permanen Semua Riwayat Terhapus</div>
              <ResetButton label="Hapus Semua" onReset={resetDeletedAll} />
            </div>
          </div>

          {/* ATTENDANCE */}
          <div className="px-5 pb-5" style={{ borderTop: "1.5px solid var(--border)", paddingTop: 16 }}>
            <div className="text-sm font-semibold mb-1">Riwayat Absensi</div>
            <div className="text-[11px] mb-3" style={{ color: "var(--muted-foreground)" }}>{attendance.length} riwayat tersimpan</div>
            <div className="flex items-center justify-between gap-3 mb-3 p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>Hapus Semua Riwayat Absensi</div>
              <ResetButton label="Hapus Semua" onReset={resetAttAll} />
            </div>
            <div className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>Hapus Berdasarkan Rentang Tanggal</div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <input type="date" value={resetAttFrom} onChange={e => setResetAttFrom(e.target.value)} className="px-2 py-1.5 rounded-xl text-xs outline-none" style={field} />
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>s.d.</span>
                <input type="date" value={resetAttTo} onChange={e => setResetAttTo(e.target.value)} className="px-2 py-1.5 rounded-xl text-xs outline-none" style={field} />
                <ResetButton label="Hapus Rentang" onReset={resetAttRange} />
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={resetAttEmp} onChange={e => setResetAttEmp(e.target.value)} className="px-2 py-1.5 rounded-xl text-xs outline-none" style={field}>
                  <option value="">Semua Karyawan</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <select value={resetAttStore} onChange={e => setResetAttStore(e.target.value)} className="px-2 py-1.5 rounded-xl text-xs outline-none" style={field}>
                  <option value="">Semua Toko</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* OTHERS — each in one row */}
          <div className="px-5 pb-5 flex flex-col gap-2" style={{ borderTop: "1.5px solid var(--border)", paddingTop: 16 }}>
            {[
              { label: "Karyawan", count: employees.length - 1, desc: "Akun Anda tetap aman", fn: () => resetOne("Semua karyawan", onResetEmployees), disabled: employees.length <= 1 },
              { label: "Produk", count: products.length, desc: "Termasuk varian & stok", fn: () => resetOne("Semua produk", onResetProducts), disabled: products.length === 0 },
              { label: "Member", count: members.length, desc: "Data pelanggan", fn: () => resetOne("Semua member", onResetMembers), disabled: members.length === 0 },
              { label: "Diskon & Voucher", count: discounts.length, desc: "Semua promosi", fn: () => resetOne("Semua diskon", onResetDiscounts), disabled: discounts.length === 0 },
              { label: "Toko", count: stores.length, desc: "Data cabang", fn: () => resetOne("Semua toko", onResetStores), disabled: stores.length === 0 },
              { label: "Chat Karyawan", count: "—", desc: "Hapus seluruh isi percakapan", fn: () => resetOne("Seluruh isi chat", onResetChat), disabled: false },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ background: "var(--background)", opacity: item.disabled ? 0.4 : 1 }}>
                <div>
                  <div className="text-xs font-semibold">{item.label} <span style={{ color: "var(--muted-foreground)" }}>({item.count})</span></div>
                  <div className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{item.desc}</div>
                </div>
                <button disabled={item.disabled} onClick={item.fn}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
                  style={{ background: "#ef4444" }}>
                  Hapus
                </button>
              </div>
            ))}
            <div className="text-[10px] mt-1 mb-2" style={{ color: "var(--muted-foreground)" }}>
              * Hapus data transaksi atau karyawan terlebih dahulu jika ingin menghapus data toko, karena data tersebut saling berkaitan.
            </div>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </div>
  );
}