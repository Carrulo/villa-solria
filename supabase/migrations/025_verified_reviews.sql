-- 2026-10-30. Guests can review the stay on the site itself, through the
-- private link of their own booking (the guide_token). Such a review is
-- tied to the booking — one per stay — and stays hidden until the host
-- approves it in /admin/reviews.
alter table public.reviews add column if not exists booking_id uuid references public.bookings(id) on delete set null;
alter table public.reviews add column if not exists verified boolean not null default false;
create unique index if not exists reviews_booking_id_key on public.reviews(booking_id) where booking_id is not null;
notify pgrst, 'reload schema';
