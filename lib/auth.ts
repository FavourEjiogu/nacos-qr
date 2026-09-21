import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

const JWT_SECRET = new TextEncoder().encode(process.env.APP_SECRET || 'fallback_secret_must_change');
const COOKIE_NAME = 'admin_session';

export async function createSession() {
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(JWT_SECRET);

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 2, // 2 hours
  });
}

export function destroySession() {
  cookies().delete(COOKIE_NAME);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminPasswordHash) {
    // Fallback to direct string comparison if hash is not yet set in environment
    return password === process.env.ADMIN_PASSWORD;
  }
  return await bcrypt.compare(password, adminPasswordHash);
}

export async function isAuthenticated(req?: NextRequest): Promise<boolean> {
  const token = req 
    ? req.cookies.get(COOKIE_NAME)?.value 
    : cookies().get(COOKIE_NAME)?.value;

  if (!token) return false;

  try {
    await jwtVerify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
