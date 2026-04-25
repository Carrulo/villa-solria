-- Manual link from an external (Airbnb/Booking iCal) cleaning_task
-- to a website booking. When set, the external entry is rendered as
-- "absorbed" by the parent booking in the admin UI, the parent's
-- cleaning task covers the work, and the row survives re-syncs even
-- if the source feed temporarily drops the event.

alter table public.cleaning_tasks
  add column if not exists linked_to_booking_id uuid
    references public.bookings(id) on delete set null;

create index if not exists cleaning_tasks_linked_to_booking_id_idx
  on public.cleaning_tasks(linked_to_booking_id);
