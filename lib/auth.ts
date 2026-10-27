import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminPasswordHash, getAuthVersion } from '@/lib/admin-config';

const COOKIE_NAME = 'admin_session';

function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is missing.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession() {
  const sessionVersion = await getAuthVersion();
  const token = await new SignJWT({ admin: true, sessionVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(getJwtSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const adminPasswordHash = await getAdminPasswordHash();
  return bcrypt.compare(password, adminPasswordHash);
}

export async function isAuthenticated(req?: NextRequest): Promise<boolean> {
  let token: string | undefined = undefined;
  
  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch (e) {
      // Ignore if outside next.js scope during tests
    }
  }

  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.admin !== true) return false;
    const tokenVersion = typeof payload.sessionVersion === 'number' ? payload.sessionVersion : 0;
    return tokenVersion === await getAuthVersion();
  } catch {
    return false;
  }
}
