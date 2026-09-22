import type { AttendanceRecord, Employee, SalaryConfig, SalaryRecord, Transaction } from "./types";

export const monthOf = (d: Date | string): string => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};

export const currentMonth = (): string => monthOf(new Date());

export const roundIdr = (n: number): number => Math.round(n);

export const attendanceCountFor = (
  attendance: AttendanceRecord[],
  employeeId: string,
  month: string,
): number => {
  const seen = new Set<string>();
  for (const r of attendance) {
    if (r.employeeId !== employeeId) continue;
    const d = String(r.date).slice(0, 10);
    if (d.startsWith(month)) seen.add(d);
  }
  return seen.size;
};

export const salesTotalFor = (
  transactions: Transaction[],
  cashierId: string,
  month: string,
): number => {
  let sum = 0;
  for (const t of transactions) {
    if (t.cashierId !== cashierId) continue;
    const d = String(t.date instanceof Date ? monthOf(t.date) : String(t.date).slice(0, 7));
    if (d === month) sum += t.total || 0;
  }
  return sum;
};

export const configFor = (
  configs: SalaryConfig[],
  employeeId: string,
  fallbackBase?: number,
): SalaryConfig => {
  const found = configs.find(c => c.employeeId === employeeId);
  if (found) return found;
  return {
    employeeId,
    baseSalary: typeof fallbackBase === "number" ? fallbackBase : 0,
    salesTarget: 0,
    bonus: 0,
  };
};

export const computeSalary = (
  cfg: SalaryConfig,
  employee: Employee,
  store: { id: string; name: string } | undefined,
  month: string,
  attendanceCount: number,
  salesTotal: number,
  prev?: SalaryRecord | null,
): SalaryRecord => {
  const gross = roundIdr((cfg.baseSalary / 30) * attendanceCount);
  const bonus = cfg.salesTarget > 0 && salesTotal >= cfg.salesTarget ? cfg.bonus : 0;
  const total = gross + bonus;
  return {
    id: `SL-${employee.id}-${month}`,
    employeeId: employee.id,
    employeeName: employee.name,
    storeId: employee.storeId,
    storeName: store?.name ?? "",
    month,
    baseSalary: cfg.baseSalary,
    attendanceCount,
    gross,
    salesTotal,
    salesTarget: cfg.salesTarget,
    bonus,
    total,
    paid: prev?.paid ?? false,
    paidAt: prev?.paidAt,
  };
};

export const upsertRecords = (
  records: SalaryRecord[],
  next: SalaryRecord[],
): SalaryRecord[] => {
  const map = new Map(records.map(r => [r.id, r]));
  for (const n of next) map.set(n.id, n);
  return [...map.values()];
};