// fix: use prisma singleton, remove direct PrismaClient instantiation
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSerialNumber } from '@/lib/serial';
import { generateMemoHash } from '@/lib/crypto';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content, authors, phoneNumbers, socialMediaLink } = body;

    if (!title || !content || !authors || !phoneNumbers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Retry loop for concurrency-safe serial number generation
    let memo;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const serialNumber = await generateSerialNumber();
        
        const contentHash = generateMemoHash({
          serialNumber,
          title,
          content,
          authors: JSON.stringify(authors),
          phoneNumbers: JSON.stringify(phoneNumbers),
          socialMediaLink,
        });

        memo = await prisma.memo.create({
          data: {
            serialNumber,
            title,
            content,
            authors: JSON.stringify(authors),
            phoneNumbers: JSON.stringify(phoneNumbers),
            socialMediaLink: socialMediaLink || null,
            contentHash,
          }
        });
        break; // Success, exit retry loop
      } catch (err: unknown) {
        // Prisma code P2002 means Unique Constraint failed (collision on serialNumber)
        const isPrismaUniqueViolation =
          err instanceof Error &&
          'code' in err &&
          (err as Error & { code: string }).code === 'P2002';
        if (isPrismaUniqueViolation) {
          attempts++;
          if (attempts >= MAX_ATTEMPTS) throw new Error('High concurrency: Could not generate a unique serial number after 5 attempts.');
          // Small random delay before retry
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        } else {
          throw err;
        }
      }
    }

    if (!memo) throw new Error('Failed to create memo.');

    // Log the creation
    await prisma.auditLog.create({
      data: {
        action: 'CREATE_MEMO',
        memoId: memo.id,
      }
    });

    return NextResponse.json({ success: true, memo });
  } catch (error: unknown) {
    console.error('Error creating memo:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const memos = await prisma.memo.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ memos });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
