import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, destroySession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const isAuth = await isAuthenticated(req);
  return NextResponse.json({ authenticated: isAuth });
}

export async function POST(req: NextRequest) {
  destroySession();
  return NextResponse.json({ success: true });
}
