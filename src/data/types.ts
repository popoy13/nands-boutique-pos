export type Size = string;
export type PaymentMethod = "cash" | "debit" | "qris";
export type UserRole = "admin" | "manager" | "manager_operasional" | "kasir" | "staff";
export type MemberTier = "bronze" | "silver" | "gold" | "platinum";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:   ["pos", "history", "chat", "expense", "deposit", "report", "inventory", "employee", "store", "discount", "product", "member", "attendance", "attendanceHistory", "settings"],
  manager: ["pos", "history", "chat", "expense", "deposit", "report", "inventory", "employee", "product", "attendance", "attendanceHistory", "settings"],
  manager_operasional: ["pos", "history", "chat", "expense", "deposit", "report", "inventory", "employee", "product", "attendance", "attendanceHistory", "settings"],
  kasir:   ["pos", "history", "chat", "expense", "deposit", "report", "inventory", "attendance", "attendanceHistory"],
  staff:   ["inventory", "chat", "attendance", "attendanceHistory"],
};

export interface StoreStock {
  storeId: string;
  quantity: number;
}

export interface ProductVariant {
  size: Size;
  color: string;
  sku: string;
  stocks: StoreStock[];
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  basePrice: number;
  image: string;
  variants: ProductVariant[];
}

export interface CartItem {
  productId: string;
  variantSku: string;
  name: string;
  brand: string;
  size: Size;
  color: string;
  price: number;
  quantity: number;
  subtotal: number;
  image: string;
}

export interface Transaction {
  id: string;
  date: Date;
  storeId: string;
  storeName: string;
  cashierId: string;
  cashierName: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  discountType: "amount" | "percent";
  discountLabel?: string;
  tax: number;
  total: number;
  payment: number;
  change: number;
  paymentMethod: string;
  note: string;
  memberId?: string;
  memberName?: string;
  pointsEarned?: number;
}

export interface DeletedTransaction {
  id: string;
  transaction: Transaction;
  deletedAt: Date;
  deletedBy: string;
  reason: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  openHour?: string;
  closeHour?: string;
}

export interface Employee {
  id: string;
  name: string;
  photo?: string;
  role: string;
  storeId: string;
  phone: string;
  email: string;
  joinDate: string;
  salary: number;
  status: "active" | "inactive";
  pin: string;
}

export interface Discount {
  id: string;
  name: string;
  type: "percent" | "amount" | "voucher";
  value: number;
  minPurchase: number;
  code?: string;
  startDate: string;
  endDate: string;
  storeId: string;
  usageLimit: number;
  usedCount: number;
  active: boolean;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  tier: MemberTier;
  points: number;
  totalSpend: number;
  joinDate: string;
  storeId: string;
  note: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  storeId: string;
  storeName: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  photoIn?: string;
  photoOut?: string;
  note?: string;
}

export interface Expense {
  id: string;
  storeId: string;
  storeName: string;
  amount: number;
  description: string;
  photo?: string;
  createdByName: string;
  date: string;
}

export interface CashDeposit {
  id: string;
  storeId: string;
  storeName: string;
  date: string;
  bank: string;
  amount: number;
  referenceCode: string;
  notes: string;
  photo?: string;
  createdByName: string;
}

export interface SalaryConfig {
  employeeId: string;
  baseSalary: number;
  salesTarget: number;
  bonus: number;
}

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  storeId: string;
  storeName: string;
  month: string;
  baseSalary: number;
  attendanceCount: number;
  gross: number;
  salesTotal: number;
  salesTarget: number;
  bonus: number;
  total: number;
  paid: boolean;
  paidAt?: string;
}

export interface Kasbon {
  id: string;
  employeeId: string;
  date: string;
  amount: number;
  note?: string;
  settled: boolean;
  settledAt?: string;
  settlementMonth?: string;
}
