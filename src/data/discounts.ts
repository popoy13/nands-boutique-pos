import type { Discount } from "./types";

export const initialDiscounts: Discount[] = [
  { id: "d1", name: "Diskon Weekend 15%", type: "percent", value: 15, minPurchase: 300000, startDate: "2026-09-06", endDate: "2026-09-30", storeId: "all", usageLimit: 0, usedCount: 12, active: true },
  { id: "d2", name: "Voucher NANDS50K",   type: "voucher", value: 50000, minPurchase: 500000, code: "NANDS50K", startDate: "2026-09-01", endDate: "2026-09-30", storeId: "all", usageLimit: 100, usedCount: 23, active: true },
  { id: "d3", name: "Member Gold -10%",   type: "percent", value: 10, minPurchase: 0,      startDate: "2026-01-01", endDate: "2026-12-31", storeId: "all", usageLimit: 0,  usedCount: 8,  active: true },
  { id: "d4", name: "Flash Sale Kemang",  type: "amount",  value: 100000, minPurchase: 750000, startDate: "2026-09-09", endDate: "2026-09-10", storeId: "s2", usageLimit: 50, usedCount: 5,  active: true },
  { id: "d5", name: "Voucher GRAND20",    type: "voucher", value: 20, minPurchase: 200000, code: "GRAND20", startDate: "2026-08-01", endDate: "2026-08-31", storeId: "all", usageLimit: 200, usedCount: 200, active: false },
];
