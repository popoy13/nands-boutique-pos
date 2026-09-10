import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import type { Transaction, DeletedTransaction } from "../data/types";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
const fmtK = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}rb`;
  return String(n);
};

interface Props {
  transactions: Transaction[];
  deletedTransactions: DeletedTransaction[];
  stores: { id: string; name: string }[];
}

export default function ReportView({ transactions, deletedTransactions, stores }: Props) {
  const [filterStore, setFilterStore] = useState("all");
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const customRange = !!dateFrom || !!dateTo;

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoff = period === "7d" ? new Date(now.getTime() - 7 * 86400000)
      : period === "30d" ? new Date(now.getTime() - 30 * 86400000)
      : new Date(0);
    return transactions.filter(t => {
      if (filterStore !== "all" && t.storeId !== filterStore) return false;
      if (!customRange && t.date < cutoff) return false;
      if (dateFrom) { const from = new Date(dateFrom); from.setHours(0, 0, 0, 0); if (t.date < from) return false; }
      if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); if (t.date > to) return false; }
      return true;
    });
  }, [transactions, filterStore, period, dateFrom, dateTo, customRange]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayTx = filtered.filter(t => t.date >= today);
    return {
      revenue: filtered.reduce((s, t) => s + t.total, 0),
      count: filtered.length,
      todayRevenue: todayTx.reduce((s, t) => s + t.total, 0),
      todayCount: todayTx.length,
      avg: filtered.length > 0 ? filtered.reduce((s, t) => s + t.total, 0) / filtered.length : 0,
      itemsSold: filtered.reduce((s, t) => s + t.items.reduce((a, i) => a + i.quantity, 0), 0),
    };
  }, [filtered]);

  // Daily for chart
  const rangeDays = useMemo(() => {
    if (!dateFrom || !dateTo) return null;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diff = Math.round((to.getTime() - from.getTime()) / 86400000);
    return Math.min(31, Math.max(1, diff + 1));
  }, [dateFrom, dateTo]);

  const dailyData = useMemo(() => {
    const days = period === "7d" ? 7 : period === "30d" ? 14 : (rangeDays ?? 14);
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (days - 1 - i)); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const dayTx = filtered.filter(t => t.date >= d && t.date < next);
      return {
        label: period === "7d"
          ? d.toLocaleDateString("id-ID", { weekday: "short" })
          : d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
        revenue: dayTx.reduce((s, t) => s + t.total, 0),
        count: dayTx.length,
      };
    });
  }, [filtered, period, rangeDays]);

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    filtered.forEach(t => t.items.forEach(item => {
      const key = item.productId;
      if (!map[key]) map[key] = { name: item.name, qty: 0, revenue: 0 };
      map[key].qty += item.quantity;
      map[key].revenue += item.subtotal;
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [filtered]);

  const storeBreakdown = useMemo(() =>
    stores.map(s => ({
      ...s,
      revenue: filtered.filter(t => t.storeId === s.id).reduce((sum, t) => sum + t.total, 0),
      count: filtered.filter(t => t.storeId === s.id).length,
    })).sort((a, b) => b.revenue - a.revenue),
  [filtered, stores]);

  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = { cash: 0, debit: 0, qris: 0 };
    filtered.forEach(t => { map[t.paymentMethod] += t.total; });
    const total = Object.values(map).reduce((s, v) => s + v, 0) || 1;
    return [
      { method: "cash", label: "Tunai", value: map.cash, pct: Math.round((map.cash / total) * 100), color: "#7c3aed" },
      { method: "debit", label: "Debit", value: map.debit, pct: Math.round((map.debit / total) * 100), color: "#3b82f6" },
      { method: "qris", label: "QRIS", value: map.qris, pct: Math.round((map.qris / total) * 100), color: "#7c3aed" },
    ];
  }, [filtered]);

  const statCards = [
    { label: "Total Pendapatan", value: fmt(stats.revenue), sub: `${stats.count} transaksi`, color: "var(--accent)" },
    { label: "Hari Ini", value: fmt(stats.todayRevenue), sub: `${stats.todayCount} transaksi`, color: "#16a34a" },
    { label: "Rata-rata Transaksi", value: fmt(Math.round(stats.avg)), sub: "per transaksi", color: "#3b82f6" },
    { label: "Item Terjual", value: stats.itemsSold.toString(), sub: "pcs produk", color: "#7c3aed" },
    { label: "Transaksi Dihapus", value: deletedTransactions.length.toString(), sub: `Nominal ${fmt(deletedTransactions.reduce((s, d) => s + d.transaction.total, 0))}`, color: "#ef4444" },
  ];

  const paymentLabel: Record<string, string> = { cash: "Tunai", debit: "Debit", qris: "QRIS" };

  const handleExport = () => {
    if (filtered.length === 0) return;

    const fmtPick = (v: string) => v ? new Date(v + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
    const periodLabel = customRange
      ? `Kustom (${fmtPick(dateFrom)} s/d ${fmtPick(dateTo)})`
      : period === "7d" ? "7 Hari Terakhir" : period === "30d" ? "30 Hari Terakhir" : "Semua Waktu";

    const summaryRows = [
      { "Periode": periodLabel, "Toko": filterStore === "all" ? "Semua Toko" : stores.find(s => s.id === filterStore)?.name ?? filterStore },
      { "Total Pendapatan": stats.revenue, "Jumlah Transaksi": stats.count, "Rata-rata": Math.round(stats.avg), "Item Terjual": stats.itemsSold, "Pendapatan Hari Ini": stats.todayRevenue, "Transaksi Hari Ini": stats.todayCount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);

    const txRows = filtered.map(t => ({
      "Tanggal": t.date.toLocaleDateString("id-ID"),
      "Jam": t.date.toLocaleTimeString("id-ID", { hour12: false }),
      "ID": t.id,
      "Toko": t.storeName,
      "Kasir": t.cashierName,
      "Item": t.items.reduce((a, i) => a + i.quantity, 0),
      "Subtotal": t.subtotal,
      "Diskon": t.discount,
      "Pajak": t.tax,
      "Total": t.total,
      "Metode Bayar": paymentLabel[t.paymentMethod],
      "Catatan": t.note,
    }));
    const wsTx = XLSX.utils.json_to_sheet(txRows);

    const productRows = topProducts.map((p, i) => ({ "Peringkat": i + 1, "Produk": p.name, "Qty": p.qty, "Pendapatan": p.revenue }));
    const wsProducts = XLSX.utils.json_to_sheet(productRows);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsTx, "Transaksi");
    XLSX.utils.book_append_sheet(wb, wsProducts, "Produk Terlaris");

    if (deletedTransactions.length > 0) {
      const deletedRows = deletedTransactions.map(d => ({
        "ID Transaksi": d.transaction.id,
        "Tanggal Transaksi": d.transaction.date.toLocaleDateString("id-ID"),
        "Toko": d.transaction.storeName,
        "Kasir": d.transaction.cashierName,
        "Total": d.transaction.total,
        "Metode Bayar": paymentLabel[d.transaction.paymentMethod],
        "Dihapus Oleh": d.deletedBy,
        "Waktu Hapus": d.deletedAt.toLocaleString("id-ID", { hour12: false }),
        "Alasan": d.reason,
      }));
      const wsDeleted = XLSX.utils.json_to_sheet(deletedRows);
      XLSX.utils.book_append_sheet(wb, wsDeleted, "Transaksi Dihapus");
    }

    XLSX.writeFile(wb, `nostra-laporan-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Laporan Penjualan</div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <option value="all">Semua Toko</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["7d", "30d", "all"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-2 text-xs font-semibold transition-all"
                style={{ background: period === p ? "var(--foreground)" : "var(--card)", color: period === p ? "white" : "var(--muted-foreground)" }}>
                {p === "7d" ? "7 Hari" : p === "30d" ? "30 Hari" : "Semua"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="text-xs rounded-xl px-2.5 py-2 outline-none" style={{ background: "var(--card)", border: `1.5px solid ${customRange ? "var(--accent)" : "var(--border)"}` }} />
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>s/d</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="text-xs rounded-xl px-2.5 py-2 outline-none" style={{ background: "var(--card)", border: `1.5px solid ${customRange ? "var(--accent)" : "var(--border)"}` }} />
            {customRange && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                className="ml-1 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#fef2f2" }} title="Reset tanggal">
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        {statCards.map(c => (
          <div key={c.label} className="p-4 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <div className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>{c.label}</div>
            <div className="font-mono text-lg font-bold" style={{ color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>{c.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 mb-4 lg:grid-cols-[1fr_280px]">
        {/* Bar Chart */}
        <div className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-4">Grafik Pendapatan</div>
          <div className="flex items-end gap-1.5 h-36">
            {dailyData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
                <div className="text-center" style={{ fontSize: 9, color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace", minHeight: 12 }}>
                  {d.revenue > 0 ? fmtK(d.revenue) : ""}
                </div>
                <div className="w-full rounded-t-lg transition-all duration-500 relative" style={{ height: `${Math.max(3, (d.revenue / maxRevenue) * 100)}px`, background: d.revenue > 0 ? "var(--accent)" : "var(--muted)", opacity: d.revenue > 0 ? 1 : 0.4 }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" style={{ background: "var(--foreground)", fontSize: 10 }}>
                    {fmt(d.revenue)}<br />{d.count} trx
                  </div>
                </div>
                <div style={{ fontSize: 9, color: "var(--muted-foreground)" }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment breakdown */}
        <div className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-4">Metode Bayar</div>
          <div className="flex flex-col gap-4">
            {paymentBreakdown.map(({ label, value, pct, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium">{label}</span>
                  <span className="font-mono" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}>{pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "var(--muted)" }}>
                  <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <div className="text-xs mt-1 font-mono" style={{ color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top products */}
        <div className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-4">Produk Terlaris</div>
          {topProducts.length === 0 ? (
            <div className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>Belum ada data</div>
          ) : (
            <div className="flex flex-col gap-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: "var(--background)" }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: i === 0 ? "#7c3aed" : i === 1 ? "#6b7280" : i === 2 ? "#b45309" : "var(--muted)", color: i > 2 ? "var(--muted-foreground)" : "white" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.qty} pcs</div>
                  </div>
                  <div className="font-mono text-xs font-bold shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(p.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Store breakdown */}
        <div className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-4">Performa Toko</div>
          <div className="flex flex-col gap-3">
            {storeBreakdown.map((s, i) => (
              <div key={s.id} className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-semibold truncate pr-2" style={{ maxWidth: "60%" }}>{s.name}</div>
                  <div className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(s.revenue)}</div>
                </div>
                <div className="w-full h-1.5 rounded-full mb-1" style={{ background: "var(--muted)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${storeBreakdown[0].revenue > 0 ? (s.revenue / storeBreakdown[0].revenue) * 100 : 0}%`, background: i === 0 ? "#7c3aed" : i === 1 ? "#3b82f6" : "#7c3aed" }} />
                </div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{s.count} transaksi</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deleted transactions */}
      <div className="p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }}>Transaksi Dihapus</div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>{deletedTransactions.length} catatan</span>
            <span className="font-mono font-semibold" style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
              Nominal {fmt(deletedTransactions.reduce((s, d) => s + d.transaction.total, 0))}
            </span>
          </div>
        </div>
        {deletedTransactions.length === 0 ? (
          <div className="text-sm text-center py-6" style={{ color: "var(--muted-foreground)" }}>Belum ada transaksi yang dihapus</div>
        ) : (
          <div className="flex flex-col gap-2">
            {[...deletedTransactions].reverse().map(d => (
              <div key={d.id} className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#ef4444" }}>{d.transaction.id}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fef2f2", color: "#ef4444" }}>Dihapus</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      {fmtDate(d.transaction.date)} · {d.transaction.storeName.replace("NAND'S BOUTIQUE - ", "")} · {d.transaction.cashierName} · {paymentLabel[d.transaction.paymentMethod]}
                    </div>
                    <div className="text-xs mt-1.5 flex items-start gap-1.5" style={{ color: "#b45309" }}>
                      <svg className="shrink-0 mt-0.5" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span>Alasan: {d.reason}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="font-mono font-bold text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#ef4444" }}>{fmt(d.transaction.total)}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>oleh {d.deletedBy}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{fmtDate(d.deletedAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
