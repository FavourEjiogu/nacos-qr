import { describe, it, expect, beforeAll } from 'vitest';
import { generatePublicId, generateMemoHash, verifyMemoHash } from '../lib/crypto';
import { generateSerialNumber } from '../lib/serial';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

describe('System Critical Logic', () => {
  it('generates a correct public ID', () => {
    const id = generatePublicId(8);
    expect(id).toHaveLength(8);
    expect(id).toMatch(/^[A-Z0-9]+$/);
    
    // Non-sequential / Random
    const id2 = generatePublicId(8);
    expect(id).not.toEqual(id2);
  });

  it('canonicalizes HMAC correctly (order does not matter, data changes change hash)', () => {
    const baseMemo = {
      publicId: '7Y2KF94Q',
      serialNumber: 'NACOSBHU/26/09/0001',
      title: 'Test Memo',
      body: 'This is a test.',
      issuer: 'Test',
      department: 'Test Dept',
      issuedAt: new Date('2026-09-26T00:00:00Z'),
      effectiveFrom: new Date('2026-09-26T00:00:00Z'),
      expiresAt: null,
      status: 'ACTIVE'
    };

    const hash1 = generateMemoHash(baseMemo);

    // Same data, different key order
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
      expiresAt: null,
    };
    const hash2 = generateMemoHash(sameMemo);
    expect(hash1).toEqual(hash2);

    // Tampered title
    const tamperedMemo = { ...baseMemo, title: 'Tampered Memo' };
    const hash3 = generateMemoHash(tamperedMemo);
    expect(hash1).not.toEqual(hash3);

    // Tampered body
    const tamperedBody = { ...baseMemo, body: 'Tampered' };
    expect(generateMemoHash(tamperedBody)).not.toEqual(hash1);

    // Tampered issuer
    const tamperedIssuer = { ...baseMemo, issuer: 'Tampered' };
    expect(generateMemoHash(tamperedIssuer)).not.toEqual(hash1);

    // Verification
    expect(verifyMemoHash(baseMemo, hash1)).toBe(true);
    expect(verifyMemoHash(tamperedMemo, hash1)).toBe(false);
  });

  describe('Database Dependent Logic', { timeout: 15000 }, () => {
    it('generates serial numbers correctly and atomically', async () => {
      // Get the next serial number
      const serial1 = await generateSerialNumber();
      const serial2 = await generateSerialNumber();

      expect(serial1).toMatch(/^NACOSBHU\/\d{2}\/\d{2}\/\d{4}$/);
      expect(serial2).toMatch(/^NACOSBHU\/\d{2}\/\d{2}\/\d{4}$/);
      expect(serial1).not.toEqual(serial2);

      // Concurrent allocation test
      const promises = [];
      for(let i = 0; i < 5; i++) {
        promises.push(generateSerialNumber());
      }
      const results = await Promise.all(promises);
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(5); // No duplicates in concurrent generation
    });

    it('rejects unauthenticated requests to revoke API', async () => {
      // Simulate calling the Next.js API route without authentication
      const { PATCH } = await import('../app/api/admin/memos/[id]/route');
      const { NextRequest } = await import('next/server');
      
      const req = new NextRequest('http://localhost/api/admin/memos/123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REVOKED' })
      });
      
      const res = await PATCH(req, { params: Promise.resolve({ id: '123' }) });
      expect(res.status).toBe(401);
    });
  });
});
