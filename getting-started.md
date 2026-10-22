# NACOS QR — Getting Started

## 1. Architecture

NACOS QR is a small Next.js/Prisma/Supabase PostgreSQL application for official NACOS memo verification.

- Authoritative memo text is stored in PostgreSQL.
- QR codes point to a canonical public verification URL.
- QR codes are generated in the application; no external QR service is required.
- HMAC-SHA256 protects the integrity of authoritative memo content.
- Revocation is operational state and is intentionally separate from the content signature.
- Public verification requires no account.
- Administrative operations require an authenticated session.

## 2. Environment variables

Create `.env` locally. Never commit it.

```env
SUPABASE_DATABASE_URL="postgresql://..."
SUPABASE_DATABASE_URL_UNPOOLED="postgresql://..."

ADMIN_ROUTE_SECRET="use-a-long-random-value"
ADMIN_PASSWORD_HASH="bcrypt-hash-of-your-admin-password"

AUTH_SECRET="long-random-secret"
APP_SECRET="long-random-secret"

NEXT_PUBLIC_VERIFY_BASE_URL="http://localhost:3000"
```

Generate a bcrypt password hash with the project's installed `bcryptjs` package:

```bash
node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" "replace-with-your-password"
```

Do not paste real production secrets into source control, issue trackers, or documentation.

## 3. Local setup

```bash
npm install
npx prisma generate
npm run dev
```

The schema is versioned under `prisma/migrations/`. The initial migration has already been applied to the new Supabase project. For future schema changes, create a Prisma migration locally and deploy it with `npx prisma migrate deploy` against the intended database. Never reset or recreate the production database to fix an application-code problem.

## 4. Verification commands

Run the actual release checks before shipping:

```bash
npm run lint
npm test
npm run build
```

A successful Vercel build proves that the production build completed. It does not replace runtime smoke testing.

## 5. Routes

- Public home: `/`
- Public verification: `/verify/<PUBLIC_ID>`
- Admin portal: `/admin/<ADMIN_ROUTE_SECRET>`

The admin route is an additional discovery barrier, not an authorization mechanism. Authentication and authorization are enforced server-side.

## 6. Supabase connection setup\n\nCreate the connection strings in the Supabase Dashboard for project `nacos-qr` (project ref `ayatnoolplaimcokvsfs`). Set a strong password for the least-privilege `nacos_app` role in the Supabase SQL Editor using your password manager, then use the **Transaction pooler** string (port `6543`) with username `nacos_app.ayatnoolplaimcokvsfs` for `SUPABASE_DATABASE_URL` on Vercel and add `pgbouncer=true&connection_limit=1&sslmode=require` to its query parameters. Use the **Session pooler** string (port `5432`) with the database-owner username `postgres.ayatnoolplaimcokvsfs` for `SUPABASE_DATABASE_URL_UNPOOLED` so Prisma migrations can connect from IPv4-only environments. Copy the actual pooler host from Supabase's Connect dialog; do not guess it from the region. Keep the app-role password and database-owner password in Vercel's encrypted environment variables; never paste either into source control or a public client. Keep the database password URL-encoded if it contains reserved characters.\n\nThe Neon integration's existing `DATABASE_URL` variables are deliberately left untouched as a fallback; the app reads only `SUPABASE_DATABASE_URL` and `SUPABASE_DATABASE_URL_UNPOOLED`. The five application tables have RLS enabled and no public Data API policies. This is intentional: public verification is served by the Next.js server, which uses a private database connection. Do not add `NEXT_PUBLIC_` database credentials or grant direct table access to `anon`/`authenticated`.\n\n## 7. Production deployment

The GitHub repository is connected to Vercel and `master` is the production branch.

Before production release:

1. Confirm all required Production environment variables exist.
2. Confirm `NEXT_PUBLIC_VERIFY_BASE_URL` is the canonical public domain.
3. Run lint, tests, and build.
4. Deploy the exact reviewed commit.
5. Verify the deployment reaches `READY`.
6. Smoke-test public verification and admin authentication.
7. Create a test memo only if using an intentionally controlled test record; never invent production records merely for demonstration.

## 8. Integrity and lifecycle rules

The HMAC covers the authoritative memo fields, including:

- public ID
- serial number
- title
- body
- issuer
- issuer contact
- addressed-to
- document type
- issue/effective/expiry dates
- official links

Revocation status is not included in the content signature. A revoked memo should therefore still have a valid historical content signature while displaying its revoked state.

Changing `APP_SECRET` invalidates signatures created with the old secret. Treat the secret as long-lived production key material.

## 9. Security notes

- Never trust browser-supplied authorization state.
- Never expose `AUTH_SECRET`, `APP_SECRET`, password hashes, database credentials, or admin credentials to the client.
- Keep production secrets in Vercel's encrypted/sensitive environment storage.
- Do not commit helper scripts containing credentials or destructive Git automation.
- Do not claim that cryptographic verification proves the physical document itself was never altered; it proves the authoritative record's integrity.

## 10. Current production status

The production Vercel project is connected to this GitHub repository. Check the Vercel deployment state and runtime logs before declaring a release healthy.
