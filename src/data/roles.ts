import { ROLE_PERMISSIONS } from "./types";
import type { UserRole } from "./types";

export interface RoleConfig {
  label: string;
  color: string;
  menus: string[];
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

export const DEFAULT_ROLES: Record<string, RoleConfig> = (Object.keys(ROLE_PERMISSIONS) as UserRole[]).reduce(
  (acc, key) => {
    acc[key] = { label: BUILTIN_LABELS[key], color: BUILTIN_COLORS[key], menus: [...ROLE_PERMISSIONS[key]] };
    return acc;
  },
  {} as Record<string, RoleConfig>
);

export const isBuiltinRole = (role: string) => role in DEFAULT_ROLES;

export const ensureRoles = (roles?: Record<string, RoleConfig>): Record<string, RoleConfig> => ({
  ...DEFAULT_ROLES,
  ...(roles ?? {}),
});

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

export const slugifyRoleKey = (label: string): string =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);