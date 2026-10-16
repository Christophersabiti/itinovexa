# EPIC-0xx — <Name>

- **Phase:** N
- **Risk class:** R0–R3
- **Depends on:** EPIC-…
- **Feature flag:** `flag_name` / none

## Goal
One paragraph: what a user can do when this ships.

## In scope
-

## Out of scope
-

## Data (must match 03-DATABASE-SCHEMA.md)
| Table | Columns touched | New? |
|-------|-----------------|------|

## API
| Method | Path | Permission | Notes |
|--------|------|------------|-------|

## Permissions
-

## Slices (one PR each)
1. Schema + migrations + RLS
2. Domain service + unit tests
3. API + integration tests
4. UI

## File scope
Agents may edit only:
-

## Acceptance criteria
**AC-1** Given … when … then …

## Definition of Done
- [ ] All ACs automated and green in CI
- [ ] Audit rows for sensitive changes
- [ ] Schema / API docs updated
- [ ] Seed data covers the feature
- [ ] Demoed on staging
