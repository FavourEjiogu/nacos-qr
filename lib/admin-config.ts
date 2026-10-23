import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';

const CONFIG_ID = 1;

export function hashAdminPath(path: string): string {
  return crypto.createHash('sha256').update(path, 'utf8').digest('hex');
}

function safeEqualHex(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export async function isValidAdminPath(candidate: string): Promise<boolean> {
  const settings = await prisma.adminConfig.findUnique({ where: { id: CONFIG_ID } });
  if (settings?.adminPathHash) {
    return safeEqualHex(hashAdminPath(candidate), settings.adminPathHash);
  }

  const bootstrapPath = process.env.ADMIN_ROUTE_SECRET;
  return typeof bootstrapPath === 'string' && bootstrapPath.length >= 24 && candidate === bootstrapPath;
}

export async function getAdminPasswordHash(): Promise<string> {
  const settings = await prisma.adminConfig.findUnique({ where: { id: CONFIG_ID } });
  const hash = settings?.adminPasswordHash ?? process.env.ADMIN_PASSWORD_HASH;
  if (!hash || !/^\$2[aby]\$\d{2}\$/.test(hash)) {
    throw new Error('Admin password hash is not configured.');
  }
  return hash;
}

export async function getAuthVersion(): Promise<number> {
  const settings = await prisma.adminConfig.findUnique({ where: { id: CONFIG_ID } });
  return settings?.authVersion ?? 0;
}
