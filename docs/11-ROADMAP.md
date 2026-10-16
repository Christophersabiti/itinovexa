# 11 — Roadmap: Phases, Epics and Exit Tests

Build order follows `Database → Domain logic → API → UI` and the dependency chain:

```
Organisation → User/RBAC → Audit → Customer/Traveller → Supplier → Product/Option → Rate/Season/FX
   → Itinerary → Pricing → Quote → Booking → Invoice/Payment → Payable → Profitability
```

A phase is finished only when its **exit test is automated and green on staging**. No phase starts until the previous phase's exit test passes.

Durations are rough estimates for one founder working with agents. Revise them after Phase 1 using real numbers.

---

## Phase 0 — Engineering pack (1–2 weeks, no product code)

| Deliverable                                                                             | Status      |
| --------------------------------------------------------------------------------------- | ----------- |
| `00-OPS-ARCHITECTURE.md`                                                                | ✅ drafted  |
| `11-ROADMAP.md` (this file)                                                             | ✅ drafted  |
| `AGENTS.md`, `CLAUDE.md`, PR template, epic template                                    | ✅ drafted  |
| `decisions/ADR-001-stack.md`                                                            | ✅ accepted |
| `01-PRD.md` (paste the full PRD here)                                                   | ⬜          |
| `03-DATABASE-SCHEMA.md` (every table, column, type, enum, index, FK)                    | ⬜ next     |
| `06-FINANCE-ENGINE.md` (markup, margin, tax, commission, FX, rounding, worked examples) | ⬜ next     |
| `04-RBAC.md` (permission catalogue + default role matrix)                               | ⬜          |
| `09-ACCEPTANCE-CRITERIA.md` (Given/When/Then for M1 and M2)                             | ⬜          |
| `docs/epics/EPIC-001-platform-foundation.md`                                            | ✅ drafted  |

**Exit test:** a coding agent can answer "what columns does `itinerary_items` have, and how is `gross_price` computed?" from the docs alone.

EPIC-001 depends only on ADR-001, so it can **start in parallel** with the 03/06 specs.

---

## Phase 1 — Platform foundation (≈2–3 weeks)

| Epic                                 | Contents                                                                                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EPIC-001** Platform Foundation     | Monorepo, CI gates, local env, `organisations` + `audit_logs`, tenancy mechanism (RLS + `withTenant`), isolation and schema-lint tests, health endpoint, seed |
| **EPIC-002** Authentication & RBAC   | Supabase Auth (email + MFA-ready), `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, server-side `requirePermission()`                       |
| **EPIC-003** Organisation Management | Org settings (base currency, timezone, tax defaults), brands, user invitations, role assignment UI                                                            |
| **EPIC-025a** Audit basics           | Audit writer used by every R3 change; audit log viewer (admin)                                                                                                |

**Exit test (automated):**

- Two organisations can't read or write each other's rows in _any_ tenant table.
- A user without `admin.manage_roles` gets `403` from the API, even when calling the API directly.
- Every permission change writes an audit row containing the old and new values.

---

## Phase 2 — CRM and catalogue (≈3–4 weeks)

| Epic                                | Contents                                                                                                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EPIC-004** CRM                    | Enquiries, statuses, lead sources, lost-business capture                                                                                                                          |
| **EPIC-005** Traveller Management   | Customers/contacts, travellers, sensitive fields (passport) behind `traveller.sensitive_data.view` with encryption at rest                                                        |
| **EPIC-007** Supplier Management    | Suppliers, typed contacts, finance details (bank changes audited)                                                                                                                 |
| **EPIC-008** Product Catalogue      | Products, options, pricing units, capacity/occupancy                                                                                                                              |
| **EPIC-009** Contract & Rate Engine | Contracts, seasons/rate periods, rates (net/gross), age bands, supplements, blackout dates, min/max stay, cancellation policies with hierarchy resolution, `exchange_rates` table |

**Exit test:**

- A hotel is loaded with a USD rate for a season.
- `getApplicableRate(option, date, occupancy, ageBand)` returns the correct rate, including at the season boundaries.
- Cancellation-policy resolution picks the most specific policy (item > rate > product > supplier).

---

## Phase 3 — Itinerary, pricing, quotation → **Milestone 1** (≈3–4 weeks)

| Epic                           | Contents                                                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EPIC-010** Itinerary Builder | Header, auto-generated days, canonical `itinerary_items`, reorder/duplicate/remove, custom services, templates (clone)                                                  |
| **EPIC-011** Pricing Engine    | Server-side pricing in `packages/pricing`: quantity × units → net → FX → markup → tax → gross; overrides with a reason and an audit row                                 |
| **EPIC-012** Quotation         | Immutable quote versions (frozen snapshot of items and prices), send, public link, accept/decline/request change, acceptance record (version, timestamp, IP, statement) |
| **EPIC-019a** Quote PDF        | Branded quotation PDF generated by the worker                                                                                                                           |
| **EPIC-022a** Email provider   | `EmailProvider` interface + one implementation, enough to send quotes                                                                                                   |

**Exit test (e2e, Milestone 1):** create company → add consultant → add customer → create supplier → hotel product → USD rate → 3-night itinerary → add hotel at USD 200/room/night → **net = USD 600.00** → apply markup → quote PDF generated → customer accepts → quote version is frozen.

---

## Phase 4 — Booking and finance → **Milestone 2 = MVP** (≈4–6 weeks)

| Epic                            | Contents                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **EPIC-013** Supplier Booking   | Booking status machine, immutable status history, tokenised supplier link (no account, expiring, single-purpose), booking request email  |
| **EPIC-015** Customer Finance   | Invoice from accepted quote, payment schedule, payments (bank, card, mobile money, cash), allocation table, finance statuses             |
| **EPIC-016** Supplier Finance   | Expected payables from confirmed bookings, supplier invoices, 3-way variance (quoted / expected / invoiced), approval, supplier payments |
| **EPIC-018** Profitability      | Quoted / forecast / actual GP and margin per trip                                                                                        |
| **EPIC-019b** Finance documents | Invoice and receipt PDFs                                                                                                                 |
| **EPIC-023a** Basic reports     | Sales, outstanding receivables/payables, upcoming trips, profitability                                                                   |

**Exit test (e2e, Milestone 2):** quote accepted → services bookable → supplier opens the link and confirms → payable generated → invoice generated → payment recorded and allocated → trip profitability shows the correct quoted vs actual GP.

**Then run a pilot:** one real operator (or your own operation) runs live trips on production for **4 weeks** before Phase 5 starts. Use pilot feedback to re-order Phase 5.

---

## Phase 5 — Operations and growth

EPIC-006 Agencies · EPIC-017 Commission · EPIC-014 Operations Control Centre · EPIC-027 Driver/Guide portals · EPIC-019 full document suite · EPIC-020 Tasks · EPIC-021 Workflow automation (trigger → condition → action) · EPIC-022 Notifications (in-app, email, SMS, **WhatsApp Business API**) · EPIC-024 Accounting integrations (Xero → QuickBooks) · EFRIS (see gaps below) · EPIC-023 full dashboards.

## Phase 6 — Reach

EPIC-026 Traveller portal · offline PWA · supplier portal · advanced multi-brand · advanced BI · multilingual content · public API and webhooks catalogue.

## Phase 7 — AI

EPIC-028: first the controlled tool functions (`search_suppliers`, `calculate_trip_price`, …), then itinerary drafting, an ops assistant ("what needs attention tomorrow?") and finance explanations. The AI calls domain services only. It never gets raw database access.

---

## Changes from the original plan, and why

1. **Audit log moves into EPIC-001.** It's the first tenant-scoped table, so the isolation test has something real to test from day one.
2. **Slices of later epics move earlier:** the quote PDF (019a) and the email provider (022a) into Phase 3, finance PDFs (019b) and basic reports (023a) into Phase 4. Milestones 1 and 2 can't pass without them.
3. **The FX table belongs to Phase 2** (EPIC-009). Rates in USD can't be priced in UGX without it.
4. **A 4-week pilot sits between the MVP and Phase 5,** so real usage decides Phase 5 priorities instead of guesses.
5. **Short-lived slice branches plus feature flags** replace long-lived `epic/*` branches (see ops §4).

## Gaps in the PRD to close in Phase 0 specs

| #   | Gap                                                                                                                                                                                        | Where to resolve  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| 1   | **Tax model is undefined:** VAT inclusive or exclusive, per line or per invoice, exempt services, Uganda VAT at 18%, taxes on markup only vs on gross (tour-operator margin schemes)       | 06-FINANCE-ENGINE |
| 2   | **Rounding and currency precision:** UGX has 0 decimals and USD has 2. When to round (per line vs total), which mode (half-even vs half-up), and where rounding differences go             | 06-FINANCE-ENGINE |
| 3   | **Occupancy and rooming:** "2 adults, USD 200 per room/night" requires a room allocation model (rooms × nights) separate from the traveller count. Child pricing interacts with this.      | 03-SCHEMA + 06    |
| 4   | **Itinerary versions vs quote versions:** both tables are listed. Proposal: drop `itinerary_versions`; a quote version is an immutable snapshot of the priced items at send time           | 03-SCHEMA         |
| 5   | **FX direction and buffer:** where the buffer applies (rate or amount), which rate is locked at quote time, and how invoice FX differs from payment FX (realised FX gain/loss)             | 06-FINANCE-ENGINE |
| 6   | **URA EFRIS e-invoicing:** VAT-registered Ugandan businesses must issue fiscal invoices through EFRIS. This needs at least an `AccountingProvider`/`FiscalProvider` slot in the design now | ADR + Phase 5     |
| 7   | **Mobile money** (MTN MoMo, Airtel Money) through Flutterwave/Pesapal: reconciliation, partial payments, fees                                                                              | 06 + EPIC-015     |
| 8   | **Data protection:** Uganda Data Protection and Privacy Act 2019 (and GDPR for EU travellers). Covers passport and health data, consent, retention and deletion requests                   | 02-ARCHITECTURE   |
| 9   | **Idempotency:** payments, webhooks and supplier-link actions must be idempotent (idempotency keys and unique constraints)                                                                 | 05-API-SPEC       |
| 10  | **Supplier link security:** token entropy, expiry, single booking scope, rate limiting, and an audit row on every action                                                                   | EPIC-013          |
| 11  | **Number sequences:** per-org, gap-free (or explicitly gap-tolerant) sequences for invoice, quote and itinerary numbers. Invoices usually need to be gap-free                              | 03-SCHEMA         |
| 12  | **Time zones:** service dates are local to the destination, while timestamps are UTC (`timestamptz`). Store the destination timezone on items with times                                   | 03-SCHEMA         |
