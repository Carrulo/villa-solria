# Auditoria do site — 3 Out 2026

Quatro inspecções (bugs/segurança, conversão, SEO, landing para anúncios). Este ficheiro guarda o que **ficou por fazer**; o que foi corrigido está nos commits `0959e9c`, `c1ea65c`, `32b1a3a`, `ae11efc`.

## ✅ Corrigido a 3 Out
- **Segurança**: rotas de admin exigiam nada — agora `requireAdmin` (`src/lib/admin-auth.ts`) + `adminFetch` no browser. Código da porta e URLs iCal fora da leitura anónima de `settings` (migração 019). `guest_suggestions` com RLS. `/api/settings` removido. Guia `preview` sem password do wifi. Nome do hóspede escapado nos emails.
- **Pagamentos**: checkout cobra `total_price` (antes perdia o desconto de estadia longa). Webhook idempotente. Reabrir checkout move o hold e expira a sessão antiga. Índice único completo em `cleaning_tasks.booking_id` (migração 020 — o upsert do webhook falhava em silêncio).
- **Disponibilidade**: calendário público lê `bookings`; sync iCal mantém noites de estadias em curso e recusa respostas que não são calendário.
- **SEO**: robots.txt/sitemap.xml davam 404 (matcher do middleware); canonical + hreflang por página (`src/lib/seo.ts`); `og-image.jpg`; `X-Robots-Tag noindex` em admin/guia/booking.

## 🔴 Precisa do Bruno (fora do código)
1. **Mudar o código da fechadura** — esteve público em `/api/settings` sabe-se lá desde quando.
2. **Desligar o registo no Supabase** (`disable_signup`). Com ele ligado, qualquer pessoa cria conta e as políticas RLS dão acesso de admin a qualquer `authenticated` que não seja empregada. Hoje só existe 1 utilizador (o Bruno), por isso não foi explorado. Depois, trocar `NOT is_cleaner()` por lista de admins.
3. **Vercel → Domains**: `www.villasolria.com` responde 200 (site duplicado). Pôr redirect 308 para o apex.
4. **Search Console**: submeter `https://villasolria.com/sitemap.xml`.
5. **Paridade de Outubro**: `Mid Season Autumn 2026` está a **5/10/15** na BD, não 22/22/22. O site está mais caro que o Booking (1 260 € vs 1 086 € para 12-20 Out) e promete "poupe até 20%".

## 🟠 Código por fazer (por impacto)
**Segurança / dados**
- `/api/ical/sync` é GET público; delete+insert não é atómico. Proteger com `CRON_SECRET` (descobrir primeiro quem o chama — não há `vercel.json`) e passar para RPC transaccional.
- `/api/booking` quase não valida: formato de datas, datas passadas, `guests` vs `max_guests`.
- `invoices/check-pending` fica aberta se `INVOICE_REMINDER_TOKEN` não existir.
- `booking_mode=inquiry` / `payments_enabled` não são respeitados em lado nenhum.
- `fulfillBooking` grava `paid` sem comparar `amount_total` (só importa se `deposit_percent < 100`).

**Preço**
- `BookingForm.tsx` ~129: datas em hora local → hóspedes a oeste de UTC vêem o preço da noite anterior. Iterar em UTC.

**Conversão** (nota da landing ~51/100)
1. Promessa "mais barato" não provada — mostrar comparação com Booking no detalhe do preço, número real em vez de "até 20%".
2. Funil não medido: só existe `InitiateCheckout`. Faltam `ViewContent`, escolha de datas (`AddToCart` c/ valor), clique WhatsApp (`Lead`).
3. Textos contraditórios: "Enviar Pedido", "é um pedido, só confirmada após resposta", "24 horas para pagar" (hold real 30 min) vs "Confirmação imediata".
4. "Desde 150€" sem os 120€ de limpeza; calendário abre num mês cheio.
5. H1 só "Villa Solria"; contraste fraco no hero.
6. `/en` mostra avaliações em português; "5+ avaliações".
7. Mobile: sem CTA fixo desde o início; bolha do WhatsApp tapa domingo no calendário.
8. LCP ~3,4 s: carrossel com fade de 1 s no hero; `Reveal` esconde conteúdo.
9. Banner de cookies grande e centrado.
10. Partidos/não traduzidos: países em PT na versão EN (`countries.ts`), rodapé "(custo da chamada…)" em todas as línguas, WhatsApp em `wa.me` e texto EN no PT, "Epoca Media" sem acentos, "Outubro De 2026", tu/você misturado, erro React #418 em `/pricing`, cartão "Época Alta (Julho)" diz "Check-in flexível" mas a regra é sábado.
11. Formulário com 7 campos + caixa de termos antes do Stripe.

**SEO restante**
- JSON-LD `VacationRental`: `checkoutTime 10:30` (é 11:00), descrição só em inglês, `priceRange` desactualizado, falta `containsPlace`, só 3 imagens, `tourBookingPage` inválido.
- Títulos 71-80 caracteres, descrições ~200; páginas legais sem description e títulos sem acentos ("Geschaftsbedingungen", "Politica", "Terminos").
- Alt das imagens em PT nas outras línguas; "Vista Aerea" repetido 6×.
- ~286 KB de JS na homepage.
