# NACOS QR — Getting Started

## 1. Architecture

NACOS QR is a small Next.js/Prisma/Neon application for official NACOS memo verification.

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
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."

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

If the database schema needs to be synchronized in a development environment, use the project's existing Neon/Prisma workflow. Do not reset or recreate the production database to fix an application-code problem.

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

## 6. Production deployment

The GitHub repository is connected to Vercel and `master` is the production branch.

Before production release:

1. Confirm all required Production environment variables exist.
2. Confirm `NEXT_PUBLIC_VERIFY_BASE_URL` is the canonical public domain.
3. Run lint, tests, and build.
4. Deploy the exact reviewed commit.
5. Verify the deployment reaches `READY`.
6. Smoke-test public verification and admin authentication.
7. Create a test memo only if using an intentionally controlled test record; never invent production records merely for demonstration.

## 7. Integrity and lifecycle rules

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

## 8. Security notes

- Never trust browser-supplied authorization state.
- Never expose `AUTH_SECRET`, `APP_SECRET`, password hashes, database credentials, or admin credentials to the client.
- Keep production secrets in Vercel's encrypted/sensitive environment storage.
- Do not commit helper scripts containing credentials or destructive Git automation.
- Do not claim that cryptographic verification proves the physical document itself was never altered; it proves the authoritative record's integrity.

## 9. Current production status

The production Vercel project is connected to this GitHub repository. Check the Vercel deployment state and runtime logs before declaring a release healthy.
