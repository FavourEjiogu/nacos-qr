# Contributing to NACOS QR

First off, thank you for considering contributing to NACOS QR! This repository is designed to be highly secure, maintainable, and straightforward to collaborate on.

## 1. Branching Strategy

We use a simplified Git Flow.
- `main` or `production`: The stable branch deployed to production.
- `development`: The active development branch.
- Feature branches: `feat/your-feature-name`
- Bugfix branches: `fix/your-bug-name`

Always branch off from `development` for your PRs.

## 2. Setting Up Your Local Environment

Please refer to the [Getting Started Guide](getting-started.md) for step-by-step instructions on setting up your local Next.js server and Neon PostgreSQL database.

## 3. Pull Request Process

1. **Ensure your code is clean:** Run linters, remove console.logs, and ensure no dead code is left behind.
2. **Database Changes:** If your contribution requires a schema change:
   - Update `prisma/schema.prisma`
   - Run `npx prisma db push` (for local dev)
   - Do NOT commit migrations to source control unless explicitly requested by the maintainers, as we rely heavily on Neon branching and `db push` for prototyping.
3. **Write a clear PR description:** Detail what you changed and why. If it fixes an issue, include "Fixes #ISSUE_NUMBER".
4. **Security Review:** Any PR that touches `lib/crypto.ts`, `app/api/admin/auth/route.ts`, or `app/api/admin/memos/route.ts` will undergo strict security review. Please refer to `couldgowrong.md` to understand our threat model.

## 4. Coding Standards

- **React/Next.js:** Use functional components and hooks. Follow Next.js App Router conventions (server components by default, `'use client'` only when strictly necessary for interactivity).
- **Styling:** We use CSS Modules and Vanilla CSS variable tokens for styling. Do not introduce large utility frameworks like Tailwind unless previously discussed. Maintain the institutional, minimal, mobile-first design language.
- **TypeScript:** Strict typing is enforced. Avoid `any` whenever possible.

## 5. Reporting Security Vulnerabilities

If you find a security vulnerability, **do NOT open a public issue.**
Please responsibly disclose it by contacting the repository administrators directly.

## 6. Commit Message Guidelines

We follow conventional commits.
Example:
- `feat: add WhatsApp contact link to verification page`
- `fix: correct typo in payload limit error`
- `docs: update getting-started guide`
- `chore: update dependencies`

Thank you for helping keep the NACOS QR system secure and reliable!
