import crypto from 'crypto';

export function generateMemoHash(memoData: {
  publicId: string;
  serialNumber: string;
  title: string;
  body: string;
  issuer: string;
  department: string;
  issuedAt: Date | string;
  effectiveFrom: Date | string;
}): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error('APP_SECRET environment variable is missing.');
  }

  const payload = JSON.stringify({
    publicId: memoData.publicId,
    serialNumber: memoData.serialNumber,
    title: memoData.title,
    body: memoData.body,
    issuer: memoData.issuer,
    department: memoData.department,
    issuedAt: typeof memoData.issuedAt === 'string' ? memoData.issuedAt : memoData.issuedAt.toISOString(),
    effectiveFrom: typeof memoData.effectiveFrom === 'string' ? memoData.effectiveFrom : memoData.effectiveFrom.toISOString(),
  });

  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
