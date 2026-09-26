# Red Team Audit & Vulnerability Log

## Current Posture
- **Authentication**: JWT `HttpOnly` cookies implemented. Passwords hashed via `bcryptjs`.
- **Database**: Migrated to Neon serverless Postgres.
- **Rate Limiting**: `LoginAttempt` model implemented to prevent brute-force attacks on the admin portal.
- **Routing Security**: Admin portal obfuscated via `ADMIN_ROUTE_SECRET` environmental variable.

## Potential Attack Vectors (Monitored)
- **Database Tampering**: Addressed via `HMAC-SHA256` recalculation on fetch. If the backend record is modified, the hash check will fail and mark the memo as tampered.
- **Session Hijacking**: Addressed by enforcing `HttpOnly` and `Secure` (in production) flags on cookies.

## Action Items
- Maintain zero dependencies with high severity vulnerabilities. (Currently 0 vulnerabilities via `npm audit fix --force`).
