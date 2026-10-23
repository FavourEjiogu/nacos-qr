# Engineering Artifact — Supabase Migration

## Objective
Move NACOS QR's PostgreSQL hosting from Neon to Supabase without changing memo-verification semantics, invalidating signatures, or losing records.

## Completed
1. Created Supabase project `nacos-qr` (`ayatnoolplaimcokvsfs`) in `eu-central-1`; project reports healthy.
2. Applied initial schema for `Memo`, `MemoLink`, `SerialCounter`, `LoginAttempt`, and `AuditLog`.
3. Enabled RLS on all five application tables, created a least-privilege `nacos_app` runtime role with table-scoped policies, and revoked table access from `anon` and `authenticated`.
4. Added indexes for memo creation/status, memo-link foreign keys, login-attempt rate limiting, and audit history.
5. Applied the privacy-safe references/admin settings migration and registered its exact SHA-256 checksum in `_prisma_migrations` (three applied Prisma migrations).
6. Removed Neon-specific package dependencies and `neon.ts` config.
7. Updated README, setup guide, and environment template for Supabase.
8. Opened PR #1: https://github.com/FavourEjiogu/nacos-qr/pull/1.

9. Added public/private classification, per-office public counters, cryptographically random confidential references, and secure password/path management in the admin UI.\n\n## Verification evidence
- Supabase project state: `ACTIVE_HEALTHY`.
- Table inspection confirmed all five tables and expected columns/foreign keys.
- All five memo application tables plus `AdminConfig` have RLS enabled; only the `nacos_app` role receives application-table policies.
- SQL count query returned 0 memos, 0 links, 0 serial counters, 0 login attempts, and 0 audit logs; three Prisma migration records are present.
- Supabase security advisor should be rerun after the new `AdminConfig` table/migration; `_prisma_migrations` remains deliberately denied to the runtime and public roles.
- Supabase performance advisor reports unused indexes because the new database has no workload yet; this is expected before launch.
- Dependency refresh upgraded Next.js to `16.4.2`, React to `19.3.1`, the QR/icon dependencies, and ESLint/Vitest; the one-time workflow passed `npm audit --audit-level=high`, lint, tests, and build before the final office-code collision guard was added. A new full CI run is required for the latest commit.
- Vercel runtime/build-log calls returned 403; do not claim runtime tests passed.

## Remaining release blockers
0. Confirm the current GitHub CI passes the latest office-code guard and includes the npm audit gate.
1. Obtain the exact Supabase transaction and session pooler connection strings from the project's Connect dialog.
2. Set `SUPABASE_DATABASE_URL` and `SUPABASE_DATABASE_URL_UNPOOLED` in Vercel without exposing them to browser bundles.
3. Reconcile the old Neon database and migrate any existing rows while preserving IDs, timestamps, serial counters, hashes, and relations.
4. Confirm the existing `APP_SECRET` is retained.
5. Deploy only after env setup and migration reconciliation.
6. Smoke-test homepage, public ID lookup, admin login, memo creation, QR output, verification, invalid ID, revocation, and audit logging.
7. Keep Neon unchanged until the new deployment is confirmed healthy.

## Next action
Complete the connection setup through the Supabase Connect dialog and Vercel environment configuration, then run end-to-end smoke tests. Do not merge PR #1 before that.
