import type { Product } from "./types";

const mkVariants = (
  colors: { color: string; skuSuffix: string }[],
  sizes: string[],
  skuBase: string,
  baseStocks: number[] // per store: [s1, s2, s3]
) =>
  colors.flatMap((c) =>
    sizes.map((s) => ({
      size: s as any,
      color: c.color,
      sku: `${skuBase}-${c.skuSuffix}-${s}`,
      stocks: [
        { storeId: "s1", quantity: baseStocks[0] },
        { storeId: "s2", quantity: baseStocks[1] },
        { storeId: "s3", quantity: baseStocks[2] },
      ],
    }))
  );

export const initialProducts: Product[] = [
  {
    id: "p1", name: "Classic Oxford Shirt", brand: "NAND'S", category: "Kemeja", basePrice: 289000,
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Putih", skuSuffix: "WHT" }, { color: "Biru Navy", skuSuffix: "NVY" }, { color: "Hitam", skuSuffix: "BLK" }],
      ["S", "M", "L", "XL"], "KMJ-OXF", [12, 8, 6]
    ),
  },
  {
    id: "p2", name: "Slim Fit Chinos", brand: "NAND'S", category: "Celana", basePrice: 345000,
    image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Khaki", skuSuffix: "KHK" }, { color: "Abu Gelap", skuSuffix: "GRY" }],
      ["S", "M", "L", "XL", "XXL"], "CLN-CHN", [15, 10, 7]
    ),
  },
  {
    id: "p3", name: "Oversized Tee Essential", brand: "NAND'S", category: "Kaos", basePrice: 179000,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Putih", skuSuffix: "WHT" }, { color: "Hitam", skuSuffix: "BLK" }, { color: "Sage Green", skuSuffix: "SGN" }, { color: "Dusty Pink", skuSuffix: "DPK" }],
      ["S", "M", "L", "XL"], "KOS-OVR", [20, 15, 12]
    ),
  },
  {
    id: "p4", name: "Denim Jacket Vintage", brand: "NAND'S", category: "Jaket", basePrice: 599000,
    image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Indigo", skuSuffix: "IND" }, { color: "Light Wash", skuSuffix: "LWS" }],
      ["S", "M", "L", "XL"], "JKT-DNM", [6, 5, 3]
    ),
  },
  {
    id: "p5", name: "Linen Blazer", brand: "NAND'S", category: "Blazer", basePrice: 749000,
    image: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Cream", skuSuffix: "CRM" }, { color: "Olive", skuSuffix: "OLV" }],
      ["S", "M", "L", "XL"], "BLZ-LNN", [4, 3, 2]
    ),
  },
  {
    id: "p6", name: "Jogger Pants Premium", brand: "NAND'S", category: "Celana", basePrice: 265000,
    image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Hitam", skuSuffix: "BLK" }, { color: "Charcoal", skuSuffix: "CHA" }],
      ["S", "M", "L", "XL", "XXL"], "CLN-JGR", [12, 10, 8]
    ),
  },
  {
    id: "p7", name: "Polo Shirt Pique", brand: "NAND'S", category: "Polo", basePrice: 219000,
    image: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Putih", skuSuffix: "WHT" }, { color: "Navy", skuSuffix: "NVY" }, { color: "Merah Marun", skuSuffix: "MRN" }],
      ["S", "M", "L", "XL"], "PLO-PIQ", [10, 8, 6]
    ),
  },
  {
    id: "p8", name: "Hoodie Fleece Zip", brand: "NAND'S", category: "Hoodie", basePrice: 399000,
    image: "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Hitam", skuSuffix: "BLK" }, { color: "Stone Gray", skuSuffix: "STG" }],
      ["S", "M", "L", "XL", "XXL"], "HDI-FLC", [8, 7, 5]
    ),
  },
  {
    id: "p9", name: "Cardigan Knit", brand: "NAND'S", category: "Sweater", basePrice: 459000,
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Caramel", skuSuffix: "CAR" }, { color: "Hitam", skuSuffix: "BLK" }],
      ["S", "M", "L", "XL"], "SWT-KNT", [5, 4, 3]
    ),
  },
  {
    id: "p10", name: "Formal Trousers Wool", brand: "NAND'S", category: "Celana", basePrice: 489000,
    image: "https://images.unsplash.com/photo-1560243563-062bfc001d68?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Charcoal", skuSuffix: "CHA" }, { color: "Navy", skuSuffix: "NVY" }],
      ["S", "M", "L", "XL"], "CLN-FRM", [6, 5, 4]
    ),
  },
  {
    id: "p11", name: "Casual Shorts", brand: "NAND'S", category: "Celana", basePrice: 189000,
    image: "https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Beige", skuSuffix: "BGE" }, { color: "Hitam", skuSuffix: "BLK" }, { color: "Olive", skuSuffix: "OLV" }],
      ["S", "M", "L", "XL"], "CLN-CSL", [14, 11, 8]
    ),
  },
  {
    id: "p12", name: "Turtleneck Ribbed", brand: "NAND'S", category: "Sweater", basePrice: 329000,
    image: "https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=300&h=300&fit=crop&auto=format",
    variants: mkVariants(
      [{ color: "Krem", skuSuffix: "CRM" }, { color: "Hitam", skuSuffix: "BLK" }],
      ["S", "M", "L", "XL"], "SWT-TRT", [7, 5, 4]
    ),
  },
];

export const categories = ["Semua", "Kemeja", "Kaos", "Celana", "Jaket", "Blazer", "Polo", "Hoodie", "Sweater"];
