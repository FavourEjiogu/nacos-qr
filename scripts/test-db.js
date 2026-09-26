const { PrismaClient } = require('@prisma/client');
const { generateMemoHash, verifyMemoHash } = require('./lib/crypto');
const prisma = new PrismaClient();

async function run() {
  const allMemos = await prisma.memo.findMany();
  console.log('Total memos in DB:', allMemos.length);
  
  if (allMemos.length > 0) {
    const legacy = allMemos[0];
    console.log('Testing legacy memo:', legacy.publicId);
    
    // verify integrity
    const isTampered = !verifyMemoHash(legacy, legacy.contentHash);
    console.log('Legacy memo tampered?', isTampered);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
