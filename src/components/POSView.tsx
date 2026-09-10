import { useState, useMemo, useEffect, useRef } from "react";
import type { Product, ProductVariant, CartItem, Transaction, Size, Discount, Member } from "../data/types";
import type { PrinterSettings, BarcodeSettings } from "../data/settings";
import { categories } from "../data/products";
import { generateId } from "../data/transactions";
import { POINTS_PER_10K, getTier, TIER_COLOR } from "../data/members";
import { cleanBarcode, playScanFeedback } from "../lib/barcode";
import PaymentModal from "./PaymentModal";
import BarcodeScanModal from "./BarcodeScanModal";
import type { ScanResult } from "./BarcodeScanModal";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const SIZES: Size[] = ["XS", "S", "M", "L", "XL", "XXL"];

interface Props {
  activeStore: string;
  storeName: string;
  cashierId: string;
  cashierName: string;
  products: Product[];
  discounts: Discount[];
  members: Member[];
  brandName: string;
  printer: PrinterSettings;
  barcode: BarcodeSettings;
  onNewTransaction: (t: Transaction) => void;
  onUpdateMember: (m: Member) => void;
}

interface VariantPicker { product: Product }

export default function POSView({ activeStore, storeName, cashierId, cashierName, products, discounts, members, brandName, printer, barcode, onNewTransaction, onUpdateMember }: Props) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"amount" | "percent">("amount");
  const [discountLabel, setDiscountLabel] = useState("");
  const [showPicker, setShowPicker] = useState<VariantPicker | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pickerColor, setPickerColor] = useState("");
  const [pickerSize, setPickerSize] = useState<Size | "">("");
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [showMemberSearch, setShowMemberSearch] = useState(false);

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      (activeCategory === "Semua" || p.category === activeCategory) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()) || p.variants.some(v => v.sku.toLowerCase().includes(search.toLowerCase())))
    ), [products, search, activeCategory]);

  const memberSuggestions = useMemo(() =>
    memberSearch.length >= 2
      ? members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.phone.includes(memberSearch)).slice(0, 5)
      : [],
    [members, memberSearch]);

  const openPicker = (product: Product, initialColor?: string) => {
    const colors = [...new Set(product.variants.map(v => v.color))];
    setPickerColor(initialColor && colors.includes(initialColor) ? initialColor : colors[0]);
    setPickerSize("");
    setShowPicker({ product });
  };

  const addVariantToCart = (product: Product, variant: ProductVariant) => {
    const storeStock = variant.stocks.find(s => s.storeId === activeStore);
    if (!storeStock || storeStock.quantity === 0) return false;
    setCart(prev => {
      const existing = prev.find(i => i.variantSku === variant.sku);
      if (existing) return prev.map(i => i.variantSku === variant.sku ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.price } : i);
      return [...prev, {
        productId: product.id,
        variantSku: variant.sku,
        name: product.name,
        brand: product.brand,
        size: variant.size,
        color: variant.color,
        price: product.basePrice,
        quantity: 1,
        subtotal: product.basePrice,
        image: product.image,
      }];
    });
    return true;
  };

  const addToCart = () => {
    if (!showPicker || !pickerColor || !pickerSize) return;
    const variant = showPicker.product.variants.find(v => v.color === pickerColor && v.size === pickerSize);
    if (!variant) return;
    if (addVariantToCart(showPicker.product, variant)) setShowPicker(null);
  };

  const handleScanResult = (code: string): ScanResult => {
    const norm = (s: string) => s.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const c = cleanBarcode(code, barcode).toUpperCase();
    const cn = norm(c);
    if (!cn) return { ok: false, message: "Kode kosong" };
    for (const p of products) {
      for (const v of p.variants) {
        if (v.sku.toUpperCase() === c || norm(v.sku) === cn) {
          if (addVariantToCart(p, v)) return { ok: true, message: `"${p.name}" (${v.color} / ${v.size}) ditambahkan ke keranjang` };
          return { ok: false, message: `Stok habis untuk "${p.name}" (${v.color} / ${v.size})` };
        }
      }
    }
    const baseMatches = products.filter(p => p.variants.some(v => {
      const base = v.sku.slice(0, v.sku.lastIndexOf("-"));
      return base.toUpperCase() === c || norm(base) === cn;
    }));
    if (baseMatches.length === 1) {
      const p = baseMatches[0];
      const color = p.variants.find(v => {
        const base = v.sku.slice(0, v.sku.lastIndexOf("-"));
        return base.toUpperCase() === c || norm(base) === cn;
      })?.color;
      setShowScanner(false);
      openPicker(p, color);
      return { ok: true, message: `"${p.name}" ditemukan. Pilih ukuran.` };
    }
    return { ok: false, message: `Kode "${c}" tidak ditemukan` };
  };

  const scanRef = useRef(handleScanResult);
  useEffect(() => { scanRef.current = handleScanResult; });

  useEffect(() => {
    if (barcode.mode !== "keyboard") return;
    let buf = "";
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      if (e.key === "Enter") {
        const code = cleanBarcode(buf, barcode);
        buf = "";
        clearTimeout(timer);
        if (!code) return;
        e.preventDefault();
        const r = scanRef.current(code);
        playScanFeedback(r.ok, barcode);
        return;
      }
      if (e.key.length === 1) {
        buf += e.key;
        clearTimeout(timer);
        timer = setTimeout(() => { buf = ""; }, 300);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [barcode.mode, barcode]);

  const updateQty = (sku: string, delta: number) => {
    setCart(prev => prev.map(i => i.variantSku === sku ? { ...i, quantity: i.quantity + delta, subtotal: (i.quantity + delta) * i.price } : i).filter(i => i.quantity > 0));
  };

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const discountAmt = discountType === "percent" ? Math.round(subtotal * discount / 100) : discount;
  const tax = Math.round((subtotal - discountAmt) * 0.1);
  const total = subtotal - discountAmt + tax;
  const pointsToEarn = Math.floor(total / 10000) * POINTS_PER_10K;

  const applyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (!code) return;
    const today = new Date().toISOString().slice(0, 10);
    const v = discounts.find(d =>
      d.type === "voucher" &&
      d.code?.toUpperCase() === code &&
      d.active &&
      d.startDate <= today &&
      d.endDate >= today &&
      (d.usageLimit === 0 || d.usedCount < d.usageLimit) &&
      (d.storeId === "all" || d.storeId === activeStore)
    );
    if (!v) { setVoucherMsg({ text: "Kode voucher tidak valid atau kedaluwarsa", ok: false }); return; }
    if (subtotal < v.minPurchase) { setVoucherMsg({ text: `Minimal belanja ${fmt(v.minPurchase)}`, ok: false }); return; }
    if (v.value <= 100) {
      setDiscount(v.value); setDiscountType("percent");
    } else {
      setDiscount(v.value); setDiscountType("amount");
    }
    setDiscountLabel(v.name);
    setVoucherMsg({ text: `Voucher "${v.name}" berhasil diterapkan!`, ok: true });
  };

  const clearDiscount = () => {
    setDiscount(0); setDiscountType("amount"); setDiscountLabel(""); setVoucherCode(""); setVoucherMsg(null);
  };

  const handlePay = (payment: number, method: "cash" | "debit" | "qris") => {
    const t: Transaction = {
      id: generateId(activeStore),
      date: new Date(),
      storeId: activeStore,
      storeName,
      cashierId,
      cashierName,
      items: cart,
      subtotal,
      discount,
      discountType,
      discountLabel,
      tax,
      total,
      payment,
      change: payment - total,
      paymentMethod: method,
      note: "",
      memberId: selectedMember?.id,
      memberName: selectedMember?.name,
      pointsEarned: selectedMember ? pointsToEarn : 0,
    };

    if (selectedMember) {
      const updated: Member = {
        ...selectedMember,
        points: selectedMember.points + pointsToEarn,
        totalSpend: selectedMember.totalSpend + total,
        tier: getTier(selectedMember.totalSpend + total),
      };
      onUpdateMember(updated);
    }

    onNewTransaction(t);
    setCart([]);
    setDiscount(0);
    setDiscountType("amount");
    setDiscountLabel("");
    setVoucherCode("");
    setVoucherMsg(null);
    setSelectedMember(null);
    setShowPayment(false);
  };

  const pickerColors = showPicker ? [...new Set(showPicker.product.variants.map(v => v.color))] : [];
  const pickerSizes = showPicker ? SIZES.filter(s => showPicker.product.variants.some(v => v.color === pickerColor && v.size === s)) : [];
  const selectedVariant = showPicker ? showPicker.product.variants.find(v => v.color === pickerColor && v.size === pickerSize) : null;
  const storeStockQty = selectedVariant?.stocks.find(s => s.storeId === activeStore)?.quantity ?? 0;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* Catalog */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 pt-5 pb-3 shrink-0" style={{ background: "var(--background)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Cari produk, brand, atau kode..." value={search} onChange={e => setSearch(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { const r = handleScanResult(search); if (r.ok) setSearch(""); } }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }} />
            </div>
            <button onClick={() => setShowScanner(true)} title="Scan Barcode"
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "var(--accent)", color: "white" }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V4a1 1 0 011-1h3M17 3h3a1 1 0 011 1v3m0 10v3a1 1 0 01-1 1h-3M7 21H4a1 1 0 01-1-1v-3M8 7h1v4H8zM12 7h1v4h-1zM16 7h1v4h-1zM8 13h1v4H8zM12 13h1v4h-1zM16 13h1v4h-1z" /></svg>
            </button>
            <div className="shrink-0 text-xs px-3 py-2.5 rounded-xl font-mono font-medium" style={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0"
                style={{ background: activeCategory === cat ? "var(--foreground)" : "var(--card)", color: activeCategory === cat ? "white" : "var(--muted-foreground)", border: `1.5px solid ${activeCategory === cat ? "var(--foreground)" : "var(--border)"}` }}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto p-5">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))" }}>
            {filteredProducts.map(product => {
              const totalStock = product.variants.reduce((s, v) => s + (v.stocks.find(st => st.storeId === activeStore)?.quantity ?? 0), 0);
              const inCart = cart.filter(i => i.productId === product.id).reduce((s, i) => s + i.quantity, 0);
              return (
                <button key={product.id} onClick={() => openPicker(product)} disabled={totalStock === 0}
                  className="group relative rounded-2xl overflow-hidden text-left transition-all duration-150 hover:-translate-y-0.5 disabled:opacity-40"
                  style={{ background: "var(--card)", border: "1.5px solid var(--border)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div className="w-full aspect-square bg-gray-100 overflow-hidden">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {totalStock === 0 && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-600">Habis</span></div>}
                  </div>
                  <div className="p-2.5">
                    <div className="text-xs text-gray-400 mb-0.5 flex items-center justify-between gap-1" style={{ fontSize: 10 }}>
                      <span>{product.brand}</span>
                      <span className="font-mono truncate" style={{ fontSize: 9, color: "var(--muted-foreground)" }}>{product.variants[0].sku.slice(0, product.variants[0].sku.lastIndexOf("-"))}</span>
                    </div>
                    <div className="text-xs font-semibold leading-tight mb-1.5 line-clamp-2">{product.name}</div>
                    <div className="text-xs font-bold" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(product.basePrice)}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Stok: {totalStock}</div>
                  </div>
                  {inCart > 0 && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: "var(--accent)" }}>{inCart}</div>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart */}
      {cart.length > 0 && (
      <div className="flex flex-col shrink-0 w-full lg:w-[340px]" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
        <div className="px-5 py-3.5 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>Keranjang Belanja</div>
          <button onClick={() => setCart([])} className="text-xs px-2.5 py-1 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>Hapus</button>
        </div>

        {/* Member section */}
        <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: "var(--border)" }}>
          {selectedMember ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: TIER_COLOR[selectedMember.tier].bg }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: TIER_COLOR[selectedMember.tier].border, color: "white" }}>
                {selectedMember.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: TIER_COLOR[selectedMember.tier].text }}>{selectedMember.name}</div>
                <div className="text-xs" style={{ color: TIER_COLOR[selectedMember.tier].text, opacity: 0.7 }}>{selectedMember.points} pts · {selectedMember.tier}</div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="text-xs px-1.5 py-0.5 rounded" style={{ color: TIER_COLOR[selectedMember.tier].text, opacity: 0.6 }}>✕</button>
            </div>
          ) : (
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <input type="text" placeholder="Cari member (nama / HP)..." value={memberSearch}
                onChange={e => { setMemberSearch(e.target.value); setShowMemberSearch(true); }}
                onFocus={() => setShowMemberSearch(true)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "var(--background)", border: "1px solid var(--border)" }} />
              {showMemberSearch && memberSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-lg z-20" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  {memberSuggestions.map(m => (
                    <button key={m.id} onClick={() => { setSelectedMember(m); setMemberSearch(""); setShowMemberSearch(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: TIER_COLOR[m.tier].bg, color: TIER_COLOR[m.tier].text }}>
                        {m.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{m.name}</div>
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{m.phone} · {m.points} pts</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="lg:flex-1 lg:overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-2">
            {cart.map(item => (
              <div key={item.variantSku} className="flex gap-3 p-3 rounded-xl" style={{ background: "var(--background)" }}>
                <img src={item.image} alt={item.name} className="w-11 h-11 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{item.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{item.color} / {item.size}</div>
                  <div className="text-xs font-mono font-bold mt-1" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.subtotal)}</div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <button onClick={() => updateQty(item.variantSku, -1)} className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center" style={{ background: "var(--muted)" }}>−</button>
                  <span className="text-xs font-mono font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.quantity}</span>
                  <button onClick={() => updateQty(item.variantSku, 1)} className="w-5 h-5 rounded text-xs font-bold flex items-center justify-center" style={{ background: "var(--foreground)", color: "white" }}>+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary & actions */}
        <div className="border-t px-4 py-4 shrink-0" style={{ borderColor: "var(--border)" }}>
          {/* Voucher input */}
          <div className="mb-3">
            {discountLabel ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "#f0fdf4" }}>
                <span className="text-xs font-medium" style={{ color: "#16a34a" }}>🎫 {discountLabel}</span>
                <button onClick={clearDiscount} className="text-xs" style={{ color: "#ef4444" }}>Hapus</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="text" placeholder="Kode voucher..." value={voucherCode}
                  onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherMsg(null); }}
                  onKeyDown={e => e.key === "Enter" && applyVoucher()}
                  className="flex-1 px-3 py-2 rounded-xl text-xs outline-none font-mono"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }} />
                <button onClick={applyVoucher} className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: "var(--foreground)", color: "white" }}>Pakai</button>
              </div>
            )}
            {voucherMsg && !discountLabel && (
              <div className="text-xs mt-1.5 px-2" style={{ color: voucherMsg.ok ? "#16a34a" : "#ef4444" }}>{voucherMsg.text}</div>
            )}
          </div>

          {/* Discount manual */}
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted-foreground)" }}>Subtotal</span>
              <span className="font-mono font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(subtotal)}</span>
            </div>
            {!discountLabel && (
              <div className="flex items-center justify-between text-sm gap-2">
                <span style={{ color: "var(--muted-foreground)" }}>Diskon</span>
                <div className="flex items-center gap-1.5">
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as "amount" | "percent")}
                    className="text-xs rounded-lg px-2 py-1 outline-none" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
                    <option value="amount">Rp</option>
                    <option value="percent">%</option>
                  </select>
                  <input type="number" value={discount || ""} onChange={e => setDiscount(Math.max(0, Number(e.target.value)))}
                    placeholder="0" className="w-20 text-right text-xs font-mono outline-none px-2 py-1 rounded-lg"
                    style={{ background: "var(--background)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace", color: "#ef4444" }} />
                </div>
              </div>
            )}
            {discountLabel && discountAmt > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: "#16a34a" }}>Diskon ({discountLabel})</span>
                <span className="font-mono" style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>-{fmt(discountAmt)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span style={{ color: "var(--muted-foreground)" }}>Pajak (10%)</span>
              <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(tax)}</span>
            </div>
            {selectedMember && pointsToEarn > 0 && (
              <div className="flex justify-between text-xs" style={{ color: "#16a34a" }}>
                <span>+Poin member</span>
                <span className="font-mono font-semibold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>+{pointsToEarn} pts</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t mt-1" style={{ borderColor: "var(--border)" }}>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15 }}>Total</span>
              <span className="font-mono text-base" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(total)}</span>
            </div>
          </div>

          <button disabled={cart.length === 0} onClick={() => setShowPayment(true)}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150"
            style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, background: cart.length > 0 ? "var(--foreground)" : "var(--muted)", color: cart.length > 0 ? "white" : "var(--muted-foreground)" }}>
            Lanjut Pembayaran
          </button>
        </div>
      </div>
      )}

      {/* Variant Picker */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl overflow-hidden shadow-2xl my-auto" style={{ background: "var(--card)" }}>
            <div className="flex items-center gap-3 p-5 border-b" style={{ borderColor: "var(--border)" }}>
              <img src={showPicker.product.image} alt="" className="w-12 h-12 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{showPicker.product.name}</div>
                <div className="text-xs font-mono font-bold mt-0.5" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(showPicker.product.basePrice)}</div>
              </div>
              <button onClick={() => setShowPicker(null)} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--muted)" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>WARNA</div>
                <div className="flex flex-wrap gap-2">
                  {pickerColors.map(color => (
                    <button key={color} onClick={() => { setPickerColor(color); setPickerSize(""); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: pickerColor === color ? "var(--foreground)" : "var(--background)", color: pickerColor === color ? "white" : "var(--foreground)", border: `1.5px solid ${pickerColor === color ? "var(--foreground)" : "var(--border)"}` }}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>UKURAN</div>
                <div className="flex gap-2 flex-wrap">
                  {pickerSizes.map(size => {
                    const v = showPicker.product.variants.find(vv => vv.color === pickerColor && vv.size === size);
                    const qty = v?.stocks.find(s => s.storeId === activeStore)?.quantity ?? 0;
                    return (
                      <button key={size} onClick={() => setPickerSize(size)} disabled={qty === 0}
                        className="w-12 h-10 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
                        style={{ background: pickerSize === size ? "var(--foreground)" : "var(--background)", color: pickerSize === size ? "white" : "var(--foreground)", border: `1.5px solid ${pickerSize === size ? "var(--foreground)" : "var(--border)"}` }}>
                        {size}
                      </button>
                    );
                  })}
                </div>
                {pickerSize && selectedVariant && (
                  <div className="text-xs mt-2" style={{ color: "var(--muted-foreground)" }}>
                    Stok: <span className="font-bold" style={{ color: storeStockQty > 3 ? "#16a34a" : "#ef4444" }}>{storeStockQty}</span>
                  </div>
                )}
              </div>
              <button onClick={addToCart} disabled={!pickerColor || !pickerSize || storeStockQty === 0}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{ background: pickerColor && pickerSize && storeStockQty > 0 ? "var(--foreground)" : "var(--muted)", color: pickerColor && pickerSize && storeStockQty > 0 ? "white" : "var(--muted-foreground)" }}>
                Tambah ke Keranjang
              </button>
            </div>
          </div>
        </div>
      )}

      {showPayment && (
        <PaymentModal
          cart={cart}
          subtotal={subtotal}
          discountAmt={discountAmt}
          tax={tax}
          total={total}
          storeId={activeStore}
          storeName={storeName}
          cashierName={cashierName}
          brandName={brandName}
          printer={printer}
          memberName={selectedMember?.name}
          pointsEarned={selectedMember ? pointsToEarn : 0}
          onPay={handlePay}
          onClose={() => setShowPayment(false)}
        />
      )}
    {showScanner && (
        <BarcodeScanModal barcode={barcode} onClose={() => setShowScanner(false)} onResult={handleScanResult} />
      )}
    </div>
  );
}
