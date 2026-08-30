# 0001 — Foundation choices

**Status:** Accepted — 2026-08-29

## Decisions

- Use npm and Node 22 to minimize prerequisite tooling.
- Use Supabase PostgreSQL RPCs for atomic review and ledger writes; no separate backend.
- Treat `point_transactions` as append-only. Corrections reference the original and use a signed compensating amount.
- Store group IANA timezone and evaluate reporting boundaries in PostgreSQL.
- Keep pt-BR copy under `src/shared/i18n`; code and schema remain English.
- Use a feature-first UI with infrastructure adapters; components receive data/actions and never issue arbitrary database calls.
- Ship a responsive bottom-navigation shell and installable PWA in the foundation.

## Consequences

Authorization logic is centralized in database helpers/RPCs and duplicated only for UX hints. Local integration requires Docker for Supabase. Group theme customization is constrained to validated semantic fields rather than arbitrary CSS.
