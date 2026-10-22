# Architecture Decisions

## ADR-001 — Keep Prisma; replace Neon with Supabase PostgreSQL
**Decision:** Keep the existing Next.js/Prisma architecture and change the PostgreSQL host rather than introducing Supabase Auth or rewriting data access to REST/RPC.

**Reason:** Existing app logic relies on Prisma transactions for atomic memo creation + audit logging, serial counters, and relational memo links. A backend rewrite during an urgent issuance workflow would increase risk.

## ADR-002 — Use Supavisor pooler strings on Vercel
**Decision:** Use the exact Supabase transaction pooler connection string for `SUPABASE_DATABASE_URL` and session pooler string for `SUPABASE_DATABASE_URL_UNPOOLED`; preserve Neon-managed `DATABASE_URL` variables as fallback.

**Reason:** Vercel serverless runtime does not support direct IPv6 database connections in the default environment. Pooler hosts vary and must be copied from Supabase Connect; do not synthesize them.

## ADR-003 — Deny public Data API access
**Decision:** Enable RLS, grant all-row policies only to the private `nacos_app` runtime role, and revoke table privileges from `anon` and `authenticated`.

**Reason:** Public verification is mediated by server-side application logic. Granting table-wide SELECT would expose the complete memo registry and could reveal unpublished records.

## ADR-004 — Preserve HMAC key
**Decision:** Keep the existing `APP_SECRET` unchanged during migration.

**Reason:** Existing memo hashes are verified against this key; rotation without a key-versioned migration invalidates previously issued signatures.

## ADR-005 — Do not switch production before reconciliation
**Decision:** Keep Neon as fallback and do not merge the migration until the connection is configured and source/target data are reconciled.

**Reason:** A database switch without record migration can break existing QR codes and verification IDs.
