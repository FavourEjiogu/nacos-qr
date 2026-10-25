# NACOS QR — Project Context

## Product
Official NACOS memo-verification system. Administrators issue authoritative memo records; public users verify by QR/public ID. The QR points to the canonical record and does not embed the memo itself.

## Architecture
- Next.js App Router, React, TypeScript.
- Prisma 5 against PostgreSQL.
- Current migration target: Supabase project `nacos-qr`, ref `ayatnoolplaimcokvsfs`, region `eu-central-1`.
- HMAC-SHA256 integrity signatures use `APP_SECRET`; do not rotate it without a deliberate signing-key migration.
- Custom admin auth uses bcrypt password hash and signed HttpOnly session cookies.
- Vercel project: `nacos-qr`; production domain `https://nacos-qr.vercel.app`.

## Database boundaries
- Supabase application tables are in `public`.
- RLS is enabled on all application tables.
- RLS policies grant runtime access only to the `nacos_app` database role; `anon` and `authenticated` have no table privileges. Public verification is mediated by the Next.js server.
- Do not add browser-side database credentials or expose a service-role/secret key.
- The app uses `SUPABASE_DATABASE_URL` (least-privilege `nacos_app` runtime role) and `SUPABASE_DATABASE_URL_UNPOOLED` (database-owner migration role); the existing Neon-managed `DATABASE_URL` variables remain untouched as a fallback. Supabase's exact transaction/session pooler hosts must be copied from the Connect dialog; never guess the pooler hostname.
- Keep the existing Neon database intact until old records are reconciled and production smoke tests pass.

## Release status (2026-10-23, updated)
- Supabase project exists; the privacy-safe reference/admin-settings, database-enforced issuing-office registry, and office-FK index migrations are applied.
- Schema, RLS policies/grants, office registry, foreign-key index, and all five Prisma migration checksums were checked through Supabase SQL tools.
- Supabase currently has zero memo, link, serial-counter, login-attempt, audit-log, and admin-config rows, with 11 seeded issuing offices; source Neon counts have not been reconciled.
- Vercel production has not yet been switched to Supabase: `SUPABASE_DATABASE_URL` and `SUPABASE_DATABASE_URL_UNPOOLED` are not configured yet.
- Vercel logs APIs returned 403; production runtime behavior is not certified.
- PR #1 remains open; do not merge until connection configuration, Neon data reconciliation, and database-backed smoke tests are complete.
- Issuance separates PUBLIC and CONFIDENTIAL records. Public references are `NACOS/BHU/<OFFICE>/PUB/<YEAR>/<MONTH>/<SEQUENCE>`; confidential references are `NACOS/BHU/<OFFICE>/CONF/<YEAR>/<MONTH>/<RANDOM-TOKEN>`. Both have QR/reference verification; confidential records are not listed but their exact random reference is bearer access to the record.
- Reference format: `NACOS/BHU/<OFFICE>/PUB/<YEAR>/<MONTH>/<SEQUENCE>` or `NACOS/BHU/<OFFICE>/CONF/<YEAR>/<MONTH>/<RANDOM-TOKEN>`. The counter key contains office + UTC year + month.
- Admin settings support password changes, URL rotation, and `/admin/recover` recovery.

## Commands
```bash
npm ci
npx prisma generate
npm run lint
npm test
npm run build
npx prisma migrate deploy
```

## Important invariants
- Preserve all existing public IDs and serial numbers during migration.
- Preserve the existing `APP_SECRET` so already-issued signatures remain valid.
- Memo creation and its audit entry must remain atomic.
- Serial numbers and public IDs must remain unique.
- Revocation is operational state and must not be added to the content HMAC payload.
