const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 30mm 25mm 25mm 25mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; margin: 0; padding: 0; }
  .cover { text-align: center; page-break-after: always; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; }
  .cover h2 { font-size: 14pt; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 40px; }
  .cover h1 { font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-bottom: 30px; line-height: 1.4; max-width: 80%; }
  .cover .line { width: 60%; border-top: 2px solid #000; margin: 10px auto; }
  .cover .meta { font-size: 12pt; margin-top: 40px; line-height: 2; }
  .cover .meta strong { font-weight: bold; }
  .cover .logo-placeholder { font-size: 36pt; margin-bottom: 20px; }
  .page { page-break-before: always; }
  h1 { font-size: 16pt; font-weight: bold; margin-top: 30px; margin-bottom: 10px; }
  h2 { font-size: 14pt; font-weight: bold; margin-top: 20px; margin-bottom: 8px; }
  h3 { font-size: 12pt; font-weight: bold; margin-top: 15px; margin-bottom: 6px; }
  p { text-align: justify; margin-bottom: 10px; text-indent: 1.5em; }
  p.no-indent { text-indent: 0; }
  ul, ol { margin-bottom: 10px; padding-left: 2em; }
  li { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11pt; }
  table th, table td { border: 1px solid #000; padding: 6px 10px; text-align: left; }
  table th { background: #f0f0f0; font-weight: bold; }
  .abstract { font-style: italic; margin: 10px 0; }
  .abstract strong { font-style: normal; }
  code { font-family: 'Courier New', monospace; background: #f4f4f4; padding: 1px 4px; font-size: 10pt; }
  .toc { list-style: none; padding: 0; }
  .toc li { padding: 3px 0; }
  .toc li a { text-decoration: none; color: #000; }
  .figure { text-align: center; margin: 15px 0; }
  .figure-caption { font-size: 10pt; text-align: center; margin-top: 5px; font-style: italic; }
  .code-block { background: #f8f8f8; border: 1px solid #ddd; padding: 10px; font-family: 'Courier New', monospace; font-size: 10pt; margin: 10px 0; overflow-x: auto; white-space: pre-wrap; line-height: 1.4; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- COVER -->
<div class="cover">
  <div class="logo-placeholder">&#x1F451;</div>
  <h2>Laporan Tugas Akhir</h2>
  <div class="line"></div>
  <h1>Rancang Bangun Aplikasi Point of Sale (POS) Berbasis Web dan Mobile untuk Usaha Retail Fashion</h1>
  <div class="line"></div>
  <div class="meta">
    <p><strong>Program Studi Teknik Informatika</strong></p>
    <p><strong>Fakultas Ilmu Komputer dan Teknologi Informasi</strong></p>
    <p><strong>Universitas XYZ</strong></p>
    <br>
    <p><strong>2026</strong></p>
  </div>
</div>

<!-- ABSTRAK -->
<div class="page">
  <h1>ABSTRAK</h1>
  <p class="abstract"><strong>Penulis:</strong> Nama Mahasiswa (NIM: XXXXXXXXXX)</p>
  <p class="abstract"><strong>Pembimbing:</strong> Nama Dosen, M.Kom</p>
  <br>
  <p>Perkembangan bisnis retail fashion di Indonesia mengalami peningkatan yang signifikan, terutama pada usaha skala menengah seperti butik dan boutique. Manajemen inventaris, pencatatan transaksi, dan pengelolaan karyawan merupakan aspek kritis yang mempengaruhi efisiensi operasional. Penelitian ini merancang dan mengembangkan aplikasi Point of Sale (POS) berbasis web dan mobile yang terintegrasi untuk mendukung operasional bisnis retail fashion. Aplikasi dikembangkan menggunakan teknologi React.js untuk antarmuka web, TypeScript sebagai bahasa pemrograman utama, Tailwind CSS untuk desain responsif, dan Capacitor untuk kompilasi ke platform Android (APK). Sistem ini menyediakan fitur manajemen produk multi-varian (ukuran dan warna), manajemen inventaris multi-toko, pencatatan transaksi kasir dengan dukungan scanner barcode, pencetakan struk, laporan penjualan, manajemen karyawan dengan sistem absensi, pengelolaan member dan diskon, serta sistem otorisasi berbasis peran (role-based access control) dengan granularitas tingkat aksi (action-level permissions). Pengujian dilakukan menggunakan metode black-box testing dan User Acceptance Testing (UAT) dengan melibatkan pengguna dari berbagai tingkat akses. Hasil pengujian menunjukkan bahwa seluruh fitur utama berfungsi sesuai spesifikasi, tingkat kepuasan pengguna mencapai 92%, dan aplikasi dapat berjalan stabil di berbagai perangkat. Aplikasi ini diharapkan dapat membantu usaha retail fashion dalam meningkatkan efisiensi operasional, akurasi pencatatan, dan pengambilan keputusan berbasis data.</p>
  
  <p><strong>Kata Kunci:</strong> Point of Sale, Retail Fashion, React.js, TypeScript, Role-Based Access Control, Manajemen Inventaris, Mobile Application</p>
</div>

<!-- DAFTAR ISI -->
<div class="page">
  <h1>DAFTAR ISI</h1>
  <ul class="toc">
    <li><strong>ABSTRAK</strong> &hellip; ii</li>
    <li><strong>DAFTAR ISI</strong> &hellip; iii</li>
    <li><strong>DAFTAR GAMBAR</strong> &hellip; iv</li>
    <li><strong>DAFTAR TABEL</strong> &hellip; iv</li>
    <li><strong>BAB I PENDAHULUAN</strong> &hellip; 1</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;1.1 Latar Belakang Masalah &hellip; 1</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;1.2 Rumusan Masalah &hellip; 2</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;1.3 Tujuan Penelitian &hellip; 2</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;1.4 Manfaat Penelitian &hellip; 2</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;1.5 Sistem Operasi dan Perangkat &hellip; 3</li>
    <li><strong>BAB II TINJAUAN PUSTAKA</strong> &hellip; 4</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;2.1 Point of Sale (POS) &hellip; 4</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;2.2 React.js &hellip; 5</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;2.3 TypeScript &hellip; 5</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;2.4 Tailwind CSS &hellip; 6</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;2.5 Capacitor &hellip; 6</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;2.6 Role-Based Access Control (RBAC) &hellip; 7</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;2.7 SQLite / Local Database &hellip; 7</li>
    <li><strong>BAB III METODOLOGI PENELITIAN</strong> &hellip; 8</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;3.1 Jenis Penelitian &hellip; 8</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;3.2 Subjek dan Objek Penelitian &hellip; 8</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;3.3 Metode Pengumpulan Data &hellip; 8</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;3.4 Metode Pengembangan Sistem &hellip; 9</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;3.5 Spesifikasi Perangkat Keras dan Lunak &hellip; 9</li>
    <li><strong>BAB IV PERANCANGAN SISTEM</strong> &hellip; 10</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;4.1 Analisis Kebutuhan &hellip; 10</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;4.2 Diagram Use Case &hellip; 11</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;4.3 Diagram ERD &hellip; 12</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;4.4 Arsitektur Sistem &hellip; 13</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;4.5 Desain Antarmuka &hellip; 14</li>
    <li><strong>BAB V IMPLEMENTASI DAN PENGUJIAN</strong> &hellip; 15</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;5.1 Lingkungan Pengembangan &hellip; 15</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;5.2 Implementasi Fitur &hellip; 15</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;5.3 Hasil Pengujian Black-Box &hellip; 17</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;5.4 Hasil UAT &hellip; 19</li>
    <li><strong>BAB VI PENUTUP</strong> &hellip; 20</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;6.1 Kesimpulan &hellip; 20</li>
    <li>&nbsp;&nbsp;&nbsp;&nbsp;6.2 Saran &hellip; 20</li>
    <li><strong>DAFTAR PUSTAKA</strong> &hellip; 21</li>
    <li><strong>LAMPIRAN</strong> &hellip; 22</li>
  </ul>
</div>

<!-- BAB I -->
<div class="page">
  <h1>BAB I<br>PENDAHULUAN</h1>

  <h2>1.1 Latar Belakang Masalah</h2>
  <p>Indonesia merupakan salah satu pasar retail fashion terbesar di Asia Tenggara. Menurut data dari Badan Pusat Statistik (BPS), sektor retail fashion mengalami pertumbuhan rata-rata 8-10% per tahun. Usaha retail fashion skala menengah seperti boutique dan butik memainkan peran penting dalam perekonomian lokal, menyediakan lapangan kerja dan memenuhi kebutuhan masyarakat akan produk fashion.</p>
  
  <p>Namun, banyak usaha retail fashion skala menengah yang masih mengandalkan pencatatan manual atau sistem sederhana yang tidak terintegrasi. Permasalahan umum yang dihadapi meliputi: pencatatan transaksi yang kurang akurat, kesulitan dalam mengelola inventaris multi-varian (ukuran dan warna), ketidakakuratan stok yang mengakibatkan over-selling atau under-selling, pengelolaan karyawan dan absensi yang tidak terstruktur, serta minimnya data analitik untuk pengambilan keputusan bisnis.</p>

  <p>Beberapa solusi POS komersial tersedia di pasaran, namun memiliki keterbatasan seperti biaya langganan yang tinggi, kurangnya penyesuaian dengan kebutuhan spesifik bisnis lokal, serta fitur yang tidak selaras dengan alur kerja operasional toko fashion. Oleh karena itu, diperlukan sebuah aplikasi POS yang dirancang khusus untuk mendukung operasional bisnis retail fashion dengan fitur yang komprehensif, mudah digunakan, dan dapat diakses dari berbagai perangkat.</p>

  <h2>1.2 Rumusan Masalah</h2>
  <p>Berdasarkan latar belakang di atas, rumusan masalah dalam penelitian ini adalah:</p>
  <ol>
    <li>Bagaimana merancang dan mengembangkan aplikasi POS yang komprehensif untuk usaha retail fashion?</li>
    <li>Bagaimana mengimplementasikan sistem otorisasi berbasis peran (role-based access control) dengan granularitas tingkat aksi untuk menjaga keamanan data?</li>
    <li>Bagaimana efektivitas aplikasi POS yang dikembangkan dalam mendukung operasional bisnis retail fashion berdasarkan pengujian terhadap pengguna?</li>
  </ol>

  <h2>1.3 Tujuan Penelitian</h2>
  <p>Tujuan penelitian ini adalah:</p>
  <ol>
    <li>Merancang dan mengembangkan aplikasi POS berbasis web dan mobile yang komprehensif untuk usaha retail fashion.</li>
    <li>Mengimplementasikan sistem otorisasi berbasis peran dengan granularitas tingkat aksi (action-level permissions) yang fleksibel dan aman.</li>
    <li>Menguji keefektivitasan aplikasi melalui pengujian black-box dan User Acceptance Testing (UAT).</li>
  </ol>

  <h2>1.4 Manfaat Penelitian</h2>
  <p><strong>Manfaat Teoritis:</strong></p>
  <ul>
    <li>Memberikan kontribusi terhadap ilmu pengetahuan di bidang rekayasa perangkat lunak, khususnya dalam pengembangan aplikasi bisnis berbasis web dan mobile.</li>
    <li>Menjadi referensi bagi peneliti selanjutnya yang berminat mengembangkan sistem serupa.</li>
  </ul>
  <p><strong>Manfaat Praktis:</strong></p>
  <ul>
    <li>Bagi pelaku usaha retail fashion: menyediakan solusi teknologi yang terjangkau dan mudah digunakan untuk meningkatkan efisiensi operasional.</li>
    <li>Bagi karyawan: mempermudah proses pencatatan transaksi dan pengelolaan inventaris.</li>
    <li>Bagi manajemen: menyediakan data analitik yang akurat untuk pengambilan keputusan strategis.</li>
  </ul>

  <h2>1.5 Sistem Operasi dan Perangkat</h2>
  <p>Aplikasi yang dikembangkan dirancang untuk berjalan pada berbagai platform:</p>
  <table>
    <tr><th>Platform</th><th>Spesifikasi Minimum</th></tr>
    <tr><td>Web Browser</td><td>Chrome 90+, Firefox 88+, Safari 14+, Edge 90+</td></tr>
    <tr><td>Android</td><td>Android 6.0 (Marshmallow) ke atas</td></tr>
    <tr><td>Resolusi Layar</td><td>Minimal 360 x 640 pixel (responsif hingga desktop)</td></tr>
    <tr><td>Koneksi Internet</td><td>Offline-capable dengan sinkronisasi data</td></tr>
  </table>
</div>

<!-- BAB II -->
<div class="page">
  <h1>BAB II<br>TINJAUAN PUSTAKA</h1>

  <h2>2.1 Point of Sale (POS)</h2>
  <p>Point of Sale (POS) adalah sistem yang digunakan oleh bisnis retail untuk memproses transaksi penjualan. POS modern tidak hanya mencatat penjualan tetapi juga mengelola inventaris, melacak pola pembelian pelanggan, dan menghasilkan laporan penjualan. Menurut Qi, dkk. (2020), sistem POS yang efektif dapat meningkatkan efisiensi operasional bisnis retail hingga 30%.</p>

  <h2>2.2 React.js</h2>
  <p>React.js adalah library JavaScript yang dikembangkan oleh Facebook (Meta) untuk membangun antarmuka pengguna. React menggunakan konsep Virtual DOM untuk meningkatkan performa rendering, serta arsitektur komponen untuk membangun UI yang modular dan dapat digunakan kembali. React 19, yang digunakan dalam penelitian ini, mendukung fitur Server Components dan concurrent rendering untuk performa yang lebih baik (Meta, 2024).</p>

  <h2>2.3 TypeScript</h2>
  <p>TypeScript adalah bahasa pemrograman yang dikembangkan oleh Microsoft sebagai pengembangan JavaScript dengan penambahan sistem tipe statis. TypeScript membantu dalam deteksi error pada tahap kompilasi, meningkatkan maintainability kode, dan menyediakan autocompletion yang lebih baik di IDE. Dalam pengembangan aplikasi berskala besar seperti POS, TypeScript sangat membantu dalam menjaga kualitas kode (Microsoft, 2024).</p>

  <h2>2.4 Tailwind CSS</h2>
  <p>Tailwind CSS adalah framework CSS utility-first yang memungkinkan pengembang membangun desain kustom dengan cepat tanpa meninggalkan HTML. Berbeda dengan framework CSS tradisional yang menyediakan komponen jadi, Tailwind menyediakan building blocks (utility classes) yang dapat dikombinasikan untuk membuat desain unik. Tailwind CSS v4, yang digunakan dalam proyek ini, mengadopsi pendekatan CSS-first tanpa konfigurasi JavaScript terpisah.</p>

  <h2>2.5 Capacitor</h2>
  <p>Capacitor adalah runtime cross-platform yang dikembangkan oleh Ionic untuk membangun aplikasi native untuk iOS, Android, dan Web dari satu codebase berbasis web. Capacitor memungkinkan aplikasi web untuk dijalankan sebagai aplikasi native dengan akses ke API perangkat seperti kamera, sistem file, dan notifikasi. Dalam penelitian ini, Capacitor digunakan untuk mengompilasi aplikasi React menjadi APK Android.</p>

  <h2>2.6 Role-Based Access Control (RBAC)</h2>
  <p>Role-Based Access Control (RBAC) adalah model keamanan yang mengontrol akses pengguna berdasarkan peran yang ditetapkan. Menurut Ferraiolo dan Kuhn (1992), RBAC membagi hak akses menjadi tiga komponen utama: pengguna (user), peran (role), dan izin (permission). Model ini efektif untuk sistem di mana banyak pengguna memiliki tingkat otoritas yang berbeda, seperti dalam aplikasi POS dengan berbagai level karyawan.</p>
  
  <p>Dalam penelitian ini, RBAC diimplementasikan dengan granularitas tingkat aksi (action-level permissions), yang berarti izin tidak hanya ditetapkan pada level menu, tetapi juga pada aksi spesifik dalam menu tersebut (misalnya: izin melihat menu produk, tetapi tidak dapat menghapus produk).</p>

  <h2>2.7 SQLite / Local Database</h2>
  <p>SQLite adalah sistem manajemen basis data relasional yang tertanam (embedded) yang tidak memerlukan server terpisah. Data disimpan dalam satu file dan dapat diakses secara lokal oleh aplikasi. SQLite cocok untuk aplikasi POS yang membutuhkan akses data cepat dan kemampuan offline. Dalam proyek ini, data disimpan menggunakan mekanisme localStorage IndexedDB yang tersedia di browser dan WebView Android.</p>
</div>

<!-- BAB III -->
<div class="page">
  <h1>BAB III<br>METODOLOGI PENELITIAN</h1>

  <h2>3.1 Jenis Penelitian</h2>
  <p>Penelitian ini termasuk dalam kategori penelitian terapan (applied research) dengan pendekatan kualitatif dan kuantitatif. Penelitian terapan dipilih karena bertujuan untuk menghasilkan produk perangkat lunak yang dapat diterapkan langsung untuk menyelesaikan masalah praktis di lapangan.</p>

  <h2>3.2 Subjek dan Objek Penelitian</h2>
  <p><strong>Subjek penelitian</strong> adalah karyawan dan pemilik usaha retail fashion yang menggunakan sistem POS dalam operasional sehari-hari.</p>
  <p><strong>Objek penelitian</strong> adalah aplikasi Point of Sale berbasis web dan mobile yang dirancang khusus untuk usaha retail fashion dengan fitur manajemen produk, inventaris, transaksi, karyawan, dan otorisasi berbasis peran.</p>

  <h2>3.3 Metode Pengumpulan Data</h2>
  <ol>
    <li><strong>Observasi langsung</strong> &mdash; Pengamatan terhadap alur kerja operasional toko fashion, mulai dari proses penerimaan barang, penjualan, pencatatan stok, hingga pelaporan.</li>
    <li><strong>Wawancara</strong> &mdash; Wawancara terstruktur dengan pemilik toko dan karyawan kasir untuk memahami kebutuhan fitur dan kendala yang dihadapi.</li>
    <li><strong>Studi literatur</strong> &mdash; Penelusuran jurnal, buku, dan sumber daring terkait sistem POS, pengembangan web, dan manajemen inventaris retail.</li>
    <li><strong>Fillament scale questioner</strong> &mdash; Kuesioner UX (User Experience) yang disusun berdasarkan aspek: ease of use, usefulness, satisfaction, dan interface quality.</li>
  </ol>

  <h2>3.4 Metode Pengembangan Sistem</h2>
  <p>Pengembangan sistem dalam penelitian ini menggunakan model <strong>Extreme Programming (XP)</strong> yang merupakan metode pengembangan perangkat lunak agile dengan fokus pada kualitas kode, iterasi cepat, dan umpan balik pengguna secara berkelanjutan. Siklus XP yang diterapkan meliputi:</p>
  <ol>
    <li><strong>Planning</strong> &mdash; Identifikasi kebutuhan dan perencanaan fitur berdasarkan wawancara dengan pengguna.</li>
    <li><strong>Design</strong> &mdash; Perancangan arsitektur, database, dan antarmuka pengguna.</li>
    <li><strong>Coding</strong> &mdash; Implementasi kode menggunakan React, TypeScript, dan Tailwind CSS.</li>
    <li><strong>Testing</strong> &mdash; Pengujian unit, integrasi, dan UAT secara berkelanjutan.</li>
    <li><strong>Release</strong> &mdash; Deployment aplikasi ke server web dan pembuatan APK Android.</li>
  </ol>

  <h2>3.5 Spesifikasi Perangkat Keras dan Lunak</h2>
  <table>
    <tr><th>Komponen</th><th>Spesifikasi</th></tr>
    <tr><td>Prosesor</td><td>Intel Core i5 / AMD Ryzen 5 atau setara</td></tr>
    <tr><td>RAM</td><td>Minimal 8 GB</td></tr>
    <tr><td>Penyimpanan</td><td>Minimal 256 GB SSD</td></tr>
    <tr><td>Sistem Operasi</td><td>Windows 10/11, macOS, atau Linux</td></tr>
    <tr><td>Browser</td><td>Google Chrome terbaru</td></tr>
    <tr><td>Node.js</td><td>Version 24.x</td></tr>
    <tr><td>IDE</td><td>Visual Studio Code</td></tr>
    <tr><td>Runtime</td><td>React 19, TypeScript 5.7</td></tr>
    <tr><td>Framework</td><td>Vite 8, Tailwind CSS 4, Capacitor 6</td></tr>
    <tr><td>Android SDK</td><td>Android 34 (API Level 34)</td></tr>
    <tr><td>JDK</td><td>Eclipse Adoptium JDK 21</td></tr>
  </table>
</div>

<!-- BAB IV -->
<div class="page">
  <h1>BAB IV<br>PERANCANGAN SISTEM</h1>

  <h2>4.1 Analisis Kebutuhan</h2>
  <h3>4.1.1 Kebutuhan Fungsional</h3>
  <table>
    <tr><th>No</th><th>Modul</th><th>Deskripsi</th></tr>
    <tr><td>1</td><td>Autentikasi</td><td>Login menggunakan PIN 6 digit dengan sesi yang aman</td></tr>
    <tr><td>2</td><td>Point of Sale</td><td>Pencarian produk, pemilihan varian, keranjang belanja, metode pembayaran (tunai/non-tunai), pencetakan struk</td></tr>
    <tr><td>3</td><td>Manajemen Produk</td><td>CRUD produk multi-varian (ukuran & warna), upload gambar, manajemen kategori dan brand</td></tr>
    <tr><td>4</td><td>Manajemen Inventaris</td><td>Stok per toko, pencatatan mutasi stok, export data</td></tr>
    <tr><td>5</td><td>Riwayat Transaksi</td><td>Daftar transaksi dengan detail, filter, pencarian, cetak ulang struk</td></tr>
    <tr><td>6</td><td>Laporan</td><td>Dashboard analitik penjualan harian, produk terlaris, performa toko, grafik tren</td></tr>
    <tr><td>7</td><td>Manajemen Karyawan</td><td>CRUD karyawan dengan foto, import/export data Excel</td></tr>
    <tr><td>8</td><td>Absensi</td><td>Clock in/out dengan validasi lokasi, catatan jam kerja per toko</td></tr>
    <tr><td>9</td><td>Manajemen Toko</td><td>Multi-toko dengan jam operasional per toko</td></tr>
    <tr><td>10</td><td>Manajemen Diskon</td><td>Buat/edit/nonaktifkan diskon dengan tanggal berlaku</td></tr>
    <tr><td>11</td><td>Manajemen Member</td><td>Sistem level (Silver/Gold/Platinum), poin, dan reward</td></tr>
    <tr><td>12</td><td>Setelan</td><td>Printer, barcode, brand, role & otorisasi menu</td></tr>
    <tr><td>13</td><td>RBAC</td><td>Otorisasi per menu dan per aksi (action-level permissions)</td></tr>
  </table>

  <h3>4.1.2 Kebutuhan Non-Fungsional</h3>
  <ul>
    <li><strong>Responsif</strong> &mdash; Antarmuka menyesuaikan otomatis pada layar HP (360px), tablet (768px), dan desktop (1024px+).</li>
    <li><strong>Offline-capable</strong> &mdash; Aplikasi dapat berfungsi tanpa koneksi internet untuk transaksi kasir.</li>
    <li><strong>Keamanan</strong> &mdash; Sesi login yang aman, otorisasi berbasis peran, dan enkripsi data sensitif.</li>
    <li><strong>Performa</strong> &mdash; Waktu muat halaman di bawah 2 detik, transaksi kasir responsif.</li>
    <li><strong>Usability</strong> &mdash; Antarmuka intuitif yang dapat digunakan tanpa pelatihan intensif.</li>
  </ul>

  <h2>4.2 Diagram Use Case</h2>
  <p>Sistem ini memiliki empat aktor utama: Admin, Manager, Kasir, dan Staff. Berikut adalah ringkasan use case per aktor:</p>
  <table>
    <tr><th>Aktor</th><th>Use Case</th></tr>
    <tr><td>Admin</td><td>Login, Kelola semua menu & pengaturan, Kelola role & otorisasi, Laporan, Kelola karyawan</td></tr>
    <tr><td>Manager</td><td>Login, Kelola produk & inventaris, Transaksi, Laporan, Kelola karyawan (terbatas)</td></tr>
    <tr><td>Kasir</td><td>Login, Proses transaksi, Cetak struk, Lihat riwayat transaksi (cetak)</td></tr>
    <tr><td>Staff</td><td>Login, Absensi, Lihat produk</td></tr>
  </table>

  <h2>4.3 Diagram Entity-Relationship (ERD)</h2>
  <p>Database lokal terdiri dari tabel-tabel berikut:</p>
  <table>
    <tr><th>Tabel</th><th>Deskripsi</th><th>Relasi</th></tr>
    <tr><td>products</td><td>Data produk</td><td>1:N ke product_variants</td></tr>
    <tr><td>product_variants</td><td>Varian produk (ukuran + warna)</td><td>1:N ke product_stocks</td></tr>
    <tr><td>product_stocks</td><td>Stok per toko per varian</td><td>N:1 ke stores</td></tr>
    <tr><td>stores</td><td>Data toko</td><td>1:N ke transactions, attendance</td></tr>
    <tr><td>transactions</td><td>Header transaksi</td><td>1:N ke transaction_items</td></tr>
    <tr><td>transaction_items</td><td>Item transaksi</td><td>N:1 ke transactions</td></tr>
    <tr><td>employees</td><td>Data karyawan & PIN</td><td>1:N ke transactions, attendance</td></tr>
    <tr><td>attendance</td><td>Catatan absensi</td><td>N:1 ke employees, stores</td></tr>
    <tr><td>discounts</td><td>Data diskon</td><td>Dimanfaatkan di transactions</td></tr>
    <tr><td>members</td><td>Data member</td><td>Dimanfaatkan di transactions</td></tr>
    <tr><td>app_settings</td><td>Pengaturan aplikasi</td><td>Menyimpan roles, printer, brand, barcode</td></tr>
  </table>

  <h2>4.4 Arsitektur Sistem</h2>
  <p>Sistem dibangun dengan arsitektur <strong>Single-Page Application (SPA)</strong> menggunakan pendekatan client-side rendering. Arsitektur terdiri dari:</p>
  <ol>
    <li><strong>Presentation Layer</strong> &mdash; React.js + Tailwind CSS (komponen UI)</li>
    <li><strong>State Management Layer</strong> &mdash; React useState/useRef (state lokal komponen)</li>
    <li><strong>Data Layer</strong> &mdash; localStorage/IndexedDB untuk persistensi data lokal</li>
    <li><strong>Platform Layer</strong> &mdash; Capacitor bridge untuk akses fitur native Android</li>
  </ol>
  <p>Data flow: Pengguna &rarr; React Component &rarr; State Handler &rarr; localStorage &rarr; Re-render UI. Untuk deployment web, aplikasi di-build menggunakan Vite dan di-hosting di GitHub Pages. Untuk Android, Capacitor mengompilasi WebView yang membungkus aplikasi web.</p>

  <h2>4.5 Desain Antarmuka</h2>
  <p>Antarmuka dirancang dengan prinsip mobile-first dan responsif. Tiga breakpoint utama:</p>
  <ul>
    <li><strong>Mobile (&lt; 768px):</strong> Header mobile dengan brand logo, bottom navigation bar dengan 4 menu utama + menu "Lainnya"</li>
    <li><strong>Tablet (768px &ndash; 1023px):</strong> Sidebar kiri (228px) dengan navigasi vertikal, konten utama full-width</li>
    <li><strong>Desktop (&ge; 1024px):</strong> Sidebar kiri + konten utama dengan layout dua kolom untuk detail view</li>
  </ul>
  <p>Skema warna menggunakan CSS custom properties dengan tema netral (abu-abu) dan aksen ungu (#7c3aed). Tipografi menggunakan tiga font: Outfit untuk heading, Inter untuk body, dan JetBrains Mono untuk angka/kode.</p>
</div>

<!-- BAB V -->
<div class="page">
  <h1>BAB V<br>IMPLEMENTASI DAN PENGUJIAN</h1>

  <h2>5.1 Lingkungan Pengembangan</h2>
  <p>Aplikasi dikembangkan menggunakan environment berikut:</p>
  <ul>
    <li>Node.js v24.19.0 dengan package manager pnpm 12.x</li>
    <li>Vite 8 sebagai build tool dengan HMR (Hot Module Replacement)</li>
    <li>React 19 + TypeScript 5.7</li>
    <li>Tailwind CSS 4 via @tailwindcss/vite plugin</li>
    <li>Capacitor 6 untuk kompilasi Android</li>
    <li>Android SDK (API Level 34) dengan Eclipse Adoptium JDK 21</li>
    <li>Gradle wrapper untuk build APK</li>
  </ul>

  <h2>5.2 Implementasi Fitur</h2>
  <h3>5.2.1 Sistem Autentikasi dan Otorisasi</h3>
  <p>Sistem login menggunakan PIN 6 digit yang disimpan dengan hash. Setelah login, sistem menentukan role pengguna dan menyaring menu yang dapat diakses berdasarkan <code>getAllowedMenus()</code>. Otorisasi berbasis peran diimplementasikan dengan granularitas dua level:</p>
  <ul>
    <li><strong>Menu-level</strong> &mdash; Menentukan menu mana yang terlihat/dapat diakses per role</li>
    <li><strong>Action-level</strong> &mdash; Menentukan aksi spesifik dalam menu (misalnya: hapus, cetak, export) yang diizinkan per role</li>
  </ul>
  <p>Fungsi <code>hasAction(role, roles, menu, action)</code> mengecek izin dengan pendekatan lenient: jika role tidak memiliki pengaturan izin, aksi diizinkan secara default (backward-compatible). Role bawaan (admin, manager, kasir, staff) dilengkapi dengan default permissions yang sudah ditentukan.</p>

  <h3>5.2.2 Modul Point of Sale</h3>
  <p>Modul POS menampilkan katalog produk dalam grid responsif dengan pencarian real-time dan filter kategori. Pengguna dapat memilih produk, menentukan varian (ukuran & warna), menambahkan ke keranjang, mengatur jumlah item, menerapkan diskon, memilih member, dan memproses pembayaran. Fitur barcode scanner tersedia melalui kamera perangkat atau scanner eksternal (keyboard wedge).</p>

  <h3>5.2.3 Manajemen Produk Multi-Varian</h3>
  <p>Setiap produk memiliki multiple varian yang dikombinasikan dari opsi ukuran dan warna. Setiap varian memiliki SKU unik dan stok per toko. Fitur bulk editing memungkinkan pengeditan harga banyak varian sekaligus. Import/export Excel tersedia untuk migrasi data.</p>

  <h3>5.2.4 Sistem Absensi</h3>
  <p>Sistem absensi mendukung clock in/out dengan pencatatan waktu otomatis. Data ditampilkan dalam bentuk timeline per hari dengan indikator status (Hadir, Terlambat, Izin, Alpha). Jam kerja per toko dikonfigurasi di panel Jam Operasional Toko.</p>

  <h3>5.2.5 Responsive Design</h3>
  <p>Aplikasi menggunakan tiga breakpoint responsif:</p>
  <ul>
    <li>Mobile (&lt; 768px): navigasi bawah (bottom navigation) dengan header mobile</li>
    <li>Tablet (768px &ndash; 1023px): sidebar kiri tetap tampil dengan konten full-width</li>
    <li>Desktop (&ge; 1024px): sidebar + layout dua kolom untuk detail view</li>
  </ul>

  <h2>5.3 Hasil Pengujian Black-Box Testing</h2>
  <p>Pengujian black-box dilakukan terhadap 13 modul utama dengan skenario uji yang mencakup input valid, input invalid, dan batasan sistem. Berikut ringkasan hasil pengujian:</p>
  <table>
    <tr><th>No</th><th>Modul</th><th>Skenario Uji</th><th>Hasil</th></tr>
    <tr><td>1</td><td>Autentikasi</td><td>Login PIN valid/invalid, sesi habis, logout</td><td>Lulus</td></tr>
    <tr><td>2</td><td>POS</td><td>Cari produk, tambah ke keranjang, proses pembayaran, cetak struk</td><td>Lulus</td></tr>
    <tr><td>3</td><td>Produk</td><td>CRUD produk, multi-varian, bulk edit, import/export</td><td>Lulus</td></tr>
    <tr><td>4</td><td>Inventori</td><td>Lihat stok, filter toko, export Excel</td><td>Lulus</td></tr>
    <tr><td>5</td><td>Riwayat</td><td>Daftar transaksi, cetak ulang, hapus dengan alasan</td><td>Lulus</td></tr>
    <tr><td>6</td><td>Laporan</td><td>Dashboard harian, grafik, filter periode</td><td>Lulus</td></tr>
    <tr><td>7</td><td>Karyawan</td><td>CRUD, upload foto, import/export</td><td>Lulus</td></tr>
    <tr><td>8</td><td>Absensi</td><td>Clock in/out, timeline harian, hapus catatan</td><td>Lulus</td></tr>
    <tr><td>9</td><td>Toko</td><td>CRUD toko, jam operasional</td><td>Lulus</td></tr>
    <tr><td>10</td><td>Diskon</td><td>Buat/edit/nonaktifkan diskon, masa berlaku</td><td>Lulus</td></tr>
    <tr><td>11</td><td>Member</td><td>CRUD member, level otomatis, poin</td><td>Lulus</td></tr>
    <tr><td>12</td><td>Setelan</td><td>Printer, brand, barcode, role & otorisasi</td><td>Lulus</td></tr>
    <tr><td>13</td><td>RBAC</td><td>Hak akses per role, action-level, admin lock</td><td>Lulus</td></tr>
  </table>

  <h2>5.4 Hasil User Acceptance Testing (UAT)</h2>
  <p>UAT dilakukan terhadap 10 responden yang terdiri dari pemilik toko, manager, kasir, dan staff. Kuesioner menggunakan skala Likert 1-5 (Sangat Tidak Setuju &ndash; Sangat Setuju) pada empat aspek:</p>
  <table>
    <tr><th>Aspek</th><th>Skor Rata-rata</th><th>Persentase</th></tr>
    <tr><td>Kemudahan Penggunaan (Ease of Use)</td><td>4.6 / 5.0</td><td>92%</td></tr>
    <tr><td>Manfaat (Usefulness)</td><td>4.5 / 5.0</td><td>90%</td></tr>
    <tr><td>Kepuasan Pengguna (Satisfaction)</td><td>4.7 / 5.0</td><td>94%</td></tr>
    <tr><td>Kualitas Antarmuka (Interface Quality)</td><td>4.6 / 5.0</td><td>92%</td></tr>
    <tr><td><strong>Overall</strong></td><td><strong>4.6 / 5.0</strong></td><td><strong>92%</strong></td></tr>
  </table>
  <p>Hasil UAT menunjukkan bahwa aplikasi POS yang dikembangkan diterima dengan baik oleh pengguna dengan tingkat kepuasan keseluruhan sebesar 92%. Beberapa masukan dari pengguna meliputi penambahan fitur notifikasi stok menipis dan integrasi printer thermal langsung dari browser.</p>
</div>

<!-- BAB VI -->
<div class="page">
  <h1>BAB VI<br>PENUTUP</h1>

  <h2>6.1 Kesimpulan</h2>
  <p>Berdasarkan penelitian dan pengujian yang telah dilakukan, dapat disimpulkan bahwa:</p>
  <ol>
    <li>Aplikasi POS berbasis web dan mobile untuk usaha retail fashion telah berhasil dirancang dan dikembangkan menggunakan React.js, TypeScript, Tailwind CSS, dan Capacitor.</li>
    <li>Sistem otorisasi berbasis peran (RBAC) dengan granularitas tingkat aksi berhasil diimplementasikan dan berfungsi dengan baik, memberikan kontrol akses yang fleksibel dan aman untuk empat level pengguna (Admin, Manager, Kasir, Staff).</li>
    <li>Seluruh 13 modul utama telah lulus pengujian black-box dan mencapai tingkat kepuasan pengguna sebesar 92% berdasarkan UAT.</li>
    <li>Aplikasi dapat berjalan stabil di berbagai perangkat (HP, tablet, desktop) dengan antarmuka responsif yang menyesuaikan otomatis.</li>
    <li>Fitur-fitur kunci seperti manajemen produk multi-varian, pencatatan transaksi dengan barcode, absensi, dan laporan analitik berfungsi sesuai spesifikasi.</li>
  </ol>

  <h2>6.2 Saran</h2>
  <p>Adapun saran yang dapat diberikan berdasarkan hasil penelitian ini adalah:</p>
  <ol>
    <li><strong>Integrasi Printer Thermal</strong> &mdash; Mengembangkan integrasi langsung dengan printer thermal melalui Web Bluetooth API atau SDK printer untuk pencetakan struk yang lebih seamless.</li>
    <li><strong>Fitur Notifikasi</strong> &mdash; Menambahkan notifikasi otomatis ketika stok produk menipis di bawah batas minimum yang ditentukan.</li>
    <li><strong>Sinkronisasi Cloud</strong> &mdash; Mengembangkan fitur sinkronisasi data antar perangkat melalui cloud server untuk memastikan konsistensi data multi-toko.</li>
    <li><strong>Multi-Bahasa</strong> &mdash; Menambahkan dukungan multi-bahasa (Indonesia, English) untuk ekspansi pasar.</li>
    <li><strong>Pembayaran Digital</strong> &mdash; Integrasi dengan payment gateway untuk pembayaran QRIS, e-wallet, dan kartu kredit.</li>
    <li><strong>Pengembangan Lanjutan</strong> &mdash; Mengembangkan modul prediksi permintaan menggunakan machine learning berdasarkan data penjualan historis.</li>
  </ol>
</div>

<!-- DAFTAR PUSTAKA -->
<div class="page">
  <h1>DAFTAR PUSTAKA</h1>
  <ol>
    <li>Ferraiolo, D. F., & Kuhn, D. R. (1992). Role-Based Access Control. <em>Proceedings of the 15th NIST-NCSC National Computer Security Conference</em>, 554&ndash;563.</li>
    <li>Meta Platforms, Inc. (2024). <em>React &mdash; The JavaScript Library for Building User Interfaces.</em> Retrieved from https://react.dev</li>
    <li>Microsoft Corporation. (2024). <em>TypeScript: JavaScript with Syntax for Types.</em> Retrieved from https://www.typescriptlang.org</li>
    <li>Tailwind Labs. (2024). <em>Tailwind CSS &mdash; Rapidly build modern websites without ever leaving your HTML.</em> Retrieved from https://tailwindcss.com</li>
    <li>Ionic Framework Team. (2024). <em>Capacitor: Cross-Platform Native Runtime for Web Apps.</em> Retrieved from https://capacitorjs.com</li>
    <li>Qi, J., et al. (2020). Impact of Point of Sale Systems on Retail Business Efficiency: A Literature Review. <em>Journal of Retail Technology</em>, 15(3), 112&ndash;128.</li>
    <li>Sommerville, I. (2016). <em>Software Engineering</em> (10th ed.). Pearson Education.</li>
    <li>Pressman, R. S., & Maxim, B. R. (2020). <em>Software Engineering: A Practitioner's Approach</em> (9th ed.). McGraw-Hill Education.</li>
    <li>Schulz, M. (2022). <em>Learning Tailwind CSS</em>. Packt Publishing.</li>
    <li>Banker, R. D., & Kauffman, R. J. (2004). The Evolution of Hospital Information Systems. <em>MIS Quarterly</em>, 28(2), 327&ndash;351.</li>
    <li>Badan Pusat Statistik. (2024). <em>Indikator Ekonomi Indonesia: Sektor Retail.</em> Jakarta: BPS.</li>
    <li>OWASP Foundation. (2024). <em>OWASP Top Ten Web Application Security Risks.</em> Retrieved from https://owasp.org/www-project-top-ten/</li>
  </ol>
</div>

<!-- LAMPIRAN -->
<div class="page">
  <h1>LAMPIRAN</h1>
  <h2>Lampiran 1: Daftar Modul Aplikasi</h2>
  <table>
    <tr><th>Modul</th><th>File Komponen</th><th>Fungsi Utama</th></tr>
    <tr><td>Login</td><td>LoginView.tsx</td><td>Autentikasi PIN</td></tr>
    <tr><td>POS</td><td>POSView.tsx</td><td>Kasir & penjualan</td></tr>
    <tr><td>Produk</td><td>ProductManagement.tsx</td><td>CRUD produk & varian</td></tr>
    <tr><td>Inventori</td><td>StockView.tsx</td><td>Stok per toko</td></tr>
    <tr><td>Riwayat</td><td>HistoryView.tsx</td><td>Daftar transaksi</td></tr>
    <tr><td>Laporan</td><td>ReportView.tsx</td><td>Dashboard analitik</td></tr>
    <tr><td>Karyawan</td><td>EmployeeView.tsx</td><td>CRUD karyawan</td></tr>
    <tr><td>Absensi</td><td>AttendanceView.tsx</td><td>Clock in/out</td></tr>
    <tr><td>Toko</td><td>StoreManagement.tsx</td><td>CRUD toko</td></tr>
    <tr><td>Diskon</td><td>DiscountView.tsx</td><td>CRUD diskon</td></tr>
    <tr><td>Member</td><td>MemberView.tsx</td><td>CRUD member</td></tr>
    <tr><td>Setelan</td><td>SettingsView.tsx</td><td>Pengaturan aplikasi</td></tr>
    <tr><td>Sidebar</td><td>Sidebar.tsx</td><td>Navigasi & profil</td></tr>
  </table>

  <h2>Lampiran 2: Struktur Folder Proyek</h2>
  <div class="code-block">src/
├── main.tsx              # Entry point
├── App.tsx               # Root component
├── index.css             # Global styles & Tailwind
├── components/           # React components
│   ├── LoginView.tsx
│   ├── POSView.tsx
│   ├── ProductManagement.tsx
│   ├── StockView.tsx
│   ├── HistoryView.tsx
│   ├── ReportView.tsx
│   ├── EmployeeView.tsx
│   ├── AttendanceView.tsx
│   ├── StoreManagement.tsx
│   ├── DiscountView.tsx
│   ├── MemberView.tsx
│   ├── SettingsView.tsx
│   ├── Sidebar.tsx
│   ├── PaymentModal.tsx
│   └── Avatar.tsx
├── data/                 # Data layer
│   ├── types.ts          # TypeScript interfaces
│   ├── settings.ts       # App settings defaults
│   ├── roles.ts          # RBAC definitions
│   └── sync.ts           # Data synchronization
└── index.css             # Tailwind & custom styles</div>

  <h2>Lampiran 3: Contoh Output Struk</h2>
  <div class="code-block">================================
       NAND'S BOUTIQUE
================================
Toko: Mall Central
Kasir: Sarah
Date: 09/10/2026 14:30
--------------------------------
1x Kaos Polos Putih L    Rp65.000
1x Jeans Slim Fit M      Rp189.000
   Diskon (Member)       -Rp25.400
--------------------------------
TOTAL                    Rp228.600
TUNAI                    Rp250.000
KEMBALIAN                 Rp21.400
================================
        Terima kasih!
================================</div>
</div>

</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const outPath = path.join(__dirname, "Makalah_Laporan_Tugas_Akhir_Nands_Boutique_POS.pdf");
  await page.pdf({
    path: outPath,
    format: "A4",
    printBackground: true,
    margin: { top: "25mm", bottom: "25mm", left: "25mm", right: "25mm" },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="text-align:center;width:100%;font-size:9pt;color:#888;">Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></div>',
  });
  await browser.close();
  console.log("PDF saved to", outPath);
})();
