# Engineering Artifact — Supabase Migration

## Objective
Move NACOS QR's PostgreSQL hosting from Neon to Supabase without changing memo-verification semantics, invalidating signatures, or losing records.

## Completed
1. Created Supabase project `nacos-qr` (`ayatnoolplaimcokvsfs`) in `eu-central-1`; project reports healthy.
2. Applied initial schema for `Memo`, `MemoLink`, `SerialCounter`, `LoginAttempt`, and `AuditLog`.
3. Enabled RLS on all seven application tables, created a least-privilege `nacos_app` runtime role with table-scoped policies, and revoked table access from `anon` and `authenticated`.
4. Added indexes for memo creation/status, memo-link foreign keys, login-attempt rate limiting, and audit history.
5. Applied the privacy-safe references/admin settings, persistent office registry, and office-FK index migrations. All five Prisma migration checksums are registered in `_prisma_migrations`.
6. Removed Neon-specific package dependencies and `neon.ts` config.
7. Updated README, setup guide, and environment template for Supabase.
8. Opened PR #1: https://github.com/FavourEjiogu/nacos-qr/pull/1.

9. Added public/private classification, per-office public counters, cryptographically random confidential references, and secure password/path management in the admin UI.

## Verification evidence
- Supabase project state: `ACTIVE_HEALTHY`.
- Table inspection confirmed all five tables and expected columns/foreign keys.
- All seven application tables (`Memo`, `MemoLink`, `SerialCounter`, `LoginAttempt`, `AuditLog`, `AdminConfig`, `IssuingOffice`) have RLS enabled; only `nacos_app` receives application-table policies.
- SQL counts returned 0 memos, 0 links, 0 serial counters, 0 login attempts, 0 audit logs, and 0 AdminConfig rows; the IssuingOffice registry contains 11 seeded offices. Five Prisma migration records are finished with verified checksums.
- Supabase security advisor reports one informational RLS-without-policy finding on `public._prisma_migrations`, which is intentionally unavailable to the runtime and public roles. No unindexed foreign-key finding remains; unused-index warnings are expected on the empty target database.
- Supabase performance advisor reports unused indexes because the new database has no workload yet; this is expected before launch.
- Latest GitHub Actions run for the monthly-reference/confidential-verification changes passed dependency audit (`npm audit --audit-level=high`, 0 reported vulnerabilities), lint, all 16 tests, and the production build. The corresponding Vercel preview deployment reached READY.
- The Vercel connector returned 403 when fetching protected preview runtime URLs; do not claim database-backed runtime smoke tests passed.

## Remaining release blockers
0. The confirmed pooler host is `aws-1-eu-central-1.pooler.supabase.com`. Set a strong password for the least-privilege `nacos_app` role; it currently has no password. Do this in Supabase SQL Editor and never send the password in chat.
1. Set `SUPABASE_DATABASE_URL` in Vercel Preview for branch `migration/supabase-postgres`, using `nacos_app.ayatnoolplaimcokvsfs` on port 6543 with `pgbouncer=true&connection_limit=1&sslmode=require`.
2. Set `SUPABASE_DATABASE_URL_UNPOOLED` in Vercel to the Session pooler on port 5432 using `postgres.ayatnoolplaimcokvsfs`; reset the Supabase database password in its secure dashboard if the existing owner password is not available, then place it directly into Vercel as a sensitive variable. Do not expose either URL to browser bundles.
3. Reconcile the old Neon database and migrate any existing rows while preserving IDs, timestamps, serial counters, hashes, and relations.
4. Confirm the existing `APP_SECRET` is retained.
5. Deploy only after env setup and migration reconciliation.
6. Smoke-test homepage, public ID lookup, admin login, memo creation, QR output, verification, invalid ID, revocation, and audit logging.
7. Keep Neon unchanged until the new deployment is confirmed healthy.

## Next action
Complete the connection setup through the Supabase Connect dialog and Vercel environment configuration, then run end-to-end smoke tests. Do not merge PR #1 before that.
