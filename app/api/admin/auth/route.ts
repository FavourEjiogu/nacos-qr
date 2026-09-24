import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, createSession } from '@/lib/auth';

const MAX_REQUESTS = 5; // max 5 attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  // Get IP for rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
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
    const { password } = await req.json();
    const isValid = await verifyPassword(password);
    
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
  } catch (err: any) {
    console.error("Auth error:", err);
    return NextResponse.json({ error: err.message || 'Invalid request body' }, { status: 400 });
  }
}
