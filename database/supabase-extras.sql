-- ============================================================================
-- NAND'S BOUTIQUE - SUPABASE EXTRAS
-- Tambahan khusus Supabase: transaksi contoh + RLS + publikasi realtime.
-- JALANKAN SETELAH schema.sql DAN seed.sql di SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) TRANSACTIONS - contoh 8 transaksi (mirror seedTransactions di aplikasi)
-- ----------------------------------------------------------------------------
INSERT INTO transactions (id, transaction_date, store_id, store_name, cashier_id, cashier_name, items, subtotal, discount, discount_type, discount_label, tax, total, payment, change_amount, payment_method, note, member_id, member_name, points_earned) VALUES
    ('TRX-S1-20260901-0023', now() - interval '7 days', 's1', 'NAND''S BOUTIQUE - Sudirman', 'e2', 'Budi Santoso',
     '[{"productId":"p3","variantSku":"KOS-OVR-WHT-M","name":"Oversized Tee Essential","brand":"NOSTRA","size":"M","color":"Putih","price":179000,"quantity":2,"subtotal":358000,"image":"https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=80&h=80&fit=crop&auto=format"},{"productId":"p2","variantSku":"CLN-CHN-KHK-L","name":"Slim Fit Chinos","brand":"NOSTRA","size":"L","color":"Khaki","price":345000,"quantity":1,"subtotal":345000,"image":"https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     703000, 50000, 'amount', NULL, 65300, 718300, 800000, 81700, 'cash', '', NULL, NULL, 0),
    ('TRX-S1-20260902-0041', now() - interval '6 days', 's1', 'NAND''S BOUTIQUE - Sudirman', 'e3', 'Citra Dewi',
     '[{"productId":"p5","variantSku":"BLZ-LNN-CRM-M","name":"Linen Blazer","brand":"NOSTRA","size":"M","color":"Cream","price":749000,"quantity":1,"subtotal":749000,"image":"https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=80&h=80&fit=crop&auto=format"},{"productId":"p1","variantSku":"KMJ-OXF-WHT-M","name":"Classic Oxford Shirt","brand":"NOSTRA","size":"M","color":"Putih","price":289000,"quantity":2,"subtotal":578000,"image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     1327000, 10, 'percent', NULL, 119430, 1260730, 1260730, 0, 'debit', 'Member Platinum', NULL, NULL, 0),
    ('TRX-S2-20260903-0012', now() - interval '5 days', 's2', 'NAND''S BOUTIQUE - Kemang', 'e6', 'Fitri Handayani',
     '[{"productId":"p4","variantSku":"JKT-DNM-IND-L","name":"Denim Jacket Vintage","brand":"NOSTRA","size":"L","color":"Indigo","price":599000,"quantity":1,"subtotal":599000,"image":"https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     599000, 0, 'amount', NULL, 59900, 658900, 658900, 0, 'qris', '', NULL, NULL, 0),
    ('TRX-S1-20260904-0088', now() - interval '4 days', 's1', 'NAND''S BOUTIQUE - Sudirman', 'e2', 'Budi Santoso',
     '[{"productId":"p8","variantSku":"HDI-FLC-BLK-L","name":"Hoodie Fleece Zip","brand":"NOSTRA","size":"L","color":"Hitam","price":399000,"quantity":2,"subtotal":798000,"image":"https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=80&h=80&fit=crop&auto=format"},{"productId":"p11","variantSku":"CLN-CSL-BGE-M","name":"Casual Shorts","brand":"NOSTRA","size":"M","color":"Beige","price":189000,"quantity":1,"subtotal":189000,"image":"https://images.unsplash.com/photo-1591195853828-11db59a44f43?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     987000, 0, 'amount', NULL, 98700, 1085700, 1100000, 14300, 'cash', '', NULL, NULL, 0),
    ('TRX-S3-20260905-0055', now() - interval '3 days', 's3', 'NAND''S BOUTIQUE - BSD City', 'e9', 'Ivan Kurniawan',
     '[{"productId":"p7","variantSku":"PLO-PIQ-WHT-M","name":"Polo Shirt Pique","brand":"NOSTRA","size":"M","color":"Putih","price":219000,"quantity":3,"subtotal":657000,"image":"https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     657000, 0, 'amount', NULL, 65700, 722700, 722700, 0, 'debit', '', NULL, NULL, 0),
    ('TRX-S2-20260906-0033', now() - interval '2 days', 's2', 'NAND''S BOUTIQUE - Kemang', 'e6', 'Fitri Handayani',
     '[{"productId":"p9","variantSku":"SWT-KNT-CAR-S","name":"Cardigan Knit","brand":"NOSTRA","size":"S","color":"Caramel","price":459000,"quantity":1,"subtotal":459000,"image":"https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=80&h=80&fit=crop&auto=format"},{"productId":"p12","variantSku":"SWT-TRT-CRM-S","name":"Turtleneck Ribbed","brand":"NOSTRA","size":"S","color":"Krem","price":329000,"quantity":1,"subtotal":329000,"image":"https://images.unsplash.com/photo-1614251055880-ee96e4803393?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     788000, 5, 'percent', NULL, 74860, 821460, 900000, 78540, 'cash', 'Member Gold', NULL, NULL, 0),
    ('TRX-S1-20260907-0071', now() - interval '1 day', 's1', 'NAND''S BOUTIQUE - Sudirman', 'e3', 'Citra Dewi',
     '[{"productId":"p10","variantSku":"CLN-FRM-CHA-L","name":"Formal Trousers Wool","brand":"NOSTRA","size":"L","color":"Charcoal","price":489000,"quantity":1,"subtotal":489000,"image":"https://images.unsplash.com/photo-1560243563-062bfc001d68?w=80&h=80&fit=crop&auto=format"},{"productId":"p1","variantSku":"KMJ-OXF-NVY-L","name":"Classic Oxford Shirt","brand":"NOSTRA","size":"L","color":"Biru Navy","price":289000,"quantity":1,"subtotal":289000,"image":"https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     778000, 0, 'amount', NULL, 77800, 855800, 855800, 0, 'qris', '', NULL, NULL, 0),
    ('TRX-S3-20260908-0019', now(), 's3', 'NAND''S BOUTIQUE - BSD City', 'e9', 'Ivan Kurniawan',
     '[{"productId":"p6","variantSku":"CLN-JGR-BLK-M","name":"Jogger Pants Premium","brand":"NOSTRA","size":"M","color":"Hitam","price":265000,"quantity":2,"subtotal":530000,"image":"https://images.unsplash.com/photo-1542272604-787c3835535d?w=80&h=80&fit=crop&auto=format"}]'::jsonb,
     530000, 0, 'amount', NULL, 53000, 583000, 600000, 17000, 'cash', '', NULL, NULL, 0);

-- ----------------------------------------------------------------------------
-- 2) ROW LEVEL SECURITY - aktifkan + policy akses penuh utk anon & authenticated
--    (ubah policy ini bila ingin membatasi akses per pengguna)
-- ----------------------------------------------------------------------------
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['stores','categories','products','product_variants','store_stocks','employees','members','discounts','transactions','deleted_transactions','attendance_records','app_settings'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS p_all_anon ON %I', t);
    EXECUTE format('CREATE POLICY p_all_anon ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS p_all_auth ON %I', t);
    EXECUTE format('CREATE POLICY p_all_auth ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3) REALTIME - daftarkan tabel ke publikasi supabase_realtime
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE stores, categories, products, product_variants, store_stocks, employees, members, discounts, transactions, deleted_transactions, attendance_records, app_settings;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'realtime publication skipped: %', SQLERRM;
END $$;