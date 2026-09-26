# NACOS QR - Getting Started Guide

Welcome to the NACOS QR repository. This document provides everything a human engineer needs to understand, set up, and run the project locally.

## 1. System Architecture

NACOS QR is a cryptographic verification system that generates tamper-proof memos with scannable QR codes. 
It uses Next.js (App Router), Prisma (with Neon PostgreSQL), and standard Web Cryptography (HMAC-SHA256).

- **No PDF storage**: We store the authoritative text in the database and render it on the fly.
- **No 3rd-party QR APIs**: QR codes are generated client-side using `qrcode.react`.
- **Fail-closed security**: The system will crash or deny access if secrets are missing or tampered with.

## 2. Environment Variables

To run the system, you must define the following variables in a `.env` file at the root of the project. Do not use default or empty strings in production.

```env
# 1. Database Connection
# Must be a PostgreSQL connection string. We strongly recommend Neon Serverless Postgres.
# Example: postgresql://[user]:[password]@[host]:5432/[db]?sslmode=require
DATABASE_URL="postgresql://user:password@hostname:5432/dbname"

# 2. Administrative Authentication
# The secret path used to access the admin portal (e.g., /admin/super-secret-path)
ADMIN_ROUTE_SECRET="super-secret-path"
# The password required to log in to the admin portal
ADMIN_PASSWORD="your-strong-password"

# 3. Cryptography & Integrity
# Used to sign JWT session cookies
AUTH_SECRET="generate-a-secure-random-string-here"
# Used to generate HMAC-SHA256 hashes for memo integrity verification. 
# WARNING: Changing this will invalidate all previously issued memos!
HMAC_SECRET="generate-another-secure-random-string-here"

# 4. Public URLs
# The base URL of your deployed application, used for generating QR code links.
# Example: https://verify.nacos.org
NEXT_PUBLIC_VERIFY_BASE_URL="http://localhost:3000"
```

## 3. Local Setup

1. **Install Node.js 18+**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Set up the Database:**
   Create a Neon PostgreSQL project, retrieve the connection string, and add it to your `.env` file.
4. **Push the schema:**
   ```bash
   npx prisma db push
   ```
   *Note: We use `db push` instead of `migrate dev` to rapidly prototype schema changes without managing migration files, but for production, consider `prisma migrate deploy`.*
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

## 5. Deployment Checklist

Before deploying to production (e.g., Vercel):
1. **Rotate Secrets**: Ensure `AUTH_SECRET`, `HMAC_SECRET`, and `ADMIN_PASSWORD` are strong, cryptographically random strings.
2. **Set NEXT_PUBLIC_VERIFY_BASE_URL**: This must be your actual production domain, otherwise QR codes will point to `localhost`.
3. **Database Connection Limits**: If using Neon, ensure you use the pooled connection string (usually ending with `-pooler.tech`) to avoid exhausting connections in a serverless environment.

## 6. Security Principles
- Do not commit `.env` or any secrets to version control.
- If a memo's integrity hash fails during verification, the system will flag it as "Verification Failed". This means the database record was manually altered or tampered with.
- "Revocation" is permanent. A revoked memo retains its historical hash but displays a "Revoked" warning to the public.
