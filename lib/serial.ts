// fix: use prisma singleton, remove direct PrismaClient instantiation
import { prisma } from '@/lib/prisma';

export async function generateSerialNumber(): Promise<string> {
  const date = new Date();
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${yy}${mm}`;
  const prefix = `NACOSBHU/${yy}/${mm}/`;

  const counter = await prisma.serialCounter.upsert({
    where: { yearMonth },
    update: {
      lastValue: { increment: 1 }
    },
    create: {
      yearMonth,
      lastValue: 1
    }
  });

  const formattedNumber = String(counter.lastValue).padStart(4, '0');
  return `${prefix}${formattedNumber}`;
}
