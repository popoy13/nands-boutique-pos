import { useState } from "react";
import type { CartItem } from "../data/types";
import type { PrinterSettings } from "../data/settings";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

interface Props {
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
  memberName?: string;
  pointsEarned?: number;
  onPay: (payment: number, method: "cash" | "debit" | "qris") => void;
  onClose: () => void;
}

type Method = "cash" | "debit" | "qris";
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

const QrisIcon = ({ size = 26 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M2 2h6.5v6.5H2V2zm1.6 1.6v3.3h3.3V3.6H3.6z" />
    <path fillRule="evenodd" d="M15.5 2H22v6.5h-6.5V2zm1.6 1.6v3.3h3.3V3.6h-3.3z" />
    <path fillRule="evenodd" d="M2 15.5h6.5V22H2v-6.5zm1.6 1.6V22h3.3v-3.3H3.6zM15.5 15.5H22V22h-6.5v-6.5z" />
    <rect x="9.2" y="2" width="1.8" height="1.8" rx="0.3" />
    <rect x="11.5" y="2" width="1.8" height="1.8" rx="0.3" />
    <rect x="13.8" y="5.8" width="1.8" height="1.8" rx="0.3" />
    <rect x="13.8" y="8.2" width="1.8" height="1.8" rx="0.3" />
    <rect x="9.2" y="4.4" width="1.8" height="1.8" rx="0.3" />
    <rect x="9.2" y="6.8" width="1.8" height="1.8" rx="0.3" />
    <rect x="9.2" y="9.2" width="6.4" height="6.4" />
    <rect x="10" y="10" width="4.8" height="4.8" fill="var(--card)" />
    <rect x="11.3" y="11.3" width="2.2" height="2.2" />
    <rect x="9.2" y="16.4" width="1.8" height="1.8" rx="0.3" />
    <rect x="12.4" y="18.2" width="1.8" height="1.8" rx="0.3" />
    <rect x="14.6" y="14.4" width="1.8" height="1.8" rx="0.3" />
    <rect x="11.3" y="10.4" width="1.8" height="1.8" rx="0.3" />
  </svg>
);

export default function PaymentModal({ cart, subtotal, discountAmt, tax, total, storeName, cashierName, brandName, printer, memberName, pointsEarned, onPay, onClose }: Props) {
  const [method, setMethod] = useState<Method>("cash");
  const [payment, setPayment] = useState(total);
  const [success, setSuccess] = useState(false);
  const [txId, setTxId] = useState("");
  const [txDate] = useState(new Date());

  const change = Math.max(0, payment - total);
  const isValid = method !== "cash" || payment >= total;

  const handleConfirm = () => {
    if (!isValid) return;
    const id = `TRX-${Date.now().toString(36).toUpperCase()}`;
    setTxId(id);
    setSuccess(true);
    const actualPayment = method !== "cash" ? total : payment;
    if (printer.autoPrint) {
      setTimeout(() => { const w = buildPrintWindow(); if (w) { w.print(); } }, 900);
    }
    setTimeout(() => onPay(actualPayment, method), 1600);
  };

  const buildPrintWindow = () => {
    const w = window.open("", "_blank", "width=320,height=700");
    if (!w) return null;
    const width = printer.paperWidth || 80;
    const font = width <= 58 ? 8 : width === 72 ? 10 : 11;
    const body = `
    <div class="center"><b>${brandName}</b><br>${storeName.replace("NAND'S BOUTIQUE - ", "")}<br></div>
    <hr>
    <div>No: ${txId}</div><div>Tgl: ${txDate.toLocaleString("id-ID")}</div><div>Kasir: ${cashierName}</div>
    ${memberName ? `<div>Member: ${memberName}${pointsEarned ? ` (+${pointsEarned} pts)` : ""}</div>` : ""}
    <hr>
    ${cart.map(i => `<div>${i.name} (${i.color}/${i.size})</div><div class="row"><span>${i.quantity} x ${new Intl.NumberFormat("id-ID").format(i.price)}</span><span>${new Intl.NumberFormat("id-ID").format(i.subtotal)}</span></div>`).join("")}
    <hr>
    <div class="row"><span>Subtotal</span><span>${new Intl.NumberFormat("id-ID").format(subtotal)}</span></div>
    ${discountAmt > 0 ? `<div class="row"><span>Diskon</span><span>-${new Intl.NumberFormat("id-ID").format(discountAmt)}</span></div>` : ""}
    <div class="row"><span>Pajak 10%</span><span>${new Intl.NumberFormat("id-ID").format(tax)}</span></div>
    <div class="row"><b><span>TOTAL</span><span>${new Intl.NumberFormat("id-ID").format(total)}</span></b></div>
    <div class="row"><span>Bayar (${method === "cash" ? "Tunai" : method === "debit" ? "Debit" : "QRIS"})</span><span>${new Intl.NumberFormat("id-ID").format(method === "cash" ? payment : total)}</span></div>
    ${method === "cash" && change > 0 ? `<div class="row"><span>Kembalian</span><span>${new Intl.NumberFormat("id-ID").format(change)}</span></div>` : ""}
    <hr><div class="center">Terima kasih telah berbelanja!<br>www.nandsboutique.id</div>`;
    const copies = Math.max(1, printer.copies || 1);
    const pages = Array.from({ length: copies }, () => `<div style="page-break-after:always;">${body}</div>`).join("");
    w.document.write(`<html><head><title>Struk</title>
    <style>body{font-family:'Courier New',monospace;font-size:${font}px;padding:8mm;width:${width}mm;margin:0;} .row{display:flex;justify-content:space-between;} hr{border:none;border-top:1px dashed #000;margin:6px 0;} .center{text-align:center;} b{font-weight:bold;} @page{size:${width}mm auto;margin:0;}</style>
    </head><body>${pages}</body></html>`);
    w.document.close();
    return w;
  };

  const handlePrint = () => {
    const w = buildPrintWindow();
    if (!w) return;
    w.print();
  };

const methodData = {
    cash:  { label: "Tunai",       icon: <CashIcon /> },
    debit: { label: "Kartu Debit", icon: <CardIcon /> },
    qris:  { label: "QRIS",        icon: <QrisIcon /> },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="w-full max-w-lg mx-3 my-auto rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--card)", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        {success ? (
          <div className="flex flex-col items-center justify-center py-14 px-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: "#dcfce7" }}>
              <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 20 }} className="mb-1">Pembayaran Berhasil!</div>
            <div className="font-mono text-xs mb-1" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{txId}</div>
            {memberName && pointsEarned && pointsEarned > 0 && (
              <div className="text-sm mb-4" style={{ color: "#16a34a" }}>+{pointsEarned} poin untuk {memberName}</div>
            )}
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mt-4"
              style={{ background: "var(--foreground)", color: "white" }}>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Cetak Struk
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
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
                  {memberName && <div className="text-yellow-400">Member: {memberName}</div>}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold mb-2.5" style={{ color: "var(--muted-foreground)" }}>METODE PEMBAYARAN</div>
                <div className="grid grid-cols-3 gap-2">
                  {(["cash", "debit", "qris"] as Method[]).map(m => (
                    <button key={m} onClick={() => { setMethod(m); setPayment(total); }}
                      className="py-3 px-2 rounded-xl flex flex-col items-center gap-1.5 transition-all duration-150"
                      style={{ background: method === m ? "rgba(124,58,237,0.1)" : "var(--background)", border: `2px solid ${method === m ? "var(--accent)" : "var(--border)"}` }}>
                      <span className="leading-none">{methodData[m].icon}</span>
                      <span className="text-xs font-semibold" style={{ color: method === m ? "var(--accent)" : "var(--foreground)" }}>{methodData[m].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {method === "cash" && (
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

              {method === "debit" && (
<div className="p-4 rounded-xl text-center" style={{ background: "var(--background)", border: "1.5px dashed var(--border)" }}>
                  <div className="inline-flex items-center justify-center mb-2" style={{ color: "var(--accent)" }}><CardIcon size={44} /></div>
                  <div className="text-sm font-semibold mb-1">Gesek / Tap Kartu</div>
                  <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Tempelkan atau gesek kartu debit pada mesin EDC</div>
                  <div className="font-mono font-bold text-base" style={{ color: "var(--accent)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(total)}</div>
                </div>
              )}

              {method === "qris" && (
                <div className="p-4 rounded-xl text-center" style={{ background: "var(--background)", border: "1.5px dashed var(--border)" }}>
                  <div className="inline-flex items-center justify-center w-28 h-28 rounded-2xl mb-3" style={{ background: "var(--muted)", color: "var(--accent)" }}><QrisIcon size={80} /></div>
                  <div className="text-sm font-semibold mb-1">Scan QRIS</div>
                  <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>Bayar via GoPay, OVO, DANA, ShopeePay, dll</div>
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
