-- The cot lives in Q1 Principal, but it is only set up when a baby is
-- actually coming. It used to be baked into the room description
-- ("cama queen + berço"), so every message told the cleaner to prepare
-- it — including the stays with no baby.
--
-- Now it is a per-cleaning flag the host turns on in the admin.

alter table cleaning_tasks
  add column if not exists needs_cot boolean not null default false;

comment on column cleaning_tasks.needs_cot is
  'Set up the cot in Q1 Principal for this cleaning. Off by default.';
