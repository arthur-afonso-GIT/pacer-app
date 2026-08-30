# Supabase Edge Functions

No Edge Function is required for the Phase 1 scoring path. Score mutations are implemented as PostgreSQL `SECURITY DEFINER` RPCs in `0002_security_and_rpcs.sql`, where authorization, row locking, status history, and ledger writes share one transaction.

Future functions should:

- authenticate with the caller's bearer token and pass that identity through;
- call the public RPCs rather than writing protected tables directly;
- reserve the service-role key for server-controlled jobs and never expose it to clients;
- be idempotent and emit `audit_events` for privileged/background actions.
