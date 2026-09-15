const pptxgen = require("pptxgenjs");
const path = require("path");

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 inch

// Color palette
const C = {
  purple: "7C3AED",
  dark: "0D0F14",
  white: "FFFFFF",
  gray: "6B7280",
  lightGray: "F0F2F5",
  card: "FFFFFF",
  border: "E5E7EB",
  green: "16A34A",
  blue: "2563EB",
  orange: "EA580C",
  red: "EF4444",
};

const tint = (hex) => ({"7C3AED":"F5F3FF","3B82F6":"EFF6FF","16A34A":"F0FDF4","EA580C":"FFF7ED","2563EB":"EFF6FF"}[hex] || hex);

const addPageNumber = (slide) => {
  slide.addText("", { x: 12.5, y: 7.0, w: 0.5, fontSize: 9, color: C.gray, align: "right", slideNumber: true });
};

// =============================================
// SLIDE 1 - Cover
// =============================================
let s = pptx.addSlide();
s.background = { color: C.dark };
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.5, w: 12.33, h: 6.5, fill: { color: C.dark }, rectRadius: 0.3, line: { color: C.purple, width: 2 } });
s.addText("LAPORAN TUGAS AKHIR", { x: 1.5, y: 1.2, w: 10, align: "center", fontSize: 14, fontFace: "Arial", color: C.purple, bold: true, letterSpacing: 4 });
s.addShape(pptx.shapes.LINE, { x: 4, y: 1.85, w: 5, line: { color: C.purple, width: 1.5 } });
s.addText("Rancang Bangun Aplikasi\nPoint of Sale (POS) Berbasis Web dan Mobile\nuntuk Usaha Retail Fashion", {
  x: 1.5, y: 2.2, w: 10, h: 2, align: "center", fontSize: 26, fontFace: "Arial", color: C.white, bold: true, lineSpacingMultiple: 1.3, valign: "middle",
});
s.addShape(pptx.shapes.LINE, { x: 4, y: 4.5, w: 5, line: { color: C.gray, width: 0.5 } });
s.addText("Program Studi Teknik Informatika\nFakultas Ilmu Komputer dan Teknologi Informasi\nUniversitas XYZ\n2026", {
  x: 1.5, y: 4.8, w: 10, h: 1.8, align: "center", fontSize: 12, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.6,
});

// =============================================
// SLIDE 2 - Daftar Isi
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("DAFTAR ISI", { x: 0.8, y: 0.4, w: 5, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

const tocItems = [
  "1. Latar Belakang",
  "2. Rumusan Masalah & Tujuan",
  "3. Tinjauan Pustaka",
  "4. Arsitektur & Desain Sistem",
  "5. Fitur Utama Aplikasi",
  "6. Sistem Otorisasi (RBAC)",
  "7. Implementasi & Hasil",
  "8. Pengujian & UAT",
  "9. Kesimpulan & Saran",
];

tocItems.forEach((item, i) => {
  const y = 1.4 + i * 0.6;
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y, w: 0.5, h: 0.45, fill: { color: C.purple }, rectRadius: 0.1 });
  s.addText(String(i + 1), { x: 0.8, y, w: 0.5, h: 0.45, align: "center", fontSize: 14, fontFace: "Arial", color: C.white, bold: true, valign: "middle" });
  s.addText(item, { x: 1.5, y, w: 8, h: 0.45, fontSize: 15, fontFace: "Arial", color: C.dark, valign: "middle" });
});
addPageNumber(s);

// =============================================
// SLIDE 3 - Latar Belakang
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("LATAR BELAKANG", { x: 0.8, y: 0.4, w: 8, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

s.addText([
  { text: "Permasalahan Bisnis Retail Fashion:\n", options: { fontSize: 14, bold: true, color: C.dark } },
  { text: "â€¢ Pencatatan transaksi manual rentan kesalahan\n", options: { fontSize: 12, color: C.gray } },
  { text: "â€¢ Manajemen inventaris multi-varian (ukuran & warna) kompleks\n", options: { fontSize: 12, color: C.gray } },
  { text: "â€¢ Ketidakakuratan stok â†’ over-selling / under-selling\n", options: { fontSize: 12, color: C.gray } },
  { text: "â€¢ Pengelolaan karyawan & absensi tidak terstruktur\n", options: { fontSize: 12, color: C.gray } },
  { text: "â€¢ Minimnya data analitik untuk pengambilan keputusan\n\n", options: { fontSize: 12, color: C.gray } },
  { text: "Solusi POS komersial:\n", options: { fontSize: 14, bold: true, color: C.dark } },
  { text: "â€¢ Biaya langganan tinggi\nâ€¢ Kurang fleksibel untuk kebutuhan lokal\nâ€¢ Tidak sesuai alur kerja toko fashion", options: { fontSize: 12, color: C.gray } },
], { x: 0.8, y: 1.3, w: 11, h: 5.5, valign: "top", lineSpacingMultiple: 1.5, fontFace: "Arial" });

// Stat boxes
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 8.5, y: 4.5, w: 3.8, h: 1.2, fill: { color: "F5F3FF" }, rectRadius: 0.15, line: { color: "C4B5FD", width: 1 } });
s.addText([
  { text: "8-10%\n", options: { fontSize: 28, bold: true, color: C.purple, align: "center" } },
  { text: "Pertumbuhan/tahun sektor retail fashion Indonesia", options: { fontSize: 10, color: C.gray, align: "center" } },
], { x: 8.5, y: 4.5, w: 3.8, h: 1.2, align: "center", valign: "middle", fontFace: "Arial" });
addPageNumber(s);

// =============================================
// SLIDE 4 - Rumusan Masalah & Tujuan
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("RUMUSAN MASALAH & TUJUAN", { x: 0.8, y: 0.4, w: 10, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

// Rumusan Masalah
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 1.4, w: 5.6, h: 5, fill: { color: C.lightGray }, rectRadius: 0.2 });
s.addText("RUMUSAN MASALAH", { x: 1.0, y: 1.5, w: 5, fontSize: 13, fontFace: "Arial", color: C.purple, bold: true });
s.addText([
  { text: "1. ", options: { bold: true, color: C.purple } },
  { text: "Bagaimana merancang aplikasi POS komprehensif untuk retail fashion?\n\n", options: { color: C.gray } },
  { text: "2. ", options: { bold: true, color: C.purple } },
  { text: "Bagaimana mengimplementasikan RBAC dengan granularitas action-level?\n\n", options: { color: C.gray } },
  { text: "3. ", options: { bold: true, color: C.purple } },
  { text: "Seberapa efektif aplikasi berdasarkan UAT?", options: { color: C.gray } },
], { x: 1.0, y: 2.1, w: 5, h: 4, fontSize: 12, fontFace: "Arial", lineSpacingMultiple: 1.5, valign: "top" });

// Tujuan
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 6.8, y: 1.4, w: 5.6, h: 5, fill: { color: "F5F3FF" }, rectRadius: 0.2 });
s.addText("TUJUAN", { x: 7.0, y: 1.5, w: 5, fontSize: 13, fontFace: "Arial", color: C.purple, bold: true });
s.addText([
  { text: "1. ", options: { bold: true, color: C.purple } },
  { text: "Merancang aplikasi POS web & mobile yang komprehensif\n\n", options: { color: C.gray } },
  { text: "2. ", options: { bold: true, color: C.purple } },
  { text: "Mengimplementasikan RBAC action-level yang fleksibel & aman\n\n", options: { color: C.gray } },
  { text: "3. ", options: { bold: true, color: C.purple } },
  { text: "Menguji efektivitas melalui black-box testing & UAT", options: { color: C.gray } },
], { x: 7.0, y: 2.1, w: 5, h: 4, fontSize: 12, fontFace: "Arial", lineSpacingMultiple: 1.5, valign: "top" });
addPageNumber(s);

// =============================================
// SLIDE 5 - Tinjauan Pustaka
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("TINJAUAN PUSTAKA", { x: 0.8, y: 0.4, w: 8, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

const techCards = [
  { title: "React.js 19", desc: "Library UI berbasis komponen dengan Virtual DOM & Server Components", color: "61DAFB", icon: "R" },
  { title: "TypeScript 5.7", desc: "JavaScript dengan tipe statis untuk kode yang lebih aman & maintainable", color: "3178C6", icon: "TS" },
  { title: "Tailwind CSS 4", desc: "Framework CSS utility-first untuk desain responsif yang cepat", color: "06B6D4", icon: "T" },
  { title: "Capacitor 6", desc: "Cross-platform runtime: satu codebase â†’ Web + Android APK", color: "119EFF", icon: "C" },
  { title: "Vite 8", desc: "Build tool modern dengan HMR instan & optimasi bundling", color: "646CFF", icon: "V" },
  { title: "RBAC", desc: "Model otorisasi berbasis peran dengan action-level permissions", color: C.purple, icon: "ðŸ”" },
];

techCards.forEach((card, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 0.8 + col * 4;
  const y = 1.4 + row * 2.8;
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: 3.7, h: 2.4, fill: { color: C.white }, rectRadius: 0.15, shadow: { type: "outer", blur: 4, offset: 2, color: "C0C0C0" }, line: { color: C.border, width: 1 } });
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, fill: { color: card.color }, rectRadius: 0.1 });
  s.addText(card.icon, { x: x + 0.2, y: y + 0.2, w: 0.6, h: 0.6, align: "center", valign: "middle", fontSize: 14, fontFace: "Arial", color: C.white, bold: true });
  s.addText(card.title, { x: x + 1.0, y: y + 0.25, w: 2.5, h: 0.5, fontSize: 14, fontFace: "Arial", color: C.dark, bold: true, valign: "middle" });
  s.addText(card.desc, { x: x + 0.2, y: y + 1.0, w: 3.3, h: 1.2, fontSize: 11, fontFace: "Arial", color: C.gray, valign: "top", lineSpacingMultiple: 1.4 });
});
addPageNumber(s);

// =============================================
// SLIDE 6 - Arsitektur Sistem
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("ARSITEKTUR SISTEM", { x: 0.8, y: 0.4, w: 8, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

const layers = [
  { label: "PRESENTATION LAYER", sub: "React.js + Tailwind CSS + Capacitor", color: "3B82F6", y: 1.5 },
  { label: "STATE MANAGEMENT", sub: "React useState / useRef", color: "8B5CF6", y: 2.7 },
  { label: "BUSINESS LOGIC", sub: "RBAC Engine, POS Engine, Inventory Manager", color: "7C3AED", y: 3.9 },
  { label: "DATA LAYER", sub: "localStorage / IndexedDB", color: "A855F7", y: 5.1 },
  { label: "PLATFORM LAYER", sub: "Capacitor Bridge â†’ Android / Web Browser", color: "6D28D9", y: 6.3 },
];

layers.forEach((l) => {
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 1.5, y: l.y, w: 10, h: 0.9, fill: { color: l.color }, rectRadius: 0.12 });
  s.addText(l.label, { x: 1.7, y: l.y, w: 5, h: 0.9, fontSize: 13, fontFace: "Arial", color: C.white, bold: true, valign: "middle" });
  s.addText(l.sub, { x: 5, y: l.y, w: 6.3, h: 0.9, fontSize: 11, fontFace: "Arial", color: "E5E7EB", valign: "middle", align: "right" });
});

// Arrows
[2.5, 3.7, 4.9, 6.1].forEach((y) => {
  s.addShape(pptx.shapes.DOWN_ARROW, { x: 6.3, y, w: 0.4, h: 0.25, fill: { color: "9CA3AF" } });
});

// Side note
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 1.3, w: 0.8, h: 6.1, fill: { color: "F5F3FF" }, rectRadius: 0.15 });
s.addText("DATA FLOW", { x: 0.5, y: 3.5, w: 0.8, h: 1.5, fontSize: 9, fontFace: "Arial", color: C.purple, bold: true, align: "center", valign: "middle", rotate: 270 });
addPageNumber(s);

// =============================================
// SLIDE 7 - Fitur Utama
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("FITUR UTAMA APLIKASI", { x: 0.8, y: 0.4, w: 10, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

const features = [
  { icon: "ðŸ›’", title: "Point of Sale", desc: "Kasir, keranjang, barcode\nscanner, multi-pembayaran,\ncetak struk" },
  { icon: "ðŸ“¦", title: "Produk Multi-Varian", desc: "Ukuran & warna, SKU unik,\nbulk edit, import/export\nExcel" },
  { icon: "ðŸ“Š", title: "Laporan Analitik", desc: "Dashboard harian, grafik\npenjualan, produk terlaris,\nperforma toko" },
  { icon: "ðŸ‘¥", title: "Manajemen Karyawan", desc: "CRUD, foto profil,\nimport/export, level akses" },
  { icon: "ðŸ“…", title: "Absensi Digital", desc: "Clock in/out, timeline,\njam kerja per toko,\nvalidasi lokasi" },
  { icon: "ðŸ·ï¸", title: "Diskon & Member", desc: "Promo dinamis, level member\n(Silver/Gold/Platinum),\npoint & reward" },
  { icon: "ðŸª", title: "Multi-Toko", desc: "Stok per toko, transaksi\nper lokasi, jam operasional" },
  { icon: "ðŸ”", title: "RBAC Granular", desc: "Akses per menu & per\naksi, 4 level: Admin â†’\nManager â†’ Kasir â†’ Staff" },
];

features.forEach((f, i) => {
  const col = i % 4;
  const row = Math.floor(i / 4);
  const x = 0.6 + col * 3.1;
  const y = 1.4 + row * 2.9;
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y, w: 2.9, h: 2.6, fill: { color: C.lightGray }, rectRadius: 0.15 });
  s.addText(f.icon, { x, y: y + 0.15, w: 2.9, h: 0.6, align: "center", fontSize: 28 });
  s.addText(f.title, { x, y: y + 0.8, w: 2.9, h: 0.5, align: "center", fontSize: 12, fontFace: "Arial", color: C.dark, bold: true });
  s.addText(f.desc, { x: x + 0.2, y: y + 1.3, w: 2.5, h: 1.1, align: "center", fontSize: 9.5, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.3 });
});
addPageNumber(s);

// =============================================
// SLIDE 8 - RBAC Detail
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("SISTEM OTORISASI (RBAC)", { x: 0.8, y: 0.4, w: 10, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

// RBAC levels
s.addText("Two-Level Permission Model:", { x: 0.8, y: 1.3, w: 10, fontSize: 13, fontFace: "Arial", color: C.dark, bold: true });

const rbacCards = [
  { title: "Level 1: MENU ACCESS", desc: "Menentukan menu mana yang\nterlihat & dapat diakses\nper role", color: "3B82F6" },
  { title: "Level 2: ACTION ACCESS", desc: "Menentukan aksi spesifik\ndalam menu (hapus, cetak,\nexport, import, dll)", color: C.purple },
];

rbacCards.forEach((c, i) => {
  const x = 0.8 + i * 6.2;
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 1.8, w: 5.8, h: 1.5, fill: { color: tint(c.color) }, rectRadius: 0.15, line: { color: tint(c.color), width: 1 } });
  s.addText(c.title, { x: x + 0.3, y: 1.9, w: 5, h: 0.5, fontSize: 13, fontFace: "Arial", color: c.color, bold: true });
  s.addText(c.desc, { x: x + 0.3, y: 2.4, w: 5, h: 0.8, fontSize: 11, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.4 });
});

// Role table
s.addText("Role Defaults:", { x: 0.8, y: 3.6, w: 5, fontSize: 13, fontFace: "Arial", color: C.dark, bold: true });

const rows = [
  [{ text: "Role", options: { bold: true, color: C.white } }, { text: "Menu Access", options: { bold: true, color: C.white } }, { text: "Action Permissions", options: { bold: true, color: C.white } }],
  [{ text: "Admin", options: { bold: true } }, { text: "Semua menu (11 menu)" }, { text: "Semua aksi" }],
  [{ text: "Manager", options: { bold: true } }, { text: "Produk, Inventori, Transaksi, Laporan, dll" }, { text: "Full akses di menu inti, batas di Pengaturan" }],
  [{ text: "Kasir", options: { bold: true } }, { text: "POS, Riwayat (cetak)" }, { text: "history: print only" }],
  [{ text: "Staff", options: { bold: true } }, { text: "POS, Absensi" }, { text: "attendance: delete only" }],
];

s.addTable(rows, {
  x: 0.8, y: 4.0, w: 11.5,
  fontSize: 10, fontFace: "Arial",
  border: { pt: 0.5, color: C.border },
  colW: [1.5, 5, 5],
  autoPage: false,
  rowH: 0.4,
  fill: { color: C.white },
});
// Header row styling (first row bg)
rows[0].forEach(() => {});

s.addText('â€¢ Fungsi hasAction() bersifat lenient: jika izin tidak didefinisikan, aksi diizinkan (backward-compatible)', { x: 0.8, y: 6.2, w: 11, fontSize: 10, fontFace: "Arial", color: C.gray });
s.addText('â€¢ Admin settings actions dikunci (Wajib) untuk mencegah self-lockout', { x: 0.8, y: 6.5, w: 11, fontSize: 10, fontFace: "Arial", color: C.gray });
addPageNumber(s);

// =============================================
// SLIDE 9 - Responsive Design
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("RESPONSIVE DESIGN", { x: 0.8, y: 0.4, w: 8, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

const bpCards = [
  { title: "MOBILE", sub: "< 768px", items: "Bottom navigation bar\nHeader mobile + store picker\nStacked content\nFull-width cart", color: "3B82F6", w: 3, device: "ðŸ“±" },
  { title: "TABLET", sub: "768px â€“ 1023px", items: "Sidebar kiri (228px)\nNavigasi vertikal\nKonten full-width\nDetail view stacked", color: C.purple, w: 3.5, device: "ðŸ“Ÿ" },
  { title: "DESKTOP", sub: "â‰¥ 1024px", items: "Sidebar + 2-kolom layout\nSplit view (list + detail)\nFull keyboard support\nMulti-tab mode", color: C.green, w: 3.5, device: "ðŸ–¥ï¸" },
];

bpCards.forEach((bp, i) => {
  const x = 0.8 + i * (bp.w + 0.3);
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: bp.w, h: 5, fill: { color: C.white }, rectRadius: 0.15, shadow: { type: "outer", blur: 4, offset: 2, color: "D0D0D0" }, line: { color: bp.color, width: 1.5 } });
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: bp.w, h: 0.8, fill: { color: bp.color }, rectRadius: 0.15 });
  // Cover bottom corners of header
  s.addShape(pptx.shapes.RECTANGLE, { x, y: 2.0, w: bp.w, h: 0.2, fill: { color: bp.color } });
  s.addText(bp.device + " " + bp.title, { x, y: 1.4, w: bp.w, h: 0.8, align: "center", valign: "middle", fontSize: 15, fontFace: "Arial", color: C.white, bold: true });
  s.addText(bp.sub, { x, y: 2.4, w: bp.w, h: 0.5, align: "center", fontSize: 11, fontFace: "Arial", color: bp.color, bold: true });
  s.addText(bp.items, { x: x + 0.3, y: 3.0, w: bp.w - 0.6, h: 3, fontSize: 11, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.6, valign: "top" });
});
addPageNumber(s);

// =============================================
// SLIDE 10 - Hasil Implementasi
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("HASIL IMPLEMENTASI", { x: 0.8, y: 0.4, w: 8, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

// Key metrics
const metrics = [
  { value: "13", label: "Modul Utama", color: C.purple },
  { value: "92%", label: "Tingkat Kepuasan UAT", color: C.green },
  { value: "2", label: "Platform (Web + APK)", color: "3B82F6" },
  { value: "3", label: "Breakpoint Responsif", color: C.orange },
];

metrics.forEach((m, i) => {
  const x = 0.8 + i * 3.05;
  s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x, y: 1.4, w: 2.85, h: 1.6, fill: { color: tint(m.color) }, rectRadius: 0.15, line: { color: tint(m.color), width: 1 } });
  s.addText(m.value, { x, y: 1.5, w: 2.85, h: 0.9, align: "center", fontSize: 32, fontFace: "Arial", color: m.color, bold: true });
  s.addText(m.label, { x, y: 2.35, w: 2.85, h: 0.5, align: "center", fontSize: 11, fontFace: "Arial", color: C.gray });
});

// Tech stack
s.addText("Tech Stack:", { x: 0.8, y: 3.4, w: 3, fontSize: 13, fontFace: "Arial", color: C.dark, bold: true });

const stackItems = [
  "React 19 + TypeScript 5.7",
  "Tailwind CSS 4 (utility-first)",
  "Vite 8 (build tool)",
  "Capacitor 6 (Android APK)",
  "localStorage + IndexedDB",
  "Node.js 24 + pnpm 12",
];
s.addText(stackItems.map(i => "âœ“ " + i).join("\n"), {
  x: 0.8, y: 3.8, w: 5, h: 2.8, fontSize: 12, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.7, valign: "top",
});

// Deployment
s.addText("Deployment:", { x: 6.5, y: 3.4, w: 3, fontSize: 13, fontFace: "Arial", color: C.dark, bold: true });
s.addText([
  { text: "Web:\n", options: { bold: true, color: C.purple } },
  { text: "GitHub Pages (HTTPS)\n\n", options: { color: C.gray } },
  { text: "Mobile:\n", options: { bold: true, color: C.green } },
  { text: "Android APK (Capacitor)\n\n", options: { color: C.gray } },
  { text: "Build:\n", options: { bold: true, color: "3B82F6" } },
  { text: "Vite â†’ dist/ â†’ gh-pages branch\nCapacitor â†’ android/ â†’ APK", options: { color: C.gray } },
], { x: 6.5, y: 3.8, w: 5.5, h: 3.5, fontSize: 11, fontFace: "Arial", lineSpacingMultiple: 1.4, valign: "top" });
addPageNumber(s);

// =============================================
// SLIDE 11 - Pengujian
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("PENGUJIAN & HASIL UAT", { x: 0.8, y: 0.4, w: 8, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

s.addText("Black-Box Testing: 13 modul â†’ 13/13 LULUS", { x: 0.8, y: 1.3, w: 10, fontSize: 13, fontFace: "Arial", color: C.green, bold: true });

const uatRows = [
  [{ text: "Aspek UAT", options: { bold: true, color: C.white } }, { text: "Skor (1-5)", options: { bold: true, color: C.white } }, { text: "Persentase", options: { bold: true, color: C.white } }, { text: "Status", options: { bold: true, color: C.white } }],
  ["Kemudahan Penggunaan", "4.6 / 5.0", "92%", "Sangat Baik"],
  ["Manfaat", "4.5 / 5.0", "90%", "Sangat Baik"],
  ["Kepuasan Pengguna", "4.7 / 5.0", "94%", "Sangat Baik"],
  ["Kualitas Antarmuka", "4.6 / 5.0", "92%", "Sangat Baik"],
  [{ text: "Overall", options: { bold: true } }, { text: "4.6 / 5.0", options: { bold: true } }, { text: "92%", options: { bold: true } }, { text: "LULUS", options: { bold: true, color: C.green } }],
];

s.addTable(uatRows, {
  x: 0.8, y: 1.8, w: 11.5,
  fontSize: 11, fontFace: "Arial",
  border: { pt: 0.5, color: C.border },
  colW: [4, 2.5, 2.5, 2.5],
  autoPage: false,
  rowH: 0.45,
  fill: { color: C.white },
});

// UAT respondents
s.addText("UAT Responden:", { x: 0.8, y: 4.5, w: 5, fontSize: 12, fontFace: "Arial", color: C.dark, bold: true });
s.addText("â€¢ 10 responden (pemilik, manager, kasir, staff)\nâ€¢ Skala Likert 1-5 (Sangat Tidak Setuju â†’ Sangat Setuju)\nâ€¢ 4 aspek penilaian UX\nâ€¢ Seluruh aspek mencapai â‰¥ 90%", {
  x: 0.8, y: 4.9, w: 6, h: 2, fontSize: 11, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.6,
});

// Masukan
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 7, y: 4.5, w: 5.3, h: 2.3, fill: { color: "FFF7ED" }, rectRadius: 0.15, line: { color: "FED7AA", width: 1 } });
s.addText("Masukan Pengguna:", { x: 7.2, y: 4.6, w: 5, fontSize: 12, fontFace: "Arial", color: C.orange, bold: true });
s.addText("â€¢ Notifikasi stok menipis\nâ€¢ Integrasi printer thermal langsung dari browser\nâ€¢ Pembayaran QRIS / e-wallet", {
  x: 7.2, y: 5.1, w: 4.8, h: 1.5, fontSize: 11, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.6,
});
addPageNumber(s);

// =============================================
// SLIDE 12 - Kesimpulan & Saran
// =============================================
s = pptx.addSlide();
s.background = { color: C.white };
s.addText("KESIMPULAN & SARAN", { x: 0.8, y: 0.4, w: 8, fontSize: 24, fontFace: "Arial", color: C.dark, bold: true });
s.addShape(pptx.shapes.LINE, { x: 0.8, y: 1.0, w: 3, line: { color: C.purple, width: 2 } });

// Kesimpulan
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 0.8, y: 1.3, w: 7, h: 5.5, fill: { color: "F0FDF4" }, rectRadius: 0.2, line: { color: "BBF7D0", width: 1 } });
s.addText("KESIMPULAN", { x: 1.0, y: 1.4, w: 6, fontSize: 14, fontFace: "Arial", color: C.green, bold: true });
s.addText([
  { text: "1. ", options: { bold: true, color: C.green } },
  { text: "Aplikasi POS berbasis web & mobile berhasil dikembangkan menggunakan React.js, TypeScript, Tailwind CSS, dan Capacitor\n\n", options: { color: C.gray, fontSize: 11 } },
  { text: "2. ", options: { bold: true, color: C.green } },
  { text: "RBAC action-level berfungsi dengan baik untuk 4 level pengguna (Admin, Manager, Kasir, Staff)\n\n", options: { color: C.gray, fontSize: 11 } },
  { text: "3. ", options: { bold: true, color: C.green } },
  { text: "13 modul lulus black-box testing, UAT mencapai 92%\n\n", options: { color: C.gray, fontSize: 11 } },
  { text: "4. ", options: { bold: true, color: C.green } },
  { text: "Responsif di 3 breakpoint: mobile, tablet, desktop\n\n", options: { color: C.gray, fontSize: 11 } },
  { text: "5. ", options: { bold: true, color: C.green } },
  { text: "Fitur lengkap: POS, produk multi-varian, inventaris, absensi, laporan, member, diskon", options: { color: C.gray, fontSize: 11 } },
], { x: 1.0, y: 2.0, w: 6.5, h: 4.5, fontFace: "Arial", lineSpacingMultiple: 1.3, valign: "top" });

// Saran
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 8.2, y: 1.3, w: 4.3, h: 5.5, fill: { color: "EFF6FF" }, rectRadius: 0.2, line: { color: "BFDBFE", width: 1 } });
s.addText("SARAN", { x: 8.4, y: 1.4, w: 4, fontSize: 14, fontFace: "Arial", color: C.blue, bold: true });
s.addText([
  { text: "â€¢ Integrasi printer thermal (Web Bluetooth API)\n\n", options: { color: C.gray, fontSize: 10 } },
  { text: "â€¢ Notifikasi otomatis stok menipis\n\n", options: { color: C.gray, fontSize: 10 } },
  { text: "â€¢ Sinkronisasi cloud multi-perangkat\n\n", options: { color: C.gray, fontSize: 10 } },
  { text: "â€¢ Multi-bahasa (ID/EN)\n\n", options: { color: C.gray, fontSize: 10 } },
  { text: "â€¢ Integrasi payment gateway (QRIS, e-wallet)\n\n", options: { color: C.gray, fontSize: 10 } },
  { text: "â€¢ Prediksi permintaan dengan machine learning", options: { color: C.gray, fontSize: 10 } },
], { x: 8.4, y: 2.0, w: 3.8, h: 4.5, fontFace: "Arial", lineSpacingMultiple: 1.3, valign: "top" });
addPageNumber(s);

// =============================================
// SLIDE 13 - Terima Kasih
// =============================================
s = pptx.addSlide();
s.background = { color: C.dark };
s.addShape(pptx.shapes.ROUNDED_RECTANGLE, { x: 2, y: 1.5, w: 9.33, h: 4.5, fill: { color: C.dark }, rectRadius: 0.3, line: { color: C.purple, width: 2 } });
s.addText("TERIMA KASIH", { x: 2, y: 2.0, w: 9.33, h: 1.5, align: "center", fontSize: 40, fontFace: "Arial", color: C.white, bold: true });
s.addShape(pptx.shapes.LINE, { x: 5, y: 3.5, w: 3.33, line: { color: C.purple, width: 2 } });
s.addText("Rancang Bangun Aplikasi POS\nuntuk Usaha Retail Fashion", { x: 2, y: 3.8, w: 9.33, h: 1, align: "center", fontSize: 14, fontFace: "Arial", color: C.gray, lineSpacingMultiple: 1.4 });
s.addText("Program Studi Teknik Informatika â€” Universitas XYZ â€” 2026", { x: 2, y: 5.0, w: 9.33, h: 0.6, align: "center", fontSize: 10, fontFace: "Arial", color: "9CA3AF" });

// Save
const outPath = path.join(__dirname, "Presentasi_Sidang_Tugas_Akhir_Nands_Boutique_POS.pptx");
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log("PPTX saved to", outPath);
}).catch((err) => {
  console.error("Error saving PPTX:", err);
});
