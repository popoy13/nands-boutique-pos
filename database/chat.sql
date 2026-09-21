-- Jalankan sekali di Supabase SQL Editor untuk mengaktifkan Chat Karyawan.
create extension if not exists pgcrypto;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.employees(id) on delete cascade,
  sender_name text not null,
  sender_photo text,
  kind text not null check (kind in ('text', 'image', 'audio', 'file', 'location')),
  body text not null default '',
  attachment_url text,
  attachment_name text,
  attachment_mime text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);

alter table public.chat_messages add column if not exists deleted_at timestamptz;

create index if not exists chat_messages_created_at_idx on public.chat_messages(created_at);

alter table public.chat_messages enable row level security;
drop policy if exists "chat_messages_read" on public.chat_messages;
drop policy if exists "chat_messages_insert" on public.chat_messages;
create policy "chat_messages_read" on public.chat_messages for select using (true);
create policy "chat_messages_insert" on public.chat_messages for insert with check (true);
drop policy if exists "chat_messages_update" on public.chat_messages;
create policy "chat_messages_update" on public.chat_messages for update using (true) with check (true);

create table if not exists public.chat_message_deletions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  employee_id text not null references public.employees(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id, employee_id)
);

alter table public.chat_message_deletions enable row level security;
drop policy if exists "chat_message_deletions_read" on public.chat_message_deletions;
drop policy if exists "chat_message_deletions_insert" on public.chat_message_deletions;
create policy "chat_message_deletions_read" on public.chat_message_deletions for select using (true);
create policy "chat_message_deletions_insert" on public.chat_message_deletions for insert with check (true);

insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict (id) do update set public = true;

drop policy if exists "chat_attachments_read" on storage.objects;
drop policy if exists "chat_attachments_insert" on storage.objects;
create policy "chat_attachments_read" on storage.objects
  for select using (bucket_id = 'chat-attachments');
create policy "chat_attachments_insert" on storage.objects
  for insert with check (bucket_id = 'chat-attachments');

do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
  alter publication supabase_realtime add table public.chat_message_deletions;
exception
  when duplicate_object then null;
end $$;
