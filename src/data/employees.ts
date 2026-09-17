import type { Employee } from "./types";

// PIN bawaan sudah di-hash (PBKDF2-SHA256, 600000 iterasi, salt unik).
// PIN asli untuk login awal: e0=0000, e1=1111, e1b=1212, e2=2222, e3=3333,
// e4=4444, e5=5555, e6=6666, e7=7777, e8=8888, e9=9999, e10=1010.
// Segera ganti PIN setelah instalasi.
export const initialEmployees: Employee[] = [
  { id: "e0",  name: "Admin Utama",    role: "admin",   storeId: "s1", phone: "08100000000", email: "admin@nandsboutique.id",  joinDate: "2020-01-01", salary: 15000000, status: "active", pin: "pbkdf2$96965c578d099000$600000$861dc37b1505d7a40ac4e8ce913c0e857ea404637afbf206f1d0f95dd27da7e7" },
  { id: "e1",  name: "Andi Prasetyo",  role: "manager", storeId: "s1", phone: "08123456789", email: "andi.p@nandsboutique.id", joinDate: "2021-03-15", salary: 8500000,  status: "active", pin: "pbkdf2$9014e90374496000$600000$38d9da8c43a8f3d910e706e860d8e88a87cd254f9b3b4543d74a9ce2b9898a0f" },
  { id: "e1b", name: "Rina Marlina",   role: "manager_operasional", storeId: "s1", phone: "08134567891", email: "rina.m@nandsboutique.id", joinDate: "2021-05-20", salary: 8000000,  status: "active", pin: "pbkdf2$87674703cbe26000$600000$e734612e80b8e4861c8f8c76d5f6d8db0c8eb9c2b55716308e33eb9270f59145" },
  { id: "e2",  name: "Budi Santoso",   role: "kasir",   storeId: "s1", phone: "08234567890", email: "budi.s@nandsboutique.id", joinDate: "2022-01-10", salary: 4800000,  status: "active", pin: "pbkdf2$7d587ed457b69800$600000$a7fb9af5ea0bc1ac61123c61c8a9fb7c6db3e75a898b17be64d7da17c7859667" },
  { id: "e3",  name: "Citra Dewi",     role: "kasir",   storeId: "s1", phone: "08345678901", email: "citra.d@nandsboutique.id",joinDate: "2022-06-01", salary: 4800000,  status: "active", pin: "pbkdf2$ae8dd4a96520f800$600000$a4364e0040792a84f5669071b0251353376729ad5454ad78a0cc00dfcec7c0b5" },
  { id: "e4",  name: "Dian Rahayu",    role: "staff",   storeId: "s1", phone: "08456789012", email: "dian.r@nandsboutique.id", joinDate: "2023-02-20", salary: 3500000,  status: "active", pin: "pbkdf2$500b1d07bdbd7000$600000$5f6cf3d20de1bd779fb81951b9a1d5e3fbc1825b105d8231b1732a53d0643112" },
  { id: "e5",  name: "Eko Wijaya",     role: "manager", storeId: "s2", phone: "08567890123", email: "eko.w@nandsboutique.id",  joinDate: "2021-07-05", salary: 8500000,  status: "active", pin: "pbkdf2$00f965fcffa60800$600000$659855d998aa160b474f79aae74150a8daa101d17a4a99545e0dcf4038bc138a" },
  { id: "e6",  name: "Fitri Handayani",role: "kasir",   storeId: "s2", phone: "08678901234", email: "fitri.h@nandsboutique.id",joinDate: "2022-09-15", salary: 4800000,  status: "active", pin: "pbkdf2$dbce511678032800$600000$85b1101db7de3f6f35c0f5330aee75150c33d69d75c92806f483c0498a825bf7" },
  { id: "e7",  name: "Galih Permana",  role: "staff",   storeId: "s2", phone: "08789012345", email: "galih.p@nandsboutique.id",joinDate: "2023-04-01", salary: 3500000,  status: "active", pin: "pbkdf2$da07900261928800$600000$011f02eda9ed3a4f11e773a2c5df8a59d7ec79202edb6bc9f1e34d81481571f6" },
  { id: "e8",  name: "Hana Safitri",   role: "manager", storeId: "s3", phone: "08890123456", email: "hana.s@nandsboutique.id", joinDate: "2022-03-10", salary: 8500000,  status: "active", pin: "pbkdf2$450bca8984169800$600000$9177e2090daec83f5912a0abde76c92778536eef4c863243a07a36e4787a5365" },
  { id: "e9",  name: "Ivan Kurniawan", role: "kasir",   storeId: "s3", phone: "08901234567", email: "ivan.k@nandsboutique.id", joinDate: "2023-01-08", salary: 4800000,  status: "active", pin: "pbkdf2$295f696ca6f8e000$600000$6dc147da1a02178d5b60d2e6c74f72f178863eb48d760e622561546eae2a94bf" },
  { id: "e10", name: "Julia Sari",     role: "staff",   storeId: "s3", phone: "08112345678", email: "julia.s@nandsboutique.id",joinDate: "2023-07-15", salary: 3500000,  status: "inactive", pin: "pbkdf2$20003e98a956b800$600000$dc1d00f004423cca544a335d1e6342e03ab58eac9b0bd2b66574947287bcce34" },
];
