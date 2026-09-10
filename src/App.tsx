import { useState, useEffect } from "react";
import LoginView from "./components/LoginView";
import Sidebar, { MobileBottomNav } from "./components/Sidebar";
import POSView from "./components/POSView";
import HistoryView from "./components/HistoryView";
import ReportView from "./components/ReportView";
import StockView from "./components/StockView";
import EmployeeView from "./components/EmployeeView";
import StoreManagement from "./components/StoreManagement";
import DiscountView from "./components/DiscountView";
import ProductManagement from "./components/ProductManagement";
import MemberView from "./components/MemberView";
import AttendanceView from "./components/AttendanceView";
import SettingsView from "./components/SettingsView";
import { useSyncedStore } from "./hooks/useSyncedStore";
import type { Employee, Transaction, AttendanceRecord, Member } from "./data/types";
import { ROLE_PERMISSIONS } from "./data/types";

export default function App() {
  const {
    ready,
    products, setProducts,
    stores, setStores,
    employees, setEmployees,
    members, setMembers,
    discounts, setDiscounts,
    attendance, setAttendance,
    transactions, setTransactions,
    deletedTransactions, setDeletedTransactions,
    settings, setSettings,
    categories, setCategories,
  } = useSyncedStore();
  const [currentUser, setCurrentUser] = useState<Employee | null>(() => {
    try {
      const raw = localStorage.getItem("nands-current-user");
      if (raw) return JSON.parse(raw) as Employee;
    } catch { /* ignore */ }
    return null;
  });
  const [activeTab, setActiveTab] = useState("pos");
  const [activeStore, setActiveStore] = useState("s1");

  useEffect(() => {
    if (ready && currentUser && !employees.some(e => e.id === currentUser.id)) {
      setCurrentUser(null);
      try { localStorage.removeItem("nands-current-user"); } catch { /* ignore */ }
    }
  }, [ready, employees]);

  const storeName = stores.find(s => s.id === activeStore)?.name ?? "";

  const handleLogin = (emp: Employee) => {
    setCurrentUser(emp);
    try { localStorage.setItem("nands-current-user", JSON.stringify(emp)); } catch { /* ignore */ }
    // Default to first allowed tab
    const allowed = ROLE_PERMISSIONS[emp.role];
    // Set active store to employee's store (for non-admin/manager)
    const nextStore = (emp.role !== "admin" && emp.role !== "manager" && emp.role !== "manager_operasional") ? emp.storeId : activeStore;
    setActiveStore(nextStore);
    // If user hasn't clocked in today, open Absensi first
    const todayStr = new Date().toISOString().slice(0, 10);
    const clockedToday = attendance.some(r => r.employeeId === emp.id && r.date === todayStr && r.storeId === nextStore);
    if (allowed.includes("attendance") && !clockedToday) {
      setActiveTab("attendance");
    } else {
      setActiveTab(allowed[0]);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("pos");
    try { localStorage.removeItem("nands-current-user"); } catch { /* ignore */ }
  };

  const handleNewTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
    setProducts(prev => prev.map(p => ({
      ...p,
      variants: p.variants.map(v => ({
        ...v,
        stocks: v.stocks.map(st => {
          const soldItem = t.items.find(i => i.variantSku === v.sku && t.storeId === st.storeId);
          if (soldItem) return { ...st, quantity: Math.max(0, st.quantity - soldItem.quantity) };
          return st;
        }),
      })),
    })));
    setActiveTab("history");
  };

  const handleUpdateStock = (productId: string, sku: string, storeId: string, qty: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId
        ? { ...p, variants: p.variants.map(v => v.sku === sku ? { ...v, stocks: v.stocks.map(s => s.storeId === storeId ? { ...s, quantity: qty } : s) } : v) }
        : p
    ));
  };

  const handleUpdateMember = (updated: Member) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const handleDeleteTransaction = (id: string, reason: string, deletedBy: string) => {
    const target = transactions.find(t => t.id === id);
    if (!target) return;
    setDeletedTransactions(prev => [...prev, {
      id: `DEL-${Date.now()}-${String(Math.floor(Math.random() * 9999)).padStart(4, "0")}`,
      transaction: target,
      deletedAt: new Date(),
      deletedBy,
      reason,
    }]);
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTransaction = (t: Transaction) => {
    setTransactions(prev => prev.map(tx => tx.id === t.id ? t : tx));
  };

  const handleClock = (record: AttendanceRecord) => {
    setAttendance(prev => {
      const idx = prev.findIndex(r => r.id === record.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = record; return next; }
      return [...prev, record];
    });
  };

  const handleDeleteAttendance = (id: string) => {
    setAttendance(prev => prev.filter(r => r.id !== id));
  };

  if (!ready) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3" style={{ background: "var(--background)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)" }}>
          <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 20, color: "var(--accent)" }}>{(settings.brand?.name || "N").charAt(0)}</span>
        </div>
        <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>{settings.brand?.name ?? "NAND'S BOUTIQUE"}</div>
        <div className="text-xs animate-pulse" style={{ color: "var(--muted-foreground)" }}>sabar guys loading dulu</div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView employees={employees} stores={stores} brand={settings.brand} onLogin={handleLogin} />;
  }

  const role = currentUser.role;
  const allowed = ROLE_PERMISSIONS[role];
  const managerRole = (r: string) => r === "manager" || r === "manager_operasional";
  const canEditEmployees = role === "admin" || managerRole(role);
  const canEditStore = role === "admin";
  const canEditDiscount = role === "admin";
  const canEditProduct = role === "admin" || managerRole(role);
  const canEditMember = role === "admin";
  const canEditStock = role === "admin" || managerRole(role);
  const canEditSettings = role === "admin" || managerRole(role);

  // Guard: if current tab not allowed, redirect
  const safeTab = allowed.includes(activeTab) ? activeTab : allowed[0];

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden" style={{ background: "var(--background)" }}>
      <Sidebar
        activeTab={safeTab}
        setActiveTab={tab => { if (allowed.includes(tab)) setActiveTab(tab); }}
        activeStore={activeStore}
        setActiveStore={setActiveStore}
        stores={stores}
        currentUser={currentUser}
        onLogout={handleLogout}
        brand={settings.brand}
      />

      <div className="flex-1 min-w-0 overflow-hidden">
        {safeTab === "pos" && (
          <POSView
            activeStore={activeStore}
            storeName={storeName}
            cashierId={currentUser.id}
            cashierName={currentUser.name}
            products={products}
            discounts={discounts}
            members={members}
            onNewTransaction={handleNewTransaction}
            onUpdateMember={handleUpdateMember}
            brandName={settings.brand.name}
            printer={settings.printer}
          />
        )}
        {safeTab === "history" && (
          <HistoryView
            transactions={transactions}
            stores={stores}
            activeStore={activeStore}
            userRole={role}
            onDelete={canEditEmployees ? (id, reason) => handleDeleteTransaction(id, reason, currentUser.name) : undefined}
            onUpdate={canEditEmployees ? handleUpdateTransaction : undefined}
            brandName={settings.brand.name}
            printer={settings.printer}
          />
        )}
        {safeTab === "report" && (
          <ReportView transactions={transactions} deletedTransactions={deletedTransactions} stores={stores} />
        )}
        {safeTab === "inventory" && (
          <StockView
            products={products}
            stores={stores}
            activeStore={activeStore}
            onUpdateStock={canEditStock ? handleUpdateStock : () => {}}
            canEdit={canEditStock}
          />
        )}
        {safeTab === "product" && (
          <ProductManagement
            products={products}
            stores={stores}
            categories={categories}
            onUpdateCategories={setCategories}
            onSave={setProducts}
            canEdit={canEditProduct}
          />
        )}
        {safeTab === "employee" && (
          <EmployeeView
            employees={employees}
            stores={stores}
            onSave={setEmployees}
            canEdit={canEditEmployees}
          />
        )}
        {safeTab === "store" && (
          <StoreManagement
            stores={stores}
            onSave={setStores}
            canEdit={canEditStore}
          />
        )}
        {safeTab === "discount" && (
          <DiscountView
            discounts={discounts}
            stores={stores}
            onSave={setDiscounts}
            canEdit={canEditDiscount}
          />
        )}
        {safeTab === "member" && (
          <MemberView
            members={members}
            stores={stores}
            onSave={setMembers}
            canEdit={canEditMember}
          />
        )}
        {safeTab === "attendance" && (
          <AttendanceView
            records={attendance}
            stores={stores}
            employees={employees}
            currentUser={currentUser}
            onClock={handleClock}
            onDelete={role === "admin" ? handleDeleteAttendance : undefined}
          />
        )}
        {safeTab === "settings" && (
          <SettingsView
            settings={settings}
            stores={stores}
            onSaveSettings={setSettings}
            onSaveStores={setStores}
            canEdit={canEditSettings}
          />
        )}
      </div>

      <MobileBottomNav
        allowed={allowed}
        activeTab={safeTab}
        onSelect={tab => { if (allowed.includes(tab)) setActiveTab(tab); }}
      />
    </div>
  );
}
