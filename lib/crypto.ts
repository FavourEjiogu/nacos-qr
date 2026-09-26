import crypto from 'crypto';

export function generatePublicId(length = 8): string {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let id = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, alphabet.length);
    id += alphabet[randomIndex];
  }
  return id;
}

export function canonicalizeMemoData(memoData: any): string {
  // Normalize links if present
  const links = Array.isArray(memoData.links)
    ? memoData.links.map((l: any) => ({ label: l.label, url: l.url }))
    : [];

  return JSON.stringify({
    publicId: memoData.publicId,
    serialNumber: memoData.serialNumber,
    title: memoData.title,
    body: memoData.body,
    issuer: memoData.issuer,
    department: memoData.department,
    issuedAt: typeof memoData.issuedAt === 'string' ? memoData.issuedAt : memoData.issuedAt.toISOString(),
    effectiveFrom: typeof memoData.effectiveFrom === 'string' ? memoData.effectiveFrom : memoData.effectiveFrom.toISOString(),
    expiresAt: memoData.expiresAt ? (typeof memoData.expiresAt === 'string' ? memoData.expiresAt : memoData.expiresAt.toISOString()) : null,
    status: memoData.status,
    links,
  });
}

export function generateMemoHash(memoData: any): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error('APP_SECRET environment variable is missing.');
  }

  const payload = canonicalizeMemoData(memoData);
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyMemoHash(memoData: any, hashToVerify: string): boolean {
  try {
    const expectedHash = generateMemoHash(memoData);
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const verifyBuffer = Buffer.from(hashToVerify, 'hex');
    if (expectedBuffer.length !== verifyBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(expectedBuffer, verifyBuffer);
  } catch (e) {
    return false;
  }
}
