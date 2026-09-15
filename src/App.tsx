import { useState, useEffect, lazy, Suspense } from "react";
import LoginView from "./components/LoginView";
import Sidebar, { MobileBottomNav } from "./components/Sidebar";

const POSView = lazy(() => import("./components/POSView"));
const HistoryView = lazy(() => import("./components/HistoryView"));
const ReportView = lazy(() => import("./components/ReportView"));
const StockView = lazy(() => import("./components/StockView"));
const EmployeeView = lazy(() => import("./components/EmployeeView"));
const StoreManagement = lazy(() => import("./components/StoreManagement"));
const DiscountView = lazy(() => import("./components/DiscountView"));
const ProductManagement = lazy(() => import("./components/ProductManagement"));
const MemberView = lazy(() => import("./components/MemberView"));
const AttendanceView = lazy(() => import("./components/AttendanceView"));
const AttendanceHistoryView = lazy(() => import("./components/AttendanceHistoryView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
import { useSyncedStore } from "./hooks/useSyncedStore";
import { deleteAttendance, deleteTransaction, deleteRows } from "./data/sync";
import type { ResetResult } from "./data/sync";
import type { Employee, Transaction, AttendanceRecord, Member } from "./data/types";
import { getAllowedMenus, hasAction, ensureRoles } from "./data/roles";
import { MENU_PAGES } from "./data/menuPages";
import { todayISO } from "./lib/dates";
import { getTier } from "./data/members";
import { defaultSettings } from "./data/settings";
import type { BrandSettings } from "./data/settings";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;

const SESSION_KEY = "nands-current-user-id";
const SESSION_EXPIRY_KEY = "nands-session-expiry";
const BRAND_CACHE_KEY = "nands-brand-cache";

function loadBrandCache(): BrandSettings {
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY);
    if (raw) return { ...defaultSettings.brand, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings.brand;
}

function MenuLoading({ image, name, description }: { image: string; name: string; description: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: "var(--background)" }}>
      <div className="swipe-card relative w-16 h-16 rounded-2xl overflow-hidden shrink-0" style={{ background: "var(--secondary)" }}>
        <img src={image} alt={name} className="w-16 h-16 object-cover" />
        <div className="swipe-sweep" />
      </div>
      <div className="text-xs animate-pulse" style={{ color: "var(--muted-foreground)" }}>{description}</div>
    </div>
  );
}

export default function App({ menu = "index" }: { menu?: string } = {}) {
  const {
    ready,
    products, setProducts,
    stores, setStores,
    employees, setEmployees,
    members, setMembers,
    discounts, setDiscounts,
    attendance, setAttendance,
    transactions, setTransactions,
    deletedTransactions, setDeletedTransactions,
    settings, setSettings,
    categories, setCategories,
    flush,
  } = useSyncedStore();
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [brandCache] = useState(loadBrandCache);
  const page = menu;
  const [activeStore, setActiveStore] = useState(() => {
    try { return localStorage.getItem("nands-active-store") || "s1"; } catch { return "s1"; }
  });

  useEffect(() => {
    try { localStorage.setItem("nands-active-store", activeStore); } catch { /* ignore */ }
  }, [activeStore]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(settings.brand)); } catch { /* ignore */ }
  }, [ready, settings.brand]);

  // Restore session dari {id} saja (tanpa PIN tersimpan),
  // validasi terhadap data karyawan terkini + batas sesi.
  useEffect(() => {
    if (!ready) return;
    const storedId = (() => {
      try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
    })();
    if (!storedId) return;
    const expiry = (() => {
      try { return Number(localStorage.getItem(SESSION_EXPIRY_KEY)) || 0; } catch { return 0; }
    })();
    if (expiry > 0 && Date.now() > expiry) {
      try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
      } catch { /* ignore */ }
      return;
    }
    const fresh = employees.find(e => e.id === storedId);
    if (!fresh) return;
    setCurrentUser(fresh);
  }, [ready, employees]);

  // Idle timeout: logout otomatis setelah 30 menit tanpa aktivitas.
  useEffect(() => {
    if (!currentUser) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reset = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setCurrentUser(null);
        try {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(SESSION_EXPIRY_KEY);
        } catch { /* ignore */ }
      }, IDLE_TIMEOUT_MS);
      try { localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + IDLE_TIMEOUT_MS)); } catch { /* ignore */ }
    };
    IDLE_EVENTS.forEach(ev => window.addEventListener(ev, reset, { passive: true }));
    reset();
    return () => {
      IDLE_EVENTS.forEach(ev => window.removeEventListener(ev, reset));
      if (timer) clearTimeout(timer);
    };
  }, [currentUser, ready]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    const a = getAllowedMenus(currentUser.role, settings.roles);
    const first = a.length ? a[0] : "pos";
    if (page === "index") {
      const todayStr = todayISO();
      const clockedToday = attendance.some(r => r.employeeId === currentUser.id && r.date === todayStr && r.storeId === activeStore);
      const target = a.includes("attendance") && !clockedToday ? "attendance" : first;
      location.href = MENU_PAGES[target] ?? "kasir.html";
      return;
    }
    if (!a.includes(page)) {
      location.href = MENU_PAGES[first] ?? "kasir.html";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, currentUser, page, activeStore, attendance, settings]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    const fresh = employees.find(e => e.id === currentUser.id);
    if (!fresh || fresh.status !== "active") {
      setCurrentUser(null);
      try {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(SESSION_EXPIRY_KEY);
      } catch { /* ignore */ }
      return;
    }
    if (fresh.role !== currentUser.role || fresh.name !== currentUser.name || fresh.storeId !== currentUser.storeId) {
      setCurrentUser(fresh);
    }
  }, [ready, employees, currentUser]);

  const storeName = stores.find(s => s.id === activeStore)?.name ?? "";

  const handleLogin = (emp: Employee) => {
    setCurrentUser(emp);
    try {
      localStorage.setItem(SESSION_KEY, emp.id);
      localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + IDLE_TIMEOUT_MS));
    } catch { /* ignore */ }
    const allowed = getAllowedMenus(emp.role, settings.roles);
    const nextStore = (emp.role !== "admin" && emp.role !== "manager" && emp.role !== "manager_operasional") ? emp.storeId : activeStore;
    setActiveStore(nextStore);
    try { localStorage.setItem("nands-active-store", nextStore); } catch { /* ignore */ }
    const todayStr = todayISO();
    const clockedToday = attendance.some(r => r.employeeId === emp.id && r.date === todayStr && r.storeId === nextStore);
    const target = allowed.includes("attendance") && !clockedToday ? "attendance" : (allowed[0] ?? "pos");
    location.href = MENU_PAGES[target] ?? "kasir.html";
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_EXPIRY_KEY);
    } catch { /* ignore */ }
    void flush().finally(() => { location.href = "index.html"; });
  };

  const handleNewTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
    setProducts(prev => prev.map(p => ({
      ...p,
      variants: p.variants.map(v => ({
        ...v,
        stocks: v.stocks.map(st => {
          const soldItem = t.items.find(i => i.variantSku === v.sku && t.storeId === st.storeId);
          if (soldItem) return { ...st, quantity: Math.max(0, st.quantity - soldItem.quantity) };
          return st;
        }),
      })),
    })));
    setTimeout(() => { void flush().catch(e => console.warn("[sync] flush transaksi gagal:", e)); }, 200);
  };

  const handleUpdateStock = (productId: string, sku: string, storeId: string, qty: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, variants: p.variants.map(v => v.sku === sku ? { ...v, stocks: v.stocks.map(s => s.storeId === storeId ? { ...s, quantity: qty } : s) } : v) }
        : p
    ));
  };

  const handleUpdateMember = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleDeleteTransaction = (id: string, reason: string, deletedBy: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    setDeletedTransactions(prev => [...prev, {
      id: `DEL-${Date.now()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      transaction: target,
      deletedAt: new Date(),
      deletedBy,
      reason,
    }]);
    setTransactions(prev => prev.filter(t => t.id !== id));
    setProducts(prev => prev.map(p => ({
      ...p,
      variants: p.variants.map(v => {
        const sold = target.items.find(i => i.variantSku === v.sku);
        return sold
          ? { ...v, stocks: v.stocks.map(st => st.storeId === target.storeId ? { ...st, quantity: st.quantity + sold.quantity } : st) }
          : v;
      }),
    })));
    if (target.memberId) {
      setMembers(prev => prev.map(m => m.id === target.memberId ? {
        ...m,
        points: Math.max(0, m.points - (target.pointsEarned ?? 0)),
        totalSpend: Math.max(0, m.totalSpend - (target.total ?? 0)),
        tier: getTier(Math.max(0, m.totalSpend - (target.total ?? 0))),
      } : m));
    }
    void flush().catch(e => console.warn("[sync] flush transaksi gagal:", e)).then(() => deleteTransaction(id)).catch(e => console.warn("[sync] hapus transaksi gagal:", e));
  };

  const handleUseVoucher = (id: string) => {
    setDiscounts(prev => prev.map(d => d.id === id && d.type === "voucher" ? { ...d, usedCount: d.usedCount + 1 } : d));
  };

  const handleUpdateTransaction = (t: Transaction) => {
    setTransactions(prev => prev.map(tx => tx.id === t.id ? t : tx));
  };

  const handleClock = (record: AttendanceRecord) => {
    setAttendance(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = record; return next; }
      return [...prev, record];
    });
  };

  const handleDeleteAttendance = (id: string) => {
    setAttendance(prev => prev.filter(r => r.id !== id));
    void deleteAttendance(id).catch(e => console.warn("[sync] hapus absensi gagal:", e));
  };

  const runReset = async (fn: () => Promise<void>): Promise<ResetResult> => {
    try { await fn(); return { ok: true }; }
    catch (e) {
      console.warn("[sync] reset data gagal:", e);
      return { ok: false, msg: (e as Error)?.message || "Terjadi kesalahan" };
    }
  };

  const handleResetTransactions = (ids: string[]): Promise<ResetResult> =>
    runReset(async () => {
      if (!ids.length) return;
      await deleteRows("transactions", ids);
      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
    });

  const handleResetAttendance = (ids: string[]): Promise<ResetResult> =>
    runReset(async () => {
      if (!ids.length) return;
      await deleteRows("attendance_records", ids);
      setAttendance(prev => prev.filter(r => !ids.includes(r.id)));
    });

  const handleResetEmployees = (): Promise<ResetResult> =>
    runReset(async () => {
      if (!currentUser) return;
      const targetIds = employees.filter(e => e.id !== currentUser.id).map(e => e.id);
      if (!targetIds.length) return;
      const trxBlock = transactions.filter(t => targetIds.includes(t.cashierId)).length;
      if (trxBlock) throw new Error(`Masih ada ${trxBlock} transaksi yang tercatat oleh karyawan. Hapus transaksi terlebih dahulu.`);
      const attIds = attendance.filter(r => targetIds.includes(r.employeeId)).map(r => r.id);
      if (attIds.length) await deleteRows("attendance_records", attIds);
      await deleteRows("employees", targetIds);
      setAttendance(prev => prev.filter(r => !attIds.includes(r.id)));
      setEmployees(prev => prev.filter(e => e.id === currentUser.id));
    });

  const handleResetMembers = (): Promise<ResetResult> =>
    runReset(async () => {
      if (!members.length) return;
      const memberIds = members.map(m => m.id);
      const trxBlock = transactions.filter(t => t.memberId && memberIds.includes(t.memberId)).length;
      if (trxBlock) throw new Error(`Masih ada ${trxBlock} transaksi yang memakai member. Hapus transaksi terlebih dahulu.`);
      await deleteRows("members", memberIds);
      setMembers([]);
    });

  const handleResetStores = (): Promise<ResetResult> =>
    runReset(async () => {
      const storeIds = stores.map(s => s.id);
      if (!storeIds.length) return;
      const blockers: string[] = [];
      if (employees.length) blockers.push(`${employees.length} karyawan`);
      if (transactions.length) blockers.push(`${transactions.length} transaksi`);
      if (attendance.length) blockers.push(`${attendance.length} riwayat absensi`);
      const memRef = members.filter(m => m.storeId && storeIds.includes(m.storeId)).length;
      if (memRef) blockers.push(`${memRef} member`);
      if (blockers.length) throw new Error(`Masih ada data terkait: ${blockers.join(", ")}. Hapus data tersebut terlebih dahulu.`);
      await deleteRows("stores", storeIds);
      setStores([]);
      setActiveStore("");
      try { localStorage.removeItem("nands-active-store"); } catch { /* ignore */ }
    });

  const handleResetProducts = (): Promise<ResetResult> =>
    runReset(async () => { if (products.length) setProducts([]); });

  const handleResetDiscounts = (): Promise<ResetResult> =>
    runReset(async () => { if (discounts.length) setDiscounts([]); });

  if (!ready) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: "var(--background)" }}>
        <div className="swipe-card relative w-16 h-16 rounded-2xl overflow-hidden shrink-0" style={{ background: "rgba(124,58,237,0.12)" }}>
          <img src={brandCache.loadingImage} alt={brandCache.name} className="w-16 h-16 object-cover" />
          <div className="swipe-sweep" />
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>{brandCache.name}</div>
        <div className="text-xs animate-pulse" style={{ color: "var(--muted-foreground)" }}>{brandCache.loadingDescription}</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView employees={employees} stores={stores} brand={settings.brand} roles={settings.roles} onLogin={handleLogin} />;
  }

  const role = currentUser.role;
  const allowed = getAllowedMenus(role, settings.roles).length > 0 ? getAllowedMenus(role, settings.roles) : ["pos"];
  const managerRole = (r: string) => r === "manager" || r === "manager_operasional";
  const permRoles = ensureRoles(settings.roles);
  const has = (menu: string, action: string) => hasAction(role, permRoles, menu, action);
  const canEditEmployees = role === "admin" || managerRole(role);
  const canEditStock = role === "admin" || managerRole(role);
  const canEditSettings = role === "admin" || managerRole(role);

  const canHistoryDelete = has("history", "delete");
  const canHistoryPrint = has("history", "print");
  const canProductExport = has("product", "export");
  const canProductImport = has("product", "import");
  const canProductBulk = has("product", "bulk");
  const canProductCategory = has("product", "category");
  const canProductAdd = has("product", "add");
  const canProductEdit = has("product", "edit");
  const canProductDelete = has("product", "delete");
  const canEmpImport = has("employee", "import");
  const canEmpExport = has("employee", "export");
  const canEmpAdd = has("employee", "add");
  const canStoreAdd = has("store", "add");
  const canStoreEdit = has("store", "edit");
  const canStoreDelete = has("store", "delete");
  const canDiscAdd = has("discount", "add");
  const canDiscEdit = has("discount", "edit");
  const canDiscDelete = has("discount", "delete");
  const canMemAdd = has("member", "add");
  const canMemEdit = has("member", "edit");
  const canMemDelete = has("member", "delete");
  const canDeleteAttendance = has("attendance", "delete");
  const canViewAttendanceAll = has("attendance", "view_all");
  const canViewAttHistoryAll = has("attendanceHistory", "view_all") || has("attendance", "view_all");
  const canDeleteAttHistory = has("attendanceHistory", "delete") || has("attendance", "delete");
  const settingsPerms = permRoles[role]?.permissions;

  // Guard: if current page not allowed, redirect
  const safeTab = allowed.includes(page) ? page : allowed[0];

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar
        activeTab={safeTab}
        activeStore={activeStore}
        setActiveStore={setActiveStore}
        stores={stores}
        currentUser={currentUser}
        onLogout={handleLogout}
        brand={settings.brand}
        roles={settings.roles}
        allowed={allowed}
      />

      <div className="flex-1 min-w-0 overflow-hidden">
        <Suspense fallback={<MenuLoading image={settings.brand.loadingImage} name={settings.brand.name} description={settings.brand.loadingDescription} />}>
        {safeTab === "pos" && (
          <POSView
            key={activeStore}
            activeStore={activeStore}
            storeName={storeName}
            cashierId={currentUser.id}
            cashierName={currentUser.name}
            products={products}
            discounts={discounts}
            members={members}
            onNewTransaction={handleNewTransaction}
            onUpdateMember={handleUpdateMember}
            onUseVoucher={handleUseVoucher}
            brandName={settings.brand.name}
            printer={settings.printer}
            barcode={settings.barcode}
          />
        )}
        {safeTab === "history" && (
          <HistoryView
            transactions={transactions}
            stores={stores}
            activeStore={activeStore}
            canDelete={canHistoryDelete}
            canPrint={canHistoryPrint}
            onDelete={canHistoryDelete ? (id, reason) => handleDeleteTransaction(id, reason, currentUser.name) : undefined}
            onUpdate={canHistoryDelete ? handleUpdateTransaction : undefined}
            brandName={settings.brand.name}
            printer={settings.printer}
            currentUser={currentUser}
          />
        )}
        {safeTab === "report" && (
          <ReportView transactions={transactions} deletedTransactions={deletedTransactions} stores={stores} />
        )}
        {safeTab === "inventory" && (
          <StockView
            products={products}
            stores={stores}
            categories={categories}
            activeStore={activeStore}
            onUpdateStock={canEditStock ? handleUpdateStock : () => {}}
            canEdit={canEditStock}
          />
        )}
        {safeTab === "product" && (
          <ProductManagement
            products={products}
            stores={stores}
            categories={categories}
            onUpdateCategories={setCategories}
            onSave={setProducts}
            canExport={canProductExport}
            canImport={canProductImport}
            canBulk={canProductBulk}
            canCategory={canProductCategory}
            canAdd={canProductAdd}
            canEdit={canProductEdit}
            canDelete={canProductDelete}
            currentUser={currentUser}
          />
        )}
        {safeTab === "employee" && (
          <EmployeeView
            employees={employees}
            stores={stores}
            onSave={setEmployees}
            canEdit={canEditEmployees}
            canImport={canEmpImport}
            canExport={canEmpExport}
            canAdd={canEmpAdd}
            roles={settings.roles}
            currentUser={currentUser}
          />
        )}
        {safeTab === "store" && (
          <StoreManagement
            stores={stores}
            onSave={setStores}
            canAdd={canStoreAdd}
            canEdit={canStoreEdit}
            canDelete={canStoreDelete}
          />
        )}
        {safeTab === "discount" && (
          <DiscountView
            discounts={discounts}
            stores={stores}
            onSave={setDiscounts}
            canAdd={canDiscAdd}
            canEdit={canDiscEdit}
            canDelete={canDiscDelete}
          />
        )}
        {safeTab === "member" && (
          <MemberView
            members={members}
            stores={stores}
            onSave={setMembers}
            canAdd={canMemAdd}
            canEdit={canMemEdit}
            canDelete={canMemDelete}
          />
        )}
        {safeTab === "attendance" && (
          <AttendanceView
            records={attendance}
            stores={stores}
            employees={employees}
            currentUser={currentUser}
            onClock={handleClock}
          />
        )}
        {safeTab === "attendanceHistory" && (
          <AttendanceHistoryView
            records={attendance}
            stores={stores}
            employees={employees}
            currentUser={currentUser}
            onDelete={canDeleteAttHistory ? handleDeleteAttendance : undefined}
            canViewAll={canViewAttHistoryAll}
            roles={settings.roles}
          />
        )}
        {safeTab === "settings" && (
          <SettingsView
            settings={settings}
            stores={stores}
            employees={employees}
            onSaveSettings={setSettings}
            onSaveStores={setStores}
            canEdit={canEditSettings}
            currentUser={currentUser}
            permissions={settingsPerms}
            products={products}
            members={members}
            discounts={discounts}
            transactions={transactions}
            attendance={attendance}
            onResetProducts={handleResetProducts}
            onResetMembers={handleResetMembers}
            onResetDiscounts={handleResetDiscounts}
            onResetStores={handleResetStores}
            onResetEmployees={handleResetEmployees}
            onResetTransactions={handleResetTransactions}
            onResetAttendance={handleResetAttendance}
          />
        )}
        </Suspense>
      </div>

      <MobileBottomNav
        allowed={allowed}
        activeTab={safeTab}
      />
    </div>
  );
}
