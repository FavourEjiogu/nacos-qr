# Implementation Details

## Architecture
- Next.js 16 (App Router)
- PostgreSQL (via Prisma) hosted on Neon
- Styling: CSS Modules (minimalist, institutional design)
- QR Generation: In-app SVG via `qrcode.react`

## Authoritative Data Flow
1. Admin logs in with `ADMIN_ROUTE_SECRET` and password.
2. Admin submits authoritative memo information.
3. Server validates, generates `publicId`, fetches atomic serial from DB.
4. Server generates HMAC-SHA256 signature using `APP_SECRET` over the canonicalized authoritative data.
5. Memo is inserted in PostgreSQL atomically along with an AuditLog entry.
6. User scans QR or inputs ID -> Verification Page fetches DB record, recalculates signature, displays result.

## Security Model
- **Authentication**: JWT based session using `AUTH_SECRET`, securely signed, HTTPOnly cookie. Verification is server-side and async. No default secrets fallback in production.
- **Data Integrity**: HMAC-SHA256 of public memo fields prevents undetected malicious modification of database records. Validated using constant-time equality.

## Verification Model
- **VERIFIED — ACTIVE**: Record found, integrity check passed, not revoked, not expired.
- **VERIFIED — EXPIRED**: Record found, integrity check passed, not revoked, but `expiresAt` is in the past.
- **MEMO REVOKED**: Record found, status is `REVOKED`.
- **VERIFICATION FAILED**: Record found, but HMAC-SHA256 integrity check fails.
- **RECORD NOT FOUND**: ID or Serial does not match any record.

## QR Model
- Renders as SVG inline using `qrcode.react`.
- QR download is straight SVG (direct blob), not serialized through Canvas to PNG.
- QR content is strictly the verification URL (e.g. `https://verify.domain.com/verify/7Y2KF94Q`).

## Status Model
- `ACTIVE`: The standard published state.
- `REVOKED`: Withdrawn by admin.
- `EXPIRED`: Derived state (`expiresAt < now()`).

## Caching Model
- Next.js route caching (`revalidate = 60`) on the public `/verify/[id]` page.
- Admin APIs bypass caching.
- Revocation must explicitly invalidate the affected route cache using Next.js `revalidatePath`.

## Commands for Verification
- `npm install`
- `npx prisma generate`
- `npm run lint` (using `eslint` directly)
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

## Known Design Constraints
- Mobile-first, strict institutional styling.
- No HTML editors, simple text rendering only.
- Strict database transactions for status mutations.
- Next.js 16 requires Node >= 20.9+.

## Future Agents Must Not Introduce:
- PDF storage, S3, external storage APIs
- External QR generators
- NextAuth/OAuth
- Complex draft workflows
- Redis or background workers
- Tailwind or bloated styling libraries
