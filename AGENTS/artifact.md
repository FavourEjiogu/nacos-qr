# Engineering Artifact — Supabase Migration

## Objective
Move NACOS QR's PostgreSQL hosting from Neon to Supabase without changing memo-verification semantics, invalidating signatures, or losing records.

## Completed
1. Created Supabase project `nacos-qr` (`ayatnoolplaimcokvsfs`) in `eu-central-1`; project reports healthy.
2. Applied initial schema for `Memo`, `MemoLink`, `SerialCounter`, `LoginAttempt`, and `AuditLog`.
3. Enabled RLS on all five application tables, created a least-privilege `nacos_app` runtime role with table-scoped policies, and revoked table access from `anon` and `authenticated`.
4. Added indexes for memo creation/status, memo-link foreign keys, login-attempt rate limiting, and audit history.
5. Created a versioned Prisma migration and registered its SHA-256 checksum in `_prisma_migrations`.
6. Removed Neon-specific package dependencies and `neon.ts` config.
7. Updated README, setup guide, and environment template for Supabase.
8. Opened PR #1: https://github.com/FavourEjiogu/nacos-qr/pull/1.

## Verification evidence
- Supabase project state: `ACTIVE_HEALTHY`.
- Table inspection confirmed all five tables and expected columns/foreign keys.
- All five application tables report RLS enabled.
- SQL count query returned 0 memos, 0 links, and 0 audit logs; two Prisma migration records are present.
- Supabase security advisor reports one informational RLS-without-policy finding for `public._prisma_migrations`. This is intentional; migration metadata is not granted to runtime or public Data API roles.
- Supabase performance advisor reports unused indexes because the new database has no workload yet; this is expected before launch.
- Vercel created READY preview deployments for intermediate commits, but the final deployment/runtime and user flows have not been certified.
- Vercel runtime/build-log calls returned 403; do not claim runtime tests passed.

## Remaining release blockers
1. Obtain the exact Supabase transaction and session pooler connection strings from the project's Connect dialog.
2. Set `SUPABASE_DATABASE_URL` and `SUPABASE_DATABASE_URL_UNPOOLED` in Vercel without exposing them to browser bundles.
3. Reconcile the old Neon database and migrate any existing rows while preserving IDs, timestamps, serial counters, hashes, and relations.
4. Confirm the existing `APP_SECRET` is retained.
5. Deploy only after env setup and migration reconciliation.
6. Smoke-test homepage, public ID lookup, admin login, memo creation, QR output, verification, invalid ID, revocation, and audit logging.
7. Keep Neon unchanged until the new deployment is confirmed healthy.

## Next action
Complete the connection setup through the Supabase Connect dialog and Vercel environment configuration, then run end-to-end smoke tests. Do not merge PR #1 before that.
