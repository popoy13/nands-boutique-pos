import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface AuditRow {
  id: string;
  created_at: string;
  employee_id: string | null;
  name: string | null;
  role: string | null;
  action: string;
  detail: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  login: "Login",
  login_failed: "PIN salah",
  logout: "Logout",
  logout_idle: "Logout otomatis",
  session_revoked: "Sesi dicabut",
  session_revoked_by_admin: "Sesi dicabut admin",
  employee_create: "Tambah karyawan",
  employee_update: "Ubah karyawan",
  employee_delete: "Hapus karyawan",
  employee_status: "Ubah status",
  product_create: "Tambah produk",
  product_update: "Ubah produk",
  product_delete: "Hapus produk",
  transaction_delete: "Hapus transaksi",
  transaction_delete_permanent: "Hapus permanen transaksi",
  expense_create: "Tambah pengeluaran",
  expense_update: "Ubah pengeluaran",
  expense_delete: "Hapus pengeluaran",
  deposit_create: "Tambah setor",
  deposit_update: "Ubah setor",
  deposit_delete: "Hapus setor",
};

const fmtDt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(d);
};

export default function AuditLogView({ currentUser }: { currentUser?: { id: string; role: string } | null }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(120);
      if (cancelled) return;
      setRows((error ? [] : (data as AuditRow[] | null ?? [])));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const filtered = rows.filter(r =>
    !search.trim()
    || (r.name ?? "").toLowerCase().includes(search.trim().toLowerCase())
    || (r.action ?? "").toLowerCase().includes(search.trim().toLowerCase())
    || (r.detail ?? "").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="w-full rounded-2xl mb-4" style={{ background: "var(--card)", border: "1.5px solid var(--border)" }}>
      <div className="p-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 13 }}>Aktivitas Keamanan</div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: "#7c3aed" }}>HANYA ADMIN</span>
        </div>
        <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
          Jejak login, perubahan PIN, dan aksi sensitif lainnya. Data hanya tercatat bila tabel <code>audit_log</code> sudah dibuat (lihat <code>supabase/migrations</code>).
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari aktivitas / nama..."
            className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
            style={{ background: "var(--background)", border: "1.5px solid var(--border)" }}
          />
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "var(--secondary)" }}
          >
            Muat ulang
          </button>
        </div>
      </div>

      <div className="px-5 pb-5" style={{ borderTop: "1.5px solid var(--border)", paddingTop: 12 }}>
        {loading ? (
          <div className="text-xs py-4" style={{ color: "var(--muted-foreground)" }}>Memuat catatan keamanan...</div>
        ) : filtered.length === 0 ? (
          <div className="text-xs py-4" style={{ color: "var(--muted-foreground)" }}>
            {rows.length === 0 ? "Belum ada catatan. Jalankan SQL migrasi audit_log untuk mulai merekam." : "Tidak ada hasil yang cocok."}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
            {filtered.map(r => (
              <div key={r.id} className="p-2.5 rounded-xl flex flex-col gap-0.5" style={{ background: "var(--background)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold" style={{ color: "var(--foreground)" }}>
                    {ACTION_LABELS[r.action] ?? r.action}
                  </span>
                  <span className="text-[10px] shrink-0" style={{ color: "var(--muted-foreground)" }}>{fmtDt(r.created_at)}</span>
                </div>
                <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                  {r.name || r.employee_id || "—"}{r.role ? ` · ${r.role}` : ""}
                </div>
                {r.detail && <div className="text-[10px] break-words" style={{ color: "#6b7280" }}>{r.detail}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}