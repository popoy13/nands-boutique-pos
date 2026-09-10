import pg from "pg";

const c = new pg.Client({
  host: process.env.DB_HOST,
  port: 5432,
  user: "postgres",
  password: process.env.DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await c.connect();

const sql = `
DELETE FROM deleted_transactions;
DELETE FROM transactions;
DELETE FROM attendance_records;
DELETE FROM store_stocks;
DELETE FROM product_variants;
DELETE FROM products;
DELETE FROM categories;
DELETE FROM discounts;
DELETE FROM members;
DELETE FROM employees WHERE id <> 'e0';
DELETE FROM stores WHERE id <> 's1';

UPDATE app_settings SET value = jsonb_set(value, '{name}', '"Nands Boutique Official"') WHERE key = 'brand';
`;

console.log("Jalankan reset data...");
await c.query(sql);
console.log("OK reset selesai.");

const counts = await c.query(`
  SELECT 'stores' t, count(*) n FROM stores
  UNION ALL SELECT 'employees', count(*) FROM employees
  UNION ALL SELECT 'categories', count(*) FROM categories
  UNION ALL SELECT 'products', count(*) FROM products
  UNION ALL SELECT 'product_variants', count(*) FROM product_variants
  UNION ALL SELECT 'store_stocks', count(*) FROM store_stocks
  UNION ALL SELECT 'members', count(*) FROM members
  UNION ALL SELECT 'discounts', count(*) FROM discounts
  UNION ALL SELECT 'transactions', count(*) FROM transactions
  UNION ALL SELECT 'attendance_records', count(*) FROM attendance_records
  UNION ALL SELECT 'deleted_transactions', count(*) FROM deleted_transactions;
`);
for (const r of counts.rows) console.log(`  ${r.t.padEnd(22)} ${r.n}`);

const brand = await c.query(`SELECT value FROM app_settings WHERE key='brand'`);
console.log("  app_settings brand =", brand.rows[0]?.value);
console.log("  pegawai tersisa   =", (await c.query(`SELECT id, name, role, pin FROM employees`)).rows);

await c.end();