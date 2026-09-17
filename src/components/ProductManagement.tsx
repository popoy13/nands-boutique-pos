import { useState, useMemo, useRef, useEffect } from "react";
import type { ChangeEvent } from "react";
import JsBarcode from "jsbarcode";
import type { Product, ProductVariant, Size } from "../data/types";
import { exportProductsCsv, parseProductsCsv } from "../data/csvProducts";
import { compressImage } from "../lib/compressImage";
import { verifyPin } from "../lib/auth";
import Pagination from "./Pagination";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const FALLBACK_CATEGORIES = ["Kemeja", "Kaos", "Celana", "Jaket", "Blazer", "Polo", "Hoodie", "Sweater"];

interface Category { id: string; name: string; }

interface Props {
  products: Product[];
  stores: { id: string; name: string }[];
  categories: Category[];
  onUpdateCategories: (next: Category[]) => void;
  onSave: (products: Product[]) => void;
  canExport?: boolean;
  canImport?: boolean;
  canBulk?: boolean;
  canCategory?: boolean;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  currentUser?: { id: string; pin: string } | null;
}

const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

function BarcodeModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [variantIdx, setVariantIdx] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const variant = product.variants[variantIdx];

  useEffect(() => {
    if (!svgRef.current || !variant?.sku) return;
    try {
      JsBarcode(svgRef.current, variant.sku, {
        format: "CODE128",
        displayValue: true,
        font: "monospace",
        fontSize: 14,
        margin: 10,
        height: 72,
        width: 2,
        lineColor: "#111827",
        background: "#ffffff",
      });
    } catch {
      // SKU validation is handled before saving; keep the dialog usable if a
      // legacy SKU cannot be encoded by the barcode library.
      svgRef.current.innerHTML = "";
    }
  }, [variant?.sku]);

  const printBarcode = () => {
    if (!variant) return;
    const svg = svgRef.current?.outerHTML ?? "";
    const popup = window.open("", "_blank", "width=480,height=420");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>Barcode ${variant.sku}</title>
      <style>body{font-family:Arial,sans-serif;text-align:center;padding:24px;color:#111827}svg{max-width:100%}.name{font-weight:700;margin-bottom:4px}.variant{font-size:13px;color:#4b5563;margin-bottom:12px}@media print{button{display:none}}</style>
      </head><body><div class="name">${product.name.replace(/[<>&"]/g, "")}</div><div class="variant">${variant.color} / ${variant.size}</div>${svg}<button onclick="window.print()">Cetak</button></body></html>`);
    popup.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="w-full max-w-lg rounded-2xl p-5 shadow-2xl" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="font-semibold text-sm">Buat Barcode SKU</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{product.name}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <label className="block text-xs font-semibold mt-4 mb-1.5" style={{ color: "var(--muted-foreground)" }}>PILIH VARIAN / SKU</label>
        <select value={variantIdx} onChange={e => setVariantIdx(Number(e.target.value))}
          className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
          {product.variants.map((v, i) => <option key={`${v.sku}-${i}`} value={i}>{v.color} / {v.size} — {v.sku}</option>)}
        </select>
        <div className="mt-4 rounded-xl bg-white p-4 text-center overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
          <svg ref={svgRef} aria-label={`Barcode ${variant?.sku ?? ""}`} />
          {variant?.sku && <div className="mt-1 text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>{variant.sku}</div>}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={printBarcode} disabled={!variant?.sku} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50" style={{ background: "var(--foreground)" }}>
            Cetak Barcode
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

const emptyProduct = (storeIds: string[], defaultCategory: string): Product => ({
  id: `p-${Date.now()}`,
  name: "",
  brand: "NAND'S",
  category: defaultCategory,
  basePrice: 0,
  image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&h=300&fit=crop&auto=format",
  variants: [{
    size: "M",
    color: "Putih",
    sku: `NEW-${Date.now()}-WHT-M`,
    stocks: storeIds.map(id => ({ storeId: id, quantity: 0 })),
  }],
});

function BulkActionModal({ action, stores, categories, count, onApply, onClose }: {
  action: "price" | "category" | "stock";
  stores: { id: string; name: string }[];
  categories: string[];
  count: number;
  onApply: (payload: any) => void;
  onClose: () => void;
}) {
  const [priceOp, setPriceOp] = useState<"set" | "inc" | "dec">("set");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Kemeja");
  const [stockStore, setStockStore] = useState(stores[0]?.id ?? "");
  const [stockOp, setStockOp] = useState<"set" | "add">("set");

  const numOk = value !== "" && !isNaN(Number(value));
  const canApply = action === "category" || (numOk && (action === "price" || !!stockStore));

  const apply = () => {
    if (!canApply) return;
    onApply({ priceOp, value: Number(value), category, stockStore, stockOp });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
        <div className="flex items-center justify-between mb-1">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>
            {action === "price" ? "Ubah Harga" : action === "category" ? "Ubah Kategori" : "Ubah Stok"}
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Diterapkan ke <b>{count}</b> produk terpilih</div>

        {action === "price" && (
          <>
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>PERUBAHAN</label>
              <select value={priceOp} onChange={e => setPriceOp(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}>
                <option value="set">Tetapkan harga (Rp)</option>
                <option value="inc">Naikkan (%)</option>
                <option value="dec">Turunkan (%)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>{priceOp === "set" ? "HARGA BARU (RP)" : "PERSEN (%)"}</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder={priceOp === "set" ? "250000" : "10"}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={{ background: "var(--background)", border: "1.5px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
          </>
        )}

        {action === "category" && (
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>KATEGORI BARU</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        )}

        {action === "stock" && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>TOKO</label>
                <select value={stockStore} onChange={e => setStockStore(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>MODE</label>
                <select value={stockOp} onChange={e => setStockOp(e.target.value as any)}
                  className="w-full px-3 py-2.5 rounded-xl text-xs outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}>
                  <option value="set">Set jumlah</option>
                  <option value="add">Tambah stok</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>{stockOp === "set" ? "JUMLAH BARU" : "JUMLAH DITAMBAH"}</label>
              <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono" style={{ background: "var(--background)", border: "1.5px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
            </div>
            <div className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>Diterapkan ke semua varian produk terpilih.</div>
          </>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Batal</button>
          <button onClick={apply} disabled={!canApply}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: canApply ? "var(--foreground)" : "var(--muted)", color: canApply ? "white" : "var(--muted-foreground)" }}>
            Terapkan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductManagement({ products, stores, categories, onUpdateCategories, onSave, canExport = true, canImport = true, canBulk = true, canCategory = true, canAdd = true, canEdit = true, canDelete = true, currentUser }: Props) {
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("Semua");
  const [editing, setEditing] = useState<Product | null>(null);
  const [barcodeProduct, setBarcodeProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!editing) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editing]);
  const [isNew, setIsNew] = useState(false);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [toastOk, setToastOk] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<null | "price" | "category" | "stock">(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkPinVerify, setBulkPinVerify] = useState(false);
  const [bulkPinInput, setBulkPinInput] = useState("");
  const [bulkPinError, setBulkPinError] = useState("");
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editingCatVal, setEditingCatVal] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const resetPage = () => setPage(1);

  const showToast = (msg: string, ok = true) => { setToastOk(ok); setToast(msg); setTimeout(() => setToast(""), 3000); };
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const csv = exportProductsCsv(products, stores.map(s => s.id));
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produk-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("File CSV produk berhasil diunduh");
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const res = parseProductsCsv(text, stores.map(s => s.id), products);
      if (res.added > 0 || res.updated > 0) {
        onSave(res.products);
        setEditing(null);
        showToast(`Import: ${res.added} produk baru, ${res.updated} diperbarui${res.errors.length ? `, ${res.errors.length} baris dilewati` : ""}`);
      } else if (res.errors.length) {
        showToast(`Import gagal: ${res.errors[0]}`);
      } else {
        showToast("Tidak ada perubahan dari file");
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const catNames = useMemo(() => categories.length ? categories.map(c => c.name) : FALLBACK_CATEGORIES, [categories]);
  const filterCats = useMemo(() => ["Semua", ...catNames], [catNames]);

  const filtered = useMemo(() =>
    products.filter(p =>
      (filterCat === "Semua" || p.category === filterCat) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()) || p.variants.some(v => v.sku.toLowerCase().includes(search.toLowerCase())))
    ), [products, search, filterCat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => filtered.slice((safePage - 1) * pageSize, safePage * pageSize), [filtered, safePage, pageSize]);

  const handleSave = () => {
    if (!editing?.name.trim() || editing.basePrice <= 0) return;
    const existingSkus = new Set<string>();
    products.forEach(p => { if (p.id !== editing.id) p.variants.forEach(v => existingSkus.add(v.sku)); });
    const localSeen = new Set<string>();
    for (const v of editing.variants) {
      if (localSeen.has(v.sku)) { showToast(`SKU "${v.sku}" duplikat dalam produk ini`, false); return; }
      localSeen.add(v.sku);
    }
    const dup = editing.variants.find(v => existingSkus.has(v.sku));
    if (dup) { showToast(`SKU "${dup.sku}" sudah digunakan produk lain`, false); return; }
    const updated = isNew ? [...products, editing] : products.map(p => p.id === editing!.id ? editing! : p);
    onSave(updated);
    setEditing(null);
    setIsNew(false);
    showToast("Produk disimpan");
  };

  const handleDelete = (id: string) => {
    onSave(products.filter(p => p.id !== id));
    setConfirmDelete(null);
    if (editing?.id === id) setEditing(null);
    showToast("Produk dihapus");
  };

  const updateVariant = (idx: number, key: keyof ProductVariant, val: any) => {
    setEditing(prev => {
      if (!prev) return null;
      const variants = prev.variants.map((v, i) => i === idx ? { ...v, [key]: val } : v);
      return { ...prev, variants };
    });
  };

  const updateVariantStock = (variantIdx: number, storeId: string, qty: number) => {
    setEditing(prev => {
      if (!prev) return null;
      const variants = prev.variants.map((v, i) =>
        i === variantIdx ? { ...v, stocks: v.stocks.map(s => s.storeId === storeId ? { ...s, quantity: qty } : s) } : v
      );
      return { ...prev, variants };
    });
  };

  const addVariant = () => {
    if (!editing) return;
    const newV: ProductVariant = {
      size: "M",
      color: "Putih",
      sku: `${editing.id}-NEW-${Date.now()}`,
      stocks: stores.map(s => ({ storeId: s.id, quantity: 0 })),
    };
    setEditing(prev => prev ? { ...prev, variants: [...prev.variants, newV] } : null);
    setActiveVariantIdx(editing.variants.length);
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) { setToast("File harus berupa gambar."); return; }
    setPhotoBusy(true);
    try {
      const dataUrl = await compressImage(file, 800, 0.7);
      setEditing(prev => prev ? { ...prev, image: dataUrl } : null);
    } catch {
      setToast("Gagal memuat gambar.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = () => {
    setEditing(prev => prev ? { ...prev, image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&h=300&fit=crop&auto=format" } : null);
  };

  const removeVariant = (idx: number) => {
    if (!editing || editing.variants.length <= 1) return;
    setEditing(prev => prev ? { ...prev, variants: prev.variants.filter((_, i) => i !== idx) } : null);
    setActiveVariantIdx(0);
  };

  const totalStockForProduct = (p: Product) =>
    p.variants.reduce((s, v) => s + v.stocks.reduce((a, st) => a + st.quantity, 0), 0);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allSelected = pageItems.length > 0 && pageItems.every(p => selected.has(p.id));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) pageItems.forEach(p => next.delete(p.id));
      else pageItems.forEach(p => next.add(p.id));
      return next;
    });
  };

  const exitBulk = () => { setBulkMode(false); setSelected(new Set()); };

  const applyBulk = (action: "price" | "category" | "stock", payload: any) => {
    const next = products.map(p => {
      if (!selected.has(p.id)) return p;
      if (action === "price") {
        if (payload.priceOp === "set") return { ...p, basePrice: Math.max(0, Math.round(payload.value)) };
        const mult = payload.priceOp === "inc" ? 1 + payload.value / 100 : 1 - payload.value / 100;
        return { ...p, basePrice: Math.max(0, Math.round(p.basePrice * mult)) };
      }
      if (action === "category") return { ...p, category: payload.category };
      if (action === "stock") {
        return {
          ...p,
          variants: p.variants.map(v => ({
            ...v,
            stocks: v.stocks.map(s => {
              if (s.storeId !== payload.stockStore) return s;
              const q = payload.stockOp === "set" ? Math.max(0, payload.value) : Math.max(0, s.quantity + payload.value);
              return { ...s, quantity: q };
            }),
          })),
        };
      }
      return p;
    });
    onSave(next);
    showToast(`${selected.size} produk diperbarui`);
    setBulkModal(null);
    exitBulk();
  };

  const handleBulkDelete = () => {
    if (!currentUser) {
      onSave(products.filter(p => !selected.has(p.id)));
      showToast(`${selected.size} produk dihapus`);
      setConfirmBulkDelete(false);
      exitBulk();
      setBulkPinVerify(false);
      setBulkPinInput("");
      return;
    }
    setBulkPinError("");
    setBulkPinInput("");
    setBulkPinVerify(true);
  };

  const submitBulkPinDelete = async () => {
    if (!confirmBulkDelete || !bulkPinInput || !currentUser) return;
    const pinOk = /^[a-f0-9]{64}$/i.test(currentUser.pin) || currentUser.pin.startsWith("pbkdf2$")
      ? await verifyPin(bulkPinInput, currentUser.pin)
      : bulkPinInput === currentUser.pin;
    if (pinOk) {
      onSave(products.filter(p => !selected.has(p.id)));
      showToast(`${selected.size} produk dihapus`);
      setConfirmBulkDelete(false);
      setBulkPinVerify(false);
      setBulkPinInput("");
      exitBulk();
    } else {
      setBulkPinError("PIN Anda salah");
      setBulkPinInput("");
    }
  };

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) { showToast("Kategori sudah ada"); return; }
    onUpdateCategories([...categories, { id: `c-${Date.now()}`, name }]);
    setNewCatName("");
    showToast("Kategori ditambahkan");
  };

  const renameCategory = (cat: Category) => {
    const name = editingCatVal.trim();
    if (!name || name === cat.name) { setEditingCatId(null); setEditingCatVal(""); return; }
    if (categories.some(c => c.id !== cat.id && c.name.toLowerCase() === name.toLowerCase())) { showToast("Nama kategori sudah dipakai"); return; }
    onUpdateCategories(categories.map(c => c.id === cat.id ? { ...c, name } : c));
    onSave(products.map(p => p.category === cat.name ? { ...p, category: name } : p));
    setEditingCatId(null);
    setEditingCatVal("");
    showToast("Kategori diubah");
  };

  const deleteCategory = (cat: Category) => {
    onUpdateCategories(categories.filter(c => c.id !== cat.id));
    onSave(products.map(p => p.category === cat.name ? { ...p, category: "" } : p));
    setConfirmDeleteCat(null);
    showToast("Kategori dihapus");
  };

  const editBody = editing && (canEdit || canAdd) ? (
    <>
      <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>{isNew ? "Tambah Produk" : "Edit Produk"}</div>
        <button onClick={() => setEditing(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      <div className="lg:flex-1 lg:overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <img src={editing.image} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100" onError={e => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=80&h=80&fit=crop&auto=format"; }} />
          <div className="flex-1">
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--muted-foreground)" }}>FOTO PRODUK</label>
            <div className="flex gap-2">
              <button onClick={() => photoInputRef.current?.click()} disabled={photoBusy}
                className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--foreground)", color: "white", opacity: photoBusy ? 0.6 : 1 }}>
                {photoBusy ? "Memuat..." : "Ubah Foto"}
              </button>
              <button onClick={handlePhotoRemove} className="px-3 py-2 rounded-xl text-xs font-semibold text-red-500" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                Hapus
              </button>
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>
        </div>

        {[
          { label: "NAMA PRODUK", key: "name", type: "text" },
          { label: "BRAND", key: "brand", type: "text" },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>{f.label}</label>
            <input type={f.type} value={(editing as any)[f.key]} onChange={e => setEditing(p => p ? { ...p, [f.key]: e.target.value } : null)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>KATEGORI</label>
            <select value={editing.category} onChange={e => setEditing(p => p ? { ...p, category: e.target.value } : null)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}>
              {catNames.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>HARGA (Rp)</label>
            <input type="number" value={editing.basePrice} onChange={e => setEditing(p => p ? { ...p, basePrice: Number(e.target.value) } : null)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>VARIAN ({editing.variants.length})</label>
            <button onClick={addVariant} className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: "var(--foreground)", color: "white" }}>+ Tambah</button>
          </div>

          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {editing.variants.map((v, i) => (
              <button key={i} onClick={() => setActiveVariantIdx(i)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all"
                style={{ background: activeVariantIdx === i ? "var(--foreground)" : "var(--background)", color: activeVariantIdx === i ? "white" : "var(--muted-foreground)", border: `1px solid ${activeVariantIdx === i ? "var(--foreground)" : "var(--border)"}` }}>
                {v.color} / {v.size}
              </button>
            ))}
          </div>

          {editing.variants[activeVariantIdx] && (
            <div className="p-3 rounded-xl flex flex-col gap-3" style={{ background: "var(--background)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold" style={{ color: "var(--muted-foreground)" }}>VARIAN {activeVariantIdx + 1}</span>
                {editing.variants.length > 1 && (
                  <button onClick={() => removeVariant(activeVariantIdx)} className="text-xs text-red-500 hover:underline">Hapus</button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Warna</label>
                  <input type="text" value={editing.variants[activeVariantIdx].color}
                    onChange={e => updateVariant(activeVariantIdx, "color", e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>Ukuran</label>
                  <select value={editing.variants[activeVariantIdx].size}
                    onChange={e => updateVariant(activeVariantIdx, "size", e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>SKU</label>
                <input type="text" value={editing.variants[activeVariantIdx].sku}
                  onChange={e => updateVariant(activeVariantIdx, "sku", e.target.value)}
                  className="w-full px-2.5 py-2 rounded-lg text-xs outline-none font-mono" style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
              </div>
              <div>
                <label className="block text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>STOK PER TOKO</label>
                <div className="flex flex-col gap-1.5">
                  {stores.map(store => {
                    const stockEntry = editing.variants[activeVariantIdx].stocks.find(s => s.storeId === store.id);
                    const qty = stockEntry?.quantity ?? 0;
                    return (
                      <div key={store.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs truncate" style={{ color: "var(--muted-foreground)", maxWidth: "60%" }}>
                          {store.name.replace("NAND'S BOUTIQUE - ", "")}
                        </span>
                        <input type="number" value={qty}
                          onChange={e => updateVariantStock(activeVariantIdx, store.id, Math.max(0, Number(e.target.value) || 0))}
                          className="w-16 text-center text-xs font-mono font-bold rounded-lg px-2 py-1.5 outline-none"
                          style={{ background: "var(--card)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
        <button onClick={handleSave} disabled={!editing.name.trim() || editing.basePrice <= 0}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: editing.name.trim() && editing.basePrice > 0 ? "var(--foreground)" : "var(--muted)", color: editing.name.trim() && editing.basePrice > 0 ? "white" : "var(--muted-foreground)" }}>
          Simpan Produk
        </button>
      </div>
    </>
  ) : null;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: toastOk ? "#16a34a" : "#ef4444" }}>{toast}</div>}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Produk?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Semua varian produk ini akan dihapus.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Manajemen Produk</div>
            {(canExport || canImport || canCategory || canBulk || canAdd) && (
              <div className="flex items-center gap-2">
                {canExport && (
                  <button onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--secondary-foreground)" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l4-4m-4 4l-4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                    Export
                  </button>
                )}
                {canImport && (
                  <label
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--secondary-foreground)" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15V3m0 0l-4 4m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
                    Import
                    <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleImport} />
                  </label>
                )}
                {canCategory && (
                  <button onClick={() => setCatModal(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: "var(--secondary)", border: "1px solid var(--border)", color: "var(--secondary-foreground)" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4zm3 2a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                    Kelola Kategori
                  </button>
                )}
                {canBulk && (
                  <button onClick={() => bulkMode ? exitBulk() : setBulkMode(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
                    style={{ background: bulkMode ? "var(--background)" : "var(--secondary)", border: "1px solid var(--border)", color: bulkMode ? "var(--foreground)" : "var(--secondary-foreground)" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                    {bulkMode ? "Selesai" : "Edit Banyak"}
                  </button>
                )}
                {canAdd && (
                  <button onClick={() => { setEditing(emptyProduct(stores.map(s => s.id), catNames[0] ?? "Kemeja")); setIsNew(true); setActiveVariantIdx(0); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Tambah Produk
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1" style={{ minWidth: 180 }}>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Cari produk / kode..." value={search} onChange={e => { setSearch(e.target.value); resetPage(); }}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            </div>
            <select value={filterCat} onChange={e => { setFilterCat(e.target.value); resetPage(); }}
              className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              {filterCats.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto lg:flex-1 lg:overflow-y-auto">
          <table className="w-full border-collapse" style={{ minWidth: 600 }}>
            <thead>
              <tr style={{ background: "var(--background)", position: "sticky", top: 0, zIndex: 5 }}>
                {bulkMode && (
                  <th key="sel" className="w-10 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <input type="checkbox" checked={pageItems.length > 0 && pageItems.every(p => selected.has(p.id))} onChange={toggleSelectAll} />
                  </th>
                )}
                {["Produk", "Kategori", "Harga", "Varian", "Total Stok", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map(p => (
                <tr key={p.id} onClick={bulkMode ? () => toggleSelect(p.id) : undefined}
                  className={"transition-colors hover:bg-gray-50" + (bulkMode ? " cursor-pointer select-none" : "")}
                  style={{ borderBottom: "1px solid var(--border)", background: selected.has(p.id) ? "rgba(124,58,237,0.07)" : editing?.id === p.id ? "rgba(124,58,237,0.03)" : "var(--card)" }}>
                  {bulkMode && (
                    <td className="px-4 py-3 w-10">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} onClick={e => e.stopPropagation()} />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                      <div>
                        <div className="text-sm font-semibold">{p.name}</div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.brand}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>{p.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(p.basePrice)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{p.variants.length} varian</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: totalStockForProduct(p) === 0 ? "#ef4444" : "var(--foreground)" }}>
                      {totalStockForProduct(p)} pcs
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!bulkMode && (canEdit || canDelete) && (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setBarcodeProduct(p)} title="Buat barcode SKU" className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)", color: "var(--accent)" }}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V4a1 1 0 011-1h3M17 3h3a1 1 0 011 1v3m0 10v3a1 1 0 01-1 1h-3M7 21H4a1 1 0 01-1-1v-3M8 7h1v4H8zM12 7h1v4h-1zM16 7h1v4h-1zM8 13h1v4H8zM12 13h1v4h-1zM16 13h1v4h-1z" /></svg>
                        </button>
                        {canEdit && (
                          <button onClick={() => { setEditing({ ...p, variants: p.variants.map(v => ({ ...v, stocks: [...v.stocks] })) }); setIsNew(false); setActiveVariantIdx(0); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "var(--secondary)" }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => setConfirmDelete(p.id)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Tidak ada produk</div>}
        </div>

        <Pagination
          total={filtered.length}
          page={safePage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          rowLabel="produk"
        />

        {bulkMode && selected.size > 0 && (
          <div className="px-4 py-3 border-t shrink-0 flex items-center gap-2 flex-wrap" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>{selected.size} produk dipilih</span>
            <div className="flex gap-1.5 ml-auto flex-wrap">
              <button onClick={() => setBulkModal("price")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>Harga</button>
              <button onClick={() => setBulkModal("category")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>Kategori</button>
              <button onClick={() => setBulkModal("stock")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--foreground)" }}>Stok</button>
              {canDelete && (
                <button onClick={() => setConfirmBulkDelete(true)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "#ef4444" }}>Hapus</button>
              )}
            </div>
          </div>
        )}
      </div>

      {bulkModal && (
        <BulkActionModal key={bulkModal} action={bulkModal} stores={stores} categories={catNames} count={selected.size}
          onApply={payload => applyBulk(bulkModal, payload)}
          onClose={() => setBulkModal(null)} />
      )}

      {confirmBulkDelete && !bulkPinVerify && selected.size > 0 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus {selected.size} Produk?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Anda akan menghapus {selected.size} produk beserta seluruh variannya. Konfirmasi PIN Anda untuk melanjutkan.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmBulkDelete(false)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={handleBulkDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      {bulkPinVerify && confirmBulkDelete && selected.size > 0 && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Konfirmasi PIN</div>
            <div className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>Masukkan PIN Anda untuk menghapus {selected.size} produk.</div>
            {bulkPinError && <div className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>{bulkPinError}</div>}
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={bulkPinInput}
              onChange={e => { setBulkPinInput(e.target.value.replace(/\D/g, "")); setBulkPinError(""); }}
              onKeyDown={e => { if (e.key === "Enter" && bulkPinInput.length === 4) void submitBulkPinDelete(); }}
              autoFocus
              className="w-full text-center text-xl px-3 py-3 rounded-xl mb-4 outline-none"
              style={{ background: "var(--background)", border: "1.5px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }}
            />
            <div className="flex gap-2">
              <button onClick={() => { setBulkPinVerify(false); setBulkPinInput(""); setBulkPinError(""); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Batal</button>
              <button onClick={() => void submitBulkPinDelete()} disabled={bulkPinInput.length !== 4} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: bulkPinInput.length === 4 ? "#ef4444" : "#d1d5db" }}>Hapus</button>
            </div>
          </div>
        </div>
      )}

      {catModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-96 max-w-[92vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div className="flex items-center justify-between mb-1">
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>Kelola Kategori</div>
              <button onClick={() => setCatModal(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>Tambah, ubah, atau hapus kategori produk.</div>

            <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
              {catNames.map(name => {
                const cat = categories.find(c => c.name === name);
                const isEditing = editingCatId !== null && cat?.id === editingCatId;
                const usedCount = products.filter(p => p.category === name).length;
                return (
                  <div key={name} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    {isEditing ? (
                      <input type="text" value={editingCatVal} onChange={e => setEditingCatVal(e.target.value)}
                        autoFocus defaultValue={name}
                        className="flex-1 px-2.5 py-1.5 rounded-lg text-sm outline-none" style={{ background: "var(--card)", border: "1.5px solid var(--accent)" }}
                        onKeyDown={e => { if (e.key === "Enter" && cat) renameCategory(cat); if (e.key === "Escape") { setEditingCatId(null); setEditingCatVal(""); } }} />
                    ) : (
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{name}</div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{usedCount} produk</div>
                      </div>
                    )}
                    {isEditing ? (
                      <button onClick={() => cat && renameCategory(cat)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: "var(--accent)" }}>Simpan</button>
                    ) : (
                      <>
                        <button onClick={() => { setEditingCatId(cat?.id ?? null); setEditingCatVal(name); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--secondary)" }}>
                          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        {cat && (
                          <button onClick={() => setConfirmDeleteCat(cat.id)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#fef2f2" }}>
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {catNames.length === 0 && (
                <div className="text-center py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>Belum ada kategori. Tambahkan di bawah.</div>
              )}
            </div>

            <div className="flex gap-2">
              <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)}
                placeholder="Nama kategori baru" maxLength={40}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
                onKeyDown={e => { if (e.key === "Enter") addCategory(); }} />
              <button onClick={addCategory} disabled={!newCatName.trim()}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: newCatName.trim() ? "var(--foreground)" : "var(--muted)", color: newCatName.trim() ? "white" : "var(--muted-foreground)" }}>
                Tambah
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteCat && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Kategori?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>
              Produk dalam kategori ini akan menjadi "Tanpa Kategori" (kategori tidak ikut terhapus). Lanjutkan?
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDeleteCat(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => { const cat = categories.find(c => c.id === confirmDeleteCat); if (cat) deleteCategory(cat); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      {barcodeProduct && <BarcodeModal product={barcodeProduct} onClose={() => setBarcodeProduct(null)} />}

      {/* Edit Panel - desktop */}
      {editBody && (
        <div className="hidden lg:flex shrink-0 flex-col overflow-hidden w-[380px]" style={{ background: "var(--card)", borderLeft: "1px solid var(--border)" }}>
          <div className="flex flex-col h-full overflow-y-auto">{editBody}</div>
        </div>
      )}

      {/* Edit Panel - mobile */}
      {editBody && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setEditing(null)} style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl overflow-hidden flex flex-col" style={{ background: "var(--card)", boxShadow: "0 -8px 30px rgba(0,0,0,0.18)" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mt-2.5 shrink-0" style={{ background: "var(--border)" }} />
            <div className="flex flex-col max-h-[88vh] overflow-y-auto">{editBody}</div>
          </div>
        </div>
      )}
    </div>
  );
}
