-- Allow an external (iCal) cleaning_task to be linked to ANOTHER
-- external entry, not just a website booking. Use case: an Airbnb
-- block + a Booking.com reservation that are actually the same guest.

alter table public.cleaning_tasks
  add column if not exists linked_to_external_source text
    check (linked_to_external_source in ('airbnb_ical','booking_ical')
           or linked_to_external_source is null),
  add column if not exists linked_to_external_ref text;

create index if not exists cleaning_tasks_linked_external_idx
  on public.cleaning_tasks(linked_to_external_source, linked_to_external_ref);
