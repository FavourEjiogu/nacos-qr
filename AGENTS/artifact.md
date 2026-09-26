# Implementation Artifacts & History

All historical implementation plans, workflows, and tasks will be logged here in full to ensure context is never lost.

## Active Phase: COMPLETE (Project Remediation finished)
- Goal: System is now fully functional, secure, and rigorously adheres to the minimalist/institutional aesthetic requested. 

## Future Agents Guide
1. Start by reviewing `AGENTS.md` and `red-teamer.md`.
2. Verify Next.js 15+ strict runtime standards are maintained (e.g., `await cookies()`, `await params`).
3. Ensure no Tailwind CSS is introduced. Stick to Vanilla CSS Modules or inline styling.
4. Always verify database connections with `npx prisma db push` if the schema is modified.

## Phase 3 - Scale & UX Polish (September 25)
- **UI/UX Refactoring**: Rewrote globals.css, admin, and verify pages with strict Apple/iOS-like glassmorphism, HSL colors, removing emojis for Lucide-React icons.
- **Scaling to 1k+ DAU**: Enabled Next.js Incremental Static Regeneration (ISR) by injecting `export const revalidate = 60;` into `/verify/[id]/page.tsx`. Capped Admin API payload to 100 rows (`take: 100`) to prevent Node.js OOM crashes on deep queries. 
- **Security & Bug fixes**: Fixed the `.env` `dotenv-expand` evaluation bug caused by `$`, which truncated the admin password. The password string was wrapped in single quotes `''` to force strict literal evaluation.
- **UX Laws**: Implemented a manual ID lookup search on the root `/` route (Fitts's Law) for users dealing with smudged or corrupted physical QR codes.

## Phase 4, 5, 6 - Final Implementation & Verification (September 26)
- **Security Enhancements**: 
  - Rewrote ID generation using Node `crypto.randomBytes` instead of `nanoid`.
  - Removed all insecure fallbacks (`|| 'default-secret'`) in `lib/crypto.ts` and `lib/auth.ts`.
  - Replaced regular equality checks with `timingSafeEqual` for MAC validation.
  - Implemented `await isAuthenticated(req)` across all API routes to fix the async bug.
- **Data Model & Concurrency**: 
  - Refactored `lib/serial.ts` to use PostgreSQL atomic `upsert` ensuring gapless, race-condition-free reference generation.
  - Simplified Memo status down to `ACTIVE` and `REVOKED` (with `EXPIRED` derived dynamically).
  - Encapsulated creation flow in a Prisma `$transaction` to ensure audit logs and memo creation succeed/fail together.
- **UI/UX Finalization**:
  - Restyled `/verify/[id]/page.tsx` for absolute clarity (ACTIVE, EXPIRED, REVOKED, FAILED). Added manual reference number support (`/verify/NACOSBHU/...`).
  - Restyled Admin dashboard and create forms for a clean institutional look without over-engineered layouts.
  - Fixed SVG QR download (native XMLSerializer Blob) in place of Canvas.
- **Documentation**: 
  - Created `getting-started.md` and updated `README.md` to accurately reflect environment variables and Next.js / Neon PostgreSQL stack.
