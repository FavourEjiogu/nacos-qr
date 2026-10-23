# NACOS QR — Official Memo Verification

NACOS QR is the official NACOS document-verification system. Administrators create authoritative memo records with an issuing office, a human-readable reference, a visibility classification, and a server-side HMAC-SHA256 integrity signature. Public records receive an unguessable verification ID and QR. Confidential records receive a different, cryptographically random reference and are never published to the public verification route.

## What it does

- Public verification at `/verify/<PUBLIC_ID>`
- Manual verification by public ID/reference
- Server-generated QR codes with no third-party QR service
- HMAC-SHA256 integrity verification for authoritative memo content
- Admin-only memo creation and revocation
- Office-scoped public references and unpredictable confidential references
- Separate public-verification and confidential-register workflows
- Document type, addressed-to, issuer, issuer contact, dates, and official links
- Audit logging for administrative actions
- Supabase PostgreSQL via Prisma (private server-side connection; RLS enabled on all application tables)
- Next.js App Router with a deliberately small dependency footprint

## Security model

The QR code is a pointer to the canonical verification record; it does not contain the document itself.

The integrity signature covers the authoritative memo content. Operational status such as revocation is deliberately not part of the content signature, so a valid historical signature can still be checked after a memo is revoked.

Verification confirms that the authoritative public database record has not been altered without the signing secret. It does **not** by itself prove that a physical or uploaded copy of a document was not altered. Users should compare the verified record with the document they received. Confidential records have no public verification ID or QR, and public lookups explicitly filter to records classified `PUBLIC`. Unpredictable confidential references provide additional resistance to guessing; access control—not secrecy of a reference—is what keeps private content out of the public verifier.

Administrative authentication uses a bcrypt password hash, signed HttpOnly session cookies, SameSite protection, and login rate limiting. Required secrets are fail-closed.

## Stack

- Next.js 16 / App Router
- React 19
- Prisma 5
- Supabase PostgreSQL
- Node.js crypto / HMAC-SHA256
- `qrcode.react`
- Vanilla CSS

## Reference-number policy

Public references are sequential within the issuing-office/year series. For example, the Presidency starts a series like `NACOS/BHU/PRES/PUB/2026/0001`; the Secretariat uses `NACOS/BHU/SEC/PUB/2026/0001`. The office code is stable and recorded on the memo, so references identify both the issuing office and the document's public classification.

Confidential correspondence uses a separate series, such as `NACOS/BHU/PRES/CONF/2026/23456-789AB-CDEFG-HJKLM-NPQRST`. The final token is generated from cryptographically secure randomness. A confidential record receives **no public verification ID and no public QR**. Entering its serial in the public verifier returns “Record not found,” even if someone learns the reference. Choose **Confidential** for private letters; do not rely on the document-type label to make a record private.

The Presidency's office code is `PRES`. Other registered office codes distinguish their own public and confidential series. Office code reuse for a different office name is rejected to preserve a stable audit trail.

## Admin access and security

Open the current private admin link saved in the authorised administrator's password manager. In **Admin settings**, change the admin password or rotate the private admin URL. Password changes require the current password, a 12-character minimum, and invalidate other existing admin sessions. URL rotation generates a new random link and disables the previous link; copy and save the new link immediately.

If the private admin URL is lost, visit `/admin/recover` on the official site and authenticate with the current admin password to generate a fresh link. Keep the admin URL private, but remember that URL secrecy is not a replacement for authentication.

## Local development

```bash
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

Required runtime variables are documented in `.env.example` and `getting-started.md`.

Useful verification commands:

```bash
npm run lint
npm test
npm run build
```

## Deployment

The repository is connected to Vercel. The `master` branch is the production source.

Production requires the two Supabase connection variables below (the existing Neon-managed variables remain untouched as a fallback):

- `SUPABASE_DATABASE_URL`
- `SUPABASE_DATABASE_URL_UNPOOLED`
- `ADMIN_ROUTE_SECRET`
- `ADMIN_PASSWORD_HASH`
- `AUTH_SECRET`
- `APP_SECRET`
- `NEXT_PUBLIC_VERIFY_BASE_URL`

Never commit `.env` or secret values.

## Important operational rule

Do not change `APP_SECRET` after issuing live memos unless the complete existing-record signing strategy is deliberately migrated. Changing it invalidates signatures generated with the previous secret.

Do not silently edit an issued memo's authoritative content. If an official record must be withdrawn or superseded, use the administrative revocation flow.

## License

MIT.
