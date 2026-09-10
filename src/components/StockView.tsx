import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import type { Product } from "../data/types";
import { categories } from "../data/products";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface Props {
  products: Product[];
  stores: { id: string; name: string }[];
  activeStore: string;
  onUpdateStock: (productId: string, sku: string, storeId: string, qty: number) => void;
  canEdit?: boolean;
}

export default function StockView({ products, stores, activeStore, onUpdateStock, canEdit = true }: Props) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Semua");
  const [filterStore, setFilterStore] = useState(activeStore);
  const [editCell, setEditCell] = useState<{ sku: string; storeId: string } | null>(null);
  const [editVal, setEditVal] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const filtered = useMemo(() =>
    products.filter(p =>
      (filterCat === "Semua" || p.category === filterCat) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()) || p.variants.some(v => v.sku.toLowerCase().includes(search.toLowerCase())))
    ), [products, search, filterCat]);

  const handleEditCommit = (productId: string, sku: string, storeId: string) => {
    const qty = parseInt(editVal);
    if (!isNaN(qty) && qty >= 0) {
      onUpdateStock(productId, sku, storeId, qty);
      showToast("Stok berhasil diperbarui");
    }
    setEditCell(null);
    setEditVal("");
  };

  // Export Excel
  const handleExport = () => {
    const rows: any[] = [];
    products.forEach(p => {
      p.variants.forEach(v => {
        const row: any = {
          "ID Produk": p.id,
          "Nama Produk": p.name,
          "Brand": p.brand,
          "Kategori": p.category,
          "Harga": p.basePrice,
          "SKU": v.sku,
          "Warna": v.color,
          "Ukuran": v.size,
        };
        stores.forEach(s => {
          const q = v.stocks.find(st => st.storeId === s.id)?.quantity ?? 0;
          row[`Stok - ${s.name}`] = q;
        });
        rows.push(row);
      });
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Produk");
    XLSX.writeFile(wb, `nostra-stok-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("File Excel berhasil diunduh");
  };

  // Low stock count
  const lowStockCount = useMemo(() => {
    let count = 0;
    products.forEach(p => p.variants.forEach(v => {
      const q = v.stocks.find(s => s.storeId === filterStore)?.quantity ?? 0;
      if (q <= 3) count++;
    }));
    return count;
  }, [products, filterStore]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Manajemen Stok</div>
            {lowStockCount > 0 && (
              <div className="text-xs mt-0.5" style={{ color: "#ef4444" }}>⚠ {lowStockCount} varian stok rendah (≤3)</div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all text-white"
              style={{ background: "var(--foreground)" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Excel
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative" style={{ minWidth: 200 }}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Cari produk / kode..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse" style={{ minWidth: 900 }}>
          <thead>
            <tr style={{ background: "var(--background)", position: "sticky", top: 0, zIndex: 10 }}>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)", minWidth: 200 }}>Produk</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>SKU</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Warna</th>
              <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Ukuran</th>
              <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Harga</th>
              <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Stok</th>
              <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(product =>
              product.variants.map((variant, vi) => {
                const storeQty = variant.stocks.find(s => s.storeId === filterStore)?.quantity ?? 0;
                const isLow = storeQty > 0 && storeQty <= 3;
                const isOut = storeQty === 0;
                const isEditing = editCell?.sku === variant.sku && editCell?.storeId === filterStore;

                return (
                  <tr key={variant.sku} className="transition-colors hover:bg-gray-50"
                    style={{ borderBottom: "1px solid var(--border)", background: isOut ? "#fef2f2" : isLow ? "#fffbeb" : "var(--card)" }}>
                    {vi === 0 ? (
                      <td className="px-4 py-3" rowSpan={product.variants.length}>
                        <div className="flex items-center gap-3">
                          <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{product.name}</div>
                            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{product.brand} · {product.category}</div>
                          </div>
                        </div>
                      </td>
                    ) : null}
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{variant.sku}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs">{variant.color}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-lg" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>{variant.size}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-mono text-xs font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(product.basePrice)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          value={editVal}
                          onChange={e => setEditVal(e.target.value)}
                          onBlur={() => handleEditCommit(product.id, variant.sku, filterStore)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleEditCommit(product.id, variant.sku, filterStore);
                            if (e.key === "Escape") { setEditCell(null); setEditVal(""); }
                          }}
                          className="w-16 text-center text-xs font-mono font-bold rounded-lg px-2 py-1 outline-none"
                          style={{ background: "white", border: "2px solid var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}
                        />
                      ) : (
                        <button
                          onClick={() => { setEditCell({ sku: variant.sku, storeId: filterStore }); setEditVal(String(storeQty)); }}
                          className="font-mono text-sm font-bold px-3 py-1 rounded-lg transition-all hover:bg-gray-100"
                          style={{ fontFamily: "'JetBrains Mono', monospace", color: isOut ? "#ef4444" : isLow ? "#d97706" : "var(--foreground)" }}
                        >
                          {storeQty}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: isOut ? "#fef2f2" : isLow ? "#fffbeb" : "#f0fdf4",
                          color: isOut ? "#ef4444" : isLow ? "#d97706" : "#16a34a"
                        }}>
                        {isOut ? "Habis" : isLow ? "Hampir Habis" : "Tersedia"}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Tidak ada produk ditemukan</div>
        )}
      </div>
    </div>
  );
}
