# Pacer

Mobile-first healthy-habit competition app built with React and Supabase. User-facing copy is Brazilian Portuguese; code and technical documentation are English.

## Prerequisites

- Node.js 22 and npm 12
- Docker Desktop (for local Supabase)
- Graphify 0.9.48 or a compatible release; always inspect `graphify --version` and `graphify --help` before use

## Setup from a clean checkout

```bash
npm ci
cp .env.example .env.local
npx supabase start
npx supabase db reset
npm run dev
```

Copy the local anon key printed by Supabase into `.env.local`. Never use a service-role key in a `VITE_*` variable.

## Quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run build-storybook
npx playwright install chromium
npm run e2e
```

## Repository boundaries

- `src/features/*` exposes narrow feature APIs.
- `src/infrastructure/*` owns external adapters.
- UI components receive data/actions; they do not make arbitrary database calls.
- `supabase/migrations/*` is the source of truth for schema, RLS, and trusted operations.
- `docs/*` records product, permissions, architecture, and testing decisions.

## Graphify workflow

Graphify supplements—not replaces—documentation and tests. Generated output is ignored and never enters production bundles.

The foundation was mapped only after architecture, schema, and documentation existed. On this machine the inspected CLI was `graphify 0.9.48`; its local help supports these exact commands:

```bash
graphify --version
graphify --help
graphify extract . --code-only --no-cluster
graphify update .
graphify query "Which modules depend on the Supabase client?" --graph graphify-out/graph.json
graphify affected "supabase" --depth 2 --graph graphify-out/graph.json
graphify god-nodes --top 10 --graph graphify-out/graph.json
```

Run `graphify update .` after major structural changes. Before a cross-feature refactor, run `query` and `affected`, then confirm findings against code and tests. `.graphifyignore` excludes dependencies, generated outputs, reports, and secrets.

## Documentation

Start with [`docs/product.md`](docs/product.md), [`docs/architecture.md`](docs/architecture.md), [`docs/domain-model.md`](docs/domain-model.md), and [`docs/permissions.md`](docs/permissions.md).
