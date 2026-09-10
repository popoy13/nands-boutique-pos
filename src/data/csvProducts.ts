import type { Product } from "./types";

export interface ImportResult {
  products: Product[];
  rows: number;
  added: number;
  updated: number;
  errors: string[];
}

function esc(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function exportProductsCsv(products: Product[], storeIds: string[]): string {
  const headers = ["id", "name", "brand", "category", "price", "image", "size", "color", "sku", ...storeIds.map(id => `stock:${id}`)];
  const lines = [headers.join(",")];
  for (const p of products) {
    for (const v of p.variants) {
      const row = [p.id, p.name, p.brand, p.category, String(p.basePrice), p.image, v.size, v.color, v.sku];
      for (const sid of storeIds) {
        const st = v.stocks.find(s => s.storeId === sid);
        row.push(String(st?.quantity ?? 0));
      }
      lines.push(row.map(esc).join(","));
    }
  }
  return "\uFEFF" + lines.join("\n");
}

const ALIASES: Record<string, string> = {
  id: "id", "productid": "id",
  name: "name", nama: "name", "nama produk": "name",
  brand: "brand", merek: "brand",
  category: "category", kategori: "category",
  price: "price", harga: "price", "harga (rp)": "price",
  image: "image", gambar: "image", foto: "image",
  size: "size", ukuran: "size",
  color: "color", warna: "color",
  sku: "sku", kode: "sku", "kode sku": "sku",
};

function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function parseNumber(v: string): number {
  const clean = v.replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".");
  const n = Number(clean);
  return isNaN(n) ? 0 : n;
}

export function parseProductsCsv(raw: string, storeIds: string[], existing: Product[]): ImportResult {
  const text = raw.replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const errors: string[] = [];
  if (lines.length < 2) return { products: existing, rows: 0, added: 0, updated: 0, errors: ["File kosong atau tidak ada baris data."] };

  const header = splitLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, "").trim());
  const colOf = (canon: string) => header.indexOf(canon);

  const stockCols = new Map<string, number>();
  header.forEach((h, i) => {
    const m = h.match(/^stock[:\s](.+)$/);
    if (m) stockCols.set(m[1].trim().toLowerCase(), i);
  });

  if (colOf("name") === -1 && colOf("sku") === -1) {
    return { products: existing, rows: 0, added: 0, updated: 0, errors: ["Kolom header tidak dikenali. Kolom minimal: name, brand, category, harga, size, warna, sku"] };
  }

  const out = existing.map(p => ({ ...p, variants: [...p.variants] }));
  const byId = new Map(out.map(p => [p.id, p]));
  let rows = 0, added = 0, updated = 0;

  for (let li = 1; li < lines.length; li++) {
    const cells = splitLine(lines[li]);
    if (cells.every(c => c.trim() === "")) continue;
    rows++;

    const get = (canon: string, fallback: string[] = []): string => {
      const i = colOf(canon);
      if (i === -1) return "";
      if (i < cells.length) return cells[i].trim();
      return "";
    };

    let id = get("id");
    const name = get("name");
    const brand = get("brand") || "NAND'S";
    const category = get("category");
    const price = parseNumber(get("price"));
    const image = get("image");
    const size = get("size") || "M";
    const color = get("color") || "Standar";
    let sku = get("sku");

    let stocks: { storeId: string; quantity: number }[] = [];
    for (const sid of storeIds) {
      const si = stockCols.get(sid.toLowerCase());
      if (si !== undefined && si < cells.length) {
        stocks.push({ storeId: sid, quantity: Math.max(0, parseNumber(cells[si])) });
      }
    }

    if (!name && !sku) { errors.push(`Baris ${li + 1}: nama dan SKU kosong, dilewati.`); continue; }
    if (!sku) sku = `NEW-${Date.now()}-${li}`;
    if (!id) {
      id = `p-${Date.now()}-${li}`;
      while (byId.has(id)) id = `p-${Date.now()}-${li}-${Math.floor(Math.random() * 999)}`;
    }

    const existingP = byId.get(id);
    if (existingP) {
      existingP.name = name || existingP.name;
      existingP.brand = brand || existingP.brand;
      existingP.category = category || existingP.category;
      if (get("price") !== "" || price > 0) existingP.basePrice = price;
      existingP.image = image || existingP.image;
      const vIdx = existingP.variants.findIndex(v => v.sku === sku);
      if (vIdx >= 0) {
        const v = existingP.variants[vIdx];
        existingP.variants[vIdx] = { ...v, size: size as Product["variants"][number]["size"], color, stocks: stocks.length ? stocks.map(s => ({ ...s })) : v.stocks };
      } else {
        existingP.variants.push({
          size: size as Product["variants"][number]["size"], color, sku,
          stocks: stocks.length ? stocks : storeIds.map(id2 => ({ storeId: id2, quantity: 0 })),
        });
      }
      updated++;
    } else {
      const np: Product = {
        id, name, brand, category, basePrice: price,
        image: image || "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&h=300&fit=crop&auto=format",
        variants: [{
          size: size as Product["variants"][number]["size"], color, sku,
          stocks: stocks.length ? stocks : storeIds.map(id2 => ({ storeId: id2, quantity: 0 })),
        }],
      };
      byId.set(id, np);
      out.push(np);
      added++;
    }
  }

  return { products: out, rows, added, updated, errors };
}