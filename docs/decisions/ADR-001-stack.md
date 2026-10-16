# ADR-001 — Application stack

- **Status:** Accepted (2026-10-16)
- **Date:** 2026-10-16
- **Deciders:** Christopher Sabiti

## Context

Itinovexa is a multi-tenant travel ERP, and its core is finance: decimal money, multiple currencies, immutable history and reporting. The team is one founder plus AI coding agents, and it must grow into a team without a rewrite. The PRD proposes Next.js + NestJS + Prisma + Redis/BullMQ on a VPS. The founder already works with React, TypeScript, Supabase and Vercel.

The hard requirements that drive this choice:

1. Exact decimal money arithmetic and relational integrity → **PostgreSQL**
2. Tenant isolation that holds even when application code has a bug → **row-level security as a backstop**
3. Few moving parts while there's one operator, with domain boundaries that can be split out later

## Decision

| Concern       | Choice                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Monorepo      | pnpm workspaces + Turborepo                                                                                                                                                                                                          |
| Web + API     | **Next.js (App Router) + TypeScript** in `apps/web`. REST `/api/v1/*` route handlers stay thin; all domain logic lives in `packages/*`                                                                                               |
| Database      | **Supabase Postgres** (separate projects for staging and prod; PITR on prod)                                                                                                                                                         |
| Auth          | **Supabase Auth** (email/password, magic link, TOTP MFA). Identity only; authorisation is ours (RBAC tables)                                                                                                                         |
| Data access   | **Drizzle ORM** over a direct Postgres connection from server code only. The browser never queries tables directly                                                                                                                   |
| Tenancy       | Every request runs in a transaction under a non-`BYPASSRLS` role with `SET LOCAL app.org_id / app.user_id`. RLS policies check `organisation_id = current_setting('app.org_id')::uuid`. The app filters by org _and_ RLS enforces it |
| Migrations    | Drizzle schema in `packages/db` → generated SQL migrations + hand-written SQL for RLS, triggers and functions. Applied by CI only                                                                                                    |
| Money         | `numeric(18,4)` for amounts, `numeric(18,8)` for FX rates; `decimal.js` behind a `Money` type in `packages/money`; amounts are **strings** in JSON                                                                                   |
| Validation    | Zod schemas shared by the API and forms; OpenAPI generated from Zod                                                                                                                                                                  |
| UI            | Tailwind + shadcn/ui, TanStack Query, React Hook Form                                                                                                                                                                                |
| Jobs          | **pg-boss** (a Postgres-backed queue, so no Redis) in `apps/worker` (Node) for emails, PDFs, workflows and syncs                                                                                                                     |
| PDFs          | Worker renders HTML templates with Playwright/Chromium                                                                                                                                                                               |
| Storage       | Supabase Storage behind a `StorageProvider` interface (R2 later if cheaper)                                                                                                                                                          |
| Email         | Resend or Postmark behind `EmailProvider`                                                                                                                                                                                            |
| Hosting       | Vercel (web/API), Railway or Fly.io (worker), Supabase (nearest available region to East Africa), Cloudflare DNS/WAF in front                                                                                                        |
| Testing       | Vitest (unit + integration against a real local Postgres), Playwright (e2e)                                                                                                                                                          |
| Observability | Sentry, Better Stack/UptimeRobot                                                                                                                                                                                                     |

## Alternatives considered

| Option                                                 | Why not (for now)                                                                                                                                                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **NestJS + Prisma + Redis/BullMQ on a VPS (PRD)**      | Solid, but adds a separate API service, Redis and server administration for one person. The domain packages keep a later move to `apps/api` (NestJS or Fastify) cheap if it's ever needed                       |
| **Supabase with client-side `supabase-js` + RLS only** | It puts authorisation in two places, keeps finance logic out of a proper server layer and makes multi-step finance transactions awkward. We keep RLS as a backstop only                                         |
| **Convex**                                             | Great developer experience and realtime, but it has no native decimal type, a weaker SQL/BI/reporting story for accounting exports, and a different isolation model. Finance is the core here, so Postgres wins |
| **Prisma instead of Drizzle**                          | Workable, but per-transaction `SET LOCAL` for RLS, raw SQL migrations and policies are more natural in Drizzle                                                                                                  |

## Consequences

- One deployable web/API app plus one worker. Low operating cost and a fast start.
- Vendor exposure: Supabase is standard Postgres with GoTrue auth, so we could move to RDS, Neon or Crunchy plus another auth provider. Vercel → any Node host.
- Long-running work (PDFs, syncs, workflows) **must** go through the worker. Route handlers stay under about 10 seconds.
- **Revisit when:** sustained API load needs separate scaling, the team passes ~8 engineers, or a customer requires on-prem hosting or a specific data-residency region.

## Note on the parent `CLAUDE.md`

`/Users/christophersabiti/CLAUDE.md` tells agents the project uses Convex. Claude Code loads that file in this folder too. If this ADR is accepted, the project `CLAUDE.md` overrides it, and the parent file should be moved into the Convex project it belongs to.
