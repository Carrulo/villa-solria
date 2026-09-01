-- Two very different jobs share this table.
--
-- 'turnover' — the guests are gone, the house is reset end to end.
-- 'midstay'  — a long stay (typically 15 nights) gets an intervention
--              partway through: change bed linen and towels, clean the
--              two bathrooms, and nothing else. The guests' belongings
--              are all over the house and must not be touched or tidied,
--              and the hour has to be agreed with them.

alter table public.cleaning_tasks
  add column if not exists kind text not null default 'turnover';

alter table public.cleaning_tasks
  drop constraint if exists cleaning_tasks_kind_check;

alter table public.cleaning_tasks
  add constraint cleaning_tasks_kind_check check (kind in ('turnover', 'midstay'));

notify pgrst, 'reload schema';
