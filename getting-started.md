# NACOS QR - Getting Started Guide

Welcome to the NACOS QR repository. This document provides everything an engineer needs to understand, set up, deploy, and manage the system.

## 1. System Architecture

NACOS QR is a cryptographic verification system that generates tamper-proof memos with scannable QR codes. 
It uses Next.js (App Router), Prisma (with Neon PostgreSQL), and standard Web Cryptography (HMAC-SHA256).

- **No PDF storage**: We store the authoritative text in the database and render it on the fly.
- **No 3rd-party QR APIs**: QR codes are generated client-side using `qrcode.react`.
- **Fail-closed security**: The system will crash or deny access if secrets are missing or tampered with.

## 2. Environment Variables & Secrets

To run the system, you must define the following variables in a `.env` file at the root of the project. Do not use default or empty strings in production.

```env
# 1. Database Connection
# Connection strings for Neon Serverless Postgres.
# DATABASE_URL should be the pooled connection. DATABASE_URL_UNPOOLED is required for Prisma migrations.
DATABASE_URL="postgresql://[user]:[password]@[host]:5432/[db]?sslmode=require&pgbouncer=true"
DATABASE_URL_UNPOOLED="postgresql://[user]:[password]@[host]:5432/[db]?sslmode=require"

# 2. Administrative Security
# The secret path used to access the admin portal (e.g., if set to "secure-123", the route is /admin/secure-123)
ADMIN_ROUTE_SECRET="super-secret-path"
# The bcrypt hash of the admin password. Generate this using the provided script (see below).
ADMIN_PASSWORD_HASH="$2a$10$YourBcryptHashGoesHere..."

# 3. Cryptography & Integrity
# Used to sign JWT session cookies for admin auth. Must be cryptographically secure.
AUTH_SECRET="generate-a-secure-random-string-here"
# Used to generate HMAC-SHA256 hashes for memo integrity verification. 
# WARNING: Changing this will invalidate all previously issued memos!
APP_SECRET="generate-another-secure-random-string-here"

# 4. Public URLs
# The base URL of your deployed application, used for generating QR code links.
NEXT_PUBLIC_VERIFY_BASE_URL="http://localhost:3000"
```

## 3. Local Setup

1. **Install Node.js 18+ (20+ Recommended)**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Generate your Admin Password Hash:**
   Run the following command to hash your desired password securely using bcrypt:
   ```bash
   node -e "require('bcryptjs').hash('your-new-password', 10).then(console.log)"
   ```
   *Copy the output and set it as `ADMIN_PASSWORD_HASH` in your `.env` file.*
4. **Push the schema to Neon:**
   ```bash
   npx prisma db push
   ```
   *Note: We use `db push` for rapid schema synchronization during development.*
5. **Generate the Prisma client:**
   ```bash
   npx prisma generate
   ```

## 4. Running Locally

Start the development server:
```bash
npm run dev
```

### Key Routes
- **Public Landing Page**: `http://localhost:3000`
- **Admin Dashboard**: `http://localhost:3000/admin/<ADMIN_ROUTE_SECRET>`
- **Public Verification Page**: `http://localhost:3000/verify/<PUBLIC_ID>`

## 5. How to Manage Admin Credentials

**Changing the Admin Route Path:**
Simply change `ADMIN_ROUTE_SECRET` in your `.env` (or Vercel dashboard). The admin portal will instantly move to `/admin/<YOUR_NEW_SECRET>`. The old route will return a 404.

**Changing the Admin Password:**
1. Generate a new bcrypt hash: `node -e "require('bcryptjs').hash('new-password', 10).then(console.log)"`
2. Update the `ADMIN_PASSWORD_HASH` environment variable.
3. Restart the server (or trigger a redeploy on Vercel). Active sessions will remain until they expire, but new logins will require the new password.

## 6. Deployment: What's left? (Vercel + Neon Guide)

The application code is fully complete and production-ready. The final step is deployment to Vercel and connecting it to your Neon database.

### Step-by-step Vercel Deployment:
1. **Push to GitHub**: Ensure all code is committed and pushed to your GitHub repository.
2. **Import to Vercel**: Log in to Vercel and click "Add New... Project". Select this GitHub repository.
3. **Configure Environment Variables**:
   In the Vercel deployment settings, add ALL the variables from your `.env` file.
   - Use Neon's **Pooled Connection String** for `DATABASE_URL`.
   - Use Neon's **Direct Connection String** for `DATABASE_URL_UNPOOLED`.
   - Set `NEXT_PUBLIC_VERIFY_BASE_URL` to your production domain (e.g., `https://qr.nacos.org.ng`).
4. **Deploy**: Click Deploy. Vercel will automatically run `npm run build`. Note: Ensure you have `"postinstall": "prisma generate"` in your `package.json` if it isn't there already, so Prisma client is generated on Vercel.
5. **Set up Custom Domain** (Optional): In Vercel Project Settings > Domains, add your custom domain. Update `NEXT_PUBLIC_VERIFY_BASE_URL` to match this domain.

## 7. Security Architecture & Threat Model

- **No Secrets in Source Control:** `.env` is explicitly ignored.
- **Fail-closed Integrity Validation:** If a memo's integrity hash fails during verification, the system flags it as "Verification Failed". This means the database record was manually altered or tampered with.
- **Revocations are Immutable:** "Revocation" is permanent. A revoked memo retains its historical hash but displays a "Revoked" warning to the public.
- **Admin CSRF Protection:** Admin cookie uses `SameSite: strict` to prevent CSRF attacks.
- **Payload Limits:** Incoming payloads are restricted to prevent memory exhaustion DoS attacks.
- **IP Spoofing Awareness:** The rate limiter relies on `X-Forwarded-For`. Because this app is designed to be hosted on Vercel, this header is securely set by the platform and cannot be spoofed by external attackers. (See `couldgowrong.md` for more details).
