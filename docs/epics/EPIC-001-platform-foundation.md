# EPIC-001 — Platform Foundation

- **Phase:** 1
- **Risk class:** R3 (tenancy, audit) + R2 (schema)
- **Depends on:** ADR-001 accepted
- **Feature flag:** none

## Goal

A working monorepo that a developer or agent can clone and run with one command. It has CI gates that block unsafe changes, and a proven tenancy mechanism, so that every later epic inherits isolation, auditing and money safety without rebuilding them.

## In scope

- pnpm + Turborepo monorepo with the layout in `AGENTS.md` §6. Only these packages are created now: `web`, `worker` (stub), `db`, `tenancy`, `money`, `audit`, `shared`.
- Local stack: Supabase via Docker (`supabase start`), `pnpm dev`, `pnpm db:reset`, `.env.example`.
- Two tables: `organisations` and `audit_logs` (below).
- DB roles: a migration role (owner) and `app_user` (no `BYPASSRLS`, no table ownership).
- `withTenant(ctx, fn)`: opens a transaction, runs `SET LOCAL app.org_id`, `app.user_id` and `app.request_id`, then calls `fn(tx)`.
- `packages/money`: `Money` type on decimal.js with currency precision (UGX 0, USD/EUR/GBP/KES/ZAR 2), `add`, `sub`, `mul`, `allocate`, `round(mode)`, and string (de)serialisation.
- `packages/audit`: `writeAudit(tx, { action, entity, entityId, oldValue, newValue })`, which takes the user, org, IP and request ID from the context.
- `GET /api/v1/health` checks DB connectivity (no auth, no tenant data).
- Seed: two demo orgs, _Pearl Safaris (Demo)_ (base currency UGX) and _Rival Tours (Demo)_ (base currency USD).
- CI (GitHub Actions): `typecheck`, `lint`, `format`, `unit`, `integration`, `tenant-isolation`, `schema-lint`, `migrations`, `money-lint`, `security`.
- Fill in `AGENTS.md` §7 with the real commands.

## Out of scope

Auth, users and RBAC (EPIC-002). Org settings UI (EPIC-003). Any business tables. Deployment to staging is a follow-up slice once the hosting accounts exist.

## Data

Provisional. Copy these into `03-DATABASE-SCHEMA.md` when that doc is written.

**`organisations`**: `id uuid pk`, `name text not null`, `slug text unique not null`, `base_currency char(3) not null`, `timezone text not null default 'Africa/Kampala'`, `status text not null check in ('active','suspended')`, `created_at`, `created_by uuid null`, `updated_at`, `updated_by uuid null`.
RLS: `id = current_setting('app.org_id')::uuid`.

**`audit_logs`**: `id uuid pk`, `organisation_id uuid not null fk`, `user_id uuid null`, `action text not null`, `entity text not null`, `entity_id uuid null`, `old_value jsonb`, `new_value jsonb`, `ip inet null`, `request_id text null`, `created_at timestamptz not null default now()`.
RLS: `organisation_id = current_setting('app.org_id')::uuid`. **`app_user` has INSERT and SELECT only** (no UPDATE or DELETE). Index on `(organisation_id, entity, entity_id)` and on `(organisation_id, created_at desc)`.

`audit_logs` is append-only, so it has no `updated_*` columns. `schema-lint` keeps an explicit allow-list for append-only tables.

## Slices (one PR each)

1. **Scaffold:** monorepo, tooling, `pnpm verify`, CI skeleton (typecheck, lint, format, unit, security).
2. **DB + tenancy:** local Supabase, Drizzle, both tables, roles, RLS, `withTenant`, seed, `db:reset`.
3. **Guards:** `tenant-isolation`, `schema-lint` and `migrations` test suites, wired into CI.
4. **Money + audit:** `packages/money` with golden tests, the `money-lint` ESLint rule, `packages/audit`.
5. **Health + docs:** health endpoint, worker stub, `AGENTS.md` §7, README quick-start.

## File scope

Agents may edit only:

- the repo root config files
- `apps/web`, `apps/worker`
- `packages/{db,tenancy,money,audit,shared}`
- `tests/`
- `.github/workflows/`
- `README.md`
- `AGENTS.md` §7

## Acceptance criteria

**AC-1 Clean start.** Given a fresh clone with Docker running, when `pnpm install && pnpm db:reset && pnpm dev` runs, then `GET /api/v1/health` returns `200 {"status":"ok","db":"ok"}`.

**AC-2 Isolation (read).** Given audit rows exist for Pearl Safaris and Rival Tours, when a query runs inside `withTenant` as Pearl Safaris, then only Pearl Safaris rows are returned, even with no `WHERE organisation_id` in the query.

**AC-3 Isolation (write).** Given a session for Pearl Safaris, when it inserts an `audit_logs` row with Rival Tours' `organisation_id`, then the insert is rejected by RLS.

**AC-4 No context, no data.** Given a connection as `app_user` without `app.org_id` set, when any tenant table is queried, then zero rows are returned (or an error is raised), never all rows.

**AC-5 Every tenant table is covered.** Given any table with an `organisation_id` column, when `tenant-isolation` runs, then it fails if RLS is disabled or no policy exists on that table. Verify this by adding a throwaway table without RLS in a test and seeing it fail.

**AC-6 Schema lint.** Given a new business table missing `created_by`, or a money column typed `double precision`, when `schema-lint` runs, then it fails and names the table and column.

**AC-7 Audit is append-only.** Given an existing audit row, when `app_user` attempts UPDATE or DELETE, then permission is denied.

**AC-8 Money golden tests.**

- `Money("200.00","USD") × 3 = "600.00" USD`
- `Money("0.10") + Money("0.20") = "0.30"` exactly
- `Money("1000","UGX") × 1.18` rounds to `"1180"` UGX (0 dp)
- allocating `"100.00" USD` into 3 parts gives `["33.34","33.33","33.33"]`, which sums to exactly `"100.00"`

**AC-9 Money lint.** Given code in `packages/money|pricing|finance` that uses `parseFloat` or `toFixed`, when `lint` runs, then it fails.

**AC-10 Migrations immutable.** Given a migration file already on `main`, when a PR modifies it, then the `migrations` check fails.

## Definition of Done

- [ ] AC-1…AC-10 automated and green in CI
- [ ] `AGENTS.md` §7 commands filled in and accurate
- [ ] `organisations` and `audit_logs` copied into `03-DATABASE-SCHEMA.md`
- [ ] README quick-start works on a clean machine
