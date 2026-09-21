// fix: use prisma singleton, remove direct PrismaClient instantiation
import { prisma } from '@/lib/prisma';

export async function generateSerialNumber(): Promise<string> {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `NACOSBHU/${yy}/${mm}/`;

  // We need to find the latest serial for this month to increment
  // This uses a naive approach for sqlite; in production Postgres, a sequence or row lock is better.
  const latestMemo = await prisma.memo.findFirst({
    where: {
      serialNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      serialNumber: 'desc',
    },
  });

  let nextNumber = 1;
  if (latestMemo) {
    const lastPart = latestMemo.serialNumber.split('/').pop();
    if (lastPart) {
      nextNumber = parseInt(lastPart, 10) + 1;
    }
  }

  const formattedNumber = String(nextNumber).padStart(4, '0');
  return `${prefix}${formattedNumber}`;
}
