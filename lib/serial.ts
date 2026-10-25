import { prisma } from '@/lib/prisma';
import { generatePublicId } from '@/lib/crypto';

export type MemoVisibility = 'PUBLIC' | 'CONFIDENTIAL';

type SerialCounterClient = Pick<typeof prisma, 'serialCounter'>;

export async function generateSerialNumber(input: {
  visibility: MemoVisibility;
  officeCode: string;
  issuedAt?: Date;
}, client: SerialCounterClient = prisma): Promise<string> {
  const { visibility, officeCode, issuedAt = new Date() } = input;
  const year = String(issuedAt.getUTCFullYear());
  const month = String(issuedAt.getUTCMonth() + 1).padStart(2, '0');
  const normalizedCode = officeCode.trim().toUpperCase();
  const prefix = `NACOS/BHU/${normalizedCode}/${visibility === 'PUBLIC' ? 'PUB' : 'CONF'}/${year}/${month}`;

  // Private correspondence must never use predictable counters or public verification IDs.
  if (visibility === 'CONFIDENTIAL') {
    const token = generatePublicId(26);
    return `${prefix}/${token.slice(0, 5)}-${token.slice(5, 10)}-${token.slice(10, 15)}-${token.slice(15, 20)}-${token.slice(20)}`;
  }

  // A fresh counter is started per office, year, and month. Month/year come
  // from the recorded issue date in UTC, so the series rolls over deterministically.
  const counterKey = `PUBLIC:${normalizedCode}:${year}:${month}`;
  const counter = await client.serialCounter.upsert({
    where: { counterKey },
    update: { lastValue: { increment: 1 } },
    create: { counterKey, lastValue: 1 },
  });

  return `${prefix}/${String(counter.lastValue).padStart(4, '0')}`;
}
