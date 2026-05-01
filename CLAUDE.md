@AGENTS.md

# Villa Solria — Claude Instructions

## 📍 Current State (updated 2026-05-01 22:00)
- **Active branch**: main (clean)
- **Open PRs**: none
- **In-flight work**: none
- **Blockers**: none
- **Last deploy**: ed8372d → Production (Vercel) on 2026-04-25
- **Live FB Ads (Bruno Carrulo `act_2080974932079132`)**:
  - PT (live): campaign `120253240193200586` / adset `120253240193170586` / ad `120253240193150586` — €5/d × 7d, PT video, targets PT 30+, video ID `2576195622801046`
  - EN (live 2026-05-01): campaign `120253316714670586` / adset `120253316714660586` / ad `120253316714680586` — €5/d × 7d, `villa-solria-en.mp4`, targets UK+DE+NL 30+, interests Vacation rental + Beaches, CTA Book now → villasolria.com
- **Orphan MCP campaign** (PAUSED, sem ad): `120253316804090586` / adset `120253316811480586` — pode apagar

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
- **Resend** for transactional emails (pre-arrival, daily cleaning).

## 📂 File map
- `src/app/admin/bookings/page.tsx` — unified reservations list + grouping UI
- `src/app/admin/cleaning/page.tsx` — cleaning task ledger
- `src/app/cleaning/page.tsx` — public cleaner view (token-gated)
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
