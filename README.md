# NACOS QR - Cryptographic Memo Verification System

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blue)
![Status](https://img.shields.io/badge/Status-Production_Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-green)

**NACOS QR** is the official system for generating and verifying cryptographic, tamper-proof memos for the Nigeria Association of Computing Students (NACOS). Designed with a premium glassmorphism aesthetic, it brings bank-level data integrity to official documentation.

---

## Features

- **Cryptographic Integrity (HMAC-SHA256):** Every memo generated is signed using a secure server-side secret. It is mathematically impossible to silently edit or tamper with a memo once it's created.
- **Verification Portal**: A public-facing verification page (`/verify/[id]`) that decodes and authenticates the memo's integrity.
- **Manual ID Lookup & QR Code Generation**: Automatically generate scannable QR codes for each memo. Users can either scan the QR code or manually enter the 8-character Memo ID into the root landing page (`/`).
- **High Concurrency Scalability**: Built to handle 1k+ concurrent Daily Active Users seamlessly. Powered by Neon Serverless Postgres with Connection Pooling and Next.js Incremental Static Regeneration (ISR) edge caching.
- **Hidden Admin Panel**: Protected admin dashboard nested behind a dynamic secret route (`/admin/[secret]`) to prevent unauthorized discovery.
- **Secure Authentication**: Built-in IP rate limiting and robust password protection for memo administrators.
- **PostgreSQL Database**: Scalable and production-ready database schema powered by Prisma ORM and Neon Postgres. Sequential, collision-proof serial numbers in the `NACOSBHU/YY/MM/XXXX` format.
- **Premium UI/UX:** Built without heavy frameworks, utilizing Vanilla CSS for a beautiful, responsive, NACOS Green (`#00A859`) glassmorphism interface heavily inspired by Apple/iOS design principles.

## Quick Start

Ensure you have Node.js 18+ installed on your system.

### 1. Clone & Install
```bash
git clone https://github.com/favourejiogu/nacos-qr.git
cd nacos-qr
npm install
```

### 2. Environment Setup
Copy the example environment file and customize it:
```bash
cp .env.example .env
```
Inside `.env`, define your administrative password hash (`ADMIN_PASSWORD_HASH`), a secure random string for your `APP_SECRET`, and your Neon Postgres `DATABASE_URL`. Ensure you set the `ADMIN_ROUTE_SECRET` to a secure path for your admin portal. 

For full details on configuring secrets, changing passwords, and deployment, see the [Getting Started Guide](./getting-started.md).

### 3. Database Initialization
Push the schema to your Neon PostgreSQL database:
```bash
npx prisma db push
```

### 4. Run the Application
```bash
npm run dev
```
Navigate to `http://localhost:3000` to access the landing page. Log in at `http://localhost:3000/admin/<ADMIN_ROUTE_SECRET>` using your chosen password.

---

## Tech Stack
- **Frontend:** Next.js 16 (App Router), React, Lucide Icons, Vanilla CSS
- **Backend:** Next.js API Routes, Node Crypto (HMAC-SHA256)
- **Database:** Prisma ORM, Neon Serverless Postgres
- **Caching:** Next.js Incremental Static Regeneration (ISR)

## Additional Documentation
- [Getting Started Guide](./getting-started.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Security Threat Model](./couldgowrong.md)
- [Security & Red Team Analysis](./AGENTS/red-teamer.md)
- [Architecture Log](./AGENTS/artifact.md)

---
*Maintained by [@favourejiogu](https://github.com/favourejiogu)*
