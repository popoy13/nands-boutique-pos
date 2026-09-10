import { useState } from "react";
import type { Employee } from "../data/types";
import { getRoleLabel, getRoleColor } from "../data/roles";
import type { RoleConfig } from "../data/roles";
import Avatar from "./Avatar";

interface Props {
  activeTab: string;
  setActiveTab: (t: string) => void;
  activeStore: string;
  setActiveStore: (s: string) => void;
  stores: { id: string; name: string }[];
  currentUser: Employee;
  onLogout: () => void;
  brand: { logo: string; name: string; tagline: string };
  roles?: Record<string, RoleConfig>;
  allowed: string[];
}

export const ALL_NAV = [
  { id: "pos",      label: "Kasir",         icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
  { id: "history",  label: "Transaksi",     icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> },
  { id: "report",   label: "Laporan",       icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { id: "inventory",label: "Inventori",     icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg> },
  { id: "product",  label: "Produk",        icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg> },
  { id: "employee", label: "Karyawan",      icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  { id: "store",    label: "Toko",          icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
  { id: "discount", label: "Diskon",        icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6M9.5 9.5h.01M14.5 14.5h.01M20 12a8 8 0 11-16 0 8 8 0 0116 0z" /></svg> },
  { id: "member",   label: "Member",        icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg> },
  { id: "attendance", label: "Absensi",      icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
  { id: "settings", label: "Setelan",       icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
];

export default function Sidebar({ activeTab, setActiveTab, activeStore, setActiveStore, stores, currentUser, onLogout, brand, roles, allowed }: Props) {
  const navItems = ALL_NAV.filter(n => allowed.includes(n.id));

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden flex flex-col shrink-0" style={{ background: "var(--sidebar)", paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-2.5">
          <img src={brand.logo} alt={`Logo ${brand.name}`} className="w-8 h-8 rounded-lg object-cover shrink-0" style={{ background: "var(--accent)" }} />
          <div className="flex-1 min-w-0">
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: "white", fontSize: 13, letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand.name}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand.tagline}</div>
          </div>
          <Avatar src={currentUser.photo} name={currentUser.name} role={currentUser.role} className="w-7 h-7 text-xs" />
          <button onClick={onLogout} title="Keluar" className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>

        <div className="px-4 pb-2.5">
          <select value={activeStore} onChange={e => setActiveStore(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-xs outline-none appearance-none cursor-pointer"
            style={{ background: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
            {stores.filter(s => currentUser.role === "admin" || currentUser.role === "manager" || currentUser.role === "manager_operasional" || s.id === currentUser.storeId).map(s => (
              <option key={s.id} value={s.id} style={{ background: "#1a1d26" }}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-full shrink-0" style={{ width: 228, background: "var(--sidebar)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <img src={brand.logo} alt={`Logo ${brand.name}`} className="w-9 h-9 rounded-xl object-cover shrink-0" style={{ background: "var(--accent)" }} />
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: "white", fontSize: 13, letterSpacing: "0.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand.name}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{brand.tagline}</div>
          </div>
        </div>
      </div>

      {/* Store selector — show for all roles */}
      <div className="px-4 pb-3">
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", marginBottom: 5 }}>TOKO AKTIF</div>
        <select value={activeStore} onChange={e => setActiveStore(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-xs outline-none appearance-none cursor-pointer"
          style={{ background: "rgba(255,255,255,0.07)", color: "white", border: "1px solid rgba(255,255,255,0.1)" }}>
          {stores.filter(s => currentUser.role === "admin" || currentUser.role === "manager" || currentUser.role === "manager_operasional" || s.id === currentUser.storeId).map(s => (
            <option key={s.id} value={s.id} style={{ background: "#1a1d26" }}>{s.name.replace("NAND'S BOUTIQUE - ", "")}</option>
          ))}
        </select>
      </div>

      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 0 8px" }} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-1 flex flex-col gap-0.5 overflow-y-auto">
        {navItems.map(item => {
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={{ background: active ? "rgba(124,58,237,0.15)" : "transparent", color: active ? "var(--accent)" : "var(--sidebar-fg)" }}>
              <span style={{ color: active ? "var(--accent)" : "rgba(156,163,175,0.55)", flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <Avatar src={currentUser.photo} name={currentUser.name} role={currentUser.role} className="w-8 h-8 text-xs" />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 12, fontWeight: 600, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
            <div style={{ fontSize: 10, color: getRoleColor(currentUser.role, roles) }}>{getRoleLabel(currentUser.role, roles)}</div>
          </div>
          <button onClick={onLogout} title="Keluar" className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all hover:bg-white/10" style={{ color: "rgba(255,255,255,0.4)" }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

export function MobileBottomNav({ allowed, activeTab, onSelect }: { allowed: string[]; activeTab: string; onSelect: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const items = ALL_NAV.filter(n => allowed.includes(n.id));
  const primary = items.slice(0, 4);
  const more = items.slice(4);

  const handleSelect = (id: string) => { onSelect(id); setOpen(false); };

  const renderItem = (item: { id: string; label: string; icon: React.ReactNode }, compact: boolean) => {
    const active = activeTab === item.id;
    return (
      <button key={item.id} onClick={() => handleSelect(item.id)}
        className={compact
          ? "flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5 px-1 transition-all"
          : "flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all"}
        style={compact
          ? { color: active ? "var(--accent)" : "rgba(156,163,175,0.7)", borderTop: `2px solid ${active ? "var(--accent)" : "transparent"}`, background: active ? "rgba(124,58,237,0.08)" : "transparent" }
          : { background: active ? "rgba(124,58,237,0.1)" : "var(--background)", border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`, color: active ? "var(--accent)" : "var(--muted-foreground)" }}>
        <span style={{ color: active ? "var(--accent)" : "rgba(156,163,175,0.6)" }}>{item.icon}</span>
        <span className={compact ? "text-[9px] font-medium truncate w-full text-center" : "text-[10px] font-semibold"}>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="lg:hidden shrink-0 flex items-stretch w-full"
        style={{ background: "#0f1117", borderTop: "1px solid rgba(255,255,255,0.06)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {primary.map(item => renderItem(item, true))}
        {more.length > 0 && (
          <button onClick={() => setOpen(true)}
            className="flex-1 min-w-0 flex flex-col items-center gap-1 py-2.5 px-1 transition-all"
            style={{ color: "rgba(156,163,175,0.7)", borderTop: "2px solid transparent" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5h.01M12 12h.01M12 19h.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
            <span className="text-[9px] font-medium">Lainnya</span>
          </button>
        )}
      </nav>

      {/* More sheet */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl p-5" style={{ background: "var(--card)", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>Menu</div>
              <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 max-h-[55vh] overflow-y-auto pb-2">
              {items.map(item => renderItem(item, false))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
