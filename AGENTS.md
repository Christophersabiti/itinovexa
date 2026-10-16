# AGENTS.md — rules for every coding agent (Claude Code, Codex, others)

Itinovexa is a multi-tenant travel operations ERP for tour operators and DMCs. Its central idea is **one itinerary, one source of truth**: the same itinerary item is the quote line, the cost line, the booking and the operations entry.

## 1. Read order (before writing any code)

1. This file.
2. The epic you were given: `docs/epics/EPIC-0xx-*.md`. **Its scope is your boundary.**
3. The docs that epic references, usually:
   - `docs/03-DATABASE-SCHEMA.md`
   - `docs/06-FINANCE-ENGINE.md`
   - `docs/04-RBAC.md`
   - `docs/decisions/*`
4. `docs/00-OPS-ARCHITECTURE.md` if you're unsure how work flows.

If the epic and a doc conflict, stop and say so in your output. Don't guess.

## 2. The 10 engineering rules (non-negotiable)

1. **Every business table is tenant-aware:** `organisation_id uuid not null` + `created_at`, `created_by`, `updated_at`, `updated_by`. RLS is enabled with policies on `app.org_id`. All DB access goes through `withTenant(ctx, tx => …)`.
2. **Financial calculations happen server-side,** in `packages/pricing` / `packages/finance`. The UI only displays values the server computed.
3. **Never use JS `number` for money.** Use `numeric` in Postgres and the `Money` type (decimal.js) in TypeScript. Money travels as strings in JSON. Don't use `parseFloat`, `toFixed` or arithmetic operators on money.
4. **Historical FX is never silently updated.** Each transaction stores `fx_rate`, `fx_date`, `fx_source` and `fx_buffer` at the time it happened.
5. **Accepted quote versions are immutable.** A change creates a new version.
6. **Financial records are reversed or credited, never deleted or edited in place** once issued.
7. **Booking status history is append-only.**
8. **Every sensitive change writes an audit record** (who, what, entity, old → new, when, IP). This covers rates, prices, overrides, invoices, payments, supplier bank details and permissions.
9. **UI permissions are not security.** Every API handler calls `requirePermission(ctx, 'resource.action')`.
10. **Integrations sit behind provider interfaces** (`EmailProvider`, `PaymentProvider`, `StorageProvider`, `FXProvider`, `AccountingProvider`, …). No vendor SDK is imported outside `packages/integrations/<provider>`.

## 3. Working rules

- **Tests first.** Turn the epic's Given/When/Then into failing tests, then make them pass.
- **One slice per PR** (schema / domain / API / UI). Aim for under ~400 changed lines, excluding generated files.
- **Stay in scope.** Don't edit files outside the epic's declared file scope. If you must, stop and explain why.
- **Migrations:**
  - never edit a migration that's already merged
  - state every migration in the PR description
  - only one open PR with a migration at a time
  - use expand → migrate → contract; no destructive change in the same release as the code change
- **Never weaken, skip or delete a test to get green.** Any change to a finance golden test needs a written justification in the PR.
- **No new dependency** unless the PR names it and says why.
- **Never touch production.** You have no prod credentials and must not ask for any.
- **Don't commit secrets, real customer data or real passport data.** Use `.env.example` and seed data.
- Run `pnpm verify` before opening a PR, and paste the summary into the PR.

## 4. Conventions

- British spelling in the domain (`organisation`, `cancelled`), matching the PRD.
- DB: `snake_case`, plural table names, `uuid` PKs (v7), `timestamptz` for timestamps, `date` for service dates, enums as Postgres enums or check constraints, as documented in 03-SCHEMA.
- TS: `camelCase`. Domain packages export pure functions plus services, and never import from `apps/*`.
- API: `/api/v1/<resource>`; errors as `{ error: { code, message, details? } }`; list endpoints are paginated; mutating payment, webhook and supplier-link endpoints accept an `Idempotency-Key`.
- Every row carries `organisation_id`. Never trust an `organisation_id` sent by the client; it comes from the session.

## 5. Dependency order

```
organisations → users/RBAC → audit → customers/travellers → suppliers → products/options
→ rates/seasons/FX → itineraries/items → pricing → quotes → bookings → invoices/payments
→ payables → profitability → operations → automation → portals → AI
```

Don't build a module before the modules it depends on exist.

## 6. Repo layout (target)

```
apps/web            Next.js UI + /api/v1 route handlers (thin)
apps/worker         pg-boss jobs: email, PDF, workflows, syncs
packages/db         Drizzle schema, migrations, RLS SQL, seed
packages/tenancy    withTenant, request context
packages/auth       session → user, requirePermission
packages/money      Money type, rounding, currency precision
packages/pricing    pricing engine (pure, golden-tested)
packages/finance    invoices, payments, allocations, payables
packages/audit      audit writer
packages/integrations/*  provider interfaces + implementations
packages/shared     Zod schemas, types, errors
tests/              cross-package integration, isolation, e2e
docs/               PRD, specs, ADRs, epics
```

## 7. Commands

Filled in by EPIC-001. Expected:

| Command | Does |
|---------|------|
| `pnpm dev` | Local stack |
| `pnpm db:reset` | Recreate the local DB, run migrations and seed |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | Integration tests against a real Postgres |
| `pnpm verify` | typecheck + lint + all tests (what CI runs) |

## 8. PR description must contain

Epic + slice · risk class (R0–R3) · migrations (yes/no + list) · new dependencies · tests added · `pnpm verify` summary · screenshots for UI.

## 9. Fixed review prompt (for the reviewing agent)

> Review this diff against AGENTS.md and the referenced epic. List **violations only**, each with file:line, the rule broken and a one-line fix. Check in particular:
> - tenant isolation (`organisation_id`, RLS, `withTenant`)
> - money handling (no `number`/float, server-side only)
> - immutability (quotes, booking history, issued finance records)
> - audit records for sensitive changes
> - `requirePermission` on every handler
> - migrations edited after merge
> - files outside the epic scope
> - tests weakened or missing for the acceptance criteria
>
> If there are no violations, reply "No violations."
