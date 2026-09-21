import { ROLE_PERMISSIONS } from "./types";
import type { UserRole } from "./types";

export interface RoleConfig {
  label: string;
  color: string;
  menus: string[];
  permissions?: Record<string, string[]>;
}

const BUILTIN_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager Toko",
  manager_operasional: "Manager Operasional",
  kasir: "Kasir",
  staff: "Staff",
};

const BUILTIN_COLORS: Record<string, string> = {
  admin: "#7c3aed",
  manager: "#2563eb",
  manager_operasional: "#0d9488",
  kasir: "#7c3aed",
  staff: "#16a34a",
};

export const getAllowedMenus = (role: string, roles?: Record<string, RoleConfig>): string[] => {
  const menus = [...((roles?.[role] ?? DEFAULT_ROLES[role])?.menus ?? [])];
  if (role in DEFAULT_ROLES && !menus.includes("chat")) menus.push("chat");
  // Migrasi: role yang punya akses Transaksi otomatis mendapat menu Pengeluaran.
  if (menus.includes("history") && !menus.includes("expense")) menus.push("expense");
  // Migrasi: role yang punya menu Pengeluaran otomatis mendapat menu Setor Tunai.
  if (menus.includes("expense") && !menus.includes("deposit")) menus.push("deposit");
  // Migrasi: role yang punya akses Absensi otomatis mendapat menu Riwayat Absensi.
  if (menus.includes("attendance") && !menus.includes("attendanceHistory")) menus.push("attendanceHistory");
  return menus;
};

export const getRoleLabel = (role: string, roles?: Record<string, RoleConfig>): string =>
  roles?.[role]?.label ?? DEFAULT_ROLES[role]?.label ?? role;

export const getRoleColor = (role: string, roles?: Record<string, RoleConfig>): string =>
  roles?.[role]?.color ?? DEFAULT_ROLES[role]?.color ?? "#7c3aed";

export const MENU_ITEMS: { id: string; label: string }[] = [
  { id: "pos", label: "Kasir" },
  { id: "history", label: "Transaksi" },
  { id: "chat", label: "Chat Karyawan" },
  { id: "expense", label: "Pengeluaran" },
  { id: "deposit", label: "Setor Tunai" },
  { id: "report", label: "Laporan" },
  { id: "inventory", label: "Inventori" },
  { id: "product", label: "Produk" },
  { id: "employee", label: "Karyawan" },
  { id: "store", label: "Toko" },
  { id: "discount", label: "Diskon" },
  { id: "member", label: "Member" },
  { id: "attendance", label: "Absensi" },
  { id: "attendanceHistory", label: "Riwayat Absensi" },
  { id: "settings", label: "Setelan" },
];

export const ACTION_ITEMS: Record<string, string[]> = {
  history: ["delete", "print"],
  chat: ["delete_all"],
  expense: ["add", "edit", "delete"],
  deposit: ["add", "edit", "delete", "bank"],
  product: ["export", "import", "bulk", "category", "size", "add", "edit", "delete"],
  employee: ["import", "export", "add"],
  store: ["add", "edit", "delete"],
  discount: ["add", "edit", "delete"],
  member: ["add", "edit", "delete"],
  attendance: ["view_all", "delete"],
  attendanceHistory: ["view_all", "delete"],
  settings: ["printer", "attendance", "roles", "barcode", "brand", "pembayaran"],
};

export const ACTION_LABELS: Record<string, Record<string, string>> = {
  history: { delete: "Hapus transaksi", print: "Cetak struk" },
  chat: { delete_all: "Hapus semua data chat" },
  expense: { add: "Tambah pengeluaran", edit: "Edit pengeluaran", delete: "Hapus pengeluaran" },
  deposit: { add: "Catat setor tunai", edit: "Edit setor tunai", delete: "Hapus setor tunai", bank: "Kelola daftar bank" },
  product: {
    export: "Export produk",
    import: "Import produk",
    bulk: "Edit banyak",
    category: "Kelola kategori",
    size: "Kelola ukuran",
    add: "Tambah produk",
    edit: "Edit produk",
    delete: "Hapus produk",
  },
  employee: { import: "Import karyawan", export: "Export karyawan", add: "Tambah karyawan" },
  store: { add: "Tambah toko", edit: "Edit toko", delete: "Hapus toko" },
  discount: { add: "Tambah diskon", edit: "Edit diskon", delete: "Hapus diskon" },
  member: { add: "Tambah member", edit: "Edit member", delete: "Hapus member" },
  attendance: { view_all: "Lihat riwayat semua karyawan", delete: "Hapus absensi" },
  attendanceHistory: { view_all: "Lihat riwayat semua karyawan", delete: "Hapus absensi" },
  settings: {
    printer: "Tab Printer",
    attendance: "Tab Jam Operasional",
    roles: "Tab Role & Menu",
    barcode: "Tab Perangkat Barcode",
    brand: "Tab Menu Utama",
    pembayaran: "Tab Pembayaran",
  },
};

const allActionsFor = (menus: string[]): Record<string, string[]> => {
  const p: Record<string, string[]> = {};
  for (const m of menus) p[m] = [...(ACTION_ITEMS[m] ?? [])];
  return p;
};

export const defaultPermissionsForMenus = (menus: string[]): Record<string, string[]> => allActionsFor(menus);

const ROLE_DEFAULT_PERMISSIONS: Record<string, Record<string, string[]>> = {
  admin: allActionsFor(MENU_ITEMS.map(m => m.id)),
  manager: {
    ...allActionsFor(["history", "product", "employee", "settings", "expense", "deposit"]),
    store: [], discount: [], member: [], attendance: ["view_all"], attendanceHistory: ["view_all"],
    pos: [], report: [], inventory: [],
  },
  manager_operasional: {
    ...allActionsFor(["history", "product", "employee", "settings", "expense", "deposit"]),
    store: [], discount: [], member: [], attendance: ["view_all"], attendanceHistory: ["view_all"],
    pos: [], report: [], inventory: [],
  },
  kasir: {
    history: ["print"], attendance: [], attendanceHistory: [],
    store: [], discount: [], member: [], settings: [], product: [], employee: [], pos: [], report: [], inventory: [],
  },
  staff: {
    attendance: [], attendanceHistory: [],
    history: [], store: [], discount: [], member: [], settings: [], product: [], employee: [], pos: [], report: [], inventory: [],
  },
};

export const DEFAULT_ROLES: Record<string, RoleConfig> = (Object.keys(ROLE_PERMISSIONS) as UserRole[]).reduce(
  (acc, key) => {
    acc[key] = {
      label: BUILTIN_LABELS[key],
      color: BUILTIN_COLORS[key],
      menus: [...ROLE_PERMISSIONS[key]],
      permissions: ROLE_DEFAULT_PERMISSIONS[key] ?? {},
    };
    return acc;
  },
  {} as Record<string, RoleConfig>
);

export const isBuiltinRole = (role: string) => role in DEFAULT_ROLES;

export const ensureRoles = (roles?: Record<string, RoleConfig>): Record<string, RoleConfig> => {
  const out: Record<string, RoleConfig> = {};
  for (const key of Object.keys(DEFAULT_ROLES)) {
    out[key] = { ...DEFAULT_ROLES[key], permissions: { ...DEFAULT_ROLES[key].permissions } };
  }
  for (const [k, v] of Object.entries(roles ?? {})) {
    let perms: Record<string, string[]> = { ...(v.permissions ?? {}) };
    const menus = k in DEFAULT_ROLES && DEFAULT_ROLES[k].menus.includes("chat")
      ? [...new Set([...(v.menus ?? []), "chat"])]
      : v.menus;
    // Migrasi: role bawaan yang seharusnya bisa melihat absensi semua karyawan
    // tetap mendapat aksi ini meski tersimpan di DB sebelum aksi tersebut ada.
    if (k in DEFAULT_ROLES && DEFAULT_ROLES[k].permissions?.attendance?.includes("view_all")) {
      perms.attendance = [...new Set([...(perms.attendance ?? []), "view_all"])];
    }
    // Migrasi: role yang punya akses Setelan otomatis mendapat tab setelan baru
    // (mis. Pembayaran) meski tersimpan di DB sebelum aksi tersebut ada.
    if (Array.isArray(perms.settings) && perms.settings.length > 0) {
      perms.settings = [...new Set([...perms.settings, ...(ACTION_ITEMS.settings ?? [])])];
    }
    // Migrasi: role yang punya aksi pengeluaran (add/delete) otomatis
    // mendapat aksi edit pengeluaran walau tersimpan sebelum aksi ini ada.
    if (Array.isArray(perms.expense) && perms.expense.length > 0) {
      perms.expense = [...new Set([...perms.expense, "edit"])];
    }
    // Migrasi: role yang punya aksi setor tunai (add/delete) otomatis
    // mendapat aksi edit setor tunai walau tersimpan sebelum aksi ini ada.
    if (Array.isArray(perms.deposit) && perms.deposit.length > 0) {
      perms.deposit = [...new Set([...perms.deposit, "edit"])];
    }
    // Migrasi: role bawaan (mis. admin/manager) yang tersimpan sebelum menu Setor
    // Tunai ada otomatis mendapat aksi default setor tunai bila menunya tersedia.
    if (k in DEFAULT_ROLES && (DEFAULT_ROLES[k].permissions?.deposit?.length ?? 0) > 0) {
      perms.deposit = [...new Set([...(perms.deposit ?? []), ...(DEFAULT_ROLES[k].permissions?.deposit ?? [])])];
    }
    // Migrasi: role yang punya aksi kelola kategori produk otomatis mendapat
    // aksi kelola ukuran walau tersimpan sebelum aksi ini ada.
    if (Array.isArray(perms.product) && perms.product.includes("category")) {
      perms.product = [...new Set([...perms.product, "size"])];
    }
    // Penghapusan seluruh chat adalah hak khusus Admin dan tidak boleh
    // terbawa dari konfigurasi role yang tersimpan sebelumnya.
    if (k === "admin") {
      perms.chat = [...new Set([...(perms.chat ?? []), "delete_all"])];
    } else {
      perms.chat = (perms.chat ?? []).filter(action => action !== "delete_all");
    }
    // Role kustom: pastikan tiap menu yang diizinkan punya daftar aksi (deny-by-default
    // di hasAction, tapi menu yang sengaja diaktifkan tetap berfungsi penuh).
    if (!(k in DEFAULT_ROLES) && Array.isArray(v.menus)) {
      perms = { ...defaultPermissionsForMenus(v.menus), ...perms };
    }
    out[k] = { ...v, menus, permissions: perms };
  }
  return out;
};

export const hasAction = (role: string, roles?: Record<string, RoleConfig>, menu?: string, action?: string): boolean => {
  const perms = roles?.[role]?.permissions;
  if (!perms || !menu) return false;
  const acts = perms[menu];
  if (!acts) return false;
  return !action || acts.includes(action);
};

export const slugifyRoleKey = (label: string): string =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);