# NACOS QR - Project Memory

## Overview
This repository contains the NACOS Official Document Verification Registry. The system allows NACOS administration to generate cryptographic, tamper-proof QR codes for physical/digital memos. Students can scan the QR code to verify the memo's authenticity against the authoritative Neon Postgres database.

## Technologies Used
- Framework: Next.js 16.3.6 (App Router)
- Database: Neon Postgres
- ORM: Prisma
- Authentication: Custom JWT-based `HttpOnly` cookie auth (`jose`, `bcryptjs`)
- Validation: HMAC-SHA256 signature verification

## Core Architecture
- **Admin Portal (`app/admin/[secret]`)**: Hidden behind an environment-configured route (`ADMIN_ROUTE_SECRET`). Used for generating memos and revoking them.
- **Verification Portal (`app/verify/[id]`)**: Publicly accessible. Loads the memo via `publicId` and compares the HMAC-SHA256 hash to detect database-level tampering.
- **Data Model**: `Memo` (authoritative record), `LoginAttempt` (rate limiting), `AuditLog` (system transparency).

## Lessons Learned
- **Next.js 15+ Async Params**: Forcing major version upgrades requires migrating dynamic URL segments (e.g., `params.id`) to asynchronous `Promises`. Failure to do so results in silent 404 layout crashes.
- **Cookies API in Next.js 15+**: `cookies()` must be awaited before calling `.get()`, `.set()`, or `.delete()`.

## Active Agent Directives
- Follow TDD and test-driven methodologies.
- Produce highly polished, zero-defect code.
- Ensure strict UI/UX alignment (iOS/Apple design paradigms without explicitly branding them). No emojis.
- Enforce junior-mid software engineer GitHub commit headers for all changed files.
