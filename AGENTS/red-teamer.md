# Red Team Audit & Vulnerability Log

## Current Posture
- **Authentication**: JWT `HttpOnly` cookies implemented. Passwords hashed via `bcryptjs`.
- **Database**: Migrated to Neon serverless Postgres.
- **Rate Limiting**: `LoginAttempt` model implemented to prevent brute-force attacks on the admin portal.
- **Routing Security**: Admin portal obfuscated via `ADMIN_ROUTE_SECRET` environmental variable.

## Potential Attack Vectors (Monitored & Patched)
- **Database Tampering**: Addressed via `HMAC-SHA256` recalculation on fetch. If the backend record is modified, the hash check will fail and mark the memo as tampered.
- **Session Hijacking**: Addressed by enforcing `HttpOnly` and `Secure` (in production) flags on cookies.
- **DDoS on Verification Route**: Addressed via Next.js ISR (`revalidate = 60`). The database is shielded from concurrent access spikes by edge caching.
- **Environment Variable Truncation (Patched)**: Resolved a vulnerability where `dotenv-expand` evaluated `$ ` inside `.env` passwords, leading to corrupted admin logins. Passwords are now safely enclosed in single quotes.


## Action Items
- Maintain zero dependencies with high severity vulnerabilities. (Currently 0 vulnerabilities via `npm audit fix --force`).
