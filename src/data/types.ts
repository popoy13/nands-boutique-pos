export type Size = "XS" | "S" | "M" | "L" | "XL" | "XXL";
export type PaymentMethod = "cash" | "debit" | "qris";
export type UserRole = "admin" | "manager" | "manager_operasional" | "kasir" | "staff";
export type MemberTier = "bronze" | "silver" | "gold" | "platinum";

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin:   ["pos", "history", "report", "inventory", "employee", "store", "discount", "product", "member", "attendance", "settings"],
  manager: ["pos", "history", "report", "inventory", "employee", "product", "attendance", "settings"],
  manager_operasional: ["pos", "history", "report", "inventory", "employee", "product", "attendance", "settings"],
  kasir:   ["pos", "history", "report", "inventory", "attendance"],
  staff:   ["inventory", "attendance"],
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
  paymentMethod: PaymentMethod;
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
  role: UserRole;
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
  role: UserRole;
  storeId: string;
  storeName: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  photoIn?: string;
  photoOut?: string;
  note?: string;
}
