import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { createSession, isAuthenticated, verifyPassword } from '@/lib/auth';
import { hashAdminPath } from '@/lib/admin-config';

export const runtime = 'nodejs';
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function requestIp(req: NextRequest): string {
  return req.headers.get('x-real-ip')?.trim()
    || req.headers.get('x-forwarded-for')?.split(',').map((value) => value.trim()).filter(Boolean).at(-1)
    || 'unknown';
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return false;
  const fetchSite = req.headers.get('sec-fetch-site');
  return fetchSite === null || fetchSite === 'same-origin' || fetchSite === 'same-site' || fetchSite === 'none';
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Cross-origin request rejected.' }, { status: 403 });
  if (!(await isAuthenticated(req))) return NextResponse.json({ error: 'Your admin session has expired. Sign in again.' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        !['change-password', 'rotate-path'].includes(body.action) ||
        typeof body.currentPassword !== 'string' || body.currentPassword.length === 0 || body.currentPassword.length > 1024) {
      return NextResponse.json({ error: 'Complete the required fields and try again.' }, { status: 400 });
    }

    const ipAddress = requestIp(req);
    const windowStart = new Date(Date.now() - WINDOW_MS);
    const recentFailures = await prisma.loginAttempt.count({
      where: { ipAddress, success: false, timestamp: { gte: windowStart } },
    });
    if (recentFailures >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many security confirmations. Please wait 15 minutes.' }, { status: 429 });
    }

    const currentPasswordValid = await verifyPassword(body.currentPassword);
    await prisma.loginAttempt.create({ data: { ipAddress, success: currentPasswordValid } });
    if (!currentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    if (body.action === 'change-password') {
      if (typeof body.newPassword !== 'string' || typeof body.confirmPassword !== 'string' ||
          body.newPassword !== body.confirmPassword) {
        return NextResponse.json({ error: 'The new passwords do not match.' }, { status: 400 });
      }
      if (body.newPassword.length < 12 || Buffer.byteLength(body.newPassword, 'utf8') > 72) {
        return NextResponse.json({ error: 'Use at least 12 characters and no more than 72 UTF-8 bytes.' }, { status: 400 });
      }

      const newPasswordHash = await bcrypt.hash(body.newPassword, 12);
      await prisma.$transaction(async (tx) => {
        await tx.adminConfig.upsert({
          where: { id: 1 },
          create: { id: 1, adminPasswordHash: newPasswordHash, authVersion: 1 },
          update: { adminPasswordHash: newPasswordHash, authVersion: { increment: 1 } },
        });
        await tx.auditLog.create({
          data: {
            action: 'ADMIN_PASSWORD_CHANGED',
            ipAddress,
            userAgent: req.headers.get('user-agent')?.slice(0, 512) || null,
          },
        });
      });

      // The new session gets the incremented version. All older sessions are invalidated.
      await createSession();
      return NextResponse.json({ success: true, message: 'Password changed. Other admin sessions have been signed out.' });
    }

    const newPath = crypto.randomBytes(24).toString('base64url');
    await prisma.$transaction(async (tx) => {
      await tx.adminConfig.upsert({
        where: { id: 1 },
        create: { id: 1, adminPathHash: hashAdminPath(newPath), authVersion: 1 },
        update: { adminPathHash: hashAdminPath(newPath), authVersion: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: {
          action: 'ADMIN_PATH_ROTATED',
          ipAddress,
          userAgent: req.headers.get('user-agent')?.slice(0, 512) || null,
        },
      });
    });

    return NextResponse.json({
      success: true,
      newPath,
      message: 'Admin URL rotated. Copy and save the new link; the previous workspace URL no longer works.',
    });
  } catch (error) {
    console.error('Admin settings update failed:', error);
    return NextResponse.json({ error: 'Security settings could not be changed. No change was confirmed.' }, { status: 500 });
  }
}
