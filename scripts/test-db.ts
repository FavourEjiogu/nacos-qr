import { PrismaClient } from '@prisma/client';
import { verifyMemoHash } from './lib/crypto';
const prisma = new PrismaClient();

async function run() {
  const allMemos = await prisma.memo.findMany();
  
  if (allMemos.length > 0) {
    const legacy = allMemos[0];
    const isTampered = !verifyMemoHash(legacy, legacy.contentHash);
    console.log('Legacy memo tampered?', isTampered);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
