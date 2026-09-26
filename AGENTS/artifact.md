# Implementation Artifacts & History

All historical implementation plans, workflows, and tasks will be logged here in full to ensure context is never lost.

## Active Phase: Phase 3 (UI Polish)
- Goal: Finalize the public verification UI, ensuring a modern, sleek, and highly polished visual presentation.

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
