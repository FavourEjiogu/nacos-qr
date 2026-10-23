import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSerialNumber } from '@/lib/serial';
import { generateMemoHash, generatePublicId } from '@/lib/crypto';
import { isAuthenticated } from '@/lib/auth';
import { resolveIssuingOffice } from '@/lib/offices';

class OfficeCodeConflictError extends Error {
  constructor() {
    super('That office code is already registered to a different office name. Choose a new code.');
    this.name = 'OfficeCodeConflictError';
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
    }

    const {
      title, summary, body: memoBody, issuer, addressedTo, documentType,
      issuerPhone, issuedAt, effectiveFrom, expiresAt, links,
      visibility, officeCode, customOfficeCode, customOfficeName,
    } = body;

    if (visibility !== 'PUBLIC' && visibility !== 'CONFIDENTIAL') {
      return NextResponse.json({ error: 'Choose whether this record is public or confidential.' }, { status: 400 });
    }

    const issuingOffice = resolveIssuingOffice(officeCode, customOfficeCode, customOfficeName);
    if (!issuingOffice) {
      return NextResponse.json({ error: 'Choose a valid issuing office and office code.' }, { status: 400 });
    }

    // Fail early for an already-registered code/name mismatch. The same check
    // is repeated under a transaction-scoped advisory lock before inserting.
    const registeredOffice = await prisma.issuingOffice.findUnique({
      where: { code: issuingOffice.code },
      select: { code: true, name: true },
    });
    if (registeredOffice && registeredOffice.name !== issuingOffice.name) {
      return NextResponse.json(
        { error: 'That office code is already registered to a different office name. Choose a new code.' },
        { status: 409 },
      );
    }

    const requiredTextFields = [
      ['title', title, 255],
      ['body', memoBody, 50000],
      ['issuer', issuer, 255],
      ['addressedTo', addressedTo, 255],
      ['documentType', documentType, 100],
    ] as const;

    for (const [field, value, maxLength] of requiredTextFields) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return NextResponse.json({ error: 'Invalid or missing ' + field }, { status: 400 });
      }
      if (value.length > maxLength) {
        return NextResponse.json({ error: field + ' exceeds the allowed length' }, { status: 413 });
      }
    }

    if (summary !== undefined && summary !== null &&
        (typeof summary !== 'string' || summary.length > 2000)) {
      return NextResponse.json({ error: 'Invalid summary' }, { status: 400 });
    }

    if (issuerPhone !== undefined && issuerPhone !== null &&
        (typeof issuerPhone !== 'string' || issuerPhone.trim().length > 64)) {
      return NextResponse.json({ error: 'Invalid issuer phone number' }, { status: 400 });
    }

    const dateInputs = [
      ['issuedAt', issuedAt],
      ['effectiveFrom', effectiveFrom],
    ] as const;
    for (const [field, value] of dateInputs) {
      if (typeof value !== 'string' || value.length === 0 || !Number.isFinite(Date.parse(value))) {
        return NextResponse.json({ error: 'Invalid ' + field + ' date' }, { status: 400 });
      }
    }
    if (expiresAt !== undefined && expiresAt !== null && expiresAt !== '' &&
        (typeof expiresAt !== 'string' || !Number.isFinite(Date.parse(expiresAt)))) {
      return NextResponse.json({ error: 'Invalid expiry date' }, { status: 400 });
    }

    if (links !== undefined && links !== null && !Array.isArray(links)) {
      return NextResponse.json({ error: 'Links must be an array' }, { status: 400 });
    }
    if (Array.isArray(links)) {
      if (links.length > 20) {
        return NextResponse.json({ error: 'A memo may contain at most 20 links' }, { status: 413 });
      }
      for (const link of links) {
        if (!link || typeof link !== 'object' ||
            typeof link.label !== 'string' || link.label.trim().length === 0 ||
            link.label.length > 255 || typeof link.url !== 'string' || link.url.length > 2048) {
          return NextResponse.json({ error: 'Every link must have a label and valid URL' }, { status: 400 });
        }
        try {
          const url = new URL(link.url);
          if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
            return NextResponse.json({ error: 'Links must use HTTP or HTTPS without embedded credentials' }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: 'Every link must be an absolute HTTP or HTTPS URL' }, { status: 400 });
        }
      }
    }

    const parsedIssuedAt = new Date(issuedAt);
    const parsedEffectiveFrom = new Date(effectiveFrom);
    const parsedExpiresAt = expiresAt ? new Date(expiresAt) : null;

    let memo;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      try {
        const serialNumber = await generateSerialNumber({
          visibility,
          officeCode: issuingOffice.code,
          issuedAt: parsedIssuedAt,
        });
        const publicId = visibility === 'PUBLIC' ? generatePublicId(26) : null;

        const memoData = {
          publicId,
          visibility,
          officeCode: issuingOffice.code,
          officeName: issuingOffice.name,
          integrityVersion: 2,
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
          // Lock by code so concurrent first-time custom-office registrations
          // cannot claim the same code for different office names.
          await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${issuingOffice.code}, 0))`;
          const officeInTransaction = await tx.issuingOffice.findUnique({
            where: { code: issuingOffice.code },
            select: { code: true, name: true },
          });
          if (officeInTransaction && officeInTransaction.name !== issuingOffice.name) {
            throw new OfficeCodeConflictError();
          }
          if (!officeInTransaction) {
            await tx.issuingOffice.create({
              data: { code: issuingOffice.code, name: issuingOffice.name },
            });
          }

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
              metadata: JSON.stringify({ visibility, officeCode: issuingOffice.code }),
            }
          });

          return createdMemo;
        });

        break; 
      } catch (err: any) {
        if (err instanceof OfficeCodeConflictError) {
          return NextResponse.json({ error: err.message }, { status: 409 });
        }
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
