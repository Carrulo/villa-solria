-- Add VRBO as a third iCal source alongside Airbnb and Booking.com.
-- VRBO's iCal export URL pattern: https://www.vrbo.com/icalendar/{listing_id}.ics

alter table public.cleaning_tasks
  drop constraint if exists cleaning_tasks_external_source_check;
alter table public.cleaning_tasks
  add constraint cleaning_tasks_external_source_check
  check (
    external_source in ('airbnb_ical', 'booking_ical', 'vrbo_ical')
    or external_source is null
  );

-- The linked_to_external_source check was added in migration 003 with a
-- generated name. Drop the well-known names just in case.
alter table public.cleaning_tasks
  drop constraint if exists cleaning_tasks_linked_to_external_source_check;
alter table public.cleaning_tasks
  add constraint cleaning_tasks_linked_to_external_source_check
  check (
    linked_to_external_source in ('airbnb_ical', 'booking_ical', 'vrbo_ical')
    or linked_to_external_source is null
  );

-- Settings slot for the VRBO iCal URL. Pre-populated with the live one
-- so the next sync run picks it up automatically.
insert into public.settings (key, value)
values ('ical_vrbo', to_jsonb('https://www.vrbo.com/icalendar/616.12119985.7164530.ics'::text))
on conflict (key) do update set value = excluded.value;

notify pgrst, 'reload schema';
