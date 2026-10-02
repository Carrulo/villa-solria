-- 2026-10-03. Two public reads that should never have existed.
--
-- 1. The anon policy on `settings` filtered by secret-looking names
--    (api_key, _token, password...) and missed `guide_door_code`, which
--    is the code to the front door. The anon key ships in the site's JS,
--    so anyone could read it straight from PostgREST, and /api/settings
--    served it to anyone who opened the URL. Also hidden now: the private
--    iCal export URLs, the Telegram chat, the Meta test code and the rest
--    of the guide.
--
-- 2. guest_suggestions was created without RLS, so anon could read
--    guest names and booking ids — and delete or truncate the table.
--    Inserts come from /api/guide/suggestion with the service role;
--    reads from the admin, which is authenticated.

drop policy if exists "Anon read safe settings" on public.settings;
create policy "Anon read safe settings" on public.settings
  for select to public
  using (
    key !~ '(api_key|_token|_secret|password|credential|_pat|service_role)'
    and key !~ '^(cleaner_|laundry_|guide_|ical_|telegram_)'
    and key not in ('cleaning_base_fee', 'meta_test_event_code')
  );

alter table public.guest_suggestions enable row level security;
revoke all on public.guest_suggestions from anon;
drop policy if exists "Admin all on guest_suggestions" on public.guest_suggestions;
create policy "Admin all on guest_suggestions" on public.guest_suggestions
  for all to authenticated
  using (not is_cleaner())
  with check (not is_cleaner());
