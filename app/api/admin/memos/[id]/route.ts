// fix: use prisma singleton, remove direct PrismaClient instantiation
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const params = await props.params;
    const body = await req.json();
    const { status, revocationReason } = body;

    if (status !== 'REVOKED') {
      return NextResponse.json({ error: 'Invalid status update. Can only revoke.' }, { status: 400 });
    }

    const memo = await prisma.$transaction(async (tx) => {
      const updatedMemo = await tx.memo.update({
        where: { id: params.id },
        data: { status: 'REVOKED', revocationReason }
      });

      await tx.auditLog.create({
        data: {
          action: 'REVOKE_MEMO',
          memoId: updatedMemo.id,
        }
      });

      return updatedMemo;
    });

    revalidatePath(`/verify/${memo.publicId}`);

    return NextResponse.json({ success: true, memo });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
