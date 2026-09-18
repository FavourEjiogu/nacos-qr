import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSerialNumber } from '@/lib/serial';
import { generateMemoHash, generatePublicId } from '@/lib/crypto';
import { isAuthenticated } from '@/lib/auth';

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, summary, body: memoBody, issuer, addressedTo, documentType, issuerPhone, issuedAt, effectiveFrom, expiresAt, links } = body;

    if (!title || !memoBody || !issuer || !addressedTo || !documentType || !issuedAt || !effectiveFrom) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (
      String(title).length > 255 || 
      String(memoBody).length > 50000 || 
      String(issuer).length > 255 || 
      String(addressedTo).length > 255
    ) {
      return NextResponse.json({ error: 'Payload size limit exceeded' }, { status: 413 });
    }

    let memo;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const serialNumber = await generateSerialNumber();
        const publicId = generatePublicId(8);
        
        const parsedIssuedAt = new Date(issuedAt);
        const parsedEffectiveFrom = new Date(effectiveFrom);
        const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;
        
        const memoData = {
          publicId,
          serialNumber,
          title,
          body: memoBody,
          issuer,
          issuerPhone: issuerPhone ? String(issuerPhone).trim() : null,
          addressedTo,
          documentType,
          issuedAt: parsedIssuedAt,
          effectiveFrom: parsedEffectiveFrom,
          expiresAt: parsedExpiresAt,
          status: 'ACTIVE',
          links: links && links.length > 0 ? links : undefined
        };

        const contentHash = generateMemoHash(memoData);

        memo = await prisma.$transaction(async (tx: any) => {
          const createdMemo = await tx.memo.create({
            data: {
              ...memoData,
              summary,
              contentHash,
              links: memoData.links ? {
                create: memoData.links.map((link: {label: string, url: string}) => ({
                  label: link.label,
                  url: link.url
                }))
              } : undefined
            }
          });

          await tx.auditLog.create({
            data: {
              action: 'MEMO_CREATED',
              memoId: createdMemo.id,
            }
          });

          return createdMemo;
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

    return NextResponse.json({ success: true, memo });
  } catch (error: any) {
    console.error('Error creating memo:', error);
    const isDev = process.env.NODE_ENV !== 'production';
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        details: isDev ? (error.message || String(error)) : undefined
      }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const memos = await prisma.memo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 // Prevent massive payloads for admin panel
    });
    return NextResponse.json({ memos });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
