import { useState } from "react";
import type { Employee } from "../data/types";
import { getRoleLabel, getRoleColor } from "../data/roles";
import type { RoleConfig } from "../data/roles";
import Avatar from "./Avatar";

interface Props {
  employees: Employee[];
  stores: { id: string; name: string }[];
  brand: { logo: string; name: string; tagline: string };
  roles?: Record<string, RoleConfig>;
  onLogin: (employee: Employee) => void;
}

export default function LoginView({ employees, stores, brand, roles, onLogin }: Props) {
  const [step, setStep] = useState<"select" | "pin">("select");
  const [selected, setSelected] = useState<Employee | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [search, setSearch] = useState("");

  const activeEmployees = employees.filter(e =>
    e.status === "active" && (filterStore === "all" || e.storeId === filterStore)
  );

  const filteredEmployees = activeEmployees.filter(e =>
    !search.trim() || e.name.toLowerCase().includes(search.trim().toLowerCase()) || e.role.includes(search.trim().toLowerCase())
  );

  const handleSelect = (emp: Employee) => {
    setSelected(emp);
    setPin("");
    setError("");
    setStep("pin");
  };

  const handlePinInput = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    if (newPin.length === 4) {
      setTimeout(() => {
        if (newPin === selected?.pin) {
          onLogin(selected);
        } else {
          setError("PIN salah. Coba lagi.");
          setPin("");
        }
      }, 200);
    }
  };

  const handleBackspace = () => { setPin(p => p.slice(0, -1)); setError(""); };

  return (
    <div className="h-full flex items-start justify-center overflow-y-auto" style={{ background: "var(--sidebar)" }}>
      {/* Background texture */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-5" style={{ background: "var(--accent)" }} />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full opacity-5" style={{ background: "var(--accent)" }} />
      </div>

      <div className="relative w-full max-w-2xl mx-4 my-auto py-6">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <img src={brand.logo} alt={`Logo ${brand.name}`} className="w-12 h-12 rounded-2xl object-cover" style={{ background: "var(--accent)" }} />
          </div>
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: 26, color: "white", letterSpacing: "0.04em" }}>
            {brand.name}
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>{brand.tagline}</div>
        </div>

        {step === "select" ? (
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--card)" }}>
            <div className="px-6 py-5 border-b" style={{ borderColor: "var(--border)" }}>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 16 }} className="mb-3">Pilih Akun Karyawan</div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    placeholder="Cari nama karyawan..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 rounded-xl text-xs outline-none"
                    style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                  />
                </div>
                <select
                  value={filterStore}
                  onChange={e => setFilterStore(e.target.value)}
                  className="text-xs rounded-xl px-3 py-2 outline-none"
                  style={{ background: "var(--background)", border: "1px solid var(--border)" }}
                >
                  <option value="all">Semua Toko</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div className="p-4 grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
              {filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => handleSelect(emp)}
                  className="p-4 rounded-xl text-left transition-all duration-150 hover:-translate-y-0.5 group"
                  style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
                >
                  <Avatar src={emp.photo} name={emp.name} role={emp.role} className="w-10 h-10 text-sm mb-3" />
                  <div className="text-sm font-semibold mb-0.5 truncate">{emp.name}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${getRoleColor(emp.role, roles)}18`, color: getRoleColor(emp.role, roles) }}>
                      {getRoleLabel(emp.role, roles)}
                    </span>
                  </div>
                  <div className="text-xs mt-1 truncate" style={{ color: "var(--muted-foreground)" }}>
                    {stores.find(s => s.id === emp.storeId)?.name?.replace("NAND'S BOUTIQUE - ", "") ?? ""}
                  </div>
                </button>
              ))}
              {filteredEmployees.length === 0 && (
                <div className="col-span-full text-center py-8 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {search.trim() ? `Tidak ada karyawan dengan nama "${search.trim()}"` : "Tidak ada karyawan aktif"}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--card)", maxWidth: 360, margin: "0 auto" }}>
            <div className="px-6 py-5 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
              <button onClick={() => { setStep("select"); setError(""); setPin(""); }} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
<Avatar src={selected?.photo} name={selected?.name ?? ""} role={selected?.role} className="w-9 h-9 text-sm shrink-0" />
              <div>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 15 }}>Masukkan PIN</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{selected?.name}</div>
              </div>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: `${getRoleColor(selected?.role ?? "staff", roles)}18`, color: getRoleColor(selected?.role ?? "staff", roles) }}>
                {getRoleLabel(selected?.role ?? "staff", roles)}
              </span>
            </div>

            <div className="px-6 py-6">
              {/* PIN dots */}
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="w-3.5 h-3.5 rounded-full transition-all duration-150"
                    style={{ background: i < pin.length ? "var(--accent)" : "var(--muted)", transform: i < pin.length ? "scale(1.2)" : "scale(1)" }} />
                ))}
              </div>

              {error && (
                <div className="text-center text-xs font-medium mb-4 px-3 py-2 rounded-lg" style={{ background: "#fef2f2", color: "#ef4444" }}>
                  {error}
                </div>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-2">
                {["1","2","3","4","5","6","7","8","9","",  "0","del"].map((d, i) => (
                  <button
                    key={i}
                    onClick={() => d === "del" ? handleBackspace() : d ? handlePinInput(d) : null}
                    disabled={!d && d !== "0"}
                    className="h-14 rounded-2xl text-lg font-semibold transition-all duration-100 active:scale-95"
                    style={{
                      background: d === "del" ? "#fef2f2" : d ? "var(--background)" : "transparent",
                      color: d === "del" ? "#ef4444" : "var(--foreground)",
                      border: d && d !== "del" ? "1.5px solid var(--border)" : "none",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {d === "del" ? (
                      <svg className="mx-auto" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M9 3L3 9v6l6 6h12a1 1 0 001-1V4a1 1 0 00-1-1H9z" /><path d="M8 9l6 6M14 9l-6 6" /></svg>
                    ) : d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-center mt-6 text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          {brand.name} POS v2.0 · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
