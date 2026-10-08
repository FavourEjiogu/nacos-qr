# NACOS QR — Official Memo Verification

NACOS QR is the official NACOS document-verification system. Administrators create authoritative memo records; each record receives a human-readable reference, a random public verification ID, and a server-side HMAC-SHA256 integrity signature. Public users can verify a record by scanning its QR code or entering its verification ID.

## What it does

- Public verification at `/verify/<PUBLIC_ID>`
- Manual verification by public ID/reference
- Server-generated QR codes with no third-party QR service
- HMAC-SHA256 integrity verification for authoritative memo content
- Admin-only memo creation and revocation
- Sequential NACOS reference numbers
- Document type, addressed-to, issuer, issuer contact, dates, and official links
- Audit logging for administrative actions
- Neon PostgreSQL via Prisma
- Next.js App Router with a deliberately small dependency footprint

## Security model

The QR code is a pointer to the canonical verification record; it does not contain the document itself.

The integrity signature covers the authoritative memo content. Operational status such as revocation is deliberately not part of the content signature, so a valid historical signature can still be checked after a memo is revoked.

Verification confirms that the authoritative database record has not been altered without the signing secret. It does **not** by itself prove that a physical or uploaded copy of a document was not altered. Users should compare the verified record with the document they received.

Administrative authentication uses a bcrypt password hash, signed HttpOnly session cookies, SameSite protection, and login rate limiting. Required secrets are fail-closed.

## Stack

- Next.js 16 / App Router
- React 18
- Prisma 5
- Neon PostgreSQL
- Node.js crypto / HMAC-SHA256
- `qrcode.react`
- Vanilla CSS

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

Production requires:

- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
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
