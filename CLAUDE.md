@AGENTS.md

# Villa Solria — Claude Instructions

## 📍 Current State (updated 2026-09-03 14:20)
- **Active branch**: main, limpo, tudo em produção.
- **Sábado-a-sábado só em Julho e Agosto** (decisão do Bruno): época `Peak July` (1-15 Jul 2027, 265 €) separada da `High Season` de Junho. Só `Peak July` e `Peak August` têm `min_nights 7` + `allowed_checkin_days {6}`. Junho 15-30 e Setembro 1-15 voltaram a `enforce_stay_rules=false` / dias livres — no site, no Airbnb e no VRBO.
- **VRBO e Booking alinhados ao site**, Out 2026 → Dez 2027 (ver secções abaixo). Regra do Booking: **preço do site × 1,10 arredondado a 5 €**.
- **Booking já não fecha Out 2027-Dez 2027**: o fecho longo do feed encolheu de 519 para 62 noites (só resta `1 Jan → 3 Mar 2028`, que o site também não vende).
- **Airbnb pendente**: decidir se a restrição **global** de check-in ao sábado fica ligada (é global, não dá por datas — com o âmbito reduzido a Jul/Ago faz menos sentido); e a **13 Out 2026** subir todas as tarifas ~18,3% (÷0,845) quando entra a comissão host-only de 15,5%.
- **⚠️ A vigiar**: a *Dynamic restriction rule* do Booking ("For unsold nights, next 60 days, min. length of stay 1 night", ligada) vai **anular o mínimo de 7 noites** quando Jul/Ago 2027 entrar na janela de 60 dias. Decisão do Bruno: desligar a regra em Maio 2027 ou aceitar noites soltas de última hora.

## 📅 Booking.com — estado depois de 2026-09-03
- **hotel_id 14039693**, room_id 1403969301. Três planos: Standard Rate `54189435` · Weekly Rate `54189437` (5% mais barato) · Totalmente flexível `63117029` (10% mais caro).
- **Aberto 1 Out → 31 Dez 2027** (estava `Closed`; a abertura exige preço no Standard Rate). O horizonte de venda não tem definição própria — abre-se em massa no *Calendar → Dates & rates*.
- **Tarifas**: Out 2026 165 · Nov-Dez 2026 140 · (2027 já estava) Fev 155, 1-15 Jul 290, 16 Jul-31 Ago 315, 1-15 Set 275, 16 Set-31 Out 175 · **Nov-Dez 2027 155** (novo).
- **Mínimo 7 noites em 1 Jul-31 Ago 2027** aplicado nos 3 planos.
- **Sábado a sábado não é possível no Booking**: a *List view* com `Restrictions` só expõe *Minimum length of stay* e *Min. advance reservation*. Não há *closed to arrival/departure* nem dia de check-in — o "Bookable" do plano tarifário é só antecedência. O mínimo de 7 noites é o mais perto que se chega.
- Os campos de data do painel aceitam texto `YYYY-MM-DD`: **pôr a data final primeiro**, depois a inicial (mudar a inicial arrasta a final).

## 📅 VRBO — estado depois de 2026-09-03
- **MarketMaker desligado** (estava a reescrever as tarifas manuais). Os limites min 130/máx 260 dele já **não** bloqueiam preços manuais — o erro "Introduza um preço entre e NaN" era um **bug de i18n do pt-PT**; no extranet em inglês (`vrbo.com/p/...`, sem `/pt-pt/`) grava sem problema. **Usar sempre a UI em inglês.**
- **Reserva antecipada: 12 → 24 meses.** Era isto que punha tudo a partir de 3 Set 2027 (365 dias) como "Unbookable", não o Booking.
- **Tarifas aplicadas** (= preço do site): Out 2026 150 · Nov-Dez 2026 129 · Jan-Mai 2027 140 · 1-14 Jun 185 · 15-30 Jun 265 · **1-15 Jul 265** (estava com um erro de digitação a **2 260 €/noite**) · 16 Jul-31 Ago 285 · 1-15 Set 250 · 16 Set-31 Out 160 · Nov-Dez 2027 139.
- **Setembro 2026 não foi tocado** — está quase todo reservado e o resto são datas de última hora com preços antigos do MarketMaker (177-260 €); mexer agora não traz nada.
- Selecção de intervalo com preços diferentes activa sozinha o *Customize by night of week* e bloqueia o campo único: **desligar o toggle primeiro**, depois escrever o valor.

## 🏠 A casa (fonte de verdade: `src/lib/villa-rooms.ts`)
- Q1 **Principal** — 1º andar, cama queen + berço
- Q2 **Casal** — 1º andar, cama de casal 1,40 m
- Q3 **Duplo** — rés-do-chão, 2 camas individuais
- Lotação 6 pessoas + bebé · 2 casas de banho, cozinha pequena, sala, sala de jantar, varanda, terraço
- Saída ≤11h · limpeza 11h-16h quando há entrada no mesmo dia · entrada ≥16h
- Casa toda = 2 pessoas × 2h = 4 h-pessoa (número dela). Estimativa: 2,5 h-pessoa de áreas comuns + 0,5 h por quarto. **A estimativa é só para o Bruno, nunca vai na mensagem** — mostrá-la ancorava as horas que ela reporta.

## ✅ Resolvido — site → VRBO iCal import (2026-09-01)
- **Causa**: no VRBO, em *Configurações → Disponibilidade → Sincronização do calendário → Calendários importados*, só existiam `Airbnb` e `Booking.com`. **O villasolria.com nunca lá foi adicionado.** Não era o feed nem o parser — as tentativas de Abril (`e8fd2c3`, `e7b752b`) atacaram o problema errado.
- **Correção**: adicionado `Villa Solria Website` → `https://villasolria.com/api/ical/villa-solria.ics`. VRBO confirmou "Operação concluída" e sincronizou logo — o dia 3 Set passou de `Bloqueado` a `Bloqueado + Importado` (estadia do Kiko a chegar pelo feed). VRBO ressincroniza a cada ~30 min.
- **Bloqueio manual do VRBO apagado (2026-09-01)**: o `Bloquear 8/08 → 5/09` (28 noites) foi eliminado — já era redundante com o import. Agosto ficou com as barras `Villa Solria Website` (8-15, 15-22, 22-29) e 1-4 Set continuam fechados via `Importado, 29 Ago → 5 Set`. Nenhuma data abriu.
- **Conflito residual 1-2 Set (cosmético)**: dois calendários *importados* na mesma noite — site (Kiko 29 Ago→5 Set) + Airbnb (1→2 Set). A origem é um **bloqueio órfão no Airbnb em 1-2 Set 2026 e 1-2 Set 2027**, sem reserva associada. Apagá-lo no Airbnb limpa o aviso.
- **Booking também estava OK**: calendário do Booking com 12 Set `Fechado` e barra `Villa Solria W…`, 1-4 Set `Fechado` (Kiko). As três ligações do painel *Sincronizar calendários* do Booking estão `OK`.
- **Mapa final**: site→Airbnb ✅ · site→Booking ✅ · site→VRBO ✅ (desde hoje) · Booking→Airbnb/VRBO ✅.

## 📍 Previous State (updated 2026-09-01 21:05)
- **Active branch**: main — working tree limpo, sincronizado com `origin/main` (`5b6eb30`). Sem trabalho em curso desde 18 Mai.
- **Open PRs**: none
- **Último trabalho (18 Mai)**: calendário do `/cleaning` — dias de chegada destacados, range "ocupado" já exclui o dia de check-in, legenda corrigida (`9c88efb`, `5b6eb30`); fim de `cleaning_task` duplicada ao enriquecer reserva iCal em `src/app/api/bookings/manual/route.ts` (`a6057eb`).
- **Blockers**: campanhas Meta continuam PAUSADAS desde 6 Mai (ver Previous State) — validação CAPI nunca foi feita.
- **⚠️ Sessões abertas em subpastas**: abrir o Claude Code dentro de `villa-solria/docs` cria um projeto separado (`~/.claude/projects/-Users-kontrolsat-Projects-villa-solria-docs`) e o histórico/memória não se junta ao do projeto. Abrir sempre na raiz `~/Projects/villa-solria`.
- **⚠️ claude-mem parado**: última observação gravada em `~/.claude-mem/claude-mem.db` é de 2026-04-28 e nunca existiu projeto `villa-solria` lá. O handoff fiável é este CLAUDE.md.

## 📍 Previous State (updated 2026-05-15 22:10)
- **Cleaning model change (2026-05-15)**: `cleaning_date` agora = checkout day (não check-in). Hóspede sai ≤11h, empregada limpa 11h-16h, nova entrada ≥16h. Aplicado em iCal sync + Stripe webhook + manual bookings + admin backfill. 17 tarefas futuras unlinked migradas via UPDATE. Commit `8d9334c`.
- **Cleaner mobile UI simplified (2026-05-15)**: `/cleaning` perdeu checklist de 14 itens + upload de fotos. Fica só lembrete + Roupas + Notas + botão Fechar. Fotos pedidas via WhatsApp. Commit `2846d7a`.

## 📍 Previous State (updated 2026-05-06 21:30) — Meta Ads
- **Active branch**: main (clean — commit `96965c7` em prod)
- **Open PRs**: none
- **In-flight work**: Campanhas Meta **PAUSADAS** desde 6 Mai 21:25 para validar CAPI ponta-a-ponta antes de relançar. Próximos passos:
  1. **Reserva de teste programática** (Stripe test mode) → confirmar `InitiateCheckout` + `Purchase` browser↔CAPI dedup no Events Manager · Event Match Quality ≥7/10.
  2. **Relançar com `OUTCOME_SALES`** optimizando `Purchase` (mesmo €5/d cada PT/EN, mesmo criativo).
  3. Adicionar **adset de retargeting LPV últimos 30d** (~1 216 pessoas guardadas) com criativo "Datas Maio/Junho — desconto vs Booking".
  4. Aceitar lag normal de vacation rentals — primeiras Purchases tipicamente entre dia 14-21.
- **Blockers**: nenhum.
- **Last deploy**: `96965c7` (Meta CAPI server-side) → Production (Vercel) on 2026-05-05
- **Meta CAPI status**: ✅ token gerado em `Set up without Dataset Quality API` (não toca em pixel Kontrolsat) e gravado em `settings.meta_capi_token` (Supabase, 207 chars, prefixo `EAARpuU…`). `meta_test_event_code` vazio.
- **FB Ads (Bruno Carrulo `act_2080974932079132`) — TODAS PAUSADAS desde 6 Mai 21:25**:
  - PT: campaign `120253240193200586` (PAUSED) / adset `120253240193170586` / ad `120253240193150586` — €5/d, PT video ID `2576195622801046`, targets PT 30+
  - EN: campaign `120253316714670586` (PAUSED) / adset `120253316714660586` / ad `120253316714680586` — €5/d, `villa-solria-en.mp4`, targets UK+DE+NL 30+
- **Orphan MCP campaign** (PAUSED, sem ad): `120253316804090586` / adset `120253316811480586` — pode apagar
- **Spend total 1-6 Maio**: €78,59 · ~60k imp · ~1 800 link clicks · ~1 216 LPV · **0 InitiateCheckout · 0 Purchase**. Audit Supabase confirma 0 visitantes externos passaram do "Reservar". Decisão: pausa enquanto se valida CAPI; ciclo decisão vacation rental é 2-4 semanas, não é problema de CRO ainda.

## 🧾 Faturas B2B (manual via Portal das Finanças)
- **Captura**: botão "+ Dados de fatura" no modal de reserva (tanto detalhe como quick-create externo) → guarda `invoice_details` JSONB em `bookings`. Campos: company, vat, address, postal_code, city, country, email, amount, issued_at.
- **Lembrete**: `<PendingInvoicesBanner />` no topo de `/admin/bookings` lista reservas com checkout hoje/amanhã com `invoice_details` preenchido e `issued_at = null`. Cada linha mostra nome, empresa, NIF e valor.
- **Emissão**: Bruno emite **fatura-recibo (modelo 6, Cat. B)** manualmente no Portal das Finanças e envia ao hóspede via Resend/email pessoal. Depois marca "✓ Marcar como emitida" no admin (stamp `issued_at`).
- **Migração futura para API**: quando >5 faturas/mês, considerar **Moloni** (REST API, ~€8/mês, certificado AT, popular para AL). Outras opções: InvoiceXpress, Vendus, JustGo. NÃO existe API directa da AT para Cat. B individuais — só software certificado.
- **Schema**: `supabase/migrations/007_booking_invoice_details.sql` (JSONB + partial index `bookings_invoice_pending_idx`).

## 📡 Meta CAPI (server-side conversions)
- **Helper**: `src/lib/meta-capi.ts` — `sendMetaEvent(name, userData, customData, { eventId, eventSourceUrl })`
  - Hash automático SHA-256 (em, ph, fn, ln, ct, country)
  - Lê `meta_pixel_id` + `meta_capi_token` (+ `meta_test_event_code`) de `settings`, com cache de 60s
  - `extractClientContext(request)` extrai `client_ip`, `user_agent`, `_fbp`, `_fbc` de Next.js Request
- **Eventos ligados**:
  - `InitiateCheckout` server-side em `src/app/api/checkout/session/route.ts` (POST) — alta qualidade de match (apanha IP/UA/fbp do utilizador)
  - `Purchase` server-side em `src/app/api/stripe/webhook/route.ts` (`fulfillBooking`) — sem IP/UA mas com email + telefone hashed
- **Dedup browser↔server**: `event_id` determinístico via `eventIdFor.purchase(bookingId)` / `eventIdFor.initiateCheckout(bookingId)`. Browser envia o mesmo `eventID` em `trackMetaEvent` (`Analytics.tsx` move-o para a 4ª posição do `fbq`).
- **Privacy**: `meta_capi_token` NUNCA é exposto em `/api/settings/tracking` (esse endpoint só lê `ga4_measurement_id` e `meta_pixel_id`). O token só é lido no servidor.

## ✅ Recently resolved (May 2026)
- **FB Ads EN campaign launched** (May 1): Duplicado do PT via Ads Manager, vídeo EN uploaded manualmente, copy EN, targeting UK+DE+NL. Limitação confirmada: meta-ads MCP em `development_access` tier — não cria creatives live (error_subcode 1885183). Workflow híbrido (browser + MCP read) é o único viável até App Review.

## ✅ Recently resolved (Apr 2026)
- **Booking grouping** (Apr 25): Manual link of split iCal events into a single grouped stay. Migration 002 (`linked_to_booking_id`) + 003 (`linked_to_external_*`). Multi-select "Agrupar reservas" modal in `/admin/bookings`. Cleaning views (admin, public, daily email) extend the head's range to span the whole group. Confirm dialog on Desligar.
- **iCal sync correctness** (Apr 25): Booking iCal events all treated as reservations (their feed only emits "CLOSED - Not available"). Airbnb still filters block markers. Auto-merge of contiguous events was tried and reverted — manual link is the correct UX. `stay_checkout_date` now stays in sync when feed range changes.
- **Bookings list** (Apr 25): Shows website + Booking + Airbnb in one list, sorted by check-in, with `Activas` / `Histórico` filter. Past stays auto-hide.

## 🏗 Architecture
- **Next.js 16** (App Router, RSC). Read `node_modules/next/dist/docs/` before assuming v13/14 patterns.
- **Supabase** Postgres + auth. Project ref: `esqkhahcifdtthnvlyos`.
- **Vercel** auto-deploy from `main`. Public domain: `villasolria.com`.
- **Stripe** for website bookings + refunds.
- **Resend** for transactional emails (pre-arrival, review requests). O email diário de limpeza foi removido em 2026-09-01.

## 📂 File map
- `src/app/admin/bookings/page.tsx` — unified reservations list + grouping UI
- `src/app/admin/cleaning/page.tsx` — ledger + plano de quartos + botões de WhatsApp (única UI de limpezas)
- `src/lib/villa-rooms.ts` — quartos, camas, lotação (mudar aqui se a casa mudar)
- `src/lib/cleaning-message.ts` — texto das mensagens (turnover, midstay, próximas limpezas)
- `src/lib/cleaning-cost.ts` — estimativa de horas e peso da roupa
- `src/lib/whatsapp.ts` — links `wa.me`
- `src/app/api/ical/sync/route.ts` — Booking + Airbnb iCal pull
- `src/app/api/bookings/link-external/route.ts` — set/clear cleaning_task links
- `src/app/api/bookings/manual/route.ts` — admin-created bookings
- `supabase/migrations/` — DDL files (003 is the latest)

## 🧪 Testing / Deploying
- Type-check: `npx tsc --noEmit`
- Lint: `npx eslint src/app/admin/bookings/page.tsx`
- Deploy: push to `main` → Vercel builds automatically (~60-90s)
- iCal manual resync: `curl -s https://villasolria.com/api/ical/sync`
- DDL via Supabase Management API: `POST https://api.supabase.com/v1/projects/esqkhahcifdtthnvlyos/database/query` with PAT from `~/Projects/kontrolsat/prestashop-mcp-server/.secrets/supabase-pat`. Always run `NOTIFY pgrst, 'reload schema'` after ALTER TABLE so the JS client sees the new columns.

## 🔐 Secrets location
- Supabase PAT: `~/Projects/kontrolsat/prestashop-mcp-server/.secrets/supabase-pat`
- Other env: in Vercel project settings (`SUPABASE_*`, `STRIPE_*`, `RESEND_*`, etc.)

## 🧠 Domain notes
- **Single property** — there is never more than one stay at a time. Date-range overlap between two reservations means they're the same guest split across channels.
- **Booking.com iCal quirk**: every reservation comes through as `SUMMARY:CLOSED - Not available` with no guest name. We render those as "Booking.com (sem nome)".
- **Airbnb iCal**: real reservations have `SUMMARY:Reserved`; blocks are `Not available` / `Airbnb (Not available)` and never become cleaning_tasks.
- **Linked cleaning_tasks**: rows with `linked_to_booking_id` OR `linked_to_external_ref` set are hidden from cleaning queries — the parent owns the cleaning. Sync also refuses to delete linked rows even if the source feed drops them.
