# NACOS QR — Getting Started

## 1. What NACOS QR does

NACOS QR is the official NACOS document register and public verification system. Authorised administrators issue memos and letters; the record stores its issuing office, document type, dates, authoritative body, visibility classification, and an HMAC-SHA256 integrity signature.

There are two separate issuance paths:

- **Public:** use only when NACOS intends the record to be publicly verifiable. It gets a sequential office/year reference, a random public verification ID, and a QR/link.
- **Confidential:** use for private letters or correspondence. It gets a separate cryptographically random reference, but no public verification ID, QR, or verification URL. The public verifier explicitly filters out confidential records.

**Visibility is not the same as document type.** A letter described as “External Communication” may still be confidential. Select Confidential whenever its contents should not be searchable or retrievable through NACOS QR.

## 2. Reference-number policy

The format is:

- Public: `NACOS/BHU/<OFFICE>/PUB/<YEAR>/<SEQUENCE>`
- Confidential: `NACOS/BHU/<OFFICE>/CONF/<YEAR>/<RANDOM-TOKEN>`

Examples:

- Presidency public memo: `NACOS/BHU/PRES/PUB/2026/0001`
- Secretariat public memo: `NACOS/BHU/SEC/PUB/2026/0001`
- Presidency confidential letter: `NACOS/BHU/PRES/CONF/2026/ABCDE-FGHIJ-KLMNO-PQRST-UVWXYZ`

Public counters run separately by year and office. The Presidency's stable office code is `PRES`; other offices have their own code, such as `SEC` for the Secretariat. If you use “Other office / committee,” assign a distinct code and keep the office name consistent. The app rejects a code if it has already been used for a different office name.

Confidential references use 26 characters generated from cryptographically secure randomness and grouped for readability. They do not use the sequential public counter. Even if a student learns or guesses a confidential reference, public lookup will return “Record not found”; confidential content is never exposed by the public verifier. The unpredictable reference adds defence in depth, but the actual privacy guarantee is the server-side visibility filter and admin authentication.

## 3. Routes

- Public homepage: `/`
- Public verification: `/verify/<PUBLIC_ID>`
- Private admin workspace: `/admin/<PRIVATE_PATH>`
- Recover a lost private admin link: `/admin/recover`

Do not share the private admin URL in public groups. It is a discovery barrier, not a substitute for the admin password.

## 4. Admin use

1. Open the private admin URL and sign in with the administrator password.
2. Choose **New document**.
3. Select **Public** or **Confidential** before entering the document details.
4. Select the issuing office. Use the stable Presidency code `PRES` for documents issued by the President's office. Other offices use their designated code.
5. Enter the actual approved title, issuer, recipient, issue/effective/expiry dates, document type, body, and any official links.
6. Review the visibility, office, reference format, and content before creating the record.
7. For public records, download the generated QR or copy the public verification URL. For confidential records, copy the confidential reference and include it only in the authorised letter; there is no public QR or verification link.

Do not create fake live memos for demonstrations. Test in a separate development/preview database.

## 5. Change the admin password or URL

In the authenticated workspace, open **Security settings**.

**Change password:** enter the current password, a new password of at least 12 characters, and the confirmation. A password change invalidates other administrator sessions. Use a unique password from a password manager; do not use a shared or predictable password.

**Rotate private admin URL:** confirm the current password and select **Generate new admin URL**. The app produces a random path and stores only its SHA-256 digest in the database. Save the returned link immediately. The previous link stops working after the change.

**If the link is lost:** open `https://nacos-qr.vercel.app/admin/recover`, enter the current admin password, and generate a fresh link. This recovery page is deliberately separate from the hidden admin path and should not be treated as a way to bypass the password.

Keep `ADMIN_ROUTE_SECRET` in Vercel as a bootstrap fallback for first-time setup/recovery. Once a new path has been stored in the database, that stored hash becomes authoritative. Never put the password, password hash, or private path in source control.

## 6. Environment variables

Keep local variables in an untracked `.env` file. Configure production secrets in Vercel's encrypted environment-variable settings.

Required values:

- `SUPABASE_DATABASE_URL`: server-side Prisma runtime connection using Supabase's **Transaction pooler** (port 6543), username `nacos_app.ayatnoolplaimcokvsfs`, with `pgbouncer=true&connection_limit=1&sslmode=require`.
- `SUPABASE_DATABASE_URL_UNPOOLED`: Prisma migration connection using the Supabase **Session pooler** (port 5432), username `postgres.ayatnoolplaimcokvsfs`.
- `ADMIN_ROUTE_SECRET`: long random bootstrap path secret (minimum 24 characters).
- `ADMIN_PASSWORD_HASH`: bcrypt hash for the initial admin password; after password rotation the database hash takes priority.
- `AUTH_SECRET`: long random signing secret for the HttpOnly admin session cookie.
- `APP_SECRET`: the long-lived HMAC key for memo integrity. Do **not** rotate it during migration.
- `NEXT_PUBLIC_VERIFY_BASE_URL`: canonical public origin, `https://nacos-qr.vercel.app` in production or `http://localhost:3000` locally.

In Supabase Dashboard, open **Connect** and copy the actual shared pooler host from the connection string. Do not construct it from the region; the pooler cluster index varies by project. Percent-encode reserved characters in passwords. Never use a `NEXT_PUBLIC_` prefix for database credentials.

The existing Neon-managed `DATABASE_URL` variables are intentionally preserved until source data and runtime flows have been reconciled. The app uses the Supabase-specific variables only.

## 7. Local development

```bash
npm ci
npx prisma generate
npm run dev
```

Run the release gates before shipping:

```bash
npm run lint
npm test
npm audit --audit-level=high
npm run build
```

The schema and migrations live under `prisma/`. For future schema changes, create and review a migration and run `npx prisma migrate deploy` against the intended database. Do not reset or recreate the production database to fix an application-code problem.

## 8. Data integrity and security invariants

- Keep the existing `APP_SECRET` so previously issued HMACs remain valid. The app preserves version-1 signatures for older records; new records use a versioned signature that includes visibility and office identity.
- Memo creation and its audit entry must remain atomic.
- Do not silently edit the authoritative contents of an issued memo. Use the revocation flow to withdraw a record.
- Revocation is operational state and is not included in the content HMAC.
- Never add public Data API privileges or RLS policies for `anon`/`authenticated` on the private memo registry. Public verification is served through the application with an explicit `PUBLIC` visibility filter.
- A successful build does not certify database connectivity. Verify login, public memo creation/verification, confidential non-visibility, revocation, and audit persistence after each production migration.

## 9. Migration and release gate

The new Supabase schema now includes office-aware numbering, visibility classification, nullable public IDs, and the `AdminConfig` table. The corresponding Prisma migration is registered as applied on the new Supabase database. The live production cutover must still wait for Vercel's exact Supabase connection strings, source-Neon count reconciliation, and a successful database-backed smoke test. Keep Neon intact until those checks pass.
