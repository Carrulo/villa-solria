@AGENTS.md

# Villa Solria — Claude Instructions

## 📍 Current State (updated 2026-09-01 21:15)
- **🔴 CAUSA RAIZ ENCONTRADA (2026-09-01)**: o GitHub **desativou os 5 workflows agendados por inatividade** (`disabled_inactivity`). GitHub desliga crons em repos sem commits há 60 dias — último commit 18 Mai + 60 = **17 Jul**. Último `iCal Sync` automático: `2026-07-17T21:29Z`. Desde aí **nenhuma reserva Booking/Airbnb entrou no site** (risco de overbooking: as datas apareciam livres em villasolria.com).
- **Reserva Booking de Setembro recuperada**: sync manual às 2026-09-01 20:06Z criou a task em falta — check-in **16 Set**, checkout **24 Set** (`CLOSED - Not available`, sem nome, normal no Booking). Foi a única reserva perdida no intervalo.
- **iCal Sync reativado** (`gh workflow enable 259514419`) — está `active` e a correr de 15 em 15 min.
- **Workflows reativados (2026-09-01)**: `iCal Sync`, `Pre-arrival emails`, `Review requests`, `Invoice Reminder` estão `active`. Usam igualdade exata de data, por isso não houve catch-up de emails para estadias antigas. Hóspedes entre 17 Jul e 1 Set não receberam pré-chegada nem pedido de review — perdido, não recuperável.
- **🧹 App da empregada REMOVIDA (2026-09-01)**: branch `chore/remove-cleaner-app`. Bruno vai substituir o link/token por **envio de mensagem WhatsApp**. Removidos: `src/app/cleaning/*`, `src/app/api/cleaning/*` (update, photo-upload, daily-email), `src/lib/cleaning-checklist.ts`, `src/lib/cleaning-rooms.ts`, workflow `cleaning-daily-email.yml`, botões "Partilhar"/rotate token em `/admin/cleaning`, e `/cleaning` do `middleware.ts`. **Mantidos**: tabela `cleaning_tasks`, ledger `/admin/cleaning` (pagamentos limpeza+roupa), criação de tasks no sync/webhook/manual, e a `cleaning_fee` cobrada ao hóspede (nada disso foi tocado).
- **Sobras a limpar quando o WhatsApp existir**: linhas `cleaner_token` e `cleaner_email` na tabela `settings` (órfãs, inofensivas) e o secret `CLEANING_EMAIL_SECRET` no GitHub.
- **✅ Crons movidos para o VPS (2026-09-01)**: `ssh vps-kontrolsat` → `/opt/cronjobs/villa-solria/call.sh <endpoint> <log>`, logs em `/var/log/villa-solria/*.log` (auto-truncados aos 5000 linhas). Entradas: `*/15` iCal sync (com `flock`), `0 9` pre-arrival, `0 8` review requests. Imune à inatividade do repo. Os workflows GitHub ficam ativos como redundância — os endpoints de email são idempotentes (`pre_arrival_sent_at` / `review_requested_at` com guarda `.is(null)`), por isso correr em duplicado **não** duplica emails.
- **✅ Verificado em produção (2026-09-01 21:35)**: `main` = `a40c86b` deployed. `/cleaning` → 404, `/admin/cleaning` → 200, homepage → 200. Cron do VPS disparou sozinho às 20:30Z (`OK /api/ical/sync`). `/api/blocked-dates` já devolve 16-23 Set como `booking_ical` — o site deixou de vender essas datas.
- **Propagação entre canais — TODOS OK (verificado visualmente 2026-09-01)**: a reserva Booking 16-24 Set aparece no Airbnb (riscada) e no VRBO (barra "Importado"). As ligações plataforma-a-plataforma do Bruno funcionam.
  - **Nem o Airbnb nem o VRBO reexportam blocos importados** no seu `.ics` (anti-loop). Por isso `blocked_dates` só vê 2 dias `airbnb_ical` e 1 bloco `vrbo_ical` — **isto é normal, não é sintoma de avaria**. Nunca diagnosticar sincronização olhando só para os feeds: confirmar no calendário da plataforma.
  - O feed de saída do site (`/api/ical/villa-solria.ics`, `/api/ical/export`) exporta **só a tabela `bookings`**. Reservas de outros canais não saem — hoje isso é compensado pelas ligações directas entre plataformas. Se alguma dessas ligações cair, a correcção estrutural é feed por canal (`?exclude=<source>`) incluindo `blocked_dates` de outras origens.
  - **Conflito VRBO 1-2 Set 2026**: dois calendários importados na mesma noite (Kiko via site + bloqueio 1-2 Set que existe no Airbnb). Provavelmente benigno. O Airbnb tem bloqueios manuais órfãos em 1-2 Set 2026 e 1-2 Set 2027 sem reserva correspondente — remover se não fizerem falta.
- **`Invoice Reminder` continua só no GitHub** — o endpoint `/api/invoices/check-pending` exige `INVOICE_REMINDER_TOKEN` quando essa env existe na Vercel. Para o mover, criar `/opt/cronjobs/villa-solria/.env` (chmod 600) com o token e passar o header no `call.sh`. Nunca inline no crontab.

## 🔴 Open incident — site → VRBO iCal import não funciona
- **Sintoma**: reservas do site não aparecem no calendário do VRBO. Prova (2026-09-01): reserva **Raquel 12-13 Set** (criada 29 Jul, `bookings`, `status=confirmed`) está no feed (`DTSTART:20260912/DTEND:20260913/SUMMARY:Reserved`) e **está** bloqueada no Airbnb, mas o VRBO mostra 12 e 13 à venda (212 €/207 €).
- **O feed está bom**: `content-type: text/calendar; charset=utf-8`, CRLF, `VERSION:2.0`, `PRODID`, `UID`+`DTSTAMP` por evento, datas `VALUE=DATE`. O Airbnb ingere-o sem problemas. O problema é do importador do VRBO ou da subscrição configurada lá.
- **Histórico**: já se tentou contornar em 2026-04-28 — `e8fd2c3` (expor em `/api/ical/villa-solria.ics` para importadores estritos) e `e7b752b` (export minimal estilo Airbnb). Não resolveu.
- **Workaround em uso**: bloqueio manual no VRBO. O bloco `8 Ago → 5 Set` no feed do VRBO é isso mesmo — cobre Patricia+Bruno+Kiko. A Raquel escapou.
- **Próximo passo**: abrir no VRBO a secção de **importar/sincronizar** calendários (não "Opções de exportação") e ler o estado/erro da subscrição do villasolria.com. Sem essa mensagem, qualquer alteração ao feed é adivinhação.
- **Não é automatizável**: o VRBO não reexporta blocos importados, por isso o site não consegue verificar sozinho se a reserva lá chegou. Verificação só a olho no calendário do VRBO.

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
- `src/app/admin/cleaning/page.tsx` — cleaning task ledger (única UI de limpezas desde 2026-09-01)
- `src/app/api/ical/sync/route.ts` — Booking + Airbnb iCal pull
- `src/app/api/bookings/link-external/route.ts` — set/clear cleaning_task links
- `src/app/api/bookings/manual/route.ts` — admin-created bookings
- `supabase/migrations/` — DDL files (003 is the latest)

## 🧪 Testing / Deploying
- Type-check: `npx tsc --noEmit`
- Lint: `npx eslint src/app/admin/bookings/page.tsx`
- Deploy: push to `main` → Vercel builds automatically (~60-90s)
- iCal manual resync: `curl -s https://villasolria.com/api/ical/sync`
- DDL via Supabase Management API: `POST https://api.supabase.com/v1/projects/esqkhahcifdtthnvlyos/database/query` with PAT from `~/prestashop-mcp-server/.secrets/supabase-pat`. Always run `NOTIFY pgrst, 'reload schema'` after ALTER TABLE so the JS client sees the new columns.

## 🔐 Secrets location
- Supabase PAT: `~/prestashop-mcp-server/.secrets/supabase-pat`
- Other env: in Vercel project settings (`SUPABASE_*`, `STRIPE_*`, `RESEND_*`, etc.)

## 🧠 Domain notes
- **Single property** — there is never more than one stay at a time. Date-range overlap between two reservations means they're the same guest split across channels.
- **Booking.com iCal quirk**: every reservation comes through as `SUMMARY:CLOSED - Not available` with no guest name. We render those as "Booking.com (sem nome)".
- **Airbnb iCal**: real reservations have `SUMMARY:Reserved`; blocks are `Not available` / `Airbnb (Not available)` and never become cleaning_tasks.
- **Linked cleaning_tasks**: rows with `linked_to_booking_id` OR `linked_to_external_ref` set are hidden from cleaning queries — the parent owns the cleaning. Sync also refuses to delete linked rows even if the source feed drops them.
