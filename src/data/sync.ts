import { supabase } from "../lib/supabase"
import type {
  Product,
  StoreStock,
  Transaction,
  DeletedTransaction,
  Employee,
  Store,
  Discount,
  Member,
  AttendanceRecord,
  Expense,
} from "./types"
import type { AppSettings } from "./settings"
import { defaultSettings } from "./settings"

/* ---------------- helpers ---------------- */

const s = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v)
const n = (v: unknown): number => Number(v ?? 0)
const d = (v: unknown): Date | undefined => {
  if (!v) return undefined
  const dt = v instanceof Date ? v : new Date(String(v))
  return Number.isNaN(dt.getTime()) ? undefined : dt
}
const time = (v: unknown): string => (v ? String(v).slice(0, 5) : "")

interface QueryResult<T> {
  data: T[] | null
  error: unknown
}
function first<T>(r: QueryResult<T>): T[] {
  if (r.error) throw r.error
  return r.data ?? []
}

/* ---------------- stores ---------------- */

export const storeFromDB = (r: Record<string, unknown>): Store => ({
  id: s(r.id),
  name: s(r.name),
  address: s(r.address),
  phone: s(r.phone),
  openHour: time(r.open_hour) || "08:00",
  closeHour: time(r.close_hour) || "21:00",
})
export const storeToDB = (st: Store) => ({
  id: st.id,
  name: st.name,
  address: st.address,
  phone: st.phone,
  open_hour: st.openHour ?? "08:00",
  close_hour: st.closeHour ?? "21:00",
})

/* ---------------- employees ---------------- */

export const empFromDB = (r: Record<string, unknown>): Employee => ({
  id: s(r.id),
  name: s(r.name),
  photo: s(r.photo) || undefined,
  role: r.role as Employee["role"],
  storeId: s(r.store_id),
  phone: s(r.phone),
  email: s(r.email),
  joinDate: s(r.join_date),
  salary: n(r.salary),
  status: r.status === "inactive" ? "inactive" : "active",
  pin: s(r.pin),
})
export const empToDB = (e: Employee) => ({
  id: e.id,
  name: e.name,
  photo: e.photo ?? null,
  role: e.role,
  store_id: e.storeId,
  phone: e.phone,
  email: e.email,
  join_date: e.joinDate,
  salary: e.salary,
  status: e.status,
  pin: e.pin,
})

/* ---------------- members ---------------- */

export const memFromDB = (r: Record<string, unknown>): Member => ({
  id: s(r.id),
  name: s(r.name),
  phone: s(r.phone),
  email: s(r.email),
  tier: r.tier as Member["tier"],
  points: n(r.points),
  totalSpend: n(r.total_spend),
  joinDate: s(r.join_date),
  storeId: s(r.store_id),
  note: s(r.note),
})
export const memToDB = (m: Member) => ({
  id: m.id,
  name: m.name,
  phone: m.phone,
  email: m.email,
  tier: m.tier,
  points: m.points,
  total_spend: m.totalSpend,
  join_date: m.joinDate,
  store_id: m.storeId,
  note: m.note,
})

/* ---------------- discounts ---------------- */

export const discFromDB = (r: Record<string, unknown>): Discount => ({
  id: s(r.id),
  name: s(r.name),
  type: r.type as Discount["type"],
  value: n(r.value),
  minPurchase: n(r.min_purchase),
  code: s(r.code) || undefined,
  startDate: s(r.start_date),
  endDate: s(r.end_date),
  storeId: s(r.store_id),
  usageLimit: n(r.usage_limit),
  usedCount: n(r.used_count),
  active: !!r.active,
})
export const discToDB = (x: Discount) => ({
  id: x.id,
  name: x.name,
  type: x.type,
  value: x.value,
  min_purchase: x.minPurchase,
  code: x.code ?? null,
  start_date: x.startDate,
  end_date: x.endDate,
  store_id: x.storeId,
  usage_limit: x.usageLimit,
  used_count: x.usedCount,
  active: x.active,
})

/* ---------------- attendance ---------------- */

export const attFromDB = (r: Record<string, unknown>): AttendanceRecord => ({
  id: s(r.id),
  employeeId: s(r.employee_id),
  employeeName: s(r.employee_name),
  role: r.role as AttendanceRecord["role"],
  storeId: s(r.store_id),
  storeName: s(r.store_name),
  date: s(r.attendance_date),
  clockIn: s(r.clock_in),
  clockOut: s(r.clock_out) || undefined,
  photoIn: s(r.photo_in) || undefined,
  photoOut: s(r.photo_out) || undefined,
  note: s(r.note) || undefined,
})
export const attToDB = (a: AttendanceRecord) => ({
  id: a.id,
  employee_id: a.employeeId,
  employee_name: a.employeeName,
  role: a.role,
  store_id: a.storeId,
  store_name: a.storeName,
  attendance_date: a.date,
  clock_in: a.clockIn,
  clock_out: a.clockOut ?? null,
  photo_in: a.photoIn ?? null,
  photo_out: a.photoOut ?? null,
  note: a.note ?? null,
})

/* ---------------- transactions ---------------- */

const sanitizeItems = (raw: unknown): Transaction["items"] => {
  if (!Array.isArray(raw)) return []
  const out: Transaction["items"] = []
  for (const it of raw) {
    if (!it || typeof it !== "object") continue
    const row = it as Record<string, unknown>
    const quantity = Number(row.quantity ?? 1)
    const price = Number(row.price ?? 0)
    const subtotal = Number.isFinite(Number(row.subtotal)) ? Number(row.subtotal) : quantity * price
    const item: Transaction["items"][number] = {
      productId: s(row.productId) || s(row.product_id),
      variantSku: s(row.variantSku) || s(row.variant_sku),
      name: s(row.name),
      brand: s(row.brand),
      size: (s(row.size) || "M") as Transaction["items"][number]["size"],
      color: s(row.color) || "Standar",
      price,
      quantity,
      subtotal,
      image: row.image === undefined || row.image === null ? "" : String(row.image),
    }
    if (item.variantSku && item.name) out.push(item)
  }
  return out
}

export const trxFromDB = (r: Record<string, unknown>): Transaction => ({
  id: s(r.id),
  date: d(r.transaction_date) ?? new Date(),
  storeId: s(r.store_id),
  storeName: s(r.store_name),
  cashierId: s(r.cashier_id),
  cashierName: s(r.cashier_name),
  items: sanitizeItems(r.items),
  subtotal: n(r.subtotal),
  discount: n(r.discount),
  discountType: (s(r.discount_type) || "amount") as Transaction["discountType"],
  discountLabel: s(r.discount_label) || undefined,
  tax: n(r.tax),
  total: n(r.total),
  payment: n(r.payment),
  change: n(r.change_amount),
  paymentMethod: r.payment_method as Transaction["paymentMethod"],
  note: s(r.note),
  memberId: s(r.member_id) || undefined,
  memberName: s(r.member_name) || undefined,
  pointsEarned: n(r.points_earned),
})
export const trxToDB = (t: Transaction) => ({
  id: t.id,
  transaction_date:
    t.date instanceof Date ? t.date.toISOString() : String(t.date),
  store_id: t.storeId,
  store_name: t.storeName,
  cashier_id: t.cashierId,
  cashier_name: t.cashierName,
  items: t.items,
  subtotal: t.subtotal,
  discount: t.discount,
  discount_type: t.discountType || "amount",
  discount_label: t.discountLabel ?? null,
  tax: t.tax,
  total: t.total,
  payment: t.payment,
  change_amount: t.change,
  payment_method: t.paymentMethod,
  note: t.note,
  member_id: t.memberId ?? null,
  member_name: t.memberName ?? null,
  points_earned: t.pointsEarned ?? 0,
})

/* ---------------- deleted transactions ---------------- */

export const delFromDB = (r: Record<string, unknown>): DeletedTransaction => {
  const rawTrx = r.transaction as Record<string, unknown> | null | undefined
  const transaction = {
    ...(rawTrx ?? {}),
    date:
      rawTrx?.date instanceof Date
        ? rawTrx.date
        : (d(rawTrx?.date) ?? new Date()),
  } as Transaction
  return {
    id: s(r.id),
    transaction,
    deletedAt: d(r.deleted_at) ?? new Date(),
    deletedBy: s(r.deleted_by),
    reason: s(r.reason),
  }
}
export const delToDB = (x: DeletedTransaction) => ({
  id: x.id,
  transaction: x.transaction,
  deleted_at:
    x.deletedAt instanceof Date
      ? x.deletedAt.toISOString()
      : String(x.deletedAt),
  deleted_by: x.deletedBy,
  reason: x.reason,
})

/* ---------------- products (denormalized) ---------------- */

interface ProductWrite {
  products: Record<string, unknown>[]
  variants: Record<string, unknown>[]
  stocks: Record<string, unknown>[]
}

let categoriesCache = new Map<string, string>()
export const setCategoriesCache = (entries: Map<string, string>) => {
  categoriesCache = entries
}

export function productsFromDB(
  prodRows: Record<string, unknown>[],
  varRows: Record<string, unknown>[],
  stockRows: Record<string, unknown>[],
  catRows: Record<string, unknown>[],
): Product[] {
  const catMap = new Map<string, string>()
  for (const c of catRows) catMap.set(s(c.id), s(c.name))
  const stocksByVar = new Map<string, StoreStock[]>()
  for (const st of stockRows) {
    const vid = s(st.variant_id)
    const arr = stocksByVar.get(vid) ?? []
    arr.push({ storeId: s(st.store_id), quantity: n(st.quantity) })
    stocksByVar.set(vid, arr)
  }
  return prodRows.map((p) => ({
    id: s(p.id),
    name: s(p.name),
    brand: s(p.brand),
    category: catMap.get(s(p.category_id)) ?? "",
    basePrice: n(p.base_price),
    image: s(p.image),
    variants: varRows
      .filter((v) => s(v.product_id) === s(p.id))
      .map((v) => ({
        size: s(v.size) as Product["variants"][number]["size"],
        color: s(v.color),
        sku: s(v.sku),
        stocks: stocksByVar.get(s(v.id)) ?? [],
      })),
  }))
}

export const stableVariantId = (productId: string, sku: string): string => {
  let h = 0x811c9dc5
  for (let i = 0; i < sku.length; i++) {
    h ^= sku.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${productId}-v-${(h >>> 0).toString(36)}`
}

export function productsToDB(
  ps: Product[],
  catMap: Map<string, string>,
): ProductWrite {
  const nameToId = new Map<string, string>()
  for (const [id, name] of catMap) nameToId.set(name, id)
  const products = ps.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category_id: nameToId.get(p.category) ?? null,
    base_price: p.basePrice,
    image: p.image || null,
  }))
  const variants: Record<string, unknown>[] = []
  const stocks: Record<string, unknown>[] = []
  ps.forEach((p) => {
    p.variants.forEach((v) => {
      const vid = stableVariantId(p.id, v.sku)
      variants.push({
        id: vid,
        product_id: p.id,
        size: v.size,
        color: v.color,
        sku: v.sku,
      })
      v.stocks.forEach((st) =>
        stocks.push({
          store_id: st.storeId,
          variant_id: vid,
          quantity: st.quantity,
        }),
      )
    })
  })
  return { products, variants, stocks }
}

export async function writeProducts(
  ps: Product[],
  removed?: { products: string[]; variants: string[] },
): Promise<void> {
  const { products, variants, stocks } = productsToDB(ps, categoriesCache)

  const seen = new Set<string>()
  for (const v of variants) {
    if (v.sku && seen.has(String(v.sku)))
      throw new Error(`SKU ganda: ${String(v.sku)}`)
    if (v.sku) seen.add(String(v.sku))
  }

  if (products.length) {
    const e1 = await supabase
      .from("products")
      .upsert(products, { onConflict: "id" })
    if (e1.error) throw e1.error
  }
  if (variants.length) {
    const e2 = await supabase
      .from("product_variants")
      .upsert(variants, { onConflict: "id" })
    if (e2.error) throw e2.error
  }
  if (stocks.length) {
    const e3 = await supabase
      .from("store_stocks")
      .upsert(stocks, { onConflict: "variant_id, store_id" })
    if (e3.error) throw e3.error
  }

  const removedProducts = new Set(removed?.products ?? [])
  const removedVariants = new Set(removed?.variants ?? [])

  if (removedProducts.size) {
    const e4 = await supabase
      .from("products")
      .delete()
      .in("id", [...removedProducts])
    if (e4.error) throw e4.error
    // product_variants & store_stocks terhapus otomatis via ON DELETE CASCADE.
  }

  if (removedVariants.size) {
    const e8 = await supabase
      .from("product_variants")
      .delete()
      .in("id", [...removedVariants])
    if (e8.error) throw e8.error
    // store_stocks varian tsb terhapus otomatis via ON DELETE CASCADE.
  }
}

/* ---------------- settings ---------------- */

export const settingsFromDB = (
  rows: Record<string, unknown>[],
): AppSettings => {
  const obj: Record<string, unknown> = {}
  for (const r of rows) if (r && r.key) obj[s(r.key)] = r.value
  const printer = (obj.printer ?? {}) as Partial<AppSettings["printer"]>
  const brand = (obj.brand ?? {}) as Partial<AppSettings["brand"]>
  const barcode = (obj.barcode ?? {}) as Partial<AppSettings["barcode"]>
  const payments = (obj.payments ?? {}) as Partial<AppSettings["payments"]>
  // Migrasi branding lama "NET R" -> default baru (NANDS BOUTIQUE)
  if (brand.name === "NET R") brand.name = defaultSettings.brand.name
  return {
    ...defaultSettings,
    printer: { ...defaultSettings.printer, ...printer },
    brand: { ...defaultSettings.brand, ...brand },
    roles: {
      ...defaultSettings.roles,
      ...(obj.roles ?? {}),
    } as AppSettings["roles"],
    barcode: { ...defaultSettings.barcode, ...barcode },
    payments: {
      methods: payments.methods ?? defaultSettings.payments.methods,
      tax: { ...defaultSettings.payments.tax, ...(payments.tax ?? {}) },
      rounding: { ...defaultSettings.payments.rounding, ...(payments.rounding ?? {}) },
    },
  }
}
export const settingsToDB = (st: AppSettings) => [
  { key: "printer", value: st.printer },
  { key: "brand", value: st.brand },
  { key: "roles", value: st.roles },
  { key: "barcode", value: st.barcode },
  { key: "payments", value: st.payments },
]
export async function saveSettingsRows(
  rows: Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) return
  const { error } = await supabase
    .from("app_settings")
    .upsert(rows, { onConflict: "key" })
  if (error) throw error
}

/* ---------------- generic upsert ---------------- */

export async function saveRows(
  table: string,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) return
  const { error } = await supabase
    .from(table)
    .upsert(rows, { onConflict: "id" })
  if (error) throw error
}

/* ---------------- attendance (upsert-only + hapus per-id) ---------------- */

export async function writeAttendance(
  rows: Record<string, unknown>[],
): Promise<void> {
  const valid = rows.filter(
    (r) =>
      r &&
      typeof r.id === "string" &&
      r.id &&
      typeof r.employee_id === "string" &&
      r.employee_id &&
      typeof r.role === "string" &&
      r.role,
  )
  if (!valid.length) return
  const { error } = await supabase
    .from("attendance_records")
    .upsert(valid, { onConflict: "id" })
  if (error) throw error
}

export async function deleteAttendance(id: string): Promise<void> {
  if (!id) return
  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("id", id)
  if (error) throw error
}

/* ---------------- expenses ---------------- */

export const expFromDB = (r: Record<string, unknown>): Expense => ({
  id: s(r.id),
  storeId: s(r.store_id),
  storeName: s(r.store_name),
  amount: n(r.amount),
  description: s(r.description),
  photo: s(r.photo) || undefined,
  createdByName: s(r.created_by_name),
  date: d(r.expense_date) ?? new Date(),
})

export const expToDB = (x: Expense) => ({
  id: x.id,
  store_id: x.storeId,
  store_name: x.storeName,
  amount: x.amount,
  description: x.description,
  photo: x.photo ?? null,
  created_by_name: x.createdByName,
  expense_date:
    x.date instanceof Date ? x.date.toISOString() : String(x.date),
})

export async function writeExpenses(
  rows: Record<string, unknown>[],
): Promise<void> {
  const valid = rows.filter(
    (r) =>
      r &&
      typeof r.id === "string" &&
      r.id &&
      typeof r.store_id === "string" &&
      r.store_id &&
      typeof r.amount === "number",
  )
  if (!valid.length) return
  const { error } = await supabase
    .from("expenses")
    .upsert(valid, { onConflict: "id" })
  if (error) throw error
}

export async function deleteExpense(id: string): Promise<void> {
  if (!id) return
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
  if (error) throw error
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!id) return
  const { error } = await supabase.from("transactions").delete().eq("id", id)
  if (error) throw error
}

export async function deleteRows(table: string, ids: string[]): Promise<void> {
  const valid = ids.filter((i) => i && typeof i === "string")
  if (!valid.length) return
  const { error } = await supabase.from(table).delete().in("id", valid)
  if (error) throw error
}

export interface ResetResult {
  ok: boolean
  msg?: string
}

/* ---------------- load all ---------------- */

export interface AllData {
  products: Product[]
  stores: Store[]
  employees: Employee[]
  members: Member[]
  discounts: Discount[]
  attendance: AttendanceRecord[]
  expenses: Expense[]
  transactions: Transaction[]
  deletedTransactions: DeletedTransaction[]
  settings: AppSettings
  categories: Category[]
}

export interface Category {
  id: string
  name: string
}

export interface LoadResult {
  ok: boolean
  data: AllData | null
}

export async function loadAll(): Promise<LoadResult> {
  try {
    const [
      prodR,
      varR,
      stkR,
      catR,
      storeR,
      empR,
      memR,
      discR,
      attR,
      expR,
      trxR,
      delR,
      setR,
    ] = await Promise.all([
      supabase.from("products").select("*"),
      supabase.from("product_variants").select("*"),
      supabase.from("store_stocks").select("*"),
      supabase.from("categories").select("*"),
      supabase.from("stores").select("*"),
      supabase.from("employees").select("*"),
      supabase.from("members").select("*"),
      supabase.from("discounts").select("*"),
      supabase.from("attendance_records").select("*"),
      supabase.from("expenses").select("*"),
      supabase.from("transactions").select("*"),
      supabase.from("deleted_transactions").select("*"),
      supabase.from("app_settings").select("*"),
    ])

    const products = productsFromDB(
      first(prodR),
      first(varR),
      first(stkR),
      first(catR),
    )
    const catMap = new Map<string, string>()
    for (const c of catR.data ?? []) catMap.set(s(c.id), s(c.name))
    setCategoriesCache(catMap)

    return {
      ok: true,
      data: {
        products,
        stores: first(storeR).map(storeFromDB),
        employees: first(empR).map(empFromDB),
        members: first(memR).map(memFromDB),
        discounts: first(discR).map(discFromDB),
        attendance: first(attR).map(attFromDB),
        expenses: first(expR).map(expFromDB),
        transactions: first(trxR).map(trxFromDB),
        deletedTransactions: first(delR).map(delFromDB),
        settings: settingsFromDB(first(setR)),
        categories: first(catR).map((c) => ({ id: s(c.id), name: s(c.name) })),
      },
    }
  } catch (e) {
    console.warn("[sync] loadAll gagal:", e)
    return { ok: false, data: null }
  }
}
