import { supabase } from "../lib/supabase";
import type { Product, StoreStock, Transaction, DeletedTransaction, Employee, Store, Discount, Member, AttendanceRecord } from "./types";
import type { AppSettings } from "./settings";
import { defaultSettings } from "./settings";

/* ---------------- helpers ---------------- */

const s = (v: unknown): string => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown): number => Number(v ?? 0);
const d = (v: unknown): Date | undefined => (v ? (v instanceof Date ? v : new Date(String(v))) : undefined);
const time = (v: unknown): string => (v ? String(v).slice(0, 5) : "");

const first = <T,>(r: { data: T[] | null; error: unknown }): T[] => {
  if (r.error) throw r.error;
  return r.data ?? [];
};

/* ---------------- stores ---------------- */

export const storeFromDB = (r: Record<string, unknown>): Store => ({
  id: s(r.id), name: s(r.name), address: s(r.address), phone: s(r.phone),
  openHour: time(r.open_hour) || "08:00", closeHour: time(r.close_hour) || "21:00",
});
export const storeToDB = (st: Store) => ({
  id: st.id, name: st.name, address: st.address, phone: st.phone,
  open_hour: st.openHour ?? "08:00", close_hour: st.closeHour ?? "21:00",
});

/* ---------------- employees ---------------- */

export const empFromDB = (r: Record<string, unknown>): Employee => ({
  id: s(r.id), name: s(r.name), photo: s(r.photo) || undefined, role: r.role as Employee["role"],
  storeId: s(r.store_id), phone: s(r.phone), email: s(r.email), joinDate: s(r.join_date),
  salary: n(r.salary), status: r.status === "inactive" ? "inactive" : "active", pin: s(r.pin),
});
export const empToDB = (e: Employee) => ({
  id: e.id, name: e.name, photo: e.photo ?? null, role: e.role, store_id: e.storeId,
  phone: e.phone, email: e.email, join_date: e.joinDate, salary: e.salary, status: e.status, pin: e.pin,
});

/* ---------------- members ---------------- */

export const memFromDB = (r: Record<string, unknown>): Member => ({
  id: s(r.id), name: s(r.name), phone: s(r.phone), email: s(r.email), tier: r.tier as Member["tier"],
  points: n(r.points), totalSpend: n(r.total_spend), joinDate: s(r.join_date), storeId: s(r.store_id), note: s(r.note),
});
export const memToDB = (m: Member) => ({
  id: m.id, name: m.name, phone: m.phone, email: m.email, tier: m.tier,
  points: m.points, total_spend: m.totalSpend, join_date: m.joinDate, store_id: m.storeId, note: m.note,
});

/* ---------------- discounts ---------------- */

export const discFromDB = (r: Record<string, unknown>): Discount => ({
  id: s(r.id), name: s(r.name), type: r.type as Discount["type"], value: n(r.value),
  minPurchase: n(r.min_purchase), code: s(r.code) || undefined, startDate: s(r.start_date), endDate: s(r.end_date),
  storeId: s(r.store_id), usageLimit: n(r.usage_limit), usedCount: n(r.used_count), active: !!r.active,
});
export const discToDB = (x: Discount) => ({
  id: x.id, name: x.name, type: x.type, value: x.value, min_purchase: x.minPurchase,
  code: x.code ?? null, start_date: x.startDate, end_date: x.endDate, store_id: x.storeId,
  usage_limit: x.usageLimit, used_count: x.usedCount, active: x.active,
});

/* ---------------- attendance ---------------- */

export const attFromDB = (r: Record<string, unknown>): AttendanceRecord => ({
  id: s(r.id), employeeId: s(r.employee_id), employeeName: s(r.employee_name), role: r.role as AttendanceRecord["role"],
  storeId: s(r.store_id), storeName: s(r.store_name), date: s(r.attendance_date),
  clockIn: s(r.clock_in), clockOut: s(r.clock_out) || undefined,
  photoIn: s(r.photo_in) || undefined, photoOut: s(r.photo_out) || undefined, note: s(r.note) || undefined,
});
export const attToDB = (a: AttendanceRecord) => ({
  id: a.id, employee_id: a.employeeId, employee_name: a.employeeName, role: a.role,
  store_id: a.storeId, store_name: a.storeName, attendance_date: a.date,
  clock_in: a.clockIn, clock_out: a.clockOut ?? null,
  photo_in: a.photoIn ?? null, photo_out: a.photoOut ?? null, note: a.note ?? null,
});

/* ---------------- transactions ---------------- */

export const trxFromDB = (r: Record<string, unknown>): Transaction => ({
  id: s(r.id), date: d(r.transaction_date) ?? new Date(), storeId: s(r.store_id), storeName: s(r.store_name),
  cashierId: s(r.cashier_id), cashierName: s(r.cashier_name),
  items: Array.isArray(r.items) ? (r.items as Transaction["items"]) : [],
  subtotal: n(r.subtotal), discount: n(r.discount), discountType: (s(r.discount_type) || "amount") as Transaction["discountType"],
  discountLabel: s(r.discount_label) || undefined, tax: n(r.tax), total: n(r.total),
  payment: n(r.payment), change: n(r.change_amount), paymentMethod: r.payment_method as Transaction["paymentMethod"],
  note: s(r.note), memberId: s(r.member_id) || undefined, memberName: s(r.member_name) || undefined,
  pointsEarned: n(r.points_earned),
});
export const trxToDB = (t: Transaction) => ({
  id: t.id, transaction_date: t.date instanceof Date ? t.date.toISOString() : String(t.date),
  store_id: t.storeId, store_name: t.storeName, cashier_id: t.cashierId, cashier_name: t.cashierName,
  items: t.items, subtotal: t.subtotal, discount: t.discount, discount_type: t.discountType || "amount",
  discount_label: t.discountLabel ?? null, tax: t.tax, total: t.total, payment: t.payment, change_amount: t.change,
  payment_method: t.paymentMethod, note: t.note, member_id: t.memberId ?? null, member_name: t.memberName ?? null,
  points_earned: t.pointsEarned ?? 0,
});

/* ---------------- deleted transactions ---------------- */

export const delFromDB = (r: Record<string, unknown>): DeletedTransaction => ({
  id: s(r.id), transaction: r.transaction as Transaction, deletedAt: d(r.deleted_at) ?? new Date(),
  deletedBy: s(r.deleted_by), reason: s(r.reason),
});
export const delToDB = (x: DeletedTransaction) => ({
  id: x.id, transaction: x.transaction, deleted_at: x.deletedAt instanceof Date ? x.deletedAt.toISOString() : String(x.deletedAt),
  deleted_by: x.deletedBy, reason: x.reason,
});

/* ---------------- products (denormalized) ---------------- */

interface ProductWrite {
  products: Record<string, unknown>[];
  variants: Record<string, unknown>[];
  stocks: Record<string, unknown>[];
}

let categoriesCache = new Map<string, string>();
export const setCategoriesCache = (entries: Map<string, string>) => { categoriesCache = entries; };

export function productsFromDB(prodRows: Record<string, unknown>[], varRows: Record<string, unknown>[], stockRows: Record<string, unknown>[], catRows: Record<string, unknown>[]): Product[] {
  const catMap = new Map<string, string>();
  for (const c of catRows) catMap.set(s(c.id), s(c.name));
  const stocksByVar = new Map<string, StoreStock[]>();
  for (const st of stockRows) {
    const vid = s(st.variant_id);
    const arr = stocksByVar.get(vid) ?? [];
    arr.push({ storeId: s(st.store_id), quantity: n(st.quantity) });
    stocksByVar.set(vid, arr);
  }
  return prodRows.map(p => ({
    id: s(p.id), name: s(p.name), brand: s(p.brand), category: catMap.get(s(p.category_id)) ?? "",
    basePrice: n(p.base_price), image: s(p.image),
    variants: varRows
      .filter(v => s(v.product_id) === s(p.id))
      .map(v => ({ size: s(v.size) as Product["variants"][number]["size"], color: s(v.color), sku: s(v.sku), stocks: stocksByVar.get(s(v.id)) ?? [] })),
  }));
}

export function productsToDB(ps: Product[], catMap: Map<string, string>): ProductWrite {
  const products = ps.map(p => ({
    id: p.id, name: p.name, brand: p.brand, category_id: catMap.get(p.category) ?? null, base_price: p.basePrice, image: p.image || null,
  }));
  const variants: Record<string, unknown>[] = [];
  const stocks: Record<string, unknown>[] = [];
  ps.forEach(p => {
    p.variants.forEach((v, i) => {
      const vid = `${p.id}-v${i + 1}`;
      variants.push({ id: vid, product_id: p.id, size: v.size, color: v.color, sku: v.sku });
      v.stocks.forEach(st => stocks.push({ store_id: st.storeId, variant_id: vid, quantity: st.quantity }));
    });
  });
  return { products, variants, stocks };
}

export async function writeProducts(ps: Product[]): Promise<void> {
  const { products, variants, stocks } = productsToDB(ps, categoriesCache);
  if (products.length === 0) return;
  await supabase.from("product_variants").delete().neq("id", "");
  await supabase.from("products").delete().neq("id", "");
  const e1 = await supabase.from("products").upsert(products, { onConflict: "id" });
  if (e1.error) throw e1.error;
  if (variants.length) {
    const e2 = await supabase.from("product_variants").upsert(variants, { onConflict: "id" });
    if (e2.error) throw e2.error;
  }
  if (stocks.length) {
    const e3 = await supabase.from("store_stocks").upsert(stocks, { onConflict: "variant_id, store_id" });
    if (e3.error) throw e3.error;
  }
}

/* ---------------- settings ---------------- */

export const settingsFromDB = (rows: Record<string, unknown>[]): AppSettings => {
  const obj: Record<string, unknown> = {};
  for (const r of rows) if (r && r.key) obj[s(r.key)] = r.value;
  const printer = (obj.printer ?? {}) as Partial<AppSettings["printer"]>;
  const brand = (obj.brand ?? {}) as Partial<AppSettings["brand"]>;
  return {
    ...defaultSettings,
    printer: { ...defaultSettings.printer, ...printer },
    brand: { ...defaultSettings.brand, ...brand },
  };
};
export const settingsToDB = (st: AppSettings) => [
  { key: "printer", value: st.printer },
  { key: "brand", value: st.brand },
];
export async function saveSettingsRows(rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
}

/* ---------------- generic upsert ---------------- */

export async function saveRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw error;
}

/* ---------------- attendance (upsert-only + hapus per-id) ---------------- */

const VALID_ROLES = ["admin", "manager", "manager_operasional", "kasir", "staff"];

export async function writeAttendance(rows: Record<string, unknown>[]): Promise<void> {
  const valid = rows.filter(r => r && typeof r.id === "string" && r.id && typeof r.employee_id === "string" && r.employee_id && VALID_ROLES.includes(String(r.role)));
  if (!valid.length) return;
  const { error } = await supabase.from("attendance_records").upsert(valid, { onConflict: "id" });
  if (error) throw error;
}

export async function deleteAttendance(id: string): Promise<void> {
  if (!id) return;
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- load all ---------------- */

export interface AllData {
  products: Product[];
  stores: Store[];
  employees: Employee[];
  members: Member[];
  discounts: Discount[];
  attendance: AttendanceRecord[];
  transactions: Transaction[];
  deletedTransactions: DeletedTransaction[];
  settings: AppSettings;
  categories: Category[];
}

export interface Category { id: string; name: string; }

export interface LoadResult { ok: boolean; data: AllData | null; }

export async function loadAll(): Promise<LoadResult> {
  try {
    const prodR = await supabase.from("products").select("*");
    const varR = await supabase.from("product_variants").select("*");
    const stkR = await supabase.from("store_stocks").select("*");
    const catR = await supabase.from("categories").select("*");
    const storeR = await supabase.from("stores").select("*");
    const empR = await supabase.from("employees").select("*");
    const memR = await supabase.from("members").select("*");
    const discR = await supabase.from("discounts").select("*");
    const attR = await supabase.from("attendance_records").select("*");
    const trxR = await supabase.from("transactions").select("*");
    const delR = await supabase.from("deleted_transactions").select("*");
    const setR = await supabase.from("app_settings").select("*");

    const products = productsFromDB(first(prodR), first(varR), first(stkR), first(catR));
    const catMap = new Map<string, string>();
    for (const c of (catR.data ?? [])) catMap.set(s(c.id), s(c.name));
    setCategoriesCache(catMap);

    return {
      ok: true,
      data: {
        products,
        stores: first(storeR).map(storeFromDB),
        employees: first(empR).map(empFromDB),
        members: first(memR).map(memFromDB),
        discounts: first(discR).map(discFromDB),
        attendance: first(attR).map(attFromDB),
        transactions: first(trxR).map(trxFromDB),
        deletedTransactions: first(delR).map(delFromDB),
        settings: settingsFromDB(first(setR)),
        categories: first(catR).map(c => ({ id: s(c.id), name: s(c.name) })),
      },
    };
  } catch (e) {
    console.warn("[sync] loadAll gagal:", e);
    return { ok: false, data: null };
  }
}