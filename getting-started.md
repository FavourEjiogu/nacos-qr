# NACOS QR — Getting Started

## 1. What NACOS QR does

NACOS QR is the official NACOS document register and public verification system. Authorised administrators issue memos and letters; the record stores its issuing office, document type, dates, authoritative body, visibility classification, and an HMAC-SHA256 integrity signature.

There are two separate issuance paths:

- **Public:** it gets an office/year/month sequential reference, a random public verification ID, and a QR/link.
- **Confidential:** it gets an office/year/month reference with a cryptographically random 26-character token and a QR/link that verifies the exact record. It has no public verification ID and is not listed in a directory; only someone who knows the exact random reference can retrieve it.

**Visibility is not the same as document type.** A letter described as “External Communication” may still be confidential. Confidential-reference verification is a bearer-key model: anyone who obtains the exact serial or QR can read the stored verification record. Do not use this mode for material that must remain inaccessible after its reference is forwarded; deliver such documents through a separate private channel.

## 2. Reference-number policy

The format is:

- Public: `NACOS/BHU/<OFFICE>/PUB/<YEAR>/<MONTH>/<SEQUENCE>`
- Confidential: `NACOS/BHU/<OFFICE>/CONF/<YEAR>/<MONTH>/<RANDOM-TOKEN>`

Examples:

- Presidency public memo in October: `NACOS/BHU/PRES/PUB/2026/10/0001`
- Presidency public memo in November: `NACOS/BHU/PRES/PUB/2026/11/0001`
- Secretariat public memo in October: `NACOS/BHU/SEC/PUB/2026/10/0001`
- Presidency confidential letter: `NACOS/BHU/PRES/CONF/2026/10/23456-789AB-CDEFG-HJKLM-NPQRST`

Public counters run separately for each office, UTC year and month. The month is taken automatically from the recorded issue date and padded to two digits; for example, October is `10`, November is `11`, and January is `01`. Each office/month/year has its own counter, so October `0002` is unaffected by the November counter beginning at `0001`. When the issue date crosses into another year, the new year's month series starts independently. If an authorised administrator intentionally backdates the issue date, the reference follows that entered date.

Confidential references use 26 characters generated from cryptographically secure randomness and grouped for readability. They do not use the sequential public counter or a public verification ID. The serial is accepted for exact-match verification, and a QR is generated for convenience. No general registry listing or sequential search can reveal them, but possession of the exact reference/QR enables access to the verification record. Share it only with authorised recipients; this is not encryption or recipient authentication.

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
7. For either classification, download the verification QR or copy the verification URL. Public records can also be verified by their public ID. Confidential records use only their random serial as the verification key; only share the QR/link with the intended recipient.

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
- Never add public Data API privileges or RLS policies for `anon`/`authenticated` on the memo registry. Exact-reference verification is served through the application; there is no general list/search endpoint. Confidential verification is a bearer-reference model, not recipient identity authentication.
- A successful build does not certify database connectivity. Verify login, public memo creation/verification, confidential exact-reference verification and non-enumerability, revocation, and audit persistence after each production migration.

## 9. Migration and release gate

The new Supabase schema now includes office-aware numbering, visibility classification, nullable public IDs, and the `AdminConfig` table. The corresponding Prisma migration is registered as applied on the new Supabase database. The live production cutover must still wait for Vercel's exact Supabase connection strings, source-Neon count reconciliation, and a successful database-backed smoke test. Keep Neon intact until those checks pass.
