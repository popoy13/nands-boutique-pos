import type { Member, MemberTier } from "./types";

export const TIER_THRESHOLD: Record<MemberTier, number> = {
  bronze: 0,
  silver: 1000000,
  gold: 5000000,
  platinum: 15000000,
};

export const TIER_COLOR: Record<MemberTier, { bg: string; text: string; border: string }> = {
  bronze:   { bg: "#fef3e2", text: "#92400e", border: "#b45309" },
  silver:   { bg: "#f3f4f6", text: "#374151", border: "#6b7280" },
  gold:     { bg: "#fef9c3", text: "#854d0e", border: "#ca8a04" },
  platinum: { bg: "#f5f3ff", text: "#4c1d95", border: "#7c3aed" },
};

export const POINTS_PER_10K = 1;

export const getTier = (totalSpend: number): MemberTier => {
  if (totalSpend >= TIER_THRESHOLD.platinum) return "platinum";
  if (totalSpend >= TIER_THRESHOLD.gold) return "gold";
  if (totalSpend >= TIER_THRESHOLD.silver) return "silver";
  return "bronze";
};

export const generateMemberId = () =>
  `MBR-${Date.now().toString(36).toUpperCase().slice(-6)}`;

export const initialMembers: Member[] = [
  { id: "m1", name: "Sari Indah",      phone: "08111234567", email: "sari.i@gmail.com",   tier: "gold",     points: 520, totalSpend: 6200000,  joinDate: "2023-01-15", storeId: "s1", note: "" },
  { id: "m2", name: "Budi Cahyono",    phone: "08122345678", email: "budi.c@gmail.com",   tier: "silver",   points: 180, totalSpend: 2100000,  joinDate: "2023-05-20", storeId: "s1", note: "" },
  { id: "m3", name: "Dewi Lestari",    phone: "08133456789", email: "dewi.l@gmail.com",   tier: "platinum", points: 1820,totalSpend: 18500000, joinDate: "2022-08-10", storeId: "s2", note: "Pelanggan VIP" },
  { id: "m4", name: "Rizal Fadli",     phone: "08144567890", email: "rizal.f@gmail.com",  tier: "bronze",   points: 45,  totalSpend: 450000,   joinDate: "2024-01-08", storeId: "s2", note: "" },
  { id: "m5", name: "Mega Putri",      phone: "08155678901", email: "mega.p@gmail.com",   tier: "gold",     points: 710, totalSpend: 7800000,  joinDate: "2023-03-22", storeId: "s3", note: "" },
  { id: "m6", name: "Hendra Gunawan",  phone: "08166789012", email: "hendra.g@gmail.com", tier: "silver",   points: 230, totalSpend: 2600000,  joinDate: "2023-09-14", storeId: "s1", note: "" },
];
