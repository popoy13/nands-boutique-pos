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

export const getAllowedMenus = (role: string, roles?: Record<string, RoleConfig>): string[] =>
  (roles?.[role] ?? DEFAULT_ROLES[role])?.menus ?? [];

export const getRoleLabel = (role: string, roles?: Record<string, RoleConfig>): string =>
  roles?.[role]?.label ?? DEFAULT_ROLES[role]?.label ?? role;

export const getRoleColor = (role: string, roles?: Record<string, RoleConfig>): string =>
  roles?.[role]?.color ?? DEFAULT_ROLES[role]?.color ?? "#7c3aed";

export const MENU_ITEMS: { id: string; label: string }[] = [
  { id: "pos", label: "Kasir" },
  { id: "history", label: "Transaksi" },
  { id: "report", label: "Laporan" },
  { id: "inventory", label: "Inventori" },
  { id: "product", label: "Produk" },
  { id: "employee", label: "Karyawan" },
  { id: "store", label: "Toko" },
  { id: "discount", label: "Diskon" },
  { id: "member", label: "Member" },
  { id: "attendance", label: "Absensi" },
  { id: "settings", label: "Setelan" },
];

export const ACTION_ITEMS: Record<string, string[]> = {
  history: ["delete", "print"],
  product: ["export", "import", "bulk", "category", "add", "edit", "delete"],
  employee: ["import", "export", "add"],
  store: ["add", "edit", "delete"],
  discount: ["add", "edit", "delete"],
  member: ["add", "edit", "delete"],
  attendance: ["delete"],
  settings: ["printer", "attendance", "roles", "barcode", "brand"],
};

export const ACTION_LABELS: Record<string, Record<string, string>> = {
  history: { delete: "Hapus transaksi", print: "Cetak struk" },
  product: {
    export: "Export produk",
    import: "Import produk",
    bulk: "Edit banyak",
    category: "Kelola kategori",
    add: "Tambah produk",
    edit: "Edit produk",
    delete: "Hapus produk",
  },
  employee: { import: "Import karyawan", export: "Export karyawan", add: "Tambah karyawan" },
  store: { add: "Tambah toko", edit: "Edit toko", delete: "Hapus toko" },
  discount: { add: "Tambah diskon", edit: "Edit diskon", delete: "Hapus diskon" },
  member: { add: "Tambah member", edit: "Edit member", delete: "Hapus member" },
  attendance: { delete: "Hapus absensi" },
  settings: {
    printer: "Tab Printer",
    attendance: "Tab Jam Operasional",
    roles: "Tab Role & Menu",
    barcode: "Tab Perangkat Barcode",
    brand: "Tab Menu Utama",
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
    ...allActionsFor(["history", "product", "employee", "settings"]),
    store: [], discount: [], member: [], attendance: [],
    pos: [], report: [], inventory: [],
  },
  manager_operasional: {
    ...allActionsFor(["history", "product", "employee", "settings"]),
    store: [], discount: [], member: [], attendance: [],
    pos: [], report: [], inventory: [],
  },
  kasir: {
    history: ["print"], attendance: [],
    store: [], discount: [], member: [], settings: [], product: [], employee: [], pos: [], report: [], inventory: [],
  },
  staff: {
    attendance: [],
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
    out[k] = { ...v, permissions: v.permissions ?? DEFAULT_ROLES[k]?.permissions ?? {} };
  }
  return out;
};

export const hasAction = (role: string, roles?: Record<string, RoleConfig>, menu?: string, action?: string): boolean => {
  const perms = roles?.[role]?.permissions;
  if (!perms) return true;
  const acts = menu ? perms[menu] : undefined;
  if (!acts) return true;
  return !action || acts.includes(action);
};

export const slugifyRoleKey = (label: string): string =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);