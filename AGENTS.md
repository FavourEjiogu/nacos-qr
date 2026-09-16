<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Memo Metadata Refinements (26th Sept)
- Fixed connection/env issues for prisma schema pushes and Next.js start errors.
- Added `issuerPhone` and `documentType` to Prisma Schema, mapped `department` to `addressedTo`.
- Updated Next.js application to handle UI metadata fields: Document Type, Issued By, WhatsApp Contact, Addressed To.
- Added WhatsApp contact action buttons and verification instructions for discrepency reporting.
- Successfully implemented backward compatibility in cryptographic hash logic for existing records in Neon DB.
