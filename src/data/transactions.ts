import type { Transaction } from "./types";

const d = (daysAgo: number, hour: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  dt.setHours(hour, Math.floor(Math.random() * 55), 0, 0);
  return dt;
};

export const generateId = (storeId: string) => {
  const now = new Date();
  const sn = storeId.replace("s", "");
  return `TRX-S${sn}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`;
};

export const seedTransactions: Transaction[] = [
  {
    id: "TRX-S1-20260901-0023", date: d(7, 10), storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman",
    cashierId: "e2", cashierName: "Budi Santoso",
    items: [
      { productId: "p3", variantSku: "KOS-OVR-WHT-M", name: "Oversized Tee Essential", brand: "NOSTRA", size: "M", color: "Putih", price: 179000, quantity: 2, subtotal: 358000, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop&auto=format" },
      { productId: "p2", variantSku: "CLN-CHN-KHK-L", name: "Slim Fit Chinos", brand: "NOSTRA", size: "L", color: "Khaki", price: 345000, quantity: 1, subtotal: 345000, image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 703000, discount: 50000, discountType: "amount", tax: 65300, total: 718300,
    payment: 800000, change: 81700, paymentMethod: "cash", note: ""
  },
  {
    id: "TRX-S1-20260902-0041", date: d(6, 13), storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman",
    cashierId: "e3", cashierName: "Citra Dewi",
    items: [
      { productId: "p5", variantSku: "BLZ-LNN-CRM-M", name: "Linen Blazer", brand: "NOSTRA", size: "M", color: "Cream", price: 749000, quantity: 1, subtotal: 749000, image: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=80&h=80&fit=crop&auto=format" },
      { productId: "p1", variantSku: "KMJ-OXF-WHT-M", name: "Classic Oxford Shirt", brand: "NOSTRA", size: "M", color: "Putih", price: 289000, quantity: 2, subtotal: 578000, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 1327000, discount: 10, discountType: "percent", tax: 119430, total: 1260730,
    payment: 1260730, change: 0, paymentMethod: "debit", note: "Member Platinum"
  },
  {
    id: "TRX-S2-20260903-0012", date: d(5, 11), storeId: "s2", storeName: "NAND'S BOUTIQUE - Kemang",
    cashierId: "e6", cashierName: "Fitri Handayani",
    items: [
      { productId: "p4", variantSku: "JKT-DNM-IND-L", name: "Denim Jacket Vintage", brand: "NOSTRA", size: "L", color: "Indigo", price: 599000, quantity: 1, subtotal: 599000, image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 599000, discount: 0, discountType: "amount", tax: 59900, total: 658900,
    payment: 658900, change: 0, paymentMethod: "qris", note: ""
  },
  {
    id: "TRX-S1-20260904-0088", date: d(4, 9), storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman",
    cashierId: "e2", cashierName: "Budi Santoso",
    items: [
      { productId: "p8", variantSku: "HDI-FLC-BLK-L", name: "Hoodie Fleece Zip", brand: "NOSTRA", size: "L", color: "Hitam", price: 399000, quantity: 2, subtotal: 798000, image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=80&h=80&fit=crop&auto=format" },
      { productId: "p11", variantSku: "CLN-CSL-BGE-M", name: "Casual Shorts", brand: "NOSTRA", size: "M", color: "Beige", price: 189000, quantity: 1, subtotal: 189000, image: "https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 987000, discount: 0, discountType: "amount", tax: 98700, total: 1085700,
    payment: 1100000, change: 14300, paymentMethod: "cash", note: ""
  },
  {
    id: "TRX-S3-20260905-0055", date: d(3, 15), storeId: "s3", storeName: "NAND'S BOUTIQUE - BSD City",
    cashierId: "e9", cashierName: "Ivan Kurniawan",
    items: [
      { productId: "p7", variantSku: "PLO-PIQ-WHT-M", name: "Polo Shirt Pique", brand: "NOSTRA", size: "M", color: "Putih", price: 219000, quantity: 3, subtotal: 657000, image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 657000, discount: 0, discountType: "amount", tax: 65700, total: 722700,
    payment: 722700, change: 0, paymentMethod: "debit", note: ""
  },
  {
    id: "TRX-S2-20260906-0033", date: d(2, 14), storeId: "s2", storeName: "NAND'S BOUTIQUE - Kemang",
    cashierId: "e6", cashierName: "Fitri Handayani",
    items: [
      { productId: "p9", variantSku: "SWT-KNT-CAR-S", name: "Cardigan Knit", brand: "NOSTRA", size: "S", color: "Caramel", price: 459000, quantity: 1, subtotal: 459000, image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=80&h=80&fit=crop&auto=format" },
      { productId: "p12", variantSku: "SWT-TRT-CRM-S", name: "Turtleneck Ribbed", brand: "NOSTRA", size: "S", color: "Krem", price: 329000, quantity: 1, subtotal: 329000, image: "https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 788000, discount: 5, discountType: "percent", tax: 74860, total: 821460,
    payment: 900000, change: 78540, paymentMethod: "cash", note: "Member Gold"
  },
  {
    id: "TRX-S1-20260907-0071", date: d(1, 9), storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman",
    cashierId: "e3", cashierName: "Citra Dewi",
    items: [
      { productId: "p10", variantSku: "CLN-FRM-CHA-L", name: "Formal Trousers Wool", brand: "NOSTRA", size: "L", color: "Charcoal", price: 489000, quantity: 1, subtotal: 489000, image: "https://images.unsplash.com/photo-1560243563-062bfc001d68?w=80&h=80&fit=crop&auto=format" },
      { productId: "p1", variantSku: "KMJ-OXF-NVY-L", name: "Classic Oxford Shirt", brand: "NOSTRA", size: "L", color: "Biru Navy", price: 289000, quantity: 1, subtotal: 289000, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 778000, discount: 0, discountType: "amount", tax: 77800, total: 855800,
    payment: 855800, change: 0, paymentMethod: "qris", note: ""
  },
  {
    id: "TRX-S3-20260908-0019", date: d(0, 8), storeId: "s3", storeName: "NAND'S BOUTIQUE - BSD City",
    cashierId: "e9", cashierName: "Ivan Kurniawan",
    items: [
      { productId: "p6", variantSku: "CLN-JGR-BLK-M", name: "Jogger Pants Premium", brand: "NOSTRA", size: "M", color: "Hitam", price: 265000, quantity: 2, subtotal: 530000, image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=80&h=80&fit=crop&auto=format" },
    ],
    subtotal: 530000, discount: 0, discountType: "amount", tax: 53000, total: 583000,
    payment: 600000, change: 17000, paymentMethod: "cash", note: ""
  },
];
