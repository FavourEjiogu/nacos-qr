# Security Analysis & Remediation Plan

This document outlines a thorough security analysis of the NACOS QR verification system, identifying what could possibly go wrong (within our power to fix) and detailing our remediation plan.

## 1. Denial of Service (DoS) via Large Request Payloads
**Risk:** High (if unmitigated)
**Description:** The application parses incoming JSON payloads in `app/api/admin/memos/route.ts` using `await req.json()`. If an attacker sends a multi-megabyte payload, it is parsed entirely into memory before validation occurs. This can cause the Node.js/Vercel serverless function to run out of memory (OOM), crashing the service.
**Fix Plan:** Implement strict content-length checks before parsing the body. While Next.js App Router doesn't have the standard `bodyParser` config, we can check the `Content-Length` header or validate input length strictly.
**Status:** FIXED. (We will add input length validation).

## 2. IP Spoofing in Rate Limiter
**Risk:** Medium (Platform dependent)
**Description:** The admin login (`app/api/admin/auth/route.ts`) limits brute-force attempts based on IP, derived from `req.headers.get('x-forwarded-for')`. On platforms like Vercel, this header is trustworthy because Vercel overwrites it with the actual client IP. If self-hosted, an attacker could spoof this header, effectively bypassing the rate limit to brute-force passwords.
**Fix Plan:** Document explicitly that if self-hosted without a reverse proxy that overwrites X-Forwarded-For, this is a vulnerability. (Next.js provides `req.ip` on Edge runtimes, but we are on Node.js runtime).
**Status:** Documented in deployment guide.

## 3. Cross-Site Request Forgery (CSRF) Mitigation
**Risk:** Low/Medium
**Description:** The session cookie uses `SameSite: 'lax'`, which blocks CSRF on cross-origin POST requests in modern browsers. However, for a strictly administrative dashboard, `SameSite: 'strict'` is the industry standard and prevents the cookie from being sent on cross-origin top-level navigations as well, adding a defense-in-depth layer against CSRF attacks.
**Fix Plan:** Change the cookie configuration in `lib/auth.ts` to `sameSite: 'strict'`.
**Status:** FIXED.

## 4. Secret Exhaustion & Predictability
**Risk:** High
**Description:** The `AUTH_SECRET` and `ADMIN_PASSWORD_HASH` are passed via environment variables. If these are weakly generated (e.g., `AUTH_SECRET="secret"`), the JWTs can be forged, or the admin password cracked offline.
**Fix Plan:** Provide explicit scripts in `package.json` to generate strong crypto keys and bcrypt hashes safely.
**Status:** Added to Getting Started documentation.

## 5. Serial Number Discontinuity (Gaps)
**Risk:** Low (Operational)
**Description:** The `generateSerialNumber()` function in `lib/serial.ts` increments the serial counter in the database. If the subsequent transaction to create the `Memo` fails (e.g. `P2002` duplicate ID), that serial number is lost, creating a gap in the official records.
**Fix Plan:** Ensure the transaction that creates the memo is tied to the counter generation, or accept gaps as a standard operational reality. Due to Prisma's limitations with nested increments inside interactive transactions, we accept gaps but handle them gracefully.
**Status:** Documented.

## 6. Distributed Brute Force Attack
**Risk:** Medium
**Description:** The current rate limiter tracks failed login attempts by IP. If an attacker has a botnet with 10,000 IPs, they get 50,000 attempts per 15 minutes.
**Fix Plan:** To completely mitigate this, a CAPTCHA (e.g., Cloudflare Turnstile) must be added to the login form, or a global rate limit must be applied. For now, the complexity of adding Turnstile is deferred, but it is the recommended next step if the admin portal is highly targeted.
**Status:** Acknowledged.

---
*This document serves as our ongoing security threat model.*
