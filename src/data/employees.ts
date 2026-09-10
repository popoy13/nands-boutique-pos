import type { Employee } from "./types";

export const initialEmployees: Employee[] = [
  { id: "e0",  name: "Admin Utama",    role: "admin",   storeId: "s1", phone: "08100000000", email: "admin@nandsboutique.id",  joinDate: "2020-01-01", salary: 15000000, status: "active", pin: "0000" },
  { id: "e1",  name: "Andi Prasetyo",  role: "manager", storeId: "s1", phone: "08123456789", email: "andi.p@nandsboutique.id", joinDate: "2021-03-15", salary: 8500000,  status: "active", pin: "1111" },
  { id: "e1b", name: "Rina Marlina",   role: "manager_operasional", storeId: "s1", phone: "08134567891", email: "rina.m@nandsboutique.id", joinDate: "2021-05-20", salary: 8000000,  status: "active", pin: "1212" },
  { id: "e2",  name: "Budi Santoso",   role: "kasir",   storeId: "s1", phone: "08234567890", email: "budi.s@nandsboutique.id", joinDate: "2022-01-10", salary: 4800000,  status: "active", pin: "2222" },
  { id: "e3",  name: "Citra Dewi",     role: "kasir",   storeId: "s1", phone: "08345678901", email: "citra.d@nandsboutique.id",joinDate: "2022-06-01", salary: 4800000,  status: "active", pin: "3333" },
  { id: "e4",  name: "Dian Rahayu",    role: "staff",   storeId: "s1", phone: "08456789012", email: "dian.r@nandsboutique.id", joinDate: "2023-02-20", salary: 3500000,  status: "active", pin: "4444" },
  { id: "e5",  name: "Eko Wijaya",     role: "manager", storeId: "s2", phone: "08567890123", email: "eko.w@nandsboutique.id",  joinDate: "2021-07-05", salary: 8500000,  status: "active", pin: "5555" },
  { id: "e6",  name: "Fitri Handayani",role: "kasir",   storeId: "s2", phone: "08678901234", email: "fitri.h@nandsboutique.id",joinDate: "2022-09-15", salary: 4800000,  status: "active", pin: "6666" },
  { id: "e7",  name: "Galih Permana",  role: "staff",   storeId: "s2", phone: "08789012345", email: "galih.p@nandsboutique.id",joinDate: "2023-04-01", salary: 3500000,  status: "active", pin: "7777" },
  { id: "e8",  name: "Hana Safitri",   role: "manager", storeId: "s3", phone: "08890123456", email: "hana.s@nandsboutique.id", joinDate: "2022-03-10", salary: 8500000,  status: "active", pin: "8888" },
  { id: "e9",  name: "Ivan Kurniawan", role: "kasir",   storeId: "s3", phone: "08901234567", email: "ivan.k@nandsboutique.id", joinDate: "2023-01-08", salary: 4800000,  status: "active", pin: "9999" },
  { id: "e10", name: "Julia Sari",     role: "staff",   storeId: "s3", phone: "08112345678", email: "julia.s@nandsboutique.id",joinDate: "2023-07-15", salary: 3500000,  status: "inactive", pin: "1010" },
];
