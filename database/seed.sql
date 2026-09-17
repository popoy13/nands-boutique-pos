-- ============================================================================
-- NAND'S BOUTIQUE - POS Seed Data (PostgreSQL)
-- Data awal disamakan dengan `src/data/*.ts` pada aplikasi.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STORES
-- ----------------------------------------------------------------------------
INSERT INTO stores (id, name, address, phone, open_hour, close_hour) VALUES
    ('s1', 'NAND''S BOUTIQUE - Sudirman', 'Jl. Jend. Sudirman No. 12, Jakarta Pusat', '021-5551234', '08:00', '21:00'),
    ('s2', 'NAND''S BOUTIQUE - Kemang',   'Jl. Kemang Raya No. 45, Jakarta Selatan', '021-7890123', '09:00', '22:00'),
    ('s3', 'NAND''S BOUTIQUE - BSD City', 'Ruko BSD City Blok A5, Tangerang Selatan', '021-5396789', '10:00', '21:00');

-- ----------------------------------------------------------------------------
-- CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO categories (id, name) VALUES
    ('c-kemeja','Kemeja'), ('c-kaos','Kaos'), ('c-celana','Celana'), ('c-jaket','Jaket'),
    ('c-blazer','Blazer'), ('c-polo','Polo'), ('c-hoodie','Hoodie'), ('c-sweater','Sweater');

-- ----------------------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------------------
INSERT INTO products (id, name, brand, category_id, base_price, image) VALUES
    ('p1',  'Classic Oxford Shirt',    'NAND''S', 'c-kemeja', 289000, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=300&h=300&fit=crop&auto=format'),
    ('p2',  'Slim Fit Chinos',         'NAND''S', 'c-celana', 345000, 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=300&h=300&fit=crop&auto=format'),
    ('p3',  'Oversized Tee Essential', 'NAND''S', 'c-kaos',   179000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop&auto=format'),
    ('p4',  'Denim Jacket Vintage',    'NAND''S', 'c-jaket',  599000, 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=300&h=300&fit=crop&auto=format'),
    ('p5',  'Linen Blazer',            'NAND''S', 'c-blazer', 749000, 'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=300&h=300&fit=crop&auto=format'),
    ('p6',  'Jogger Pants Premium',    'NAND''S', 'c-celana', 265000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&h=300&fit=crop&auto=format'),
    ('p7',  'Polo Shirt Pique',        'NAND''S', 'c-polo',   219000, 'https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=300&h=300&fit=crop&auto=format'),
    ('p8',  'Hoodie Fleece Zip',       'NAND''S', 'c-hoodie', 399000, 'https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=300&h=300&fit=crop&auto=format'),
    ('p9',  'Cardigan Knit',           'NAND''S', 'c-sweater',459000, 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=300&h=300&fit=crop&auto=format'),
    ('p10', 'Formal Trousers Wool',    'NAND''S', 'c-celana', 489000, 'https://images.unsplash.com/photo-1560243563-062bfc001d68?w=300&h=300&fit=crop&auto=format'),
    ('p11', 'Casual Shorts',           'NAND''S', 'c-celana', 189000, 'https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=300&h=300&fit=crop&auto=format'),
    ('p12', 'Turtleneck Ribbed',       'NAND''S', 'c-sweater',329000, 'https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=300&h=300&fit=crop&auto=format');

-- ----------------------------------------------------------------------------
-- EMPLOYEES (PIN plain-text: KHUSUS PROTOTYPE saja)
-- Akun demo (PIN sudah di-hash PBKDF2): Admin Utama 0000 · Rina Marlina 1212 · Budi Santoso 2222
-- Segera ganti PIN setelah instalasi.
-- ----------------------------------------------------------------------------
INSERT INTO employees (id, name, role, store_id, phone, email, join_date, salary, status, pin) VALUES
    ('e0',  'Admin Utama',      'admin',               's1', '08100000000', 'admin@nandsboutique.id',  '2020-01-01', 15000000, 'active',   'pbkdf2$96965c578d099000$600000$861dc37b1505d7a40ac4e8ce913c0e857ea404637afbf206f1d0f95dd27da7e7'),
    ('e1',  'Andi Prasetyo',    'manager',             's1', '08123456789', 'andi.p@nandsboutique.id', '2021-03-15', 8500000,  'active',   'pbkdf2$9014e90374496000$600000$38d9da8c43a8f3d910e706e860d8e88a87cd254f9b3b4543d74a9ce2b9898a0f'),
    ('e1b', 'Rina Marlina',     'manager_operasional', 's1', '08134567891', 'rina.m@nandsboutique.id', '2021-05-20', 8000000,  'active',   'pbkdf2$87674703cbe26000$600000$e734612e80b8e4861c8f8c76d5f6d8db0c8eb9c2b55716308e33eb9270f59145'),
    ('e2',  'Budi Santoso',     'kasir',               's1', '08234567890', 'budi.s@nandsboutique.id', '2022-01-10', 4800000,  'active',   'pbkdf2$7d587ed457b69800$600000$a7fb9af5ea0bc1ac61123c61c8a9fb7c6db3e75a898b17be64d7da17c7859667'),
    ('e3',  'Citra Dewi',       'kasir',               's1', '08345678901', 'citra.d@nandsboutique.id', '2022-06-01', 4800000,  'active',   'pbkdf2$ae8dd4a96520f800$600000$a4364e0040792a84f5669071b0251353376729ad5454ad78a0cc00dfcec7c0b5'),
    ('e4',  'Dian Rahayu',      'staff',               's1', '08456789012', 'dian.r@nandsboutique.id', '2023-02-20', 3500000,  'active',   'pbkdf2$500b1d07bdbd7000$600000$5f6cf3d20de1bd779fb81951b9a1d5e3fbc1825b105d8231b1732a53d0643112'),
    ('e5',  'Eko Wijaya',       'manager',             's2', '08567890123', 'eko.w@nandsboutique.id',  '2021-07-05', 8500000,  'active',   'pbkdf2$00f965fcffa60800$600000$659855d998aa160b474f79aae74150a8daa101d17a4a99545e0dcf4038bc138a'),
    ('e6',  'Fitri Handayani',  'kasir',               's2', '08678901234', 'fitri.h@nandsboutique.id','2022-09-15', 4800000,  'active',   'pbkdf2$dbce511678032800$600000$85b1101db7de3f6f35c0f5330aee75150c33d69d75c92806f483c0498a825bf7'),
    ('e7',  'Galih Permana',    'staff',               's2', '08789012345', 'galih.p@nandsboutique.id','2023-04-01', 3500000,  'active',   'pbkdf2$da07900261928800$600000$011f02eda9ed3a4f11e773a2c5df8a59d7ec79202edb6bc9f1e34d81481571f6'),
    ('e8',  'Hana Safitri',     'manager',             's3', '08890123456', 'hana.s@nandsboutique.id', '2022-03-10', 8500000,  'active',   'pbkdf2$450bca8984169800$600000$9177e2090daec83f5912a0abde76c92778536eef4c863243a07a36e4787a5365'),
    ('e9',  'Ivan Kurniawan',   'kasir',               's3', '08901234567', 'ivan.k@nandsboutique.id', '2023-01-08', 4800000,  'active',   'pbkdf2$295f696ca6f8e000$600000$6dc147da1a02178d5b60d2e6c74f72f178863eb48d760e622561546eae2a94bf'),
    ('e10', 'Julia Sari',       'staff',               's3', '08112345678', 'julia.s@nandsboutique.id','2023-07-15', 3500000,  'inactive', 'pbkdf2$20003e98a956b800$600000$dc1d00f004423cca544a335d1e6342e03ab58eac9b0bd2b66574947287bcce34');

-- ----------------------------------------------------------------------------
-- MEMBERS
-- ----------------------------------------------------------------------------
INSERT INTO members (id, name, phone, email, tier, points, total_spend, join_date, store_id, note) VALUES
    ('m1', 'Sari Indah',     '08111234567', 'sari.i@gmail.com',   'gold',     520,  6200000,  '2023-01-15', 's1', ''),
    ('m2', 'Budi Cahyono',   '08122345678', 'budi.c@gmail.com',   'silver',   180,  2100000,  '2023-05-20', 's1', ''),
    ('m3', 'Dewi Lestari',   '08133456789', 'dewi.l@gmail.com',   'platinum', 1820, 18500000, '2022-08-10', 's2', 'Pelanggan VIP'),
    ('m4', 'Rizal Fadli',    '08144567890', 'rizal.f@gmail.com',  'bronze',   45,   450000,   '2024-01-08', 's2', ''),
    ('m5', 'Mega Putri',     '08155678901', 'mega.p@gmail.com',   'gold',     710,  7800000,  '2023-03-22', 's3', ''),
    ('m6', 'Hendra Gunawan', '08166789012', 'hendra.g@gmail.com', 'silver',   230,  2600000,  '2023-09-14', 's1', '');

-- ----------------------------------------------------------------------------
-- DISCOUNTS
-- ----------------------------------------------------------------------------
INSERT INTO discounts (id, name, type, value, min_purchase, code, start_date, end_date, store_id, usage_limit, used_count, active) VALUES
    ('d1', 'Diskon Weekend 15%', 'percent', 15,     300000, NULL,      '2026-09-06', '2026-09-30', 'all', 0,   12,  true),
    ('d2', 'Voucher NANDS50K',   'voucher', 50000,  500000, 'NANDS50K','2026-09-01', '2026-09-30', 'all', 100, 23,  true),
    ('d3', 'Member Gold -10%',   'percent', 10,     0,      NULL,      '2026-01-01', '2026-12-31', 'all', 0,   8,   true),
    ('d4', 'Flash Sale Kemang',  'amount',  100000, 750000, NULL,      '2026-09-09', '2026-09-10', 's2',  50,  5,   true),
    ('d5', 'Voucher GRAND20',    'voucher', 20,     200000, 'GRAND20', '2026-08-01', '2026-08-31', 'all', 200, 200, false);

-- ----------------------------------------------------------------------------
-- PRODUCT VARIANTS + STOCK (dihasilkan otomatis = mkVariants() di aplikasi)
-- Format warna: 'SUFFIX|Nama Warna'
-- ----------------------------------------------------------------------------
CREATE TEMP TABLE vseed (
    product_id  TEXT,
    sku_base    TEXT,
    colors      TEXT[],
    sizes       TEXT[],
    stocks      INT[]
);

INSERT INTO vseed (product_id, sku_base, colors, sizes, stocks) VALUES
    ('p1',  'KMJ-OXF', ARRAY['WHT|Putih','NVY|Biru Navy','BLK|Hitam'],                        ARRAY['S','M','L','XL'],          ARRAY[12,8,6]),
    ('p2',  'CLN-CHN', ARRAY['KHK|Khaki','GRY|Abu Gelap'],                                    ARRAY['S','M','L','XL','XXL'],    ARRAY[15,10,7]),
    ('p3',  'KOS-OVR', ARRAY['WHT|Putih','BLK|Hitam','SGN|Sage Green','DPK|Dusty Pink'],      ARRAY['S','M','L','XL'],          ARRAY[20,15,12]),
    ('p4',  'JKT-DNM', ARRAY['IND|Indigo','LWS|Light Wash'],                                  ARRAY['S','M','L','XL'],          ARRAY[6,5,3]),
    ('p5',  'BLZ-LNN', ARRAY['CRM|Cream','OLV|Olive'],                                        ARRAY['S','M','L','XL'],          ARRAY[4,3,2]),
    ('p6',  'CLN-JGR', ARRAY['BLK|Hitam','CHA|Charcoal'],                                     ARRAY['S','M','L','XL','XXL'],    ARRAY[12,10,8]),
    ('p7',  'PLO-PIQ', ARRAY['WHT|Putih','NVY|Navy','MRN|Merah Marun'],                       ARRAY['S','M','L','XL'],          ARRAY[10,8,6]),
    ('p8',  'HDI-FLC', ARRAY['BLK|Hitam','STG|Stone Gray'],                                   ARRAY['S','M','L','XL','XXL'],    ARRAY[8,7,5]),
    ('p9',  'SWT-KNT', ARRAY['CAR|Caramel','BLK|Hitam'],                                      ARRAY['S','M','L','XL'],          ARRAY[5,4,3]),
    ('p10', 'CLN-FRM', ARRAY['CHA|Charcoal','NVY|Navy'],                                      ARRAY['S','M','L','XL'],          ARRAY[6,5,4]),
    ('p11', 'CLN-CSL', ARRAY['BGE|Beige','BLK|Hitam','OLV|Olive'],                            ARRAY['S','M','L','XL'],          ARRAY[14,11,8]),
    ('p12', 'SWT-TRT', ARRAY['CRM|Krem','BLK|Hitam'],                                         ARRAY['S','M','L','XL'],          ARRAY[7,5,4]);

INSERT INTO product_variants (id, product_id, size, color, sku)
SELECT
    'pv-' || row_number() OVER (ORDER BY v.product_id, c.pos, s.pos)::text,
    v.product_id,
    s.size,
    split_part(c.item, '|', 2),
    v.sku_base || '-' || split_part(c.item, '|', 1) || '-' || s.size
FROM vseed v
CROSS JOIN LATERAL unnest(v.colors) WITH ORDINALITY AS c(item, pos)
CROSS JOIN LATERAL unnest(v.sizes)  WITH ORDINALITY AS s(size, pos);

INSERT INTO store_stocks (store_id, variant_id, quantity)
SELECT st.store_id, pv.id, v.stocks[st.idx]
FROM vseed v
JOIN product_variants pv ON pv.product_id = v.product_id
CROSS JOIN LATERAL unnest(ARRAY['s1','s2','s3']) WITH ORDINALITY AS st(store_id, idx);

DROP TABLE vseed;

-- ----------------------------------------------------------------------------
-- ATTENDANCE (contoh 10 hari terakhir relatif terhadap tanggal seeding)
-- ----------------------------------------------------------------------------
INSERT INTO attendance_records (id, employee_id, employee_name, role, store_id, store_name, attendance_date, clock_in, clock_out) VALUES
    ('a1',  'e1',  'Andi Prasetyo',   'manager',             's1', 'NAND''S BOUTIQUE - Sudirman', CURRENT_DATE - 0, '08:02:11', '17:03:45'),
    ('a2',  'e1b', 'Rina Marlina',    'manager_operasional', 's1', 'NAND''S BOUTIQUE - Sudirman', CURRENT_DATE - 0, '07:58:30', '16:59:12'),
    ('a3',  'e2',  'Budi Santoso',    'kasir',               's1', 'NAND''S BOUTIQUE - Sudirman', CURRENT_DATE - 0, '07:55:02', '17:00:44'),
    ('a4',  'e3',  'Citra Dewi',      'kasir',               's1', 'NAND''S BOUTIQUE - Sudirman', CURRENT_DATE - 0, '08:12:47', '16:30:21'),
    ('a5',  'e4',  'Dian Rahayu',     'staff',               's1', 'NAND''S BOUTIQUE - Sudirman', CURRENT_DATE - 1, '08:05:09', '17:15:33'),
    ('a6',  'e5',  'Eko Wijaya',      'manager',             's2', 'NAND''S BOUTIQUE - Kemang',   CURRENT_DATE - 1, '08:00:52', '17:10:18'),
    ('a7',  'e6',  'Fitri Handayani', 'kasir',               's2', 'NAND''S BOUTIQUE - Kemang',   CURRENT_DATE - 1, '07:58:14', '16:55:07'),
    ('a8',  'e8',  'Hana Safitri',    'manager',             's3', 'NAND''S BOUTIQUE - BSD City', CURRENT_DATE - 2, '08:20:03', '17:05:29'),
    ('a9',  'e9',  'Ivan Kurniawan',  'kasir',               's3', 'NAND''S BOUTIQUE - BSD City', CURRENT_DATE - 2, '08:01:37', '16:40:55'),
    ('a10', 'e7',  'Galih Permana',   'staff',               's2', 'NAND''S BOUTIQUE - Kemang',   CURRENT_DATE - 2, '08:11:26', '17:20:41');

-- ----------------------------------------------------------------------------
-- APP_SETTINGS (konfigurasi default aplikasi)
-- ----------------------------------------------------------------------------
INSERT INTO app_settings (key, value) VALUES
    ('printer', '{"printerName":"Printer Thermal","paperWidth":80,"copies":1,"autoPrint":false}'),
    ('brand',   '{"logo":"logo.webp","name":"NAND''S BOUTIQUE","tagline":"Point of Sale System"}');