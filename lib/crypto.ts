import crypto from 'crypto';

export function generateMemoHash(memoData: {
  serialNumber: string;
  title: string;
  content: string;
  authors: string;
  phoneNumbers: string;
  socialMediaLink?: string | null;
}): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error('APP_SECRET environment variable is missing.');
  }

  const payload = JSON.stringify({
    serialNumber: memoData.serialNumber,
    title: memoData.title,
    content: memoData.content,
    authors: memoData.authors,
    phoneNumbers: memoData.phoneNumbers,
    socialMediaLink: memoData.socialMediaLink || '',
  });

  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
