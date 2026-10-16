# 00 — Delivery & Ops Architecture

How Itinovexa gets specified, built, verified, released and operated, from one founder with AI agents up to a full engineering team. The pipeline stays the same as the team grows. What changes is who fills each seat.

## 1. Principles

1. **The repo is the source of truth.** Chats produce documents, and those documents land in `docs/`. If a decision exists only in a chat, it doesn't exist.
2. **One owner per stage.** Agents build, CI proves, and humans own the risky parts.
3. **Small slices.** Each epic ships as several PRs (schema → domain → API → UI). Keep each PR under about 400 changed lines, excluding generated files.
4. **Risk-based review.** Human attention goes to money, schema, auth and tenancy. CI covers everything else.
5. **Nothing reaches production without a human.** No agent ever holds production credentials.

## 2. The pipeline

| # | Stage | Input → Output (artifact in repo) | Owner | Gate |
|---|-------|-----------------------------------|-------|------|
| 1 | **Spec** | PRD section → `docs/epics/EPIC-0xx.md` | Claude (chat/Project) drafts | You approve; epic meets *Definition of Ready* (§11) |
| 2 | **Design** | Epic → screen spec in the epic, or a Figma link | Claude / Figma | You approve (UI-heavy epics only) |
| 3 | **Build** | Epic → slice PRs | Claude Code (primary) | `pnpm verify` passes locally |
| 4 | **Verify** | PR → green checks | GitHub Actions | Required status checks (§6) |
| 5 | **Review** | PR → approval | Codex (rules review), then you on R2/R3 | CODEOWNERS on risk paths (§5) |
| 6 | **Release** | `main` → staging → production | GitHub Actions + Vercel + migrations | Manual promotion to prod (§8) |
| 7 | **Operate** | Production → signals | Sentry, uptime, logs, backups | Alerts (§9) |
| 8 | **Track** | Everything | GitHub Projects | You (§10) |

```
 PRD ──► EPIC-0xx.md ──► slice branch ──► PR ──► CI ──► Codex review ──► (you: R2/R3) ──► main
                                                                                          │
                                         prod ◄── manual approve ◄── smoke + milestone ◄── staging
```

## 3. Agent roles

| Agent | Role | Notes |
|-------|------|-------|
| **Claude (chat / Project)** | Spec writer, schema/finance reasoning, ADRs | Output is always a file committed to `docs/` |
| **Claude Code** | Primary builder | Reads `AGENTS.md` → epic → writes tests first → implements one slice → `pnpm verify` → opens PR |
| **Codex** | Default reviewer; second builder only for parallel epics | Uses the fixed review prompt in `AGENTS.md` §9 |
| **You** | Product owner and risk approver | Review R2/R3 PRs, run milestone flows on staging, promote releases |

**The model that wrote the code is never the only reviewer.** If Codex built a slice, Claude Code reviews it, and the other way round.

Cost rule: use one builder (Claude Code) until two epics with disjoint file scopes are ready at the same time. Before that, a second builder adds only coordination cost.

## 4. Branching and parallel work

- **Trunk-based with short-lived slice branches**, not long-lived epic branches. Use names like `e010/schema` and `e010/pricing-service`. Each branch merges to `main` within 1–3 days, and unfinished modules stay hidden behind feature flags. Long epic branches drift from `main` and cause painful merges, especially when several agents work at once.
- **Parallel agents use git worktrees**, one per epic. Each epic file declares its *file scope*, and two concurrent epics must not have overlapping scopes.
- **Migrations are serialised.** Only one open PR may contain a migration at a time, which a `migration-lock` label enforces. This prevents numbering and ordering conflicts between agents.
- `main` is always deployable to staging.

## 5. Risk classes

| Class | What | Paths (indicative) | Required to merge |
|-------|------|--------------------|-------------------|
| **R0** | Docs, copy, styling | `docs/**`, `*.css`, UI text | CI |
| **R1** | Ordinary feature code | most of `apps/**`, `packages/**` | CI + Codex review |
| **R2** | Schema, migrations, RLS policies, seeds | `packages/db/**`, `**/migrations/**` | CI + Codex + **you** |
| **R3** | Money, auth, RBAC, tenancy, audit | `packages/money`, `packages/pricing`, `packages/finance`, `packages/auth`, `packages/tenancy` | CI + Codex + **you** + any change to finance golden tests needs a written explanation |

`.github/CODEOWNERS` and a path labeller enforce these classes. **The R2/R3 human gate never relaxes**, even when you have engineers. At that point they share the gate with you.

## 6. CI gates (required status checks)

| Check | Purpose | From |
|-------|---------|------|
| `typecheck`, `lint`, `format` | Baseline hygiene | Phase 1 |
| `unit` (Vitest) | Domain logic, including **finance golden tests** (fixed inputs → exact decimal outputs) | Phase 1 |
| `integration` | Runs against a real Postgres (local Supabase in CI), never mocks | Phase 1 |
| `tenant-isolation` | Lists **every** table with `organisation_id` and checks that RLS is on, the policies exist, and org A can't read or write org B's rows | Phase 1 |
| `schema-lint` | SQL test: every business table has `organisation_id`, `created_at/by`, `updated_at/by`; money columns are `numeric`, never `float`/`real` | Phase 1 |
| `migrations` | Migrations apply cleanly from an empty database; already-merged migration files are unchanged | Phase 1 |
| `money-lint` | ESLint bans `parseFloat`, `toFixed`, `Number()` and `+`/`*` on money in the finance/pricing packages; money uses the `Money` type only | Phase 1 |
| `e2e` (Playwright) | Milestone flows (M1 from Phase 3, M2 from Phase 4) | Phase 3 |
| `security` | Dependency audit, secret scan (gitleaks), CodeQL | Phase 1 |

## 7. Environments

| Env | Hosting | Data | Who deploys | Agents? |
|-----|---------|------|-------------|---------|
| **local** | Docker (local Supabase) + `next dev` + worker | Seed: demo org *"Pearl Safaris (Demo)"* plus a second org *"Rival Tours (Demo)"* for isolation tests | Developer / agent | Yes |
| **preview** | Vercel preview per PR (Phase 5+, optional) | Staging DB or a DB branch | CI | Read-only |
| **staging** | Vercel + separate Supabase project | Seed plus anonymised samples | CI on merge to `main` | No |
| **production** | Vercel + separate Supabase project (PITR on) | Real | CI after **manual approval** (GitHub Environment protection) | **Never** |

Production secrets live only in GitHub Environments and Vercel. Agents never get them.

## 8. Release flow

1. Merge to `main` → CI deploys to **staging** and applies migrations.
2. Smoke e2e runs on staging automatically.
3. From Phase 3, you run the current milestone flow by hand on staging.
4. Tag `vX.Y.Z` → the production job waits for your approval → migrate → deploy → post-deploy health check.

**Migration discipline:** use expand → migrate → contract. Add the new structure, backfill, switch the code, then remove the old structure in a *later* release. Never ship a destructive migration in the same release as the code that stops using the old structure.

**Rollback:** roll the app back instantly in Vercel. For the database, prefer a forward fix. Point-in-time recovery is the last resort.

## 9. Operate

| Concern | Tool | Notes |
|---------|------|-------|
| Errors | Sentry (web, API, worker) | Tag every event with `organisation_id` and `request_id` |
| Uptime | Better Stack or UptimeRobot | `/api/health` checks the DB and the queue |
| Logs | Vercel + Supabase logs | Structured JSON; never log passport data, card data or bank details |
| Jobs | pg-boss tables + internal admin page | Alert on failed and stuck jobs |
| Backups | Supabase PITR (prod) + nightly `pg_dump` to separate storage (e.g. Cloudflare R2) | Keep 7 daily, 4 weekly and 12 monthly copies. **Run a restore drill every quarter.** |
| Alerts | Email + WhatsApp/Telegram bot | Critical: prod down, failed payments or webhooks, failed migration |

## 10. Tracking

GitHub Projects board: **Backlog → Ready (meets DoR) → Building → In Review → On Staging → Done**.

- Each epic is an issue labelled `phase:N`, `epic:0xx` and `risk:R0–R3`.
- Each slice is a sub-issue, and each PR links to its slice.
- At the end of each week, the board answers "what shipped, what's blocked, what's next" without anyone asking.

## 11. Definition of Ready / Done

**Ready**: the epic file has:
- scope and explicit out-of-scope
- the tables and columns it touches, matching `03-DATABASE-SCHEMA.md`
- its endpoints and the permissions they need
- Given/When/Then acceptance tests
- a file scope
- a risk class
- its slices

**Done**: an epic is done when:
- every acceptance test is automated and green
- sensitive changes write audit records
- the schema and API docs are updated
- the feature flag state is stated
- the seed data covers the new feature
- it has been demoed on staging

## 12. Scaling path

| Stage | Team | What changes | What never changes |
|-------|------|--------------|--------------------|
| **Now** | You + Claude Code + Codex reviewer | One epic at a time; two in worktrees once scopes are disjoint | The 10 engineering rules |
| **2–4 engineers** | Engineers take review (stage 5) and on-call (stage 7) | CODEOWNERS per package; agents still do most of the building | R2/R3 need a human |
| **5–15 engineers** | Domain owners: pricing, finance, ops, platform | Preview environments per PR, SLOs, a staging data refresh job | No agent gets prod access |
| **1,000+ orgs** | Platform team | Extract worker or finance into services if needed, along the existing package boundaries; add read replicas; partition the largest tables by `organisation_id` | Tenant isolation is tested on every PR |

The modular monolith is how this stays cheap. The domain boundaries (`packages/pricing`, `packages/finance`, …) exist from day one, so pulling one out into a service later is mostly a deployment change.
