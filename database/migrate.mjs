import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(__dirname, "supabase-setup.sql");

const host = process.env.DB_HOST;
const password = process.env.DB_PASSWORD;
if (!host || !password) {
  console.error("Set DB_HOST dan DB_PASSWORD dahulu.");
  process.exit(1);
}

if (!fs.existsSync(sqlPath)) {
  console.error("File tidak ditemukan:", sqlPath);
  process.exit(1);
}

const client = new pg.Client({
  host,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "postgres",
  password,
  database: process.env.DB_NAME || "postgres",
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120000,
});

try {
  await client.connect();
  console.log("OK terhubung ke", host);
  const sql = fs.readFileSync(sqlPath, "utf8");
  await client.query(sql);
  console.log("OK setup SQL selesai tanpa error.");
} catch (e) {
  console.error("GAGAL:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}