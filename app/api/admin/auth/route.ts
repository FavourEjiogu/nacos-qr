import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter (Note: this is per-server-instance/isolate)
const rateLimitMap = new Map<string, { count: number; expiresAt: number }>();
const MAX_REQUESTS = 5; // max 5 attempts
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
  // Get IP for rate limiting
  const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown';
  
  const now = Date.now();
  const limitData = rateLimitMap.get(ip);
  
  if (limitData && now < limitData.expiresAt) {
    if (limitData.count >= MAX_REQUESTS) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
    limitData.count += 1;
    rateLimitMap.set(ip, limitData);
  } else {
    // New window
    rateLimitMap.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
  }

  try {
    const { password } = await req.json();
    
    if (password === process.env.ADMIN_PASSWORD) {
      // On success, reset rate limit for this IP
      rateLimitMap.delete(ip);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
