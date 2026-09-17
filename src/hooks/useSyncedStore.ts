import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { supabase } from "../lib/supabase";
import {
  loadAll, saveRows, saveSettingsRows, writeProducts, writeAttendance, setCategoriesCache, deleteRows,
  storeFromDB, storeToDB, empFromDB, empToDB, memFromDB, memToDB,
  discFromDB, discToDB, attFromDB, attToDB, trxFromDB, trxToDB,
  delFromDB, delToDB, settingsFromDB, settingsToDB, stableVariantId,
  expFromDB, expToDB, writeExpenses, saveExpensesJson,
  depFromDB, depToDB, writeDeposits, saveDepositsJson,
} from "../data/sync";
import type { Transaction, DeletedTransaction, Employee, Product, Store, Discount, Member, AttendanceRecord, Expense, CashDeposit } from "../data/types";
import type { Category } from "../data/sync";
import type { AppSettings } from "../data/settings";
import { defaultSettings } from "../data/settings";
import { initialProducts } from "../data/products";
import { initialStores } from "../data/stores";
import { initialEmployees } from "../data/employees";
import { initialDiscounts } from "../data/discounts";
import { initialMembers } from "../data/members";
import { seedTransactions } from "../data/transactions";
import { seedAttendance } from "../data/attendance";

const DEBOUNCE_MS = 350;

export interface SyncedStore {
  ready: boolean;
  products: Product[]; setProducts: Dispatch<SetStateAction<Product[]>>;
  stores: Store[]; setStores: Dispatch<SetStateAction<Store[]>>;
  employees: Employee[]; setEmployees: Dispatch<SetStateAction<Employee[]>>;
  members: Member[]; setMembers: Dispatch<SetStateAction<Member[]>>;
  discounts: Discount[]; setDiscounts: Dispatch<SetStateAction<Discount[]>>;
  attendance: AttendanceRecord[]; setAttendance: Dispatch<SetStateAction<AttendanceRecord[]>>;
  transactions: Transaction[]; setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  deletedTransactions: DeletedTransaction[]; setDeletedTransactions: Dispatch<SetStateAction<DeletedTransaction[]>>;
  settings: AppSettings; setSettings: Dispatch<SetStateAction<AppSettings>>;
  categories: Category[]; setCategories: Dispatch<SetStateAction<Category[]>>;
  expenses: Expense[]; setExpenses: Dispatch<SetStateAction<Expense[]>>;
  deposits: CashDeposit[]; setDeposits: Dispatch<SetStateAction<CashDeposit[]>>;
  flush: () => Promise<void>;
}

export function useSyncedStore(): SyncedStore {
  const [ready, setReady] = useState(false);
  const [products, setProductsState] = useState<Product[]>(initialProducts);
  const [stores, setStoresState] = useState<Store[]>(initialStores);
  const [employees, setEmployeesState] = useState<Employee[]>(initialEmployees);
  const [members, setMembersState] = useState<Member[]>(initialMembers);
  const [discounts, setDiscountsState] = useState<Discount[]>(initialDiscounts);
  const [attendance, setAttendanceState] = useState<AttendanceRecord[]>(seedAttendance);
  const [transactions, setTransactionsState] = useState<Transaction[]>(seedTransactions);
  const [deletedTransactions, setDeletedTransactionsState] = useState<DeletedTransaction[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(defaultSettings);
  const [categories, setCategoriesState] = useState<Category[]>([]);
  const [expenses, setExpensesState] = useState<Expense[]>([]);
  const [deposits, setDepositsState] = useState<CashDeposit[]>([]);

  const readyRef = useRef(false);
  readyRef.current = ready;
  const validEmpIdsRef = useRef<Set<string>>(new Set());

  const pendingRef = useRef<Record<string, unknown>>({});
  const removedRef = useRef<Record<string, string[]>>({});
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const appliedRef = useRef<(payload: { table: string; rows: unknown[] }) => void>(() => {});
  const lastStatusRef = useRef("");
  const productsRemovedRef = useRef<{ products: string[]; variants: string[] }>({ products: [], variants: [] });

  const trackRemoved = (table: string, prevArr: { id: string }[], nextArr: { id: string }[]) => {
    const gone = prevArr.filter(p => !nextArr.some(n => n.id === p.id)).map(p => p.id);
    if (!gone.length) return;
    removedRef.current[table] = [...new Set([...(removedRef.current[table] ?? []), ...gone])];
  };

const onAttendanceFail = (again: unknown) => {
    pendingRef.current["attendance_records"] = again;
    if (timersRef.current["attendance_records"]) return;
    timersRef.current["attendance_records"] = setTimeout(() => {
      timersRef.current["attendance_records"] = null;
      const retry = pendingRef.current["attendance_records"];
      pendingRef.current["attendance_records"] = null;
      if (retry === undefined || retry === null) return;
      void writeTable("attendance_records", retry, onAttendanceFail);
    }, 2000);
  };

const propagate = (table: string, rows: unknown) => {
  pendingRef.current[table] = rows;
  if (table === "attendance_records") {
    // Attendance is critical & low-frequency â€” flush immediately (no debounce
    // delay) and retry so clock-in/out is not silently lost.
    const payload = pendingRef.current[table];
    pendingRef.current[table] = null;
    void writeTable(table, payload, onAttendanceFail);
    return;
  }
  if (timersRef.current[table]) return;
  timersRef.current[table] = setTimeout(async () => {
    timersRef.current[table] = null;
    const payload = pendingRef.current[table];
    pendingRef.current[table] = null;
    if (payload === undefined) return;
    await writeTable(table, payload);
  }, DEBOUNCE_MS);
};

async function writeTable(table: string, payload: unknown, onFail?: (payload: unknown) => void) {
  if (payload === undefined) return;
  try {
    switch (table) {
      case "products": {
        const removed = productsRemovedRef.current;
        await writeProducts(payload as Product[], removed);
        productsRemovedRef.current = { products: [], variants: [] };
        break;
      }
      case "attendance_records": await writeAttendance(payload as Record<string, unknown>[]); break;
      case "settings": await saveSettingsRows(payload as Record<string, unknown>[]); break;
      case "expenses": {
        const rows = payload as Record<string, unknown>[];
        // Selalu simpan ke app_settings (works walau array kosong / tabel belum ada),
        // lalu upsert best-effort ke tabel dedicated bila sudah dibuat.
        await saveExpensesJson(rows);
        try { await writeExpenses(rows); } catch (e) {
          console.warn("[sync] tabel expenses belum tersedia:", e);
        }
        break;
      }
      case "deposits": {
        const rows = payload as Record<string, unknown>[];
        // Analog expenses: simpan ke app_settings (JSON) supaya selalu tercatat
        // walau tabel `cash_deposits` belum dibuat, lalu upsert best-effort.
        await saveDepositsJson(rows);
        try { await writeDeposits(rows); } catch (e) {
          console.warn("[sync] tabel cash_deposits belum tersedia:", e);
        }
        break;
      }
      default: await saveRows(table, payload as Record<string, unknown>[]);
    }
    try { await channelRef.current?.send({ type: "broadcast", event: "sync", payload: { table, rows: payload } }); } catch { /* noop */ }
    const removedIds = removedRef.current[table];
    if (removedIds?.length) {
      try { await deleteRows(table, removedIds); } catch (e) { console.warn("[sync] hapus baris gagal:", table, e); }
    }
    removedRef.current[table] = [];
  } catch (e) {
    console.warn("[sync] tulis ke database gagal:", table, e);
    onFail?.(payload);
  }
}

  /* --- wrapped setters (value or functional updater) --- */
  const setProducts: Dispatch<SetStateAction<Product[]>> = (upd) => setProductsState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Product[]) => Product[])(prev) : upd;
    if (next !== prev) {
      const pr = productsRemovedRef.current;
      const goneProducts = prev.filter(p => !next.some(n => n.id === p.id)).map(p => p.id);
      const goneVariants: string[] = [];
      for (const p of prev) {
        const np = next.find(n => n.id === p.id);
        if (!np) continue;
        for (const v of p.variants) {
          if (!np.variants.some(v2 => v2.sku === v.sku && v2.size === v.size && v2.color === v.color)) {
            goneVariants.push(stableVariantId(p.id, v.sku));
          }
        }
      }
      if (goneProducts.length) pr.products = [...new Set([...pr.products, ...goneProducts])];
      if (goneVariants.length) pr.variants = [...new Set([...pr.variants, ...goneVariants])];
      const reAddedP = new Set(next.map(n => n.id));
      pr.products = pr.products.filter(id => !reAddedP.has(id));
      const reAddedV = new Set<string>();
      for (const p of next) for (const v of p.variants) reAddedV.add(stableVariantId(p.id, v.sku));
      pr.variants = pr.variants.filter(id => !reAddedV.has(id));
      propagate("products", next);
    }
    return next;
  });
  const setStores: Dispatch<SetStateAction<Store[]>> = (upd) => setStoresState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Store[]) => Store[])(prev) : upd;
    if (next !== prev) {
      trackRemoved("stores", prev, next);
      propagate("stores", next.map(storeToDB));
    }
    return next;
  });
  const setEmployees: Dispatch<SetStateAction<Employee[]>> = (upd) => setEmployeesState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Employee[]) => Employee[])(prev) : upd;
    if (next !== prev) {
      validEmpIdsRef.current = new Set(next.map(e => e.id));
      trackRemoved("employees", prev, next);
      propagate("employees", next.map(empToDB));
    }
    return next;
  });
  const setMembers: Dispatch<SetStateAction<Member[]>> = (upd) => setMembersState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Member[]) => Member[])(prev) : upd;
    if (next !== prev) {
      trackRemoved("members", prev, next);
      propagate("members", next.map(memToDB));
    }
    return next;
  });
  const setDiscounts: Dispatch<SetStateAction<Discount[]>> = (upd) => setDiscountsState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Discount[]) => Discount[])(prev) : upd;
    if (next !== prev) {
      trackRemoved("discounts", prev, next);
      propagate("discounts", next.map(discToDB));
    }
    return next;
  });
  const setAttendance: Dispatch<SetStateAction<AttendanceRecord[]>> = (upd) => setAttendanceState(prev => {
    const next = typeof upd === "function" ? (upd as (p: AttendanceRecord[]) => AttendanceRecord[])(prev) : upd;
    if (next !== prev) {
      const validIds = validEmpIdsRef.current;
      const rows = next.filter(r => validIds.has(r.employeeId)).map(attToDB);
      propagate("attendance_records", rows);
    }
    return next;
  });
  const setTransactions: Dispatch<SetStateAction<Transaction[]>> = (upd) => setTransactionsState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Transaction[]) => Transaction[])(prev) : upd;
    if (next !== prev) propagate("transactions", next.map(trxToDB));
    return next;
  });
  const setDeletedTransactions: Dispatch<SetStateAction<DeletedTransaction[]>> = (upd) => setDeletedTransactionsState(prev => {
    const next = typeof upd === "function" ? (upd as (p: DeletedTransaction[]) => DeletedTransaction[])(prev) : upd;
    if (next !== prev) propagate("deleted_transactions", next.map(delToDB));
    return next;
  });
  const setSettings: Dispatch<SetStateAction<AppSettings>> = (upd) => setSettingsState(prev => {
    const next = typeof upd === "function" ? (upd as (p: AppSettings) => AppSettings)(prev) : upd;
    if (next !== prev) propagate("settings", settingsToDB(next));
    return next;
  });
  const setCategories: Dispatch<SetStateAction<Category[]>> = (upd) => setCategoriesState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Category[]) => Category[])(prev) : upd;
    if (next !== prev) {
      setCategoriesCache(new Map(next.map(c => [c.id, c.name])));
      trackRemoved("categories", prev, next);
      propagate("categories", next);
    }
    return next;
  });
  const setExpenses: Dispatch<SetStateAction<Expense[]>> = (upd) => setExpensesState(prev => {
    const next = typeof upd === "function" ? (upd as (p: Expense[]) => Expense[])(prev) : upd;
    if (next !== prev) {
      trackRemoved("expenses", prev, next);
      propagate("expenses", next.map(expToDB));
    }
    return next;
  });
  const setDeposits: Dispatch<SetStateAction<CashDeposit[]>> = (upd) => setDepositsState(prev => {
    const next = typeof upd === "function" ? (upd as (p: CashDeposit[]) => CashDeposit[])(prev) : upd;
    if (next !== prev) {
      trackRemoved("deposits", prev, next);
      propagate("deposits", next.map(depToDB));
    }
    return next;
  });

  const flush = async () => {
    const tasks: Promise<unknown>[] = [];
    for (const table of Object.keys(timersRef.current)) {
      const timer = timersRef.current[table];
      if (timer) { clearTimeout(timer); timersRef.current[table] = null; }
    }
    for (const table of Object.keys(pendingRef.current)) {
      const payload = pendingRef.current[table];
      if (payload !== undefined && payload !== null) {
        pendingRef.current[table] = null;
        tasks.push(writeTable(table, payload));
      }
    }
    await Promise.all(tasks);
  };

  useEffect(() => {
    const onPageHide = () => { void flush(); };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  const applyRemote = (payload: { table: string; rows: unknown[] }) => {
    if (!payload || !Array.isArray(payload.rows)) return;
    const rows = payload.rows as Record<string, unknown>[];
    switch (payload.table) {
      case "products": {
        const incoming = payload.rows as Product[];
        const keptP = new Set(incoming.map(p => p.id));
        productsRemovedRef.current.products = productsRemovedRef.current.products.filter(id => !keptP.has(id));
        const keptV = new Set<string>();
        for (const p of incoming) for (const v of p.variants) keptV.add(stableVariantId(p.id, v.sku));
        productsRemovedRef.current.variants = productsRemovedRef.current.variants.filter(id => !keptV.has(id));
        setProductsState(incoming);
        break;
      }
      case "stores": setStoresState(rows.map(storeFromDB)); break;
      case "employees": setEmployeesState(rows.map(empFromDB)); validEmpIdsRef.current = new Set(rows.map(r => String(r.id))); break;
      case "members": setMembersState(rows.map(memFromDB)); break;
      case "discounts": setDiscountsState(rows.map(discFromDB)); break;
      case "attendance_records": setAttendanceState(rows.map(attFromDB)); break;
      case "transactions": setTransactionsState(rows.map(trxFromDB)); break;
      case "deleted_transactions": setDeletedTransactionsState(rows.map(delFromDB)); break;
      case "settings": setSettingsState(settingsFromDB(rows)); break;
      case "categories":
        setCategoriesCache(new Map(rows.map(c => [String(c.id), String(c.name)])));
        setCategoriesState(rows.map(c => ({ id: String(c.id), name: String(c.name) })));
        break;
      case "expenses":
        setExpensesState(rows.map(expFromDB));
        break;
      case "deposits":
        setDepositsState(rows.map(depFromDB));
        break;
    }
  };
  appliedRef.current = applyRemote;

  /* --- initial load --- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await loadAll();
      if (cancelled) return;
      if (res.ok && res.data) {
        const d = res.data;
        validEmpIdsRef.current = new Set(d.employees.map(e => e.id));
        setProductsState(d.products);
        setStoresState(d.stores);
        setEmployeesState(d.employees);
        setMembersState(d.members);
        setDiscountsState(d.discounts);
        setAttendanceState(d.attendance);
        setTransactionsState(d.transactions);
        setDeletedTransactionsState(d.deletedTransactions);
        setSettingsState(d.settings);
        setCategoriesState(d.categories);
        setExpensesState(d.expenses);
        setDepositsState(d.deposits);
        setCategoriesCache(new Map(d.categories.map(c => [c.id, c.name])));
      } else {        console.warn("[sync] Supabase belum disetup â€” jalankan database/supabase-setup.sql di SQL Editor. Memakai data lokal sementara.");
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  /* --- realtime: broadcast antar perangkat + resync saat reconnect --- */
  useEffect(() => {
    const channel = supabase.channel("nands-pos");
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "sync" }, (msg) => {
        const payload = msg?.payload as { table: string; rows: unknown[] };
        if (!payload || !readyRef.current) return;
        appliedRef.current(payload);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && lastStatusRef.current !== "SUBSCRIBED" && readyRef.current) {
          if (Object.values(pendingRef.current).some(v => v !== undefined && v !== null)) return;
          const res = await loadAll();
          if (res.ok && res.data) {
            const d = res.data;
            validEmpIdsRef.current = new Set(d.employees.map(e => e.id));
            setProductsState(d.products);
            setStoresState(d.stores);
            setEmployeesState(d.employees);
            setMembersState(d.members);
            setDiscountsState(d.discounts);
            setAttendanceState(d.attendance);
            setTransactionsState(d.transactions);
            setDeletedTransactionsState(d.deletedTransactions);
            setSettingsState(d.settings);
            setCategoriesState(d.categories);
            setExpensesState(d.expenses);
            setDepositsState(d.deposits);
            setCategoriesCache(new Map(d.categories.map(c => [c.id, c.name])));
            productsRemovedRef.current = { products: [], variants: [] };
            for (const k of Object.keys(removedRef.current)) removedRef.current[k] = [];
          }
        }
        lastStatusRef.current = status;
      });
    return () => { supabase.removeChannel(channel); channelRef.current = null; };
  }, []);

  return {
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
    flush,
  };
}