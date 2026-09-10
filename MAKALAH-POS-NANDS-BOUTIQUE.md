# MAKALAH

## SISTEM INFORMASI POINT OF SALE (POS) "NAND'S BOUTIQUE"
### Prototype Aplikasi Kasir Multi-Cabang Berbasis Web Responsif dan Android

---

**Disusun oleh:**

_[Nama Mahasiswa 1]_  
_[Nama Mahasiswa 2]_  
_[Nama Mahasiswa 3]_

**Program Studi _[Program Studi]_**  
**_[Nama Sekolah / Perguruan Tinggi]_**  
**_[Tahun Ajaran 2026]_**  

---

## KATA PENGANTAR

Puji syukur kami panjatkan ke hadirat Tuhan Yang Maha Esa karena atas rahmat dan karunia-Nya kami dapat menyelesaikan makalah yang berjudul **"Sistem Informasi Point of Sale (POS) NAND'S BOUTIQUE"** ini dengan baik.

Makalah ini disusun untuk memenuhi tugas _[sebutkan mata kuliah / jenis tugas]_ serta sebagai bentuk pengembangan keterampilan kami dalam merancang dan membangun aplikasi sistem informasi. Aplikasi yang dibahas merupakan prototype sistem kasir (Point of Sale) untuk toko pakaian NAND'S BOUTIQUE yang mendukung operasional multi-cabang, mulai dari transaksi penjualan, pengelolaan produk dan stok, keanggotaan pelanggan, absensi karyawan, hingga pelaporan.

Kami menyadari makalah ini masih jauh dari sempurna. Oleh karena itu, kritik dan saran yang membangun sangat kami harapkan demi perbaikan ke depannya. Semoga makalah ini bermanfaat bagi pembaca.

_[Kota], [tanggal]_  
Penulis,

**_[Nama Mahasiswa]_**  

---

## DAFTAR ISI

1. Kata Pengantar
2. Daftar Isi
3. BAB I Pendahuluan
   - 1.1 Latar Belakang
   - 1.2 Rumusan Masalah
   - 1.3 Tujuan Penulisan
   - 1.4 Manfaat
4. BAB II Tinjauan Pustaka
   - 2.1 Konsep Point of Sale (POS)
   - 2.2 Aplikasi Web Responsif dan Android
   - 2.3 Teknologi yang Digunakan (React, Vite, TypeScript, Tailwind CSS, Capacitor)
   - 2.4 Penyimpanan Data Lokal
5. BAB III Pembahasan
   - 3.1 Gambaran Umum Sistem
   - 3.2 Arsitektur Sistem
   - 3.3 Pengguna dan Hak Akses
   - 3.4 Analisis Kebutuhan Fungsional
   - 3.5 Implementasi Fitur Per Modul
   - 3.6 Antarmuka Pengguna dan Responsivitas
   - 3.7 Hasil Uji Coba
6. BAB IV Penutup
   - 4.1 Kesimpulan
   - 4.2 Saran
7. Daftar Pustaka

---

## BAB I – PENDAHULUAN

### 1.1 Latar Belakang

Kemajuan teknologi informasi telah mengubah berbagai aspek kegiatan usaha, termasuk pada sektor usaha mikro dan menengah (UMKM) hingga usaha ritel bermerek. Salah satu kebutuhan utama sebuah toko ritel adalah sistem kasir yang mampu mencatat transaksi secara cepat, akurat, dan terdokumentasi. NAND'S BOUTIQUE, sebuah toko pakaian dengan tiga cabang, membutuhkan sistem Point of Sale (POS) yang dapat digunakan oleh kasir dan pengelola toko secara real-time untuk menjalankan transaksi penjualan, mengelola stok produk pada tiap cabang, melayani program keanggotaan pelanggan, memantau absensi karyawan, serta menyusun laporan penjualan.

Selama ini, pencatatan penjualan yang dilakukan secara manual atau menggunakan aplikasi kasir sederhana memiliki kelemahan, antara lain data yang tidak tersimpan rapi, kesulitan menghitung stok antar-cabang, dan laporan yang baru dapat disusun setelah waktu yang lama. Oleh karena itu, dibuatlah prototype sistem POS "NAND'S BOUTIQUE" berbasis web responsif yang juga dapat dijalankan pada perangkat Android. Dengan sistem ini, diharapkan proses transaksi dan pengelolaan data toko menjadi lebih efisien, transparan, dan dapat diakses dari berbagai perangkat.

### 1.2 Rumusan Masalah

Berdasarkan latar belakang di atas, rumusan masalah dalam penulisan makalah ini adalah:

1. Bagaimana merancang dan membangun sistem Point of Sale (POS) yang mampu menangani transaksi penjualan untuk usaha multi-cabang?
2. Fitur-fitur apa saja yang diperlukan untuk mendukung operasional kasir, pengelolaan produk dan stok, keanggotaan pelanggan, absensi karyawan, serta pelaporan?
3. Bagaimana mengimplementasikan sistem agar tampilan bersifat responsif sehingga dapat digunakan pada perangkat komputer maupun Android?

### 1.3 Tujuan Penulisan

Tujuan dari penulisan makalah ini adalah:

1. Memaparkan perancangan dan pembangunan prototype sistem POS untuk NAND'S BOUTIQUE.
2. Menjelaskan fitur-fitur fungsional sistem beserta hak akses penggunanya.
3. Menjelaskan penerapan tampilan responsif dan pengemasan aplikasi menjadi berkas Android (APK).

### 1.4 Manfaat

Manfaat yang diharapkan dari aplikasi ini adalah:

1. **Bagi kasir:** Mempercepat proses transaksi, pencetakan struk, dan pencatatan penjualan.
2. **Bagi pengelola/manajemen:** Mendapatkan laporan penjualan yang akurat, pengawasan stok antar-cabang, serta pengelolaan karyawan dan absensi yang lebih tertib.
3. **Bagi pelanggan:** Mendapatkan layanan lebih cepat serta dapat memanfaatkan program poin dan tier keanggotaan.

---

## BAB II – TINJAUAN PUSTAKA

### 2.1 Konsep Point of Sale (POS)

Point of Sale (POS) adalah sistem yang digunakan untuk mencatat dan memproses transaksi penjualan pada lokasi penjualan, meliputi penghitungan harga barang, pemberian diskon, pembayaran, hingga penerbitan struk. Sistem POS modern tidak hanya berfungsi sebagai cash register digital, tetapi juga terintegrasi dengan manajemen stok, data pelanggan, dan laporan keuangan. Dalam aplikasi ini, sistem POS dikembangkan berbasis web sehingga dapat diakses dari berbagai perangkat melalui browser.

### 2.2 Aplikasi Web Responsif dan Android

Aplikasi web responsif adalah aplikasi yang tampilannya menyesuaikan lebar layar perangkat pengguna, baik komputer, tablet, maupun ponsel. Pendekatan ini memungkinkan satu aplikasi digunakan untuk banyak jenis perangkat tanpa perlu membuat aplikasi terpisah. Agar dapat diinstal dan dijalankan seperti aplikasi Android pada umumnya, aplikasi web dapat dibungkus menggunakan Capacitor, yaitu sebuah kerangka kerja (framework) yang mengemas aplikasi web menjadi aplikasi mobile sehingga menghasilkan berkas APK.

### 2.3 Teknologi yang Digunakan

Aplikasi ini dibangun menggunakan teknologi sebagai berikut:

1. **React 19** – Pustaka JavaScript untuk membangun antarmuka pengguna berbasis komponen.
2. **TypeScript 5.7** – Bahasa pemrograman yang menambahkan penulisan tipe data (type checking) untuk meminimalkan kesalahan kode.
3. **Vite 8** – Alat build yang menyediakan proses pengembangan dan pengemasan aplikasi secara cepat serta efisien.
4. **Tailwind CSS v4** – Kerangka kerja CSS berbasis utilitas untuk mempercepat pembuatan tampilan yang konsisten dan menarik.
5. **Capacitor** – Framework untuk mengemas aplikasi web menjadi aplikasi Android (menghasilkan APK).
6. **HTML5 & localStorage** – Digunakan untuk menyimpan data aplikasi pada perangkat pengguna.

### 2.4 Penyimpanan Data Lokal

Prototype ini menggunakan localStorage, yaitu mekanisme penyimpanan data pada peramban web berbasis penyimpanan kunci-nilai (key-value) yang tidak terhapus saat halaman ditutup. Dengan pendekatan ini, seluruh data aplikasi tersimpan pada perangkat pengguna sehingga cocok untuk keperluan prototype dan demonstrasi tanpa membutuhkan server. Setiap perubahan data (data transaksi, produk, karyawan, dan lainnya) disimpan otomatis dan langsung tersedia kembali saat aplikasi dibuka.

---

## BAB III – PEMBAHASAN

### 3.1 Gambaran Umum Sistem

Sistem POS "NAND'S BOUTIQUE" merupakan aplikasi kasir multi-cabang yang mencakup tiga toko: **Sudirman** (Jakarta Pusat), **Kemang** (Jakarta Selatan), dan **BSD City** (Tangerang Selatan). Aplikasi mencatat seluruh data secara real-time pada enam modul utama, yaitu:

1. **Kasir (POS)** – proses transaksi penjualan.
2. **Produk & Stok** – pengelolaan barang dan ketersediaan stok per cabang.
3. **Riwayat & Laporan** – dokumentasi transaksi dan rekap penjualan.
4. **Karyawan & Absensi** – data pegawai dan pencatatan kehadiran.
5. **Pelanggan (Member)** – data keanggotaan dan poin.
6. **Pengaturan (Settings)** – konfigurasi toko, printer, dan tampilan aplikasi.

### 3.2 Arsitektur Sistem

Aplikasi dibangun dengan arsitektur komponen tunggal (single-page application, SPA) dengan pembagian folder sebagai berikut:

- `src/data` – berisi definisi tipe data dan data awal (produk, toko, karyawan, member, diskon).
- `src/components` – berisi komponen antarmuka untuk setiap modul (POSView, ProductManagement, StockView, EmployeeManagement, MemberView, AttendanceView, ReportView, HistoryView, SettingsView, dan lain-lain).
- `src/App.tsx` – komponen utama yang mengatur navigasi, status login, dan koordinasi antar modul.
- `src/data/settings.ts` – konfigurasi pengaturan aplikasi yang dapat diubah pengguna.

Setiap modul menerima data melalui props dari komponen utama, dan setiap pembaruan data langsung disimpan ke localStorage sehingga seluruh tampilan selalu sinkron (state management berbasis komponen).

### 3.3 Pengguna dan Hak Akses

Sistem memiliki lima jenis pengguna dengan hak akses berbeda sesuai dengan `ROLE_PERMISSIONS`:

| Role | Hak Akses |
|------|-----------|
| **Admin** | Semua menu: POS, Riwayat, Laporan, Inventori, Karyawan, Toko, Diskon, Produk, Member, Absensi, Pengaturan |
| **Manager** | POS, Riwayat, Laporan, Inventori, Karyawan, Produk, Absensi, Pengaturan |
| **Manager Operasional** | POS, Riwayat, Laporan, Inventori, Karyawan, Produk, Absensi, Pengaturan |
| **Kasir** | POS, Riwayat, Laporan, Inventori, Absensi |
| **Staff** | Inventori, Absensi |

Setiap karyawan memiliki PIN untuk masuk ke aplikasi. Pemisahan hak akses ini memastikan setiap pengguna hanya dapat mengerjakan tugas sesuai perannya, sehingga data pengelolaan (misalnya penggajian dan harga pokok) tidak dapat diakses oleh kasir atau staff.

### 3.4 Analisis Kebutuhan Fungsional

Kebutuhan fungsional sistem dirinci sebagai berikut:

1. **Login berbasis PIN** – Karyawan memilih akun dari daftar (dengan foto/avatar) dan memasukkan PIN.
2. **Transaksi penjualan (POS)** – Pencarian produk, pemilihan varian (ukuran, warna, SKU), keranjang belanja, pemberian diskon, penentuan metode pembayaran (Tunai, Debit, QRIS), penghitungan uang kembali, pencetakan struk, serta pencatatan poin pelanggan.
3. **Pengelolaan produk** – CRUD produk dengan varian (ukuran, warna, SKU), harga dasar, kategori, gambar, stok per cabang, dan edit massal (ubah harga/kategori/stok atau hapus banyak produk sekaligus).
4. **Manajemen stok** – Pencatatan stok per toko, mutasi stok antar toko, dan laporan stok.
5. **Riwayat transaksi** – Pencarian berdasarkan tanggal/toko/kasir, pencetakan ulang struk, serta penghapusan transaksi disertai alasan (tercatat di laporan khusus "Transaksi Dihapus").
6. **Laporan** – Rekap penjualan harian/7 hari/30 hari/rentang kustom, produk terlaris, perbandingan per kategori, rincian metode pembayaran, statistik transaksi, serta ekspor data ke berkas Excel.
7. **Keanggotaan** – Pendaftaran member, akumulasi belanja, poin (1 poin per Rp10.000), dan tier otomatis: **Bronze** (0), **Silver** (≥Rp1.000.000), **Gold** (≥Rp5.000.000), **Platinum** (≥Rp15.000.000).
8. **Absensi** – Klok masuk/keluar dengan bukti foto, pilihan lokasi/toko saat absen, jam operasional per toko (jam buka–tutup), penentuan status tepat waktu/terlambat berdasarkan jam buka toko, dan jam yang berjalan secara real-time.
9. **Manajemen toko** – CRUD cabang toko beserta alamat, telepon, dan jam operasional.
10. **Pengaturan** – Nama dan logo aplikasi, nama printer, lebar kertas struk (58/72/80 mm), jumlah salinan struk, serta cetak otomatis; logo dan nama tampil pada layar login, navigasi, dan struk.

### 3.5 Implementasi Fitur Per Modul

#### a. Modul Kasir (POS)

Modul POS menyediakan tampilan belanja dengan pencarian produk berdasarkan nama atau SKU, pemilihan ukuran dan warna, serta penambahan jumlah. Keranjang menampilkan subtotal, diskon, pajak, dan total tagihan. Tersedia juga pemindaian kode batang (barcode scanner atau masukan manual) untuk mempercepat pencarian produk. Saat pembayaran berhasil, sistem membuat struk yang dapat dicetak sesuai pengaturan printer, sekaligus memperbarui stok produk dan menambahkan poin ke akun pelanggan jika terdapat member.

#### b. Modul Produk dan Stok

Setiap produk memiliki beberapa varian dengan SKU unik, misalnya `KMJ-OXF-WHT-M` untuk kemeja Oxford putih ukuran M. Stok dicatat terpisah untuk setiap cabang sehingga jumlah barang setiap toko dapat dipantau dan diatur, termasuk fitur transfer stok antar toko. Fitur pengaturan massal (edit banyak) memungkinkan pengelola mengubah harga, kategori, stok, atau menghapus banyak produk dalam satu langkah.

#### c. Modul Riwayat dan Laporan

Modul riwayat menampilkan seluruh transaksi yang dapat dipilih untuk dilihat rincian ataupun dicetak ulang struknya. Modul laporan menampilkan ringkasan penjualan dalam bentuk angka dan grafik, dilengkapi pemilihan rentang tanggal, serta fitur ekspor ke Microsoft Excel yang mencakup beberapa lembar kerja (rekap transaksi, produk, per kategori, metode pembayaran, dan transaksi yang dihapus).

#### d. Modul Karyawan dan Absensi

Admin dapat menambah, mengubah, menghapus, mengatur PIN, jabatan, gaji, dan status karyawan. Pada modul absensi, karyawan menekan tombol masuk, mengambil foto, memilih lokasi toko, lalu sistem mencatat jam masuk; demikian pula saat pulang. Data kehadiran dapat difilter berdasarkan tanggal, toko, dan karyawan, serta diunduh sebagai berkas Excel. Karena penentuan terlambat mengacu pada jam buka cabang masing-masing, sistem ini menghargai perbedaan jam operasional tiap toko.

#### e. Modul Pelanggan

Modul ini mengelola data pelanggan, total belanja, poin, dan tier. Tier pelanggan dihitung otomatis dari total belanja sehingga pelanggan dapat naik kelas (misalnya dari Bronze ke Silver) secara otomatis. Poin pelanggan juga bertambah setiap transaksi yang membubuhkan member.

#### f. Modul Pengaturan

Melalui menu pengaturan, pengelola dapat mengunggah logo, mengubah nama dan slogan aplikasi, memilih nama printer, lebar kertas struk, jumlah salinan, dan mengaktifkan cetak otomatis. Seluruh pengaturan disimpan otomatis dan langsung diterapkan pada tampilan login, menu aplikasi, serta kop struk.

### 3.6 Antarmuka Pengguna dan Responsivitas

Antarmuka aplikasi dirancang dengan identitas visual toko bertema warna ungu (accent violet) dengan tipografi modern (Outfit untuk judul dan JetBrains Mono untuk angka/kode). Pengguna desktop mendapatkan tata letak dua kolom (menu samping dan area kerja), sedangkan pada layar ponsel menu berpindah ke bilah bawah (bottom navigation) sehingga tetap nyaman digunakan satu tangan. Responsivitas ini membuat aplikasi identik baik diakses dari komputer maupun dari ponsel.

### 3.7 Hasil Uji Coba

Pengujian dilakukan melalui beberapa aspek:

1. **Fungsional** – Seluruh alur kerja diuji: login, transaksi, pembayaran, pembuatan struk, CRUD produk/toko/karyawan/member, mutasi stok, absensi, laporan, hingga ekspor Excel. Seluruhnya berjalan sesuai kebutuhan.
2. **Kualitas kode** – Pemeriksaan tipe data TypeScript (`tsc --noEmit`) berhasil tanpa kesalahan.
3. **Deployment** – Aplikasi di-build dengan Vite dan berhasil dikemas menggunakan Capacitor menjadi berkas APK (±4,6 MB) yang dapat diinstal pada perangkat Android, selain dapat diakses langsung melalui peramban web.

Dari hasil uji coba tersebut, aplikasi dinyatakan layak digunakan sebagai prototype sistem kasir multi-cabang untuk NAND'S BOUTIQUE.

---

## BAB IV – PENUTUP

### 4.1 Kesimpulan

Berdasarkan pembahasan di atas dapat disimpulkan:

1. Sistem POS "NAND'S BOUTIQUE" berhasil dibangun sebagai aplikasi web responsif yang dapat berjalan di peramban maupun Android, melayani tiga cabang toko secara terpadu.
2. Sistem mencakup modul lengkap: transaksi kasir dengan struk, pengelolaan produk ber-varian dan stok per cabang, keanggotaan dengan poin dan tier, diskon, karyawan, absensi dengan bukti foto dan jam operasional per toko, laporan, buku besar transaksi, serta pengaturan aplikasi.
3. Tampilan yang responsif dan pengemasan menjadi APK memungkinkan aplikasi digunakan pada berbagai perangkat sehingga mendukung mobilitas kasir dan pengelola toko.

### 4.2 Saran

Untuk pengembangan selanjutnya disarankan:

1. Mengganti penyimpanan localStorage dengan basis data (misalnya SQLite/Firebase) dan backend server agar data dapat dibagikan antar perangkat secara real-time dalam jaringan.
2. Menambahkan integrasi dengan printer struk fisik (Bluetooth/ESC-POS) agar pencetakan struk dilakukan langsung dari perangkat Android.
3. Menambahkan fitur manajemen retur/penukaran barang dan pembelian berbasis PPN yang lebih detail.
4. Melengkapi pengujian dengan pengguna sesungguhnya (user acceptance test) dan pengujian keamanan data.

---

## DAFTAR PUSTAKA

1. Meta Media / React Team. *React Documentation*. Tersedia di: https://react.dev/
2. The TypeScript Team. *TypeScript Documentation*. Tersedia di: https://www.typescriptlang.org/docs/
3. Vite Team. *Vite Documentation*. Tersedia di: https://vite.dev/
4. Tailwind Labs. *Tailwind CSS Documentation*. Tersedia di: https://tailwindcss.com/docs
5. Ionic. *Capacitor Documentation*. Tersedia di: https://capacitorjs.com/docs
6. Laudon, K. C., & Laudon, J. P. *Management Information Systems: Managing the Digital Firm*. Pearson. (Buku teks sistem informasi manajemen)
7. Pressman, R. S. *Software Engineering: A Practitioner's Approach*. McGraw-Hill. (Buku teks rekayasa perangkat lunak)

---

*Catatan: Nama penyusun, program studi, serta nama sekolah/perguruan tinggi dapat disesuaikan sesuai kebutuhan.*