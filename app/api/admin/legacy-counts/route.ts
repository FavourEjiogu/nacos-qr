import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenMatches(candidate: string, expected: string): boolean {
  const left = Buffer.from(candidate, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function GET(req: NextRequest) {
  // This diagnostic is intentionally restricted to the migration preview only.
  if (process.env.VERCEL_ENV !== 'preview' ||
      process.env.VERCEL_GIT_COMMIT_REF !== 'migration/supabase-postgres') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const expectedToken = process.env.LEGACY_COUNTS_SECRET;
  const candidate = req.headers.get('x-legacy-counts-secret') ?? '';
  if (!expectedToken || !candidate || !tokenMatches(candidate, expectedToken)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) return NextResponse.json({ error: 'Legacy source connection is not configured.' }, { status: 503 });

  const client = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
  try {
    await client.$connect();
    const [memos, links, counters, attempts, audits] = await Promise.all([
      client.memo.count(),
      client.memoLink.count(),
      client.serialCounter.count(),
      client.loginAttempt.count(),
      client.auditLog.count(),
    ]);
    return NextResponse.json({
      counts: { memos, links, serialCounters: counters, loginAttempts: attempts, auditLogs: audits },
      checkedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Legacy source count check failed:', error);
    return NextResponse.json({ error: 'Legacy source count check failed.' }, { status: 503 });
  } finally {
    await client.$disconnect();
  }
}
