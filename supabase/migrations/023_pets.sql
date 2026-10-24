-- 2026-10-24. Dogs accepted (Bruno): every pet booking pays a fixed pet
-- fee and a refundable damage deposit. Stripe cannot hold an
-- authorisation for a multi-week stay (holds lapse after ~7 days), so the
-- deposit is charged with the booking and refunded from the admin after
-- checkout (/api/bookings/refund-deposit). Amounts live in settings so
-- they can change without a deploy.
alter table public.bookings
  add column if not exists has_pet boolean not null default false,
  add column if not exists pet_fee numeric not null default 0,
  add column if not exists pet_deposit numeric not null default 0,
  add column if not exists pet_deposit_refunded_at timestamptz;

insert into public.settings (key, value) values
  ('pet_fee', to_jsonb(150)),
  ('pet_deposit', to_jsonb(200))
on conflict (key) do nothing;

notify pgrst, 'reload schema';
