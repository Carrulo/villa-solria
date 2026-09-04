-- "Nova reserva" chegava quando a linha era criada, não quando era paga.
--
-- O fluxo do site cria a reserva antes de mandar o hóspede para o Stripe,
-- para poder casar o webhook de volta. Com o gatilho em AFTER INSERT, cada
-- pessoa que abrisse o checkout e desistisse gerava um aviso de reserva
-- nova que nunca existiu.
--
-- Passa a avisar quando a reserva fica 'confirmed': no próprio insert para
-- as reservas manuais (que já nascem confirmadas) e no update para as do
-- site, quando o pagamento chega. Reservas dos canais continuam de fora —
-- essas são anunciadas pelo sync de iCal.

drop trigger if exists trg_notify_new_booking on bookings;

create trigger trg_notify_new_booking
  after insert on bookings
  for each row
  when (new.status = 'confirmed')
  execute function notify_new_booking();

create trigger trg_notify_booking_confirmed
  after update of status on bookings
  for each row
  when (old.status is distinct from new.status and new.status = 'confirmed')
  execute function notify_new_booking();
