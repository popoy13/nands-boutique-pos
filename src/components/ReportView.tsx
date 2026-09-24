import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { safeRows } from "../lib/safeExport";
import type { Transaction, DeletedTransaction, Expense } from "../data/types";
import type { PaymentSettings } from "../data/settings";
import { todayISO } from "../lib/dates";
import { assetUrl } from "../lib/assets";
import DateRangeFilter from "./DateRangeFilter";
import Pagination from "./Pagination";
import EmptyState from "./EmptyState";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
const fmtDateSafe = (d: unknown) => {
  const dt = d instanceof Date ? d : new Date(String(d ?? ""));
  return Number.isNaN(dt.getTime()) ? "—" : fmtDate(dt);
};
const fmtK = (n: number) => {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}jt`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}rb`;
  return String(n);
};

interface Props {
  transactions: Transaction[];
  deletedTransactions: DeletedTransaction[];
  expenses: Expense[];
  stores: { id: string; name: string }[];
  payments?: PaymentSettings;
}

const PAY_COLORS = ["#7c3aed", "#3b82f6", "#0d9488", "#ea580c", "#db2777", "#ca8a04", "#16a34a", "#4f46e5"];

export default function ReportView({ transactions, deletedTransactions, expenses = [], stores, payments }: Props) {
  const [filterStore, setFilterStore] = useState("all");
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deletedPage, setDeletedPage] = useState(1);
  const [deletedPageSize, setDeletedPageSize] = useState(10);
  const [expPage, setExpPage] = useState(1);
  const [expPageSize, setExpPageSize] = useState(10);

  useEffect(() => { setDeletedPage(1); setExpPage(1); }, [filterStore, period, dateFrom, dateTo]);

  const customRange = !!dateFrom || !!dateTo;

  const periodCaption = customRange
    ? `Rentang kustom${dateFrom ? ` \u00b7 dari ${dateFrom}` : ""}${dateTo ? ` \u00b7 sampai ${dateTo}` : ""}`
    : period === "7d" ? "7 hari terakhir" : period === "30d" ? "30 hari terakhir" : "semua waktu";

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

  const filteredDeleted = useMemo(() => {
    const now = new Date();
    const cutoff = period === "7d" ? new Date(now.getTime() - 7 * 86400000)
      : period === "30d" ? new Date(now.getTime() - 30 * 86400000)
      : new Date(0);
    return deletedTransactions.filter(d => {
      if (filterStore !== "all" && d.transaction?.storeId !== filterStore) return false;
      const dt = d.deletedAt;
      if (!customRange && dt < cutoff) return false;
      if (dateFrom) { const from = new Date(dateFrom); from.setHours(0, 0, 0, 0); if (dt < from) return false; }
      if (dateTo) { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); if (dt > to) return false; }
      return true;
    });
  }, [deletedTransactions, filterStore, period, dateFrom, dateTo, customRange]);

  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const cutoff = period === "7d" ? new Date(now.getTime() - 7 * 86400000)
      : period === "30d" ? new Date(now.getTime() - 30 * 86400000)
      : new Date(0);
    const cutoffISO = cutoff.toLocaleDateString("en-CA");
    return expenses.filter(e => {
      if (filterStore !== "all" && e.storeId !== filterStore) return false;
      const day = String(e.date ?? "").slice(0, 10);
      if (!customRange && day < cutoffISO) return false;
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [expenses, filterStore, period, dateFrom, dateTo, customRange]);

  const expenseTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const weekStats = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
    const end = new Date(); end.setHours(0, 0, 0, 0); end.setDate(end.getDate() + 1);
    const weekTx = filtered.filter(t => t.date >= start && t.date < end);
    const weekExp = filteredExpenses.filter(e => {
      const d = new Date(`${String(e.date ?? "").slice(0, 10)}T00:00:00`);
      return d >= start && d < end;
    });
    const revenue = weekTx.reduce((s, t) => s + t.total, 0);
    const expense = weekExp.reduce((s, e) => s + e.amount, 0);
    return { revenue, count: weekTx.length, expense, net: revenue - expense };
  }, [filtered, filteredExpenses]);

  const cashStats = useMemo(() => {
    const today = todayISO();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCash = filtered
      .filter(t => t.paymentMethod === "cash" && t.date >= todayStart)
      .reduce((s, t) => s + t.total, 0);
    const todayExpense = filteredExpenses
      .filter(e => String(e.date ?? "").slice(0, 10) === today)
      .reduce((s, e) => s + e.amount, 0);
    return { todayCash, todayExpense, netCashToday: todayCash - todayExpense };
  }, [filtered, filteredExpenses]);

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

  const periodNet = stats.revenue - expenseTotal;

  // Daily buckets for chart — align with selected period/custom range
  // (daily bars for <= 31 days, weekly bars otherwise)
  const dailyData = useMemo(() => {
    const dayMonth = (dt: Date) => dt.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const weekday = (dt: Date) => dt.toLocaleDateString("id-ID", { weekday: "short" });

    let start: Date;
    let days: number;
    let useWeekday = false;

    if (customRange) {
      const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
      const toMs = dateTo ? new Date(`${dateTo}T00:00:00`).getTime() + 86400000 - 1 : Number.POSITIVE_INFINITY;
      const times = filtered.map(t => t.date.getTime()).filter(ts => ts >= fromMs && ts <= toMs);
      if (times.length === 0) { start = new Date(); start.setHours(0, 0, 0, 0); days = 1; }
      else {
        const min = Math.min(...times); const max = Math.max(...times);
        start = new Date(min); start.setHours(0, 0, 0, 0);
        days = Math.max(1, Math.round((max - min) / 86400000) + 1);
      }
    } else if (period === "7d") {
      start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 6);
      days = 7; useWeekday = true;
    } else if (period === "30d") {
      start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 29);
      days = 30;
    } else {
      const spans = filtered.map(t => { const x = new Date(t.date); x.setHours(0, 0, 0, 0); return x.getTime(); });
      if (spans.length === 0) { start = new Date(); start.setHours(0, 0, 0, 0); days = 1; }
      else {
        const min = Math.min(...spans); const max = Math.max(...spans);
        start = new Date(min); start.setHours(0, 0, 0, 0);
        days = Math.max(1, Math.round((max - min) / 86400000) + 1);
      }
    }

    const buckets: { start: Date; end: Date; label: string }[] = [];
    if (days <= 31) {
      for (let i = 0; i < days; i++) {
        const d = new Date(start); d.setTime(d.getTime() + i * 86400000); d.setHours(0, 0, 0, 0);
        const n = new Date(d); n.setDate(n.getDate() + 1);
        buckets.push({ start: d, end: n, label: useWeekday ? weekday(d) : dayMonth(d) });
      }
    } else {
      const weeks = Math.ceil(days / 7);
      for (let i = 0; i < weeks; i++) {
        const d = new Date(start); d.setTime(d.getTime() + i * 7 * 86400000); d.setHours(0, 0, 0, 0);
        const n = new Date(d); n.setDate(n.getDate() + 7);
        buckets.push({ start: d, end: n, label: dayMonth(d) });
      }
    }
    return buckets.map(b => {
      const dayTx = filtered.filter(t => t.date >= b.start && t.date < b.end);
      const dayExp = filteredExpenses.filter(e => {
        const dt = new Date(`${String(e.date ?? "").slice(0, 10)}T00:00:00`);
        return dt >= b.start && dt < b.end;
      });
      const revenue = dayTx.reduce((s, t) => s + t.total, 0);
      const expense = dayExp.reduce((s, e) => s + e.amount, 0);
      return { label: b.label, revenue, expense, netCash: revenue - expense, count: dayTx.length };
    });
  }, [filtered, filteredExpenses, period, dateFrom, dateTo, customRange]);

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
    stores.map(s => {
      const stx = filtered.filter(t => t.storeId === s.id);
      const revenue = stx.reduce((sum, t) => sum + t.total, 0);
      const expense = filteredExpenses.filter(e => e.storeId === s.id).reduce((sum, e) => sum + e.amount, 0);
      return { ...s, revenue, expense, net: revenue - expense, count: stx.length };
    }).sort((a, b) => b.revenue - a.revenue),
  [filtered, filteredExpenses, stores]);

  const storeBreakdownMax = storeBreakdown[0]?.revenue ?? 0;

  const paymentBreakdown = useMemo(() => {
    const methods = payments?.methods ?? [
      { id: "cash", label: "Tunai" },
      { id: "debit", label: "Debit" },
      { id: "qris", label: "QRIS" },
    ];
    const map: Record<string, number> = {};
    const fallback: Record<string, number> = {};
    filtered.forEach(t => {
      const m = t.paymentMethod || "cash";
      if (methods.some(x => x.id === m)) map[m] = (map[m] ?? 0) + t.total;
      else fallback[m] = (fallback[m] ?? 0) + t.total;
    });
    const rows = methods.map((m, i) => ({ method: m.id, label: m.label, value: map[m.id] ?? 0, color: PAY_COLORS[i % PAY_COLORS.length] }));
    const otherTotal = Object.values(fallback).reduce((s, v) => s + v, 0);
    if (otherTotal > 0) rows.push({ method: "other", label: "Lainnya", value: otherTotal, color: "#9ca3af" });
    rows.sort((a, b) => b.value - a.value);
    const total = rows.reduce((s, r) => s + r.value, 0) || 1;
    return rows.map(r => ({ ...r, pct: Math.round((r.value / total) * 100) }));
  }, [filtered, payments]);

  const statCards = [
    { label: "Total Pendapatan", value: fmt(stats.revenue), sub: `${stats.count} transaksi`, color: "var(--accent)" },
    { label: "Bersih Periode", value: fmt(periodNet), sub: `Pendapatan − Pengeluaran ${fmt(expenseTotal)}`, color: "#16a34a" },
    { label: "Minggu Ini", value: fmt(weekStats.revenue), sub: `${weekStats.count} transaksi · Pglr ${fmt(weekStats.expense)}`, color: "#3b82f6" },
    { label: "Bersih Minggu Ini", value: fmt(weekStats.net), sub: `Pendapatan − Pengeluaran 7 hari`, color: "#0d9488" },
    { label: "Hari Ini", value: fmt(stats.todayRevenue), sub: `${stats.todayCount} transaksi`, color: "#16a34a" },
    { label: "Tunai Bersih Hari Ini", value: fmt(cashStats.netCashToday), sub: `Tunai ${fmt(cashStats.todayCash)} − Pengeluaran ${fmt(cashStats.todayExpense)}`, color: "#0d9488" },
    { label: "Pengeluaran", value: fmt(expenseTotal), sub: `${filteredExpenses.length} catatan`, color: "#db2777" },
    { label: "Rata-rata Transaksi", value: fmt(Math.round(stats.avg)), sub: "per transaksi", color: "#3b82f6" },
    { label: "Item Terjual", value: stats.itemsSold.toString(), sub: "pcs produk", color: "#7c3aed" },
    { label: "Transaksi Dihapus", value: filteredDeleted.length.toString(), sub: `Nominal ${fmt(filteredDeleted.reduce((s, d) => s + (d.transaction?.total ?? 0), 0))}`, color: "#ef4444" },
  ];

  const paymentLabel: Record<string, string> = {
    ...(payments?.methods ? Object.fromEntries(payments.methods.map(m => [m.id, m.label])) : {}),
    cash: "Tunai", debit: "Debit", qris: "QRIS",
  };

  const deletedSorted = [...filteredDeleted].reverse();
  const expSorted = [...filteredExpenses].sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? "")));
  const deletedPages = Math.max(1, Math.ceil(deletedSorted.length / deletedPageSize));
  const expPages = Math.max(1, Math.ceil(expSorted.length / expPageSize));
  const safeDeletedPage = Math.min(deletedPage, deletedPages);
  const safeExpPage = Math.min(expPage, expPages);
  const deletedVisible = deletedSorted.slice((safeDeletedPage - 1) * deletedPageSize, safeDeletedPage * deletedPageSize);
  const expVisible = expSorted.slice((safeExpPage - 1) * expPageSize, safeExpPage * expPageSize);

  const handleExport = () => {
    if (filtered.length === 0 && filteredDeleted.length === 0 && filteredExpenses.length === 0) return;

    const fmtPick = (v: string) => v ? new Date(v + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
    const periodLabel = customRange
      ? `Kustom (${fmtPick(dateFrom)} s/d ${fmtPick(dateTo)})`
      : period === "7d" ? "7 Hari Terakhir" : period === "30d" ? "30 Hari Terakhir" : "Semua Waktu";

    const summaryRows = [
      { "Periode": periodLabel, "Toko": filterStore === "all" ? "Semua Toko" : stores.find(s => s.id === filterStore)?.name ?? filterStore },
      { "Total Pendapatan": stats.revenue, "Jumlah Transaksi": stats.count, "Rata-rata": Math.round(stats.avg), "Item Terjual": stats.itemsSold, "Pendapatan Hari Ini": stats.todayRevenue, "Transaksi Hari Ini": stats.todayCount },
    ];
    const wsSummary = XLSX.utils.json_to_sheet(safeRows(summaryRows));

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
    const wsTx = XLSX.utils.json_to_sheet(safeRows(txRows));

    const productRows = topProducts.map((p, i) => ({ "Peringkat": i + 1, "Produk": p.name, "Qty": p.qty, "Pendapatan": p.revenue }));
    const wsProducts = XLSX.utils.json_to_sheet(safeRows(productRows));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");
    XLSX.utils.book_append_sheet(wb, wsTx, "Transaksi");
    XLSX.utils.book_append_sheet(wb, wsProducts, "Produk Terlaris");

    if (filteredDeleted.length > 0) {
      const deletedRows = filteredDeleted.map(d => ({
        "ID Transaksi": d.transaction?.id ?? "—",
        "Tanggal Transaksi": fmtDateSafe(d.transaction?.date),
        "Toko": d.transaction?.storeName ?? "",
        "Kasir": d.transaction?.cashierName ?? "",
        "Total": d.transaction?.total ?? 0,
        "Metode Bayar": paymentLabel[d.transaction?.paymentMethod as string] ?? "",
        "Dihapus Oleh": d.deletedBy,
        "Waktu Hapus": fmtDateSafe(d.deletedAt),
        "Alasan": d.reason,
      }));
      const wsDeleted = XLSX.utils.json_to_sheet(safeRows(deletedRows));
      XLSX.utils.book_append_sheet(wb, wsDeleted, "Transaksi Dihapus");
    }

    if (filteredExpenses.length > 0) {
      const expenseRows = filteredExpenses.map(e => ({
        "Tanggal": String(e.date ?? "").slice(0, 10),
        "Toko": (e.storeName ?? "").replace("NAND'S BOUTIQUE - ", ""),
        "Jumlah": e.amount,
        "Keterangan": e.description ?? "",
        "Dibuat Oleh": e.createdByName ?? "",
        "Bukti Foto": e.photo ? "Ada" : "-",
      }));
      const wsExpenses = XLSX.utils.json_to_sheet(safeRows(expenseRows));
      XLSX.utils.book_append_sheet(wb, wsExpenses, "Pengeluaran");
    }

    const wsSummary2 = XLSX.utils.json_to_sheet(safeRows([{
      "Total Pengeluaran": expenseTotal,
      "Bersih Periode": periodNet,
      "Pendapatan Minggu Ini": weekStats.revenue,
      "Pengeluaran Minggu Ini": weekStats.expense,
      "Bersih Minggu Ini": weekStats.net,
      "Pendapatan Tunai Hari Ini": cashStats.todayCash,
      "Pengeluaran Hari Ini": cashStats.todayExpense,
      "Tunai Bersih Hari Ini": cashStats.netCashToday,
    }]));
    XLSX.utils.book_append_sheet(wb, wsSummary2, "Ringkasan Tunai");

    XLSX.writeFile(wb, `nands-boutique-laporan-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="h-full overflow-y-auto" style={{ background: "var(--background)" }}>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-5">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Laporan Penjualan</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{periodCaption}</div>
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap"
            style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Excel
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
            className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--muted)", border: "1px solid var(--border)" }}>
            <option value="all">Semua Toko</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["7d", "30d", "all"] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className="px-3 py-2 text-xs font-semibold transition-all"
                style={{ background: period === p ? "var(--accent)" : "var(--card)", color: period === p ? "white" : "var(--muted-foreground)" }}>
                {p === "7d" ? "7 Hari" : p === "30d" ? "30 Hari" : "Semua"}
              </button>
            ))}
          </div>
          <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChangeFrom={setDateFrom} onChangeTo={setDateTo} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-5">
        {statCards.map(c => (
          <div key={c.label} className="p-3.5 sm:p-4 rounded-2xl min-w-0" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
            <div className="text-xs mb-1.5 leading-snug" style={{ color: "var(--muted-foreground)" }}>{c.label}</div>
            <div className="font-mono text-sm sm:text-lg font-bold leading-tight break-words" style={{ color: c.color, fontFamily: "'JetBrains Mono', monospace" }}>{c.value}</div>
            <div className="text-xs mt-1 leading-snug" style={{ color: "var(--muted-foreground)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 mb-4 lg:grid-cols-[1fr_280px]">
        {/* Bar Chart */}
        <div className="p-4 sm:p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-4">Grafik Pendapatan</div>
          <div className="flex items-end gap-1 sm:gap-1.5 h-36">
            {dailyData.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-1 group min-w-0">
                {dailyData.length <= 14 && (
                  <div className="text-center" style={{ fontSize: 9, color: "var(--muted-foreground)", fontFamily: "'JetBrains Mono', monospace", minHeight: 12 }}>
                    {d.revenue > 0 ? fmtK(d.revenue) : ""}
                  </div>
                )}
                <div className="w-full rounded-t-lg transition-all duration-500 relative" style={{ height: d.revenue > 0 ? `${Math.max(3, (d.revenue / maxRevenue) * 100)}px` : "2px", background: d.revenue > 0 ? "var(--accent)" : "var(--muted)", opacity: d.revenue > 0 ? 1 : 0.35 }}>
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none" style={{ background: "var(--foreground)", fontSize: 10 }}>
                    {fmt(d.revenue)}<br />{d.count} trx<br />Pengeluaran {fmt(d.expense)}<br />Bersih <b>{fmt(d.netCash)}</b>
                  </div>
                </div>
                {dailyData.length <= 14 && (
                  <div style={{ fontSize: 9, color: "var(--muted-foreground)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{d.label}</div>
                )}
              </div>
            ))}
          </div>
          {dailyData.length > 14 && (
            <div className="text-[10px] mt-2" style={{ color: "var(--muted-foreground)" }}>Arahkan ke bar untuk melihat rincian (periode panjang ditampilkan per minggu).</div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="p-4 sm:p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
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

      <div className="grid gap-4 mb-4 lg:grid-cols-2">
        {/* Top products */}
        <div className="p-4 sm:p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-4">Produk Terlaris</div>
          {topProducts.length === 0 ? (
            <EmptyState compact icon="🏆" title="Belum ada data" hint="Mulai isi data penjualan untuk melihat produk terlaris." />
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
        <div className="p-4 sm:p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }} className="mb-4">Performa Toko</div>
          {storeBreakdown.length === 0 ? (
            <EmptyState compact icon="🏬" title="Belum ada toko" hint="Data performa per toko akan tampil di sini." />
          ) : (
          <div className="flex flex-col gap-3">
            {storeBreakdown.map((s, i) => (
              <div key={s.id} className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-semibold truncate pr-2" style={{ maxWidth: "60%" }}>{s.name}</div>
                  <div className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)" }}>{fmt(s.revenue)}</div>
                </div>
                <div className="w-full h-1.5 rounded-full mb-1" style={{ background: "var(--muted)" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${storeBreakdownMax > 0 ? (s.revenue / storeBreakdownMax) * 100 : 0}%`, background: i === 0 ? "#7c3aed" : i === 1 ? "#3b82f6" : "#7c3aed" }} />
                </div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  {s.count} transaksi · Pengeluaran {fmt(s.expense)} · Bersih <b style={{ color: s.net >= 0 ? "#16a34a" : "#db2777" }}>{fmt(s.net)}</b>
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>

      {/* Deleted transactions */}
      <div className="p-4 sm:p-5 rounded-2xl" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }}>Transaksi Dihapus</div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>{filteredDeleted.length} catatan</span>
            <span className="font-mono font-semibold" style={{ color: "#ef4444", fontFamily: "'JetBrains Mono', monospace" }}>
              Nominal {fmt(filteredDeleted.reduce((s, d) => s + (d.transaction?.total ?? 0), 0))}
            </span>
          </div>
        </div>
        {filteredDeleted.length === 0 ? (
          <EmptyState compact icon="🗑️" title="Belum ada transaksi yang dihapus" hint="Transaksi yang dihapus kasir akan tampil di sini." />
        ) : (
          <div className="flex flex-col gap-2">
            {deletedVisible.map(d => (
              <div key={d.id} className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#ef4444" }}>{d.transaction?.id ?? "—"}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#fef2f2", color: "#ef4444" }}>Dihapus</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                      {fmtDateSafe(d.transaction?.date)} · {(d.transaction?.storeName ?? "").replace("NAND'S BOUTIQUE - ", "")} · {d.transaction?.cashierName ?? "—"} · {paymentLabel[d.transaction?.paymentMethod as string] ?? "—"}
                    </div>
                    <div className="text-xs mt-1.5 flex items-start gap-1.5" style={{ color: "#b45309" }}>
                      <svg className="shrink-0 mt-0.5" width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span>Alasan: {d.reason}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="font-mono font-bold text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#ef4444" }}>{fmt(d.transaction?.total ?? 0)}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>oleh {d.deletedBy}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{fmtDateSafe(d.deletedAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination
          total={filteredDeleted.length}
          page={safeDeletedPage}
          pageSize={deletedPageSize}
          onPageChange={setDeletedPage}
          onPageSizeChange={setDeletedPageSize}
          rowLabel="catatan"
        />
      </div>
    {/* Pengeluaran */}
      <div className="p-4 sm:p-5 rounded-2xl mt-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }}>Pengeluaran</div>
          <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
            <span>{filteredExpenses.length} catatan</span>
            <span className="font-mono font-semibold" style={{ color: "#db2777", fontFamily: "'JetBrains Mono', monospace" }}>
              Total {fmt(expenseTotal)}
            </span>
          </div>
        </div>
        {filteredExpenses.length === 0 ? (
          <EmptyState compact icon="💸" title="Belum ada pengeluaran pada periode ini" hint="Pengeluaran operasional periode ini akan tampil di sini." />
        ) : (
          <div className="flex flex-col gap-2">
            {expVisible.map(e => (
              <div key={e.id} className="p-3 rounded-xl" style={{ background: "var(--background)" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: "#fdf2f8", color: "#db2777" }}>Pengeluaran</span>
                      <span className="text-sm">{String(e.date ?? "").slice(0, 10)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>{(e.storeName ?? "").replace("NAND'S BOUTIQUE - ", "")}</span>
                    </div>
                    {e.description && (
                      <div className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>{e.description}</div>
                    )}
                    {e.createdByName && (
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>Oleh {e.createdByName}</div>
                    )}
                    {e.photo && (
                      <img src={assetUrl(e.photo)} alt="Bukti" className="mt-2 w-12 h-12 rounded-lg object-cover" style={{ border: "1px solid var(--border)" }} />
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="font-mono font-bold text-sm" style={{ fontFamily: "'JetBrains Mono', monospace", color: "#db2777" }}>{fmt(e.amount)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination
          total={filteredExpenses.length}
          page={safeExpPage}
          pageSize={expPageSize}
          onPageChange={setExpPage}
          onPageSizeChange={setExpPageSize}
          rowLabel="catatan"
        />
      </div>
      </div>
    </div>
  );
}
