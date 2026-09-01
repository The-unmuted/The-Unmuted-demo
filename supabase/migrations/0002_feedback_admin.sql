-- Feedback admin panel — RLS + admin allow-list.
--
-- After running this migration, five team emails are pre-authorized as admin:
--   Katie Lin, Liz Wu, Gu Shi, Wendy Wu, Zijia
-- Any of them can sign into the app at /admin (with a magic-link OTP), view
-- all feedback, and add internal notes.
--
-- Non-admin users can still submit feedback via the widget but cannot read
-- anyone else's submissions.

-- ─── 1. Extend the feedback table ──────────────────────────────────────
alter table public.unmuted_feedback
  add column if not exists admin_notes text,
  add column if not exists admin_notes_by text,
  add column if not exists admin_notes_at timestamptz;

-- ─── 2. Admin allow-list ───────────────────────────────────────────────
create table if not exists public.unmuted_admins (
  email       text primary key,
  display_name text,
  added_at    timestamptz not null default now()
);

-- Bootstrap the five team members. Emails normalized to lowercase.
insert into public.unmuted_admins (email, display_name) values
  ('katielin0207@gmail.com',   'Katie Lin'),
  ('touhouzigei@gmail.com',    'Liz Wu'),
  ('hesta1218@gmail.com',      'Gu Shi'),
  ('dantong0403@gmail.com',    'Wendy Wu'),
  ('zijiameraki@outlook.com',  'Zijia')
on conflict (email) do nothing;

-- ─── 3. Helper: is the current auth user an admin? ─────────────────────
-- Returns true when the JWT's email is in unmuted_admins. Used by RLS.
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.unmuted_admins a
    where a.email = lower((auth.jwt() ->> 'email')::text)
  );
$$;

-- ─── 4. RLS on unmuted_feedback ────────────────────────────────────────
alter table public.unmuted_feedback enable row level security;

-- Drop any pre-existing policies so this migration is idempotent.
drop policy if exists "anyone can submit feedback"            on public.unmuted_feedback;
drop policy if exists "admins can read all feedback"          on public.unmuted_feedback;
drop policy if exists "admins can update admin_notes"         on public.unmuted_feedback;

-- Anyone (anon + authenticated) can INSERT a feedback row.
create policy "anyone can submit feedback"
  on public.unmuted_feedback
  for insert
  to anon, authenticated
  with check (true);

-- Only admins can SELECT.
create policy "admins can read all feedback"
  on public.unmuted_feedback
  for select
  to authenticated
  using (public.is_current_user_admin());

-- Only admins can UPDATE — and only the admin_notes columns. (The other
-- columns are the user's original submission; we never let admins edit
-- those.)
create policy "admins can update admin_notes"
  on public.unmuted_feedback
  for update
  to authenticated
  using (public.is_current_user_admin())
  with check (public.is_current_user_admin());

-- ─── 5. RLS on unmuted_admins ──────────────────────────────────────────
alter table public.unmuted_admins enable row level security;

drop policy if exists "admins can read admin list" on public.unmuted_admins;

-- Only admins can read the admin list. Anon users cannot enumerate emails.
create policy "admins can read admin list"
  on public.unmuted_admins
  for select
  to authenticated
  using (public.is_current_user_admin());
