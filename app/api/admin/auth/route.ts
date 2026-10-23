import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';

const MAX_REQUESTS = 5; // max 5 attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  // Get IP for rate limiting
  const forwardedFor = req.headers.get('x-forwarded-for');
  // Use the proxy-appended right-most value rather than trusting a client-supplied first item.
  const ip = forwardedFor?.split(',').map((value) => value.trim()).filter(Boolean).at(-1) || 'unknown';
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS);
  
  try {
    // 1. Check rate limit from the database
    const recentAttempts = await prisma.loginAttempt.count({
      where: {
        ipAddress: ip,
        timestamp: { gte: windowStart },
        success: false
      }
    });

    if (recentAttempts >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Extract and verify password
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        typeof body.password !== 'string' || body.password.length === 0 || body.password.length > 1024) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const isValid = await verifyPassword(body.password);
    
    // 3. Log the attempt
    await prisma.loginAttempt.create({
      data: {
        ipAddress: ip,
        success: isValid
      }
    });
    
    if (isValid) {
      // Create HttpOnly cookie session
      await createSession();

      // Log success in AuditLog
      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_LOGIN',
          ipAddress: ip,
        }
      });
      return NextResponse.json({ success: true });
    }
    
    // Log failure in AuditLog
    await prisma.auditLog.create({
      data: {
        action: 'ADMIN_LOGIN_FAILED',
        ipAddress: ip,
      }
    });
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch (err: unknown) {
    console.error('Authentication service error:', err);
    const malformedBody = err instanceof SyntaxError;
    return NextResponse.json(
      { error: malformedBody ? 'Invalid request body' : 'Authentication service unavailable' },
      { status: malformedBody ? 400 : 500 },
    );
  }
}
