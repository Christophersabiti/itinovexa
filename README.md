# Itinovexa

Multi-tenant travel operations ERP for tour operators and DMCs. Start with [`AGENTS.md`](AGENTS.md) and [`docs/`](docs/).

## Quick start

Requires Node 24 (see `.nvmrc`). pnpm is pinned via `packageManager` and provided by corepack:

```bash
corepack enable
```

```bash
pnpm install
```

```bash
pnpm verify
```

`pnpm dev` runs the web app on http://localhost:3000 and the worker. The local database arrives in EPIC-001 slice 2.
