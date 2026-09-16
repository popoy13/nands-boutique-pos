import { useState, useRef } from "react";
import type { CartItem } from "../data/types";
import type { PrinterSettings, PaymentMethodOption } from "../data/settings";
import { escapeHtml } from "../lib/sanitize";

const fmtNum = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface Props {
  txId: string;
  cart: CartItem[];
  subtotal: number;
  discountAmt: number;
  tax: number;
  total: number;
  storeId: string;
  storeName: string;
  cashierName: string;
  brandName: string;
  printer: PrinterSettings;
  methods: PaymentMethodOption[];
  taxLabel: string;
  memberName?: string;
  pointsEarned?: number;
  onPay: (payment: number, method: string) => void;
  onClose: () => void;
  onFinish: () => void;
}

const QUICK = [50000, 100000, 200000, 500000];

const CashIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2.5" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6.5 9.5h.01M17.5 14.5h.01" />
  </svg>
);

const CardIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="3" />
    <rect x="5" y="8" width="4" height="3.2" rx="0.8" strokeWidth={1.2} />
    <path d="M2 10.5h20" strokeWidth={1.2} opacity={0.5} />
    <path d="M17.5 14.8c-1 0-1.5.9-2.5.9s-1.5-.9-2.5-.9 1.5-.9 2.5-.9h4c-1 0-1.5.9-2.5.9z" strokeWidth={1.1} />
    <path d="M17.5 16.2c-1 0-1.5.9-2.5.9s-1.5-.9-2.5-.9" strokeWidth={1.1} opacity={0.55} />
  </svg>
);

const WalletIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm0 0V6a2 2 0 012-2h11" />
    <path d="M16 13h.01" />
  </svg>
);

export default function PaymentModal({ txId, cart, subtotal, discountAmt, tax, total, storeName, cashierName, brandName, printer, methods, taxLabel, memberName, pointsEarned, onPay, onClose, onFinish }: Props) {
  const activeMethods = methods.filter(m => m.enabled);
  const [method, setMethod] = useState<string>(() => activeMethods[0]?.id ?? "");
  const [payment, setPayment] = useState(total);
  const [success, setSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    txId: string; txDate: Date; cart: CartItem[];
    subtotal: number; discountAmt: number; tax: number; total: number;
    method: string; payment: number; change: number; roundingDiff: number; cash: boolean;
    storeName: string; cashierName: string; brandName: string;
    memberName?: string; pointsEarned?: number;
  } | null>(null);
  const paidRef = useRef(false);

  const selectedMethod = activeMethods.find(m => m.id === method) ?? activeMethods[0];
  const isCash = selectedMethod?.kind === "cash";
  const isNonCash = !!selectedMethod && !isCash;
  const methodLabel = (id: string) => methods.find(m => m.id === id)?.label ?? id;
  const change = Math.max(0, payment - total);
  const isValid = !selectedMethod || !isCash || payment >= total;
  const roundingDiff = total - (subtotal - discountAmt + tax);

  const handleConfirm = () => {
    if (!isValid || paidRef.current || !selectedMethod) return;
    paidRef.current = true;
    const actualPayment = isCash ? payment : total;
    const actualChange = Math.max(0, actualPayment - total);
    setReceiptData({
      txId, txDate: new Date(), cart: [...cart],
      subtotal, discountAmt, tax, total,
      method: selectedMethod.id, payment: actualPayment, change: actualChange, roundingDiff, cash: isCash,
      storeName, cashierName, brandName,
      memberName, pointsEarned,
    });
    setSuccess(true);
    onPay(actualPayment, selectedMethod.id);
  };

  const buildPrintWindow = (r: NonNullable<typeof receiptData>) => {
    const w = window.open("", "_blank", "width=320,height=700");
    if (!w) return null;
    const width = printer.paperWidth || 80;
    const font = width <= 58 ? 8 : width === 72 ? 10 : 11;
    const body = `
    ${printer.receiptLogo ? `<div class="center"><img class="logo" src="${escapeHtml(printer.receiptLogo)}" alt="" /></div>` : ""}
    <div class="center"><b>${escapeHtml(r.brandName)}</b><br>${escapeHtml((r.storeName || "").replace("NAND'S BOUTIQUE - ", ""))}<br></div>
    <hr>
    <div>No: ${escapeHtml(r.txId)}</div>
    ${printer.showDate !== false ? `<div>Tgl: ${r.txDate.toLocaleDateString("id-ID")}</div>` : ""}
    ${printer.showTime !== false ? `<div>Jam: ${r.txDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>` : ""}
    ${printer.showCashier !== false ? `<div>Kasir: ${escapeHtml(r.cashierName)}</div>` : ""}
    ${r.memberName ? `<div>Member: ${escapeHtml(r.memberName)}${r.pointsEarned ? ` (+${r.pointsEarned} pts)` : ""}</div>` : ""}
    <hr>
    ${r.cart.map(i => `<div>${escapeHtml(i.name)} (${escapeHtml(i.color)}/${escapeHtml(i.size)})</div><div class="row"><span>${i.quantity} x ${fmtNum(i.price)}</span><span>${fmtNum(i.subtotal)}</span></div>`).join("")}
    <hr>
    <div class="row"><span>Subtotal</span><span>${fmtNum(r.subtotal)}</span></div>
    ${r.discountAmt > 0 ? `<div class="row"><span>Diskon</span><span>-${fmtNum(r.discountAmt)}</span></div>` : ""}
    ${printer.showTax !== false ? `<div class="row"><span>${escapeHtml(taxLabel)}</span><span>${fmtNum(r.tax)}</span></div>` : ""}
    ${r.roundingDiff ? `<div class="row"><span>Pembulatan</span><span>+${fmtNum(r.roundingDiff)}</span></div>` : ""}
    <div class="row"><b><span>TOTAL</span><span>${fmtNum(r.total)}</span></b></div>
    <div class="row"><span>Bayar (${escapeHtml(methodLabel(r.method))})</span><span>${fmtNum(r.payment)}</span></div>
    ${r.cash && r.change > 0 && printer.showChange !== false ? `<div class="row"><span>Kembalian</span><span>${fmtNum(r.change)}</span></div>` : ""}
    ${printer.footerText ? `<hr><div class="center">${escapeHtml(printer.footerText).split("\n").join("<br>")}</div>` : ""}`;
    const copies = Math.max(1, printer.copies || 1);
    const pages = Array.from({ length: copies }, () => `<div style="page-break-after:always;">${body}</div>`).join("");
    w.document.write(`<html><head><title>Struk</title>
    <style>body{font-family:'Courier New',monospace;font-size:${font}px;padding:8mm;width:${width}mm;margin:0;} .row{display:flex;justify-content:space-between;} hr{border:none;border-top:1px dashed #000;margin:6px 0;} .center{text-align:center;} b{font-weight:bold;} .logo{max-width:${Math.max(30, width - 14)}mm;max-height:${Math.round(width * 0.32)}mm;object-fit:contain;} @page{size:${width}mm auto;margin:0;}</style>
    </head><body>${pages}</body></html>`);
    w.document.close();
    return w;
  };

  const handlePrint = () => {
    const r = receiptData;
    if (!r) return;
    const w = buildPrintWindow(r);
    if (!w) return;
    w.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 overflow-hidden" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl sheet-up flex flex-col" style={{ background: "var(--card)", maxHeight: "92dvh" }}>
        {success ? (
          <div className="flex flex-col items-center justify-center py-14 px-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "#dcfce7" }}>
              <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20 }} className="mb-1">Pembayaran Berhasil!</div>
            <div className="font-mono text-xs mb-1" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{receiptData?.txId}</div>
            {receiptData?.memberName && receiptData.pointsEarned && receiptData.pointsEarned > 0 && (
              <div className="text-sm mb-4" style={{ color: "#16a34a" }}>+{receiptData.pointsEarned} poin untuk {receiptData.memberName}</div>
            )}
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-4"
              style={{ background: "var(--foreground)", color: "white" }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Cetak Struk
            </button>
            <div className="flex gap-3 w-full mt-3">
              <button onClick={onFinish}
                className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{ fontFamily: "'Outfit', sans-serif", background: "var(--muted)", color: "var(--foreground)" }}>
                Tutup
              </button>
              <button onClick={onClose}
                className="flex-1 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-150"
                style={{ fontFamily: "'Outfit', sans-serif", background: "var(--foreground)" }}>
                Transaksi Lagi
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="pt-2.5 pb-1 flex justify-center shrink-0 sm:hidden">
              <div className="w-10 h-1 rounded-full" style={{ background: "var(--muted)" }} />
            </div>
            <div className="px-6 py-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16 }}>Pembayaran</div>
              <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
              <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "var(--foreground)" }}>
                <div>
                  <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.5)" }}>Total Pembayaran</div>
                  <div className="font-mono font-bold text-2xl" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(total)}</div>
                </div>
                <div className="text-right text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <div>{cart.length} item</div>
                  {discountAmt > 0 && <div className="text-green-400">Hemat {fmt(discountAmt)}</div>}
                  {roundingDiff !== 0 && <div>Termasuk pembulatan</div>}
                  {memberName && <div className="text-yellow-400">Member: {memberName}</div>}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2.5" style={{ color: "var(--muted-foreground)" }}>METODE PEMBAYARAN</div>
                {activeMethods.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {activeMethods.map(m => (
                      <button key={m.id} onClick={() => { setMethod(m.id); setPayment(total); }}
                        className="py-3 px-2 rounded-xl flex flex-col items-center gap-1.5 transition-all duration-150"
                        style={{ background: method === m.id ? "rgba(124,58,237,0.1)" : "var(--background)", border: `2px solid ${method === m.id ? "var(--accent)" : "var(--border)"}` }}>
                        <span className="leading-none" style={{ color: method === m.id ? "var(--accent)" : "var(--foreground)" }}>
                          {m.kind === "cash" ? <CashIcon /> : <CardIcon />}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: method === m.id ? "var(--accent)" : "var(--foreground)" }}>{m.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl text-center text-xs" style={{ background: "var(--background)", color: "var(--muted-foreground)" }}>
                    Belum ada metode pembayaran aktif. Atur di Setelan &gt; Pembayaran.
                  </div>
                )}
              </div>

              {isCash && (
                <div>
                  <div className="text-xs font-semibold mb-2.5" style={{ color: "var(--muted-foreground)" }}>JUMLAH DIBAYAR</div>
                  <input type="number" value={payment} onChange={e => setPayment(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl text-right font-mono text-xl font-bold outline-none mb-3"
                    style={{ background: "var(--background)", border: `2px solid ${isValid ? "var(--border)" : "#fca5a5"}`, fontFamily: "'JetBrains Mono', monospace" }} />
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {QUICK.map(amt => (
                      <button key={amt} onClick={() => setPayment(Math.ceil(total / amt) * amt)}
                        className="py-2 rounded-xl text-xs font-mono font-medium transition-all hover:bg-gray-100"
                        style={{ background: "var(--background)", border: "1px solid var(--border)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {amt >= 1000 ? `${amt / 1000}rb` : amt}
                      </button>
                    ))}
                  </div>
                  {isValid && (
                    <div className="p-3 rounded-xl flex justify-between" style={{ background: "#f0fdf4" }}>
                      <span className="text-sm font-medium" style={{ color: "#16a34a" }}>Kembalian</span>
                      <span className="font-mono font-bold" style={{ color: "#16a34a", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {isNonCash && (
                <div className="p-4 rounded-xl text-center" style={{ background: "var(--background)", border: "1.5px dashed var(--border)" }}>
                  <div className="inline-flex items-center justify-center mb-2" style={{ color: "var(--accent)" }}><WalletIcon size={40} /></div>
                  <div className="text-sm font-semibold mb-1">{selectedMethod?.label}</div>
                  <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Nominal dibayar sesuai total transaksi</div>
                  <div className="font-mono font-bold text-base" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(total)}</div>
                </div>
              )}

              <button onClick={handleConfirm} disabled={!isValid}
                className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-150"
                style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, background: isValid ? "var(--foreground)" : "var(--muted)", color: isValid ? "white" : "var(--muted-foreground)" }}>
                Konfirmasi Pembayaran
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}