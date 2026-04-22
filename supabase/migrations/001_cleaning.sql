-- Cleaning management (internal cost ledger — unrelated to guest pricing)
-- Paste this in Supabase SQL Editor.

-- ============================================================
-- Table: cleaning_tasks
-- One row per checkout date (website booking + external iCal).
-- cleaning = always 50€ (base_fee_snapshot)
-- laundry  = 0€ if no sheets taken, else per rooms_with_laundry
-- Both are closed independently (cleaning_paid / laundry_paid).
-- ============================================================
create table if not exists public.cleaning_tasks (
  id                    uuid primary key default gen_random_uuid(),

  -- source of the checkout (exactly one of the two)
  booking_id            uuid references public.bookings(id) on delete set null,
  external_source       text check (external_source in ('airbnb_ical','booking_ical') or external_source is null),
  external_ref          text,

  -- denormalized info (so UI doesn't need joins after iCal rows disappear)
  cleaning_date         date not null,
  guest_name            text,
  num_guests            integer,

  -- work + payment flags
  cleaning_done         boolean not null default false,
  cleaning_done_at      timestamptz,
  laundry_taken         boolean not null default false,
  laundry_taken_at      timestamptz,
  rooms_with_laundry    integer not null default 0 check (rooms_with_laundry >= 0),

  cleaning_paid         boolean not null default false,
  cleaning_paid_at      timestamptz,
  laundry_paid          boolean not null default false,
  laundry_paid_at       timestamptz,

  -- price snapshots (frozen at creation / at laundry mark, so price edits don't rewrite history)
  cleaning_fee_snapshot numeric(8,2) not null default 50,
  laundry_fee_snapshot  numeric(8,2) not null default 0,

  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists cleaning_tasks_date_idx on public.cleaning_tasks (cleaning_date desc);
create index if not exists cleaning_tasks_booking_idx on public.cleaning_tasks (booking_id);
create unique index if not exists cleaning_tasks_booking_unique
  on public.cleaning_tasks (booking_id) where booking_id is not null;
create unique index if not exists cleaning_tasks_external_unique
  on public.cleaning_tasks (external_source, external_ref, cleaning_date)
  where external_ref is not null;

-- updated_at trigger
create or replace function public.touch_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cleaning_tasks_touch on public.cleaning_tasks;
create trigger cleaning_tasks_touch before update on public.cleaning_tasks
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Settings rows for cleaning pricing (editable via admin UI).
-- Stored in existing `settings` table as key/value text.
-- ============================================================
insert into public.settings (key, value) values
  ('cleaning_base_fee', to_jsonb(50)),
  ('laundry_fee_per_room', '{"1":10,"2":15,"3":20}'::jsonb),
  ('villa_rooms', to_jsonb(3)),
  ('cleaner_email', to_jsonb(''::text)),
  ('cleaner_token', to_jsonb(encode(gen_random_bytes(16), 'hex')))
on conflict (key) do nothing;
