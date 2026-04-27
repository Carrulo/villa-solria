-- Guest suggestion box. Submitted from the public guide page
-- (POST /api/guide/suggestion) using the booking guide_token as the
-- only auth — no login. One booking can submit many suggestions.

create table if not exists public.guest_suggestions (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references public.bookings(id) on delete set null,
  guest_name   text,
  locale       text,
  rating       integer check (rating is null or rating between 1 and 5),
  message      text not null check (length(message) between 1 and 4000),
  acknowledged boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists guest_suggestions_created_idx
  on public.guest_suggestions (created_at desc);
create index if not exists guest_suggestions_booking_idx
  on public.guest_suggestions (booking_id);

notify pgrst, 'reload schema';
