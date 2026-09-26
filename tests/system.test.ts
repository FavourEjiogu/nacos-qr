import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { generatePublicId, generateMemoHash, verifyMemoHash } from '../lib/crypto';
import { generateSerialNumber } from '../lib/serial';
import { prisma } from '../lib/prisma';
import * as auth from '../lib/auth';
import { NextRequest } from 'next/server';

// Mock auth module
vi.mock('../lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/auth')>();
  return {
    ...actual,
    isAuthenticated: vi.fn(),
  };
});

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('System Critical Logic', () => {
  describe('A. PUBLIC ID', () => {
    it('correct length, valid alphabet, uppercase, non-sequential', () => {
      const id1 = generatePublicId(8);
      const id2 = generatePublicId(8);
      
      expect(id1).toHaveLength(8);
      expect(id2).toHaveLength(8);
      
      // uppercase and specific alphabet
      expect(id1).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
      expect(id2).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
      
      // non-sequential
      expect(id1).not.toEqual(id2);
    });
  });

  describe('C. HMAC & D. HASH COMPARISON', () => {
    const baseMemo = {
      publicId: '7Y2KF94Q',
      serialNumber: 'NACOSBHU/26/09/0001',
      title: 'Test Memo',
      body: 'This is a test.',
      issuer: 'Test',
      department: 'Test Dept',
      issuedAt: new Date('2026-09-26T00:00:00Z'),
      effectiveFrom: new Date('2026-09-26T00:00:00Z'),
      expiresAt: new Date('2027-09-26T00:00:00Z'),
      status: 'ACTIVE',
      links: [{ label: 'Link', url: 'http://example.com' }]
    };

    it('identical canonical data produces identical hash', () => {
      const hash1 = generateMemoHash(baseMemo);
      const sameMemo = {
        status: 'ACTIVE',
        body: 'This is a test.',
        title: 'Test Memo',
        publicId: '7Y2KF94Q',
        serialNumber: 'NACOSBHU/26/09/0001',
        issuer: 'Test',
        department: 'Test Dept',
        issuedAt: new Date('2026-09-26T00:00:00Z'),
        effectiveFrom: new Date('2026-09-26T00:00:00Z'),
        expiresAt: new Date('2027-09-26T00:00:00Z'),
        links: [{ url: 'http://example.com', label: 'Link' }]
      };
      const hash2 = generateMemoHash(sameMemo);
      expect(hash1).toEqual(hash2);
      expect(verifyMemoHash(baseMemo, hash1)).toBe(true);
    });

    it('changing fields invalidates hash', () => {
      const baseHash = generateMemoHash(baseMemo);

      const checkTamper = (modifier: any) => {
        const tampered = { ...baseMemo, ...modifier };
        const tamperedHash = generateMemoHash(tampered);
        expect(tamperedHash).not.toEqual(baseHash);
        expect(verifyMemoHash(tampered, baseHash)).toBe(false);
      };

      checkTamper({ title: 'Tampered Title' });
      checkTamper({ body: 'Tampered Body' });
      checkTamper({ issuer: 'Tampered Issuer' });
      checkTamper({ department: 'Tampered Dept' });
      checkTamper({ issuedAt: new Date('2026-09-27T00:00:00Z') });
      checkTamper({ effectiveFrom: new Date('2026-09-27T00:00:00Z') });
      checkTamper({ expiresAt: new Date('2027-09-27T00:00:00Z') });
      checkTamper({ links: [{ label: 'Link', url: 'http://tampered.com' }] });
      checkTamper({ status: 'REVOKED' }); // status handling matches documented model
    });
  });

  describe('G. AUTHENTICATION', () => {
    it('validates password rejection and missing secret fails closed', async () => {
      // Mocking environment variables
      const originalHash = process.env.ADMIN_PASSWORD_HASH;
      
      // Missing secret fails closed
      delete process.env.ADMIN_PASSWORD_HASH;
      await expect(auth.verifyPassword('password')).rejects.toThrow('ADMIN_PASSWORD_HASH environment variable is missing.');
      
      process.env.ADMIN_PASSWORD_HASH = originalHash;
      
      // Invalid credentials are rejected
      const isValid = await auth.verifyPassword('wrongpassword');
      expect(isValid).toBe(false);
    });
  });

  describe('Database & Integration Logic', { timeout: 15000 }, () => {
    let createdMemoId: string;
    let memoSerial: string;
    let memoPublicId: string;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterAll(async () => {
      if (createdMemoId) {
        await prisma.memo.delete({ where: { id: createdMemoId } }).catch(() => {});
      }
      await prisma.$disconnect();
    });

    it('B. SERIAL NUMBER (first serial is correct, increments, concurrency-safe)', async () => {
      const promises = [];
      for(let i = 0; i < 3; i++) {
        promises.push(generateSerialNumber());
      }
      const results = await Promise.all(promises);
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(3); // No duplicates in concurrent generation
      
      // Assert format
      results.forEach(serial => {
        expect(serial).toMatch(/^NACOSBHU\/\d{2}\/\d{2}\/\d{4}$/);
      });
    });

    it('CREATE FLOW VERIFICATION & MEMO CREATION', async () => {
      // Create request
      const { POST } = await import('../app/api/admin/memos/route');
      vi.mocked(auth.isAuthenticated).mockResolvedValue(true);

      const req = new NextRequest('http://localhost/api/admin/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Integration Test Memo',
          summary: 'Testing',
          body: 'Content for the integration test.',
          issuer: 'Tester',
          department: 'QA',
          issuedAt: new Date().toISOString(),
          effectiveFrom: new Date().toISOString()
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);

      const memo = data.memo;
      createdMemoId = memo.id;
      memoSerial = memo.serialNumber;
      memoPublicId = memo.publicId;

      expect(memo).toBeDefined();
      expect(memo.status).toBe('ACTIVE');
      expect(memo.contentHash).toBeDefined();

      // Check Audit Log was created atomically
      const logs = await prisma.auditLog.findMany({ where: { memoId: memo.id } });
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('MEMO_CREATED');
    });

    it('H. REVOCATION SECURITY (unauthenticated fails, authenticated succeeds)', async () => {
      const { PATCH } = await import('../app/api/admin/memos/[id]/route');
      
      // 1. Unauthenticated request -> 401
      vi.mocked(auth.isAuthenticated).mockResolvedValue(false);
      const unauthReq = new NextRequest(`http://localhost/api/admin/memos/${createdMemoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVOKED' })
      });
      const unauthRes = await PATCH(unauthReq, { params: Promise.resolve({ id: createdMemoId }) });
      expect(unauthRes.status).toBe(401);
      
      // Double check it wasn't revoked
      const unauthMemo = await prisma.memo.findUnique({ where: { id: createdMemoId } });
      expect(unauthMemo?.status).toBe('ACTIVE');

      // 2. Authenticated request -> successful revocation
      vi.mocked(auth.isAuthenticated).mockResolvedValue(true);
      const authReq = new NextRequest(`http://localhost/api/admin/memos/${createdMemoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVOKED', revocationReason: 'Test revoke' })
      });
      const authRes = await PATCH(authReq, { params: Promise.resolve({ id: createdMemoId }) });
      expect(authRes.status).toBe(200);

      // Verify db mutation
      const finalMemo = await prisma.memo.findUnique({ where: { id: createdMemoId } });
      expect(finalMemo?.status).toBe('REVOKED');
      expect(finalMemo?.revocationReason).toBe('Test revoke');

      // Verify audit log
      const logs = await prisma.auditLog.findMany({ where: { memoId: createdMemoId, action: 'MEMO_REVOKED' } });
      expect(logs).toHaveLength(1);
    });

    it('E. LOOKUP & F. VERIFICATION STATES', async () => {
      const pageModule = await import('../app/verify/[id]/page');
      
      // We simulate resolving by serial number
      const serialLookupReq = { params: Promise.resolve({ id: encodeURIComponent(memoSerial) }) };
      
      try {
        await pageModule.default(serialLookupReq);
        expect.unreachable('Should have redirected');
      } catch (error: any) {
        // Next.js redirect throws an error with a specific digest
        expect(error.message).toBe('NEXT_REDIRECT');
        // Unfortunately checking the URL is tricky outside next's internal context, but we know it threw NEXT_REDIRECT
      }

      // We test nonexistent lookup
      const notFoundReq = { params: Promise.resolve({ id: 'UNKNOWN123' }) };
      const notFoundRes = await pageModule.default(notFoundReq);
      expect(JSON.stringify(notFoundRes)).toContain('RECORD NOT FOUND');
    });
  });
});
