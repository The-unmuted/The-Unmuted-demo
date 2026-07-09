-- Phase 1 (production track): key vault + encrypted evidence index + private bucket
-- Per docs/decisions.md D-016/D-017.
-- The server stores ONLY ciphertext: wrapped master-key boxes, wrapped per-file keys,
-- and client-encrypted metadata. Nothing here is decryptable server-side.

-- ── Key vault: the two "boxes" (master key wrapped by password / recovery code) ──
create table if not exists public.key_vaults (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  password_box jsonb not null,
  recovery_box jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.key_vaults enable row level security;

create policy "own key vault - select" on public.key_vaults
  for select using (auth.uid() = user_id);
create policy "own key vault - insert" on public.key_vaults
  for insert with check (auth.uid() = user_id);
create policy "own key vault - update" on public.key_vaults
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- no delete policy: losing the boxes = losing all evidence; deletion only via account deletion cascade

-- ── Evidence records: cloud index (encrypted client-side) + wrapped file keys ──
create table if not exists public.evidence_records (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  tx_id            text not null unique,          -- storage object id (path: {user_id}/{tx_id})
  wrapped_file_key text not null,                 -- file AES key, wrapped by master key
  encrypted_meta   text not null,                 -- filename/note/type/etc., encrypted client-side
  original_hash    text not null,                 -- SHA-256 of plaintext (reveals nothing; needed for TSA anchoring/backfill)
  encrypted_hash   text not null,                 -- SHA-256 of the uploaded ciphertext (integrity check on download)
  capture_grade    smallint not null default 2,   -- 1 = in-app capture (现场取证), 2 = imported (事后保全)
  client_time      timestamptz,                   -- device clock at capture
  created_at       timestamptz not null default now(),  -- server clock (dual-time record)
  deleted_at       timestamptz                    -- soft delete: 72h cooling-off before purge (anti-coercion)
);

create index if not exists evidence_records_user_idx on public.evidence_records (user_id, created_at desc);

alter table public.evidence_records enable row level security;

create policy "own evidence - select" on public.evidence_records
  for select using (auth.uid() = user_id);
create policy "own evidence - insert" on public.evidence_records
  for insert with check (auth.uid() = user_id);
create policy "own evidence - update" on public.evidence_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own evidence - delete" on public.evidence_records
  for delete using (auth.uid() = user_id);

-- ── Storage: make the evidence bucket PRIVATE and per-user ──
-- (bucket was public with public URLs — anyone holding a URL could fetch ciphertext)
update storage.buckets set public = false where id = 'evidence-vault';

-- New object path scheme: {auth.uid()}/{tx_id} — owner-only access
create policy "own evidence objects - select" on storage.objects
  for select using (
    bucket_id = 'evidence-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own evidence objects - insert" on storage.objects
  for insert with check (
    bucket_id = 'evidence-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "own evidence objects - delete" on storage.objects
  for delete using (
    bucket_id = 'evidence-vault'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Legacy demo objects live under vault/{tx_id} and become unreachable once the
-- bucket is private. They were encrypted with per-file JSON key bundles (D-017
-- legacy path). If any need to survive, download before applying this migration.
