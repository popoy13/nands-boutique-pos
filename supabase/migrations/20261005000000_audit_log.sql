-- Audit log aktivitas penting (login, logout, ganti PIN, CRUD sensitif).
-- Jalankan sekali di Supabase SQL Editor lalu save (insert akan retry otomatis
-- bila tabel belum ada, jadi dicek sekali saja setelah ini).
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  employee_id text,
  name text,
  role text,
  action text not null,
  detail text
);

create index if not exists audit_log_created_at_idx on public.audit_log (created_at desc);
create index if not exists audit_log_employee_idx on public.audit_log (employee_id);

alter table public.audit_log enable row level security;

-- Aplikasi ini berjalan dengan anon key (client-only). Selama RLS di tabel
-- lain masih terbuka untuk kompatibilitas deployment, beri anon izin tulis
-- record audit (insert-only). Hapus policy di bawah ini bila RLS ditutup.
drop policy if exists "audit_log_anon_insert" on public.audit_log;
create policy "audit_log_anon_insert"
  on public.audit_log for insert to anon
  with check (true);

-- Baca record audit hanya oleh sesi terautentikasi (admin). Selama belum
-- pakai Supabase Auth, pengguna boleh membaca lewat anon juga; sesuaikan
-- bila mau dibatasi.
drop policy if exists "audit_log_anon_select" on public.audit_log;
create policy "audit_log_anon_select"
  on public.audit_log for select to anon
  using (true);