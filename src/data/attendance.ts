import type { AttendanceRecord } from "./types";

const today = new Date();
const d = (offset: number) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() - offset);
  return dt.toISOString().slice(0, 10);
};

export const seedAttendance: AttendanceRecord[] = [
  { id: "a1",  employeeId: "e1",  employeeName: "Andi Prasetyo",  role: "manager", storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman", date: d(0), clockIn: "08:02:11", clockOut: "17:03:45" },
  { id: "a2",  employeeId: "e1b", employeeName: "Rina Marlina",   role: "manager_operasional", storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman", date: d(0), clockIn: "07:58:30", clockOut: "16:59:12" },
  { id: "a3",  employeeId: "e2",  employeeName: "Budi Santoso",   role: "kasir", storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman", date: d(0), clockIn: "07:55:02", clockOut: "17:00:44" },
  { id: "a4",  employeeId: "e3",  employeeName: "Citra Dewi",     role: "kasir", storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman", date: d(0), clockIn: "08:12:47", clockOut: "16:30:21" },
  { id: "a5",  employeeId: "e4",  employeeName: "Dian Rahayu",    role: "staff", storeId: "s1", storeName: "NAND'S BOUTIQUE - Sudirman", date: d(1), clockIn: "08:05:09", clockOut: "17:15:33" },
  { id: "a6",  employeeId: "e5",  employeeName: "Eko Wijaya",     role: "manager", storeId: "s2", storeName: "NAND'S BOUTIQUE - Kemang", date: d(1), clockIn: "08:00:52", clockOut: "17:10:18" },
  { id: "a7",  employeeId: "e6",  employeeName: "Fitri Handayani",role: "kasir", storeId: "s2", storeName: "NAND'S BOUTIQUE - Kemang", date: d(1), clockIn: "07:58:14", clockOut: "16:55:07" },
  { id: "a8",  employeeId: "e8",  employeeName: "Hana Safitri",   role: "manager", storeId: "s3", storeName: "NAND'S BOUTIQUE - BSD City", date: d(2), clockIn: "08:20:03", clockOut: "17:05:29" },
  { id: "a9",  employeeId: "e9",  employeeName: "Ivan Kurniawan", role: "kasir", storeId: "s3", storeName: "NAND'S BOUTIQUE - BSD City", date: d(2), clockIn: "08:01:37", clockOut: "16:40:55" },
  { id: "a10", employeeId: "e7",  employeeName: "Galih Permana",  role: "staff", storeId: "s2", storeName: "NAND'S BOUTIQUE - Kemang", date: d(2), clockIn: "08:11:26", clockOut: "17:20:41" },
];