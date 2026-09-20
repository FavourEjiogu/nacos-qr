# Project Artifacts and Implementation Plan

## Implementation Plan
### Setup and Configuration
We will initialize a new Next.js project and configure the base styling to meet premium design standards (strict Apple/iOS design language). We will also set up Prisma with SQLite (for local dev).
Following system guidelines, we will also initialize:
- `AGENTS.md`: For persistent project memory across sessions.
- `getting-started.md`: Comprehensive documentation for local setup and environment variables.

### Database Schema
We will have two main models:

**1. Memo Model:**
- `id`: Unique identifier (UUID) used for the verification URL.
- `serialNumber`: Auto-generated unique string in the format `NACOSBHU/YY/MM/XXXX`. The `XXXX` will be concurrency-safe and reset every month.
- `title`: Title of the memo.
- `content`: Text content of the memo.
- `authors`: JSON array of author names.
- `phoneNumbers`: JSON array of contact numbers.
- `socialMediaLink`: Optional URL to the official social media post.
- `status`: Enum (`VALID`, `REVOKED`). Memos are **immutable**; they cannot be edited to preserve integrity, only revoked.
- `contentHash`: An HMAC-SHA256 signature using a server-side secret (`APP_SECRET`). This prevents someone from manually altering the database, as they cannot generate a valid hash without the secret environment variable.
- `createdAt`: Timestamp.

**2. AuditLog Model (for Tracking & Logs):**
- `id`: UUID.
- `action`: E.g., "CREATE_MEMO", "EXPORT_BACKUP".
- `memoId`: Optional reference to the affected memo.
- `timestamp`: When the action occurred.

### Admin Dashboard (`/admin`)
- **Create Memo Page:** Input memo details. The system will automatically generate the `NACOSBHU/YY/MM/XXXX` serial number and compute the server-signed integrity hash.
- **Memo List & QR Generation:** View all memos, download the QR code, and view serial numbers. Admins can **Revoke** a memo if it was issued in error, but cannot secretly edit it.
- **Backup & Logs:** A section to view the tamper-proof audit logs and a button to export/backup all memo data to a JSON/CSV file.

### Verification Page (`/verify/[id]`)
- A highly polished, mobile-first page (iOS design aesthetics: glassmorphism, clean typography, appropriate icons).
- Displays a "Verified Authentic" badge (or a red "REVOKED" warning if applicable) and the unique `serialNumber`.
- The system will dynamically re-calculate the HMAC signature of the data and compare it to the stored `contentHash` to prove absolute integrity (displaying a "Tamper-Free" seal).
- Shows original content, authors, phone numbers, and social media links.

## Task List
- Setup Next.js Project (no tailwind)
- Clean up default boilerplate
- Initialize AGENTS.md, getting-started.md, artifact.md, red-teamer.md
- Install Prisma and SQLite, qrcode.react
- Define Prisma Schema
- Core Backend Logic (HMAC, Serial Generator)
- Admin Dashboard UI/Logic
- Verification Page UI/Logic
- Testing & Verification
