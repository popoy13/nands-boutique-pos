import { useState, useEffect, useRef, lazy, Suspense } from "react";
import LoginView from "./components/LoginView";
import Sidebar, { MobileBottomNav } from "./components/Sidebar";

const POSView = lazy(() => import("./components/POSView"));
const HistoryView = lazy(() => import("./components/HistoryView"));
const ChatView = lazy(() => import("./components/ChatView"));
const ReportView = lazy(() => import("./components/ReportView"));
const StockView = lazy(() => import("./components/StockView"));
const EmployeeView = lazy(() => import("./components/EmployeeView"));
const StoreManagement = lazy(() => import("./components/StoreManagement"));
const DiscountView = lazy(() => import("./components/DiscountView"));
const ProductManagement = lazy(() => import("./components/ProductManagement"));
const MemberView = lazy(() => import("./components/MemberView"));
const AttendanceView = lazy(() => import("./components/AttendanceView"));
const AttendanceHistoryView = lazy(() => import("./components/AttendanceHistoryView"));
const ExpenseView = lazy(() => import("./components/ExpenseView"));
const DepositView = lazy(() => import("./components/DepositView"));
const SettingsView = lazy(() => import("./components/SettingsView"));
import { useSyncedStore } from "./hooks/useSyncedStore";
import { deleteAttendance, deleteTransaction, deleteRows, saveSalaryJson } from "./data/sync";
import type { ResetResult } from "./data/sync";
import type { Employee, Transaction, AttendanceRecord, Member } from "./data/types";
import { getAllowedMenus, hasAction, ensureRoles } from "./data/roles";
import { MENU_PAGES } from "./data/menuPages";
import { todayISO } from "./lib/dates";
import { getTier } from "./data/members";
import { defaultSettings } from "./data/settings";
import type { BrandSettings } from "./data/settings";
import { assetUrl } from "./lib/assets";
import { hashPin, isHashedPin } from "./lib/auth";
import { checkForAppUpdate, type AppUpdate } from "./lib/appUpdate";
import { notifyUser, requestNotificationPermission } from "./lib/notifications";
import { supabase } from "./lib/supabase";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const IDLE_EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;

const SESSION_KEY = "nands-current-user-id";
const SESSION_EXPIRY_KEY = "nands-session-expiry";
const BRAND_CACHE_KEY = "nands-brand-cache";
const UNREAD_COUNTS_KEY = "nands-unread-counts";
const READ_AT_KEY = "nands-read-at";

function loadUnreadCounts(): { chat: number; history: number } {
  try {
    const raw = localStorage.getItem(UNREAD_COUNTS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      chat: Number.isFinite(parsed.chat) ? Math.max(0, parsed.chat) : 0,
      history: Number.isFinite(parsed.history) ? Math.max(0, parsed.history) : 0,
    };
  } catch {
    return { chat: 0, history: 0 };
  }
}

function loadReadAt(): { chat: string; history: string } {
  try {
    const raw = localStorage.getItem(READ_AT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { chat: parsed.chat || new Date(0).toISOString(), history: parsed.history || new Date(0).toISOString() };
  } catch {
    return { chat: new Date(0).toISOString(), history: new Date(0).toISOString() };
  }
}

function saveUnreadCounts(next: { chat: number; history: number }) {
  try { localStorage.setItem(UNREAD_COUNTS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

function saveReadAt(next: { chat: string; history: string }) {
  try { localStorage.setItem(READ_AT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

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
        <img src={assetUrl(image)} alt={name} className="w-16 h-16 object-cover" />
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
    expenses, setExpenses,
    deposits, setDeposits,
    salaryConfig, setSalaryConfig,
    salaryRecords, setSalaryRecords,
    kasbon, setKasbon,
    flush,
  } = useSyncedStore();
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);
  const [brandCache] = useState(loadBrandCache);
  const [availableUpdate, setAvailableUpdate] = useState<AppUpdate | null>(null);
  const [unreadCounts, setUnreadCounts] = useState(loadUnreadCounts);
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

  useEffect(() => {
    if (!ready) return;
    void checkForAppUpdate().then(setAvailableUpdate);
  }, [ready]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    if (page === "chat" || page === "history") {
      const readAt = loadReadAt();
      const now = new Date().toISOString();
      saveReadAt({ ...readAt, [page === "chat" ? "chat" : "history"]: now });
      setUnreadCounts(prev => {
        const next = { ...prev, ...(page === "chat" ? { chat: 0 } : { history: 0 }) };
        saveUnreadCounts(next);
        return next;
      });
    }
  }, [ready, currentUser, page]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== UNREAD_COUNTS_KEY || !event.newValue) return;
      try { setUnreadCounts(JSON.parse(event.newValue)); } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready || !currentUser) return;
    const readAt = loadReadAt();
    let cancelled = false;
    const loadUnreadFromDatabase = async () => {
      const [chatResult, transactionResult] = await Promise.all([
        supabase.from("chat_messages").select("id", { count: "exact", head: true })
          .neq("sender_id", currentUser.id).gt("created_at", readAt.chat).is("deleted_at", null),
        supabase.from("transactions").select("id", { count: "exact", head: true })
          .neq("cashier_id", currentUser.id).gt("created_at", readAt.history),
      ]);
      if (cancelled) return;
      setUnreadCounts(prev => {
        const next = {
          chat: page === "chat" ? 0 : (chatResult.error ? prev.chat : chatResult.count ?? 0),
          history: page === "history" ? 0 : (transactionResult.error ? prev.history : transactionResult.count ?? 0),
        };
        saveUnreadCounts(next);
        return next;
      });
    };
    void loadUnreadFromDatabase();
    return () => { cancelled = true; };
  }, [ready, currentUser, page]);

  useEffect(() => {
    if (!ready || !currentUser) return;
    void requestNotificationPermission();
    const channel = supabase.channel(`nands-notifications-${currentUser.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, payload => {
        if (payload.new.sender_id === currentUser.id) return;
        setUnreadCounts(prev => {
          const next = { ...prev, chat: prev.chat + 1 };
          saveUnreadCounts(next);
          return next;
        });
        void notifyUser(`Chat dari ${payload.new.sender_name}`, payload.new.body || "Mengirim lampiran", "chat.html");
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, payload => {
        if (payload.new.cashier_id === currentUser.id) return;
        setUnreadCounts(prev => {
          const next = { ...prev, history: prev.history + 1 };
          saveUnreadCounts(next);
          return next;
        });
        void notifyUser("Transaksi baru", `${payload.new.store_name || "Toko"} · Rp ${Number(payload.new.total || 0).toLocaleString("id-ID")}`, "transaksi.html");
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [ready, currentUser]);

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

  // Migrasi PIN lama (masih plaintext) ke hash PBKDF2 terkini.
  const pinMigratedRef = useRef(false);
  useEffect(() => {
    if (!ready || pinMigratedRef.current) return;
    if (!employees.some(e => e.pin && !isHashedPin(e.pin))) return;
    pinMigratedRef.current = true;
    void (async () => {
      const next = await Promise.all(
        employees.map(async e => (e.pin && !isHashedPin(e.pin) ? { ...e, pin: await hashPin(e.pin) } : e)),
      );
      setEmployees(next);
    })();
  }, [ready, employees, setEmployees]);

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

  const handlePermanentDelete = (id: string) => {
    setDeletedTransactions(prev => prev.filter(x => x.id !== id));
  };

  const handleResetDeletedTransactions = (): Promise<ResetResult> =>
    runReset(async () => {
      if (!deletedTransactions.length) return;
      await deleteRows("deleted_transactions", deletedTransactions.map(x => x.id));
      setDeletedTransactions([]);
    });

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

const handleResetSalary = (): Promise<ResetResult> =>
    runReset(async () => {
      await saveSalaryJson([], [], []);
      setSalaryConfig([]);
      setSalaryRecords([]);
      setKasbon([]);
    });

  const handleResetChat = (): Promise<ResetResult> =>
    runReset(async () => {
      const { error: messageError } = await supabase.from("chat_messages").delete().not("id", "is", null);
      if (messageError) throw messageError;
      const { error: deletionError } = await supabase.from("chat_message_deletions").delete().not("message_id", "is", null);
      if (deletionError) throw deletionError;
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
          <img src={assetUrl(brandCache.loadingImage)} alt={brandCache.name} className="w-16 h-16 object-cover" />
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
  const canProductSize = has("product", "size");
  const canProductAdd = has("product", "add");
  const canProductEdit = has("product", "edit");
  const canProductDelete = has("product", "delete");
  const canEmpImport = has("employee", "import");
  const canEmpExport = has("employee", "export");
  const canEmpAdd = has("employee", "add");
  const canEmpGaji = has("employee", "gaji");
  const canEmpGajiAdd = has("employee", "gaji_add");
  const canEmpGajiEdit = has("employee", "gaji_edit");
  const canEmpGajiDelete = has("employee", "gaji_delete");
  const canStoreAdd = has("store", "add");
  const canStoreEdit = has("store", "edit");
  const canStoreDelete = has("store", "delete");
  const canDiscAdd = has("discount", "add");
  const canDiscEdit = has("discount", "edit");
  const canDiscDelete = has("discount", "delete");
const canExpenseAdd = has("expense", "add");
const canExpenseEdit = has("expense", "edit");
const canExpenseDelete = has("expense", "delete");
const canDepositAdd = has("deposit", "add");
const canDepositEdit = has("deposit", "edit");
const canDepositDelete = has("deposit", "delete");
const canDepositBank = has("deposit", "bank");
  const canMemAdd = has("member", "add");
  const canMemEdit = has("member", "edit");
  const canMemDelete = has("member", "delete");
  const canDeleteAttendance = has("attendance", "delete");
  const canViewAttendanceAll = has("attendance", "view_all");
  const canViewAttHistoryAll = has("attendanceHistory", "view_all") || has("attendance", "view_all");
  const canDeleteAttHistory = has("attendanceHistory", "delete") || has("attendance", "delete");
  const canViewDeletedHistory = has("history", "deleted");
  const canDeleteAllChat = role === "admin" && has("chat", "delete_all");
  const canRecallAllChat = has("chat", "recall_all");
  const canDeleteChatForMe = has("chat", "delete_for_me");
  const settingsPerms = permRoles[role]?.permissions;

  // Guard: if current page not allowed, redirect
  const safeTab = allowed.includes(page) ? page : allowed[0];

  return (
    <div className="relative flex flex-col md:flex-row h-full overflow-hidden" style={{ background: "var(--background)" }}>
      {availableUpdate && (
        <div className="absolute top-3 left-3 right-3 md:left-auto md:right-5 md:w-96 z-[55] rounded-2xl p-4 shadow-xl" style={{ background: "var(--card)", border: "1px solid var(--accent)" }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.12)", color: "var(--accent)" }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Pembaruan tersedia</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Versi {availableUpdate.version} siap diunduh. Setelah selesai, buka APK dan tekan Install.</div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => { window.location.href = availableUpdate.apkUrl; }} className="px-3 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--accent)" }}>Unduh update</button>
                <button onClick={() => setAvailableUpdate(null)} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--muted)" }}>Nanti</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
        unreadCounts={unreadCounts}
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
            payments={settings.payments}
          />
        )}
        {safeTab === "history" && (
          <HistoryView
            transactions={transactions}
            stores={stores}
            activeStore={activeStore}
            canDelete={canHistoryDelete}
            canPrint={canHistoryPrint}
            canViewDeleted={canViewDeletedHistory}
            deletedTransactions={deletedTransactions}
            onDelete={canHistoryDelete ? (id, reason) => handleDeleteTransaction(id, reason, currentUser.name) : undefined}
            onUpdate={canHistoryDelete ? handleUpdateTransaction : undefined}
            onPermanentDelete={canViewDeletedHistory && canHistoryDelete ? handlePermanentDelete : undefined}
            brandName={settings.brand.name}
            printer={settings.printer}
            payments={settings.payments}
            currentUser={currentUser}
          />
        )}
        {safeTab === "chat" && (
          <ChatView
            currentUser={currentUser}
            employees={employees}
            canDeleteAll={canDeleteAllChat}
            canRecallAll={canRecallAllChat}
            canDeleteForMe={canDeleteChatForMe}
          />
        )}
        {safeTab === "report" && (
          <ReportView transactions={transactions} deletedTransactions={deletedTransactions} stores={stores} payments={settings.payments} expenses={expenses} />
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
            sizes={settings.sizes}
            onUpdateSizes={next => setSettings(s => ({ ...s, sizes: next }))}
            onSave={setProducts}
            canExport={canProductExport}
            canImport={canProductImport}
            canBulk={canProductBulk}
            canCategory={canProductCategory}
            canSize={canProductSize}
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
            attendance={attendance}
            transactions={transactions}
            salaryConfig={salaryConfig}
            salaryRecords={salaryRecords}
            kasbon={kasbon}
            onSaveSalaryConfig={setSalaryConfig}
            onSaveSalaryRecords={setSalaryRecords}
            onSaveKasbon={setKasbon}
            canGaji={canEmpGaji}
            canGajiAdd={canEmpGajiAdd}
            canGajiEdit={canEmpGajiEdit}
            canGajiDelete={canEmpGajiDelete}
            settings={settings}
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
        {safeTab === "expense" && (
          <ExpenseView
            expenses={expenses}
            stores={stores}
            employees={employees}
            currentUser={currentUser}
            onSave={setExpenses}
            canAdd={canExpenseAdd}
            canEdit={canExpenseEdit}
            canDelete={canExpenseDelete}
          />
        )}
        {safeTab === "deposit" && (
          <DepositView
            deposits={deposits}
            stores={stores}
            employees={employees}
            banks={settings.banks}
            onUpdateBanks={b => setSettings(s => ({ ...s, banks: b }))}
            currentUser={currentUser}
            onSave={setDeposits}
            onDelete={undefined}
            canAdd={canDepositAdd}
            canEdit={canDepositEdit}
            canDelete={canDepositDelete}
            canBank={canDepositBank}
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
            deletedTransactions={deletedTransactions}
            attendance={attendance}
            onResetProducts={handleResetProducts}
            onResetMembers={handleResetMembers}
            onResetDiscounts={handleResetDiscounts}
            onResetStores={handleResetStores}
            onResetEmployees={handleResetEmployees}
            onResetTransactions={handleResetTransactions}
            onResetDeletedTransactions={handleResetDeletedTransactions}
            onResetAttendance={handleResetAttendance}
            onResetSalary={handleResetSalary}
            salaryRecords={salaryRecords}
            onResetChat={handleResetChat}
          />
        )}
        </Suspense>
      </div>

      <MobileBottomNav
        allowed={allowed}
        activeTab={safeTab}
        unreadCounts={unreadCounts}
      />

      <SyncToast />
    </div>
  );
}

function SyncToast() {
  const [state, setState] = useState<{ kind: "fail" | "ok"; msg: string } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const show = (s: { kind: "fail" | "ok"; msg: string }, ttl: number) => {
      setState(s);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setState(null), ttl);
    };
    const onFail = () => show({ kind: "fail", msg: "Gagal menyimpan — mencoba lagi otomatis…" }, 8000);
    const onRecovered = () => show({ kind: "ok", msg: "Data tersimpan" }, 2500);
    window.addEventListener("nands-sync-fail", onFail);
    window.addEventListener("nands-sync-recovered", onRecovered);
    return () => {
      window.removeEventListener("nands-sync-fail", onFail);
      window.removeEventListener("nands-sync-recovered", onRecovered);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!state) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg flex items-center gap-2" style={{ background: state.kind === "fail" ? "#dc2626" : "#16a34a" }}>
      {state.kind === "fail" ? (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16M4 20L20 4" /></svg>
      ) : (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      )}
      {state.msg}
    </div>
  );
}
