import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSerialNumber } from '@/lib/serial';
import { generateMemoHash } from '@/lib/crypto';
import { isAuthenticated } from '@/lib/auth';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, summary, body: memoBody, issuer, department, issuedAt, effectiveFrom, expiresAt, links } = body;

    if (!title || !memoBody || !issuer || !department || !issuedAt || !effectiveFrom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let memo;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const serialNumber = await generateSerialNumber();
        const publicId = nanoid(8).toUpperCase(); // e.g. 7Y2KF94Q
        
        const contentHash = generateMemoHash({
          publicId,
          serialNumber,
          title,
          body: memoBody,
          issuer,
          department,
          issuedAt,
          effectiveFrom,
        });

        memo = await prisma.memo.create({
          data: {
            publicId,
            serialNumber,
            title,
            summary,
            body: memoBody,
            issuer,
            department,
            issuedAt: new Date(issuedAt),
            effectiveFrom: new Date(effectiveFrom),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            contentHash,
            status: 'PUBLISHED', // Direct publish for now, can implement Draft later
            links: links && links.length > 0 ? {
              create: links.map((link: {label: string, url: string}) => ({
                label: link.label,
                url: link.url
              }))
            } : undefined
          }
        });
        break; 
      } catch (err: any) {
        if (err.code === 'P2002') {
          attempts++;
          if (attempts >= MAX_ATTEMPTS) throw new Error('High concurrency error');
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        } else {
          throw err;
        }
      }
    }

    if (!memo) throw new Error('Failed to create memo.');

    await prisma.auditLog.create({
      data: {
        action: 'MEMO_CREATED',
        memoId: memo.id,
      }
    });

    return NextResponse.json({ success: true, memo });
  } catch (error: any) {
    console.error('Error creating memo:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
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
