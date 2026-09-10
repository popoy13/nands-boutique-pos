import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import type { Employee } from "../data/types";
import { getRoleLabel, getRoleColor, ensureRoles } from "../data/roles";
import type { RoleConfig } from "../data/roles";

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const BUILTIN_LABEL_ROLES: Record<string, string> = {
  Admin: "admin",
  "Manager Toko": "manager",
  Manager: "manager",
  "Manager Operasional": "manager_operasional",
  Kasir: "kasir",
  Staff: "staff",
};
const allRoleByLabel = (label: string): string | undefined => BUILTIN_LABEL_ROLES[label];

interface Props {
  employees: Employee[];
  stores: { id: string; name: string }[];
  onSave: (employees: Employee[]) => void;
  canEdit?: boolean;
  canImport?: boolean;
  canExport?: boolean;
  canAdd?: boolean;
  roles?: Record<string, RoleConfig>;
}

const emptyEmployee = (): Employee => ({
  id: `e-${Date.now()}`,
  name: "",
  role: "kasir",
  storeId: "s1",
  phone: "",
  email: "",
  joinDate: new Date().toISOString().slice(0, 10),
  salary: 0,
  status: "active",
  pin: "1234",
});

export default function EmployeeView({ employees, stores, onSave, canEdit = true, canImport = true, canExport = true, canAdd = true, roles }: Props) {
  const [search, setSearch] = useState("");
  const [filterStore, setFilterStore] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [toast, setToast] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const roleConfigs = ensureRoles(roles);
  const roleOptions = Object.entries(roleConfigs);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("File harus berupa gambar"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditing(prev => prev ? { ...prev, photo: ev.target?.result as string } : null);
      showToast("Foto berhasil diubah");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const filtered = employees.filter(e =>
    (filterStore === "all" || e.storeId === filterStore) &&
    (filterRole === "all" || e.role === filterRole) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSaveEmployee = () => {
    if (!editing || !editing.name.trim()) return;
    if (isNew) {
      onSave([...employees, editing]);
    } else {
      onSave(employees.map(e => e.id === editing.id ? editing : e));
    }
    setEditing(null);
    setIsNew(false);
    showToast("Data karyawan disimpan");
  };

  const handleDelete = (id: string) => {
    onSave(employees.filter(e => e.id !== id));
    if (editing?.id === id) setEditing(null);
    showToast("Karyawan dihapus");
  };

  const handleToggleStatus = (id: string) => {
    onSave(employees.map(e => e.id === id ? { ...e, status: e.status === "active" ? "inactive" : "active" } : e));
  };

  // Export Excel
  const handleExport = () => {
    const rows = employees.map(e => ({
      "ID": e.id,
      "Nama": e.name,
      "Jabatan": getRoleLabel(e.role, roles),
      "Toko": stores.find(s => s.id === e.storeId)?.name ?? e.storeId,
      "No. HP": e.phone,
      "Email": e.email,
      "Tanggal Bergabung": e.joinDate,
      "Gaji": e.salary,
      "Status": e.status === "active" ? "Aktif" : "Tidak Aktif",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Karyawan");
    XLSX.writeFile(wb, `nostra-karyawan-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("File Excel berhasil diunduh");
  };

  // Import Excel
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];

        const imported: Employee[] = rows.map((row: any) => {
          const storeMatch = stores.find(s => s.name === row["Toko"]);
          const jabatan = String(row["Jabatan"] ?? "").trim();
          const labelToKey = new Map(roleOptions.map(([k, c]) => [c.label, k]));
          const roleKey = labelToKey.get(jabatan) ?? allRoleByLabel(jabatan) ?? "staff";
          return {
            id: row["ID"] || `e-${Date.now()}-${Math.random()}`,
            name: row["Nama"] || "",
            role: roleKey,
            storeId: storeMatch?.id ?? "s1",
            phone: row["No. HP"] || "",
            email: row["Email"] || "",
            joinDate: row["Tanggal Bergabung"] || "",
            salary: Number(row["Gaji"]) || 0,
            status: row["Status"] === "Aktif" ? "active" : "inactive",
            pin: row["PIN"] || "1234",
          };
        });

        // Merge: update existing by ID, add new
        const merged = [...employees];
        imported.forEach(imp => {
          const idx = merged.findIndex(e => e.id === imp.id);
          if (idx >= 0) merged[idx] = imp;
          else merged.push(imp);
        });
        onSave(merged);
        showToast(`${rows.length} karyawan berhasil diimpor`);
      } catch {
        showToast("Gagal membaca file Excel");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const activeCount = employees.filter(e => e.status === "active").length;

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium text-white shadow-lg" style={{ background: "#16a34a" }}>
          {toast}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-80 max-w-[90vw] rounded-2xl p-6 my-auto" style={{ background: "var(--card)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700 }} className="mb-2">Hapus Karyawan?</div>
            <div className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>Tindakan ini tidak dapat dibatalkan.</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>Tidak</button>
              <button onClick={() => { handleDelete(confirmDelete); setConfirmDelete(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: "#ef4444" }}>Ya</button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex flex-col min-w-0 lg:flex-1 lg:overflow-hidden">
        <div className="px-5 py-4 border-b shrink-0" style={{ borderColor: "var(--border)", background: "var(--background)" }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
            <div>
              <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 18 }}>Manajemen Karyawan</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{activeCount} aktif · {employees.length - activeCount} tidak aktif</div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              {canImport && (
                <button onClick={() => importRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Import
                </button>
              )}
              {canExport && (
                <button onClick={handleExport}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export
                </button>
              )}
              {canAdd && (
                <button
                  onClick={() => { setEditing(emptyEmployee()); setIsNew(true); }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{ background: "var(--foreground)" }}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  Tambah
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative" style={{ minWidth: 180 }}>
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#9ca3af" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Cari nama atau email..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }} />
            </div>
            <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
              className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Toko</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
              className="text-xs rounded-xl px-3 py-2 outline-none" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <option value="all">Semua Jabatan</option>
              {roleOptions.map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
            </select>
          </div>
        </div>

        <div className="lg:flex-1 lg:overflow-y-auto px-4 py-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-sm" style={{ color: "var(--muted-foreground)" }}>Tidak ada karyawan ditemukan</div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(emp => (
                <div
                  key={emp.id}
                  className="p-4 rounded-xl flex items-center gap-4 transition-all"
                  style={{
                    background: editing?.id === emp.id ? "rgba(124,58,237,0.04)" : "var(--card)",
                    border: `1.5px solid ${editing?.id === emp.id ? "var(--accent)" : "var(--border)"}`,
                    opacity: emp.status === "inactive" ? 0.6 : 1,
                  }}
                >
                  {/* Avatar */}
                  {emp.photo ? (
                    <img src={emp.photo} alt={emp.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                      style={{ filter: emp.status === "inactive" ? "grayscale(1)" : "none" }} />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: emp.status === "inactive" ? "#9ca3af" : "var(--foreground)" }}>
                      {emp.name.charAt(0)}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold">{emp.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${getRoleColor(emp.role, roles)}18`, color: getRoleColor(emp.role, roles) }}>{getRoleLabel(emp.role, roles)}</span>
                      {emp.status === "inactive" && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>Non-aktif</span>}
                    </div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {stores.find(s => s.id === emp.storeId)?.name ?? emp.storeId}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {emp.phone} · {emp.email}
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="font-mono text-xs font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{fmt(emp.salary)}</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>per bulan</div>
                  </div>

                  {/* Actions */}
                  {canEdit && <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(emp.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: emp.status === "active" ? "#f0fdf4" : "#f3f4f6" }}
                      title={emp.status === "active" ? "Nonaktifkan" : "Aktifkan"}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={emp.status === "active" ? "#16a34a" : "#9ca3af"} strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => { setEditing({ ...emp }); setIsNew(false); }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "var(--secondary)" }}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(emp.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: "#fef2f2" }}
                    >
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Panel */}
      {editing && (canEdit || canAdd) && (
        <div className="shrink-0 flex flex-col overflow-hidden w-full lg:w-[340px]" style={{ background: "var(--card)", borderTop: "1px solid var(--border)", borderLeft: "1px solid var(--border)" }}>
          <div className="px-5 py-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 14 }}>{isNew ? "Tambah Karyawan" : "Edit Karyawan"}</div>
            <button onClick={() => setEditing(null)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--muted)" }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="lg:flex-1 lg:overflow-y-auto px-5 py-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>Foto Karyawan</label>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: "var(--foreground)" }}>
                    {editing.photo
                      ? <img src={editing.photo} alt="Foto" className="w-full h-full object-cover" />
                      : <span>{editing.name.charAt(0) || "?"}</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                      {editing.photo ? "Ganti Foto" : "Unggah Foto"}
                    </button>
                    {editing.photo && (
                      <button
                        type="button"
                        onClick={() => setEditing(prev => prev ? { ...prev, photo: undefined } : null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ background: "#fef2f2", color: "#ef4444" }}>
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {[
                { label: "Nama Lengkap", key: "name", type: "text" },
                { label: "No. HP", key: "phone", type: "text" },
                { label: "Email", key: "email", type: "email" },
                { label: "Tanggal Bergabung", key: "joinDate", type: "date" },
                { label: "Gaji (Rp)", key: "salary", type: "number" },
                { label: "PIN Login (4 digit)", key: "pin", type: "text" },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={(editing as any)[field.key]}
                    onChange={e => setEditing(prev => prev ? { ...prev, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value } : null)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>Jabatan</label>
                <select
                  value={editing.role}
                  onChange={e => setEditing(prev => prev ? { ...prev, role: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
                >
                  {roleOptions.map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>Toko</label>
                <select
                  value={editing.storeId}
                  onChange={e => setEditing(prev => prev ? { ...prev, storeId: e.target.value } : null)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
                >
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--muted-foreground)" }}>Status</label>
                <div className="flex gap-2">
                  {(["active", "inactive"] as const).map(s => (
                    <button key={s} onClick={() => setEditing(prev => prev ? { ...prev, status: s } : null)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: editing.status === s ? "var(--foreground)" : "var(--background)",
                        color: editing.status === s ? "white" : "var(--muted-foreground)",
                        border: `1px solid ${editing.status === s ? "var(--foreground)" : "var(--border)"}`,
                      }}>
                      {s === "active" ? "Aktif" : "Tidak Aktif"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t shrink-0" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={handleSaveEmployee}
              disabled={!editing.name.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: editing.name.trim() ? "var(--foreground)" : "var(--muted)",
                color: editing.name.trim() ? "white" : "var(--muted-foreground)",
              }}
            >
              Simpan Karyawan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
