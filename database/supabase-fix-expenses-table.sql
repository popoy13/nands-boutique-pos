-- ============================================================================
-- NAND'S BOUTIQUE - PERBAIKAN: TABEL `expenses` BELUM ADA DI DATABASE
-- Jalankan sekali di Supabase SQL Editor (https://supabase.com/dashboard
-- > Project > SQL Editor) lalu klik RUN. Tidak merusak data yang sudah ada.
--
-- Efek: query GET /rest/v1/expenses (yang sekarang 404) menjadi 200 dan
-- menu Pengeluaran ikut tersinkron via tabel (tetap dual-write ke setelan).
-- ============================================================================

-- 1) BUAT TABEL (aman dijalankan ulang)
CREATE TABLE IF NOT EXISTS expenses (
    id              TEXT PRIMARY KEY,
    store_id        TEXT NOT NULL,
    store_name      TEXT NOT NULL DEFAULT '',
    amount          NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    description     TEXT NOT NULL DEFAULT '',
    photo           TEXT,
    created_by_name TEXT NOT NULL DEFAULT '',
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) INDEX UNTUK QUERY (aman dijalankan ulang)
CREATE INDEX IF NOT EXISTS idx_expenses_store  ON expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date   ON expenses(expense_date);

-- 3) ROW LEVEL SECURITY - selaras dengan tabel lain (akses penuh anon & auth)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS p_all_anon ON expenses;
  CREATE POLICY p_all_anon ON expenses FOR ALL TO anon USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS p_all_auth ON expenses;
  CREATE POLICY p_all_auth ON expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);
END $$;

-- 4) REALTIME - daftarkan ke publikasi (agar bertambah/berubah/terhapus langsung tampil)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'realtime publication skipped: %', SQLERRM;
END $$;

-- 5) BACKFILL OPSIONAL: salin pengeluaran lama yang tersimpan di setelan
--    (app_settings key 'expenses', format snake_case) ke tabel baru.
--    Aman dijalankan ulang: baris dengan id sama diabaikan (ON CONFLICT DO NOTHING).
INSERT INTO expenses (id, store_id, store_name, amount, description, photo, created_by_name, expense_date, created_at)
SELECT
    e.value->>'id'                                               AS id,
    COALESCE(e.value->>'store_id', '')                           AS store_id,
    COALESCE(e.value->>'store_name', '')                         AS store_name,
    COALESCE(NULLIF(e.value->>'amount', '')::numeric, 0)         AS amount,
    COALESCE(e.value->>'description', '')                        AS description,
    NULLIF(e.value->>'photo', '')                                AS photo,
    COALESCE(e.value->>'created_by_name', '')                    AS created_by_name,
    COALESCE(NULLIF(e.value->>'expense_date', '')::date, CURRENT_DATE) AS expense_date,
    now()                                                        AS created_at
FROM app_settings
CROSS JOIN LATERAL jsonb_array_elements(value) AS e(value)
WHERE key = 'expenses'
  AND jsonb_typeof(e.value) = 'array'
ON CONFLICT (id) DO NOTHING;