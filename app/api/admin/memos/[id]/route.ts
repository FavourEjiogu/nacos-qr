import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isAuthenticated(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.ADMIN_PASSWORD;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { status } = body;

    if (status !== 'REVOKED') {
      return NextResponse.json({ error: 'Invalid status update. Can only revoke.' }, { status: 400 });
    }

    const memo = await prisma.memo.update({
      where: { id: params.id },
      data: { status: 'REVOKED' }
    });

    // Log the revocation
    await prisma.auditLog.create({
      data: {
        action: 'REVOKE_MEMO',
        memoId: memo.id,
      }
    });

    return NextResponse.json({ success: true, memo });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
