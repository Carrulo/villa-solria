-- 2026-10-24. notify_owner_email holds the host's own address for new
-- booking alerts. Keep it out of the anonymous read of `settings`, same
-- as guide_/ical_/telegram_ (migration 019).
drop policy if exists "Anon read safe settings" on public.settings;
create policy "Anon read safe settings" on public.settings
  for select to public
  using (
    key !~ '(api_key|_token|_secret|password|credential|_pat|service_role)'
    and key !~ '^(cleaner_|laundry_|guide_|ical_|telegram_|notify_)'
    and key not in ('cleaning_base_fee', 'meta_test_event_code')
  );
