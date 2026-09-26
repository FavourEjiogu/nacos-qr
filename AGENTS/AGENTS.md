# NACOS Official Document Verification Registry

## Product Mission
The product is a NACOS OFFICIAL DOCUMENT VERIFICATION REGISTRY. It stores the authoritative structured representation of physical or digitally distributed memos. A QR code printed on the memo simply points to the official verification page.

## Architecture
- Framework: Next.js 16 (App Router)
- Database: Neon PostgreSQL via Prisma
- No file storage, object storage, PDF uploads, Redis, or external QR services.
- The authoritative memo record is kept in Neon PostgreSQL.
- QR codes are generated dynamically in-app using `qrcode.react` (as SVG).

## Security Invariants
- Do not store plaintext admin passwords in browser storage.
- Do not treat the admin route secret as authentication.
- Authentication relies on a server-side verified password hash and a secure HTTPOnly session cookie.
- Integrity is protected via HMAC-SHA256, proving that the database record has not been maliciously modified without the server signing secret.
- Do not claim that HMAC proves the authenticity of the physical paper itself.
- Do not use hardcoded fallback secrets. If `APP_SECRET` or `AUTH_SECRET` are missing, fail closed.
- `isAuthenticated(req)` must be awaited.

## Database Invariants
- Source of truth is PostgreSQL.
- Do not reintroduce SQLite.
- Minimum status states: `ACTIVE`, `REVOKED`. `EXPIRED` is derived from `expiresAt < now`.
- Serial numbering must be atomic and race-condition free.
- Record operations (create + audit log, revoke + audit log) must be atomic transactions.

## UI Invariants
- Design for clarity, trust, speed, mobile usability, accessibility, and visual polish.
- No emojis, excessive gradients, oversized icons, glassmorphism, or complex marketing layouts.
- Do not expose the admin route from the public homepage.
- The verification states (VERIFIED — ACTIVE, VERIFIED — EXPIRED, MEMO REVOKED, VERIFICATION FAILED, RECORD NOT FOUND) must be strictly distinct and visually clear.

## Dependency Rules
- Do not introduce PDF storage.
- Do not replace the internal QR implementation with an external QR service.
- Use Node.js built-in APIs (like `crypto`) rather than installing unnecessary utility libraries (e.g., `nanoid`).

## Testing Commands
- `npm install`
- `npx prisma generate`
- `npm run lint`
- `npx tsc --noEmit`
- `npm test`
- `npm run build`

## Forbidden Over-engineering
- No NextAuth/Auth.js (unless required).
- No complicated draft/publish engine (creating = publishing).
- No background workers for status updates (derive EXPIRED).

## Known Design Decisions
- Keeping `qrcode.react` to generate and download SVGs instead of canvas conversions.
- Using standard CSS modules over Tailwind or component frameworks.
- Caching verification pages where technically valid, but invalidating on revoke.

## Commits
Remember to add junior-mid engineer style commit messages at the top of committed files for Github.
