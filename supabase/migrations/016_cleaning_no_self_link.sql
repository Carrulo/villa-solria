-- A cleaning_task that points at its own booking hides itself: grouped
-- rows are filtered out of every cleaning query on the assumption the
-- parent owns the clean, but here the parent IS the row. The cleaning
-- silently disappears from the ledger and from the cleaner's message,
-- and the turnover detection stops seeing that stay's check-in.
--
-- Thirteen rows were in this state, going back to June 2026, before this
-- was noticed: the 5 Sep message told the cleaner nobody was arriving on
-- the day Raquel checked in.

alter table cleaning_tasks
  add constraint cleaning_tasks_no_self_link
  check (linked_to_booking_id is null or linked_to_booking_id is distinct from booking_id);
