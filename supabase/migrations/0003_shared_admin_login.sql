-- Shared team admin login — replaces the per-user magic-link flow.
--
-- Context: Supabase's built-in email service is rate-limited to ~4
-- outgoing mails per hour across the whole project. That was fine for
-- Katie testing solo but the moment Liz tried to log in on the same day,
-- Supabase returned "email rate limit exceeded". A five-person team on a
-- free tier can't share the built-in email sender.
--
-- New model: the team shares ONE account in Supabase Auth. The email is
-- hardcoded in src/pages/AdminPage.tsx (TEAM_ADMIN_EMAIL). The password
-- is set once in the Supabase dashboard and shared out-of-band via
-- WeChat / Signal. This migration only makes sure that account's email
-- is on the admin allow-list so RLS lets it read feedback.
--
-- The per-user entries from migration 0002 are LEFT IN PLACE — if we
-- ever switch to a custom SMTP provider and re-enable magic-link login,
-- individual team members can still sign in.

insert into public.unmuted_admins (email, display_name) values
  ('admin@theunmuted.demo', 'Team shared login')
on conflict (email) do nothing;
