-- ============================================================================
-- NAND'S BOUTIQUE - POS Database Schema (PostgreSQL)
-- ----------------------------------------------------------------------------
-- Cara pakai:
--   Opsi A (PostgreSQL terpasang di mesin):
--     createdb -U nands nands_pos
--     psql -U nands -d nands_pos -f database/schema.sql
--     psql -U nands -d nands_pos -f database/seed.sql
--   Opsi B (Docker):
--     docker compose -f database/docker-compose.yml up -d
--     # schema + seed otomatis dijalankan saat container pertama kali dibuat
--
-- Koneksi default (lihat docker-compose.yml):
--   postgres://nands:nands123@localhost:5432/nands_pos
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
CREATE TYPE user_role       AS ENUM ('admin', 'manager', 'manager_operasional', 'kasir', 'staff');
CREATE TYPE member_tier     AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE payment_method  AS ENUM ('cash', 'debit', 'qris');
CREATE TYPE discount_type   AS ENUM ('percent', 'amount', 'voucher');

-- ----------------------------------------------------------------------------
-- STORES (cabang toko + jam operasional)
-- ----------------------------------------------------------------------------
CREATE TABLE stores (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    address     TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    open_hour   TIME NOT NULL DEFAULT '08:00',
    close_hour  TIME NOT NULL DEFAULT '21:00',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- CATEGORIES (kategori produk)
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE
);

-- ----------------------------------------------------------------------------
-- PRODUCTS (produk induk; tiap produk memiliki banyak varian)
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    brand       TEXT NOT NULL DEFAULT 'NAND''S',
    category_id TEXT REFERENCES categories(id),
    base_price  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
    image       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- PRODUCT_VARIANTS (ukuran + warna + SKU unik per varian)
-- ----------------------------------------------------------------------------
CREATE TABLE product_variants (
    id          TEXT PRIMARY KEY,
    product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size        TEXT NOT NULL CHECK (size IN ('XS','S','M','L','XL','XXL')),
    color       TEXT NOT NULL,
    sku         TEXT NOT NULL UNIQUE
);

-- ----------------------------------------------------------------------------
-- STORE_STOCKS (stok per varian per cabang)
-- ----------------------------------------------------------------------------
CREATE TABLE store_stocks (
    store_id    TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    variant_id  TEXT NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    PRIMARY KEY (store_id, variant_id)
);

-- ----------------------------------------------------------------------------
-- EMPLOYEES (karyawan; PIN disimpan plain-text untuk prototype saja)
--   === PENTING: untuk produksi, ganti dengan hash (bcrypt) ===
-- ----------------------------------------------------------------------------
CREATE TABLE employees (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    photo       TEXT,
    role        user_role NOT NULL,
    store_id    TEXT NOT NULL REFERENCES stores(id),
    phone       TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    join_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    salary      NUMERIC(14,2) NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    pin         TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- MEMBERS (pelanggan + poin + tier)
-- ----------------------------------------------------------------------------
CREATE TABLE members (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL UNIQUE,
    email       TEXT NOT NULL DEFAULT '',
    tier        member_tier NOT NULL DEFAULT 'bronze',
    points      INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
    total_spend NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_spend >= 0),
    join_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    store_id    TEXT REFERENCES stores(id),
    note        TEXT
);

-- ----------------------------------------------------------------------------
-- DISCOUNTS (diskon & voucher; store_id 'all' berarti semua cabang)
-- ----------------------------------------------------------------------------
CREATE TABLE discounts (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    type          discount_type NOT NULL,
    value         NUMERIC(14,2) NOT NULL,
    min_purchase  NUMERIC(14,2) NOT NULL DEFAULT 0,
    code          TEXT,
    start_date    DATE NOT NULL,
    end_date      DATE NOT NULL,
    store_id      TEXT NOT NULL DEFAULT 'all',   -- 'all' atau kode cabang
    usage_limit   INTEGER NOT NULL DEFAULT 0,    -- 0 = tanpa batas
    used_count    INTEGER NOT NULL DEFAULT 0,
    active        BOOLEAN NOT NULL DEFAULT true
);

-- ----------------------------------------------------------------------------
-- TRANSACTIONS (trx penjualan; items = array cart dalam JSONB)
-- ----------------------------------------------------------------------------
CREATE TABLE transactions (
    id              TEXT PRIMARY KEY,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    store_id        TEXT NOT NULL REFERENCES stores(id),
    store_name      TEXT NOT NULL,
    cashier_id      TEXT NOT NULL REFERENCES employees(id),
    cashier_name    TEXT NOT NULL,
    items           JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal        NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(14,2) NOT NULL DEFAULT 0,
    discount_type   TEXT,
    discount_label  TEXT,
    tax             NUMERIC(14,2) NOT NULL DEFAULT 0,
    total           NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment         NUMERIC(14,2) NOT NULL DEFAULT 0,
    change_amount   NUMERIC(14,2) NOT NULL DEFAULT 0,
    payment_method  payment_method NOT NULL,
    note            TEXT,
    member_id       TEXT REFERENCES members(id),
    member_name     TEXT,
    points_earned   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- DELETED_TRANSACTIONS (transaksi yang dihapus + alasan & oleh siapa)
-- ----------------------------------------------------------------------------
CREATE TABLE deleted_transactions (
    id              TEXT PRIMARY KEY,
    transaction     JSONB NOT NULL,
    deleted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_by      TEXT NOT NULL,
    reason          TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- ATTENDANCE_RECORDS (absensi karyawan, foto masuk/pulang)
-- ----------------------------------------------------------------------------
CREATE TABLE attendance_records (
    id              TEXT PRIMARY KEY,
    employee_id     TEXT NOT NULL REFERENCES employees(id),
    employee_name   TEXT NOT NULL,
    role            user_role NOT NULL,
    store_id        TEXT NOT NULL REFERENCES stores(id),
    store_name      TEXT NOT NULL,
    attendance_date DATE NOT NULL,
    clock_in        TIME,
    clock_out       TIME,
    photo_in        TEXT,
    photo_out       TEXT,
    note            TEXT
);

-- ----------------------------------------------------------------------------
-- APP_SETTINGS (konfigurasi aplikasi: printer, brand/logo, dll.)
-- ----------------------------------------------------------------------------
CREATE TABLE app_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- INDEXES untuk query umum
-- ----------------------------------------------------------------------------
CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_store_stocks_variant    ON store_stocks(variant_id);
CREATE INDEX idx_employees_store         ON employees(store_id);
CREATE INDEX idx_members_store           ON members(store_id);
CREATE INDEX idx_transactions_date       ON transactions(transaction_date);
CREATE INDEX idx_transactions_store      ON transactions(store_id);
CREATE INDEX idx_transactions_cashier    ON transactions(cashier_id);
CREATE INDEX idx_transactions_member     ON transactions(member_id);
CREATE INDEX idx_discounts_code          ON discounts(code) WHERE code IS NOT NULL;
CREATE INDEX idx_attendance_date         ON attendance_records(attendance_date);
CREATE INDEX idx_attendance_employee     ON attendance_records(employee_id);
CREATE INDEX idx_attendance_store        ON attendance_records(store_id);
CREATE INDEX idx_attendance_store_date   ON attendance_records(store_id, attendance_date);