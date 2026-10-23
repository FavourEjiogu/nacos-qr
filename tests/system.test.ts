import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { generateMemoHash, generatePublicId, verifyMemoHash } from '@/lib/crypto';
import { generateSerialNumber } from '@/lib/serial';
import * as auth from '@/lib/auth';

const mockState = vi.hoisted(() => {
  type RecordData = Record<string, any>;
  const memos = new Map<string, RecordData>();
  const auditLogs: RecordData[] = [];
  const counters = new Map<string, number>();
  let memoSequence = 0;
  let auditSequence = 0;
  let linkSequence = 0;

  const findMemo = (where: RecordData = {}) =>
    [...memos.values()].find((memo) =>
      Object.entries(where).every(([key, value]) => memo[key] === value),
    ) ?? null;

  const prisma: RecordData = {};
  prisma.serialCounter = {
    upsert: vi.fn(async ({ where, create, update }: RecordData) => {
      const previous = counters.get(where.yearMonth);
      const lastValue = previous === undefined
        ? create.lastValue
        : previous + (update?.lastValue?.increment ?? 0);
      counters.set(where.yearMonth, lastValue);
      return { yearMonth: where.yearMonth, lastValue };
    }),
  };
  prisma.memo = {
    create: vi.fn(async ({ data }: RecordData) => {
      const id = `memo-${++memoSequence}`;
      const linksInput = data.links?.create;
      const memo = {
        ...data,
        id,
        createdAt: new Date(),
        links: Array.isArray(linksInput)
          ? linksInput.map((link: RecordData) => ({ ...link, id: `link-${++linkSequence}` }))
          : [],
      };
      memos.set(id, memo);
      return memo;
    }),
    findUnique: vi.fn(async ({ where }: RecordData) => findMemo(where)),
    findMany: vi.fn(async () => [...memos.values()]),
    update: vi.fn(async ({ where, data }: RecordData) => {
      const memo = findMemo(where);
      if (!memo) throw new Error('Record not found');
      Object.assign(memo, data);
      memos.set(memo.id, memo);
      return memo;
    }),
    delete: vi.fn(async ({ where }: RecordData) => {
      const memo = findMemo(where);
      if (!memo) throw new Error('Record not found');
      memos.delete(memo.id);
      return memo;
    }),
  };
  prisma.auditLog = {
    create: vi.fn(async ({ data }: RecordData) => {
      const log = { ...data, id: `audit-${++auditSequence}`, timestamp: new Date() };
      auditLogs.push(log);
      return log;
    }),
    findMany: vi.fn(async ({ where = {} }: RecordData = {}) =>
      auditLogs.filter((log) =>
        Object.entries(where).every(([key, value]) => log[key] === value),
      ),
    ),
  };
  prisma.$transaction = vi.fn(async (callback: (tx: RecordData) => Promise<unknown>) => callback(prisma));
  prisma.$disconnect = vi.fn(async () => undefined);

  return {
    prisma,
    memos,
    auditLogs,
    counters,
    reset() {
      memos.clear();
      auditLogs.length = 0;
      counters.clear();
      memoSequence = 0;
      auditSequence = 0;
      linkSequence = 0;
    },
    seedMemo(memo: RecordData) { memos.set(memo.id, memo); },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockState.prisma }));
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return { ...actual, isAuthenticated: vi.fn() };
});
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    const error = new Error('NEXT_REDIRECT');
    Object.assign(error, { digest: `NEXT_REDIRECT;replace;${url};307;` });
    throw error;
  }),
}));

process.env.APP_SECRET = 'nacos-qr-test-only-secret-do-not-use-in-production';

function makeMemo(overrides: Record<string, any> = {}) {
  const memo: Record<string, any> = {
    id: 'seed-memo',
    publicId: '7Y2KF94Q',
    serialNumber: 'NACOSBHU/26/10/1001',
    title: 'Test Memo',
    summary: 'A verification fixture',
    body: 'This is a test memo.',
    issuer: 'Test Issuer',
    issuerPhone: null,
    addressedTo: 'All NACOSites',
    documentType: 'Internal Memorandum',
    issuedAt: new Date('2026-10-22T00:00:00.000Z'),
    effectiveFrom: new Date('2026-10-22T00:00:00.000Z'),
    expiresAt: new Date('2027-10-22T00:00:00.000Z'),
    status: 'ACTIVE',
    revokedAt: null,
    revocationReason: null,
    links: [],
    createdAt: new Date('2026-10-22T00:00:00.000Z'),
    ...overrides,
  };
  memo.contentHash = generateMemoHash(memo);
  return memo;
}

beforeEach(() => {
  mockState.reset();
  vi.clearAllMocks();
});

describe('NACOS QR core logic', () => {
  it('generates cryptographically random public IDs in the expected alphabet', () => {
    const first = generatePublicId(8);
    const second = generatePublicId(8);
    expect(first).toHaveLength(8);
    expect(second).toHaveLength(8);
    expect(first).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
    expect(second).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
    expect(first).not.toEqual(second);
  });

  it('produces stable HMACs for equivalent data and rejects authoritative-field changes', () => {
    const base = makeMemo();
    const hash = generateMemoHash(base);
    expect(generateMemoHash({ ...base, links: [] })).toBe(hash);
    expect(verifyMemoHash(base, hash)).toBe(true);

    for (const changed of [
      { title: 'Tampered title' },
      { body: 'Tampered body' },
      { issuer: 'Another issuer' },
      { issuerPhone: '+2348000000000' },
      { addressedTo: 'Different recipient' },
      { documentType: 'Other' },
      { issuedAt: new Date('2026-10-23T00:00:00.000Z') },
      { effectiveFrom: new Date('2026-10-23T00:00:00.000Z') },
      { expiresAt: new Date('2027-10-23T00:00:00.000Z') },
    ]) {
      const tampered = { ...base, ...changed };
      expect(generateMemoHash(tampered)).not.toBe(hash);
      expect(verifyMemoHash(tampered, hash)).toBe(false);
    }
  });

  it('keeps operational revocation state outside the content HMAC', () => {
    const active = makeMemo();
    const revoked = { ...active, status: 'REVOKED', revocationReason: 'Test reason' };
    expect(verifyMemoHash(revoked, active.contentHash)).toBe(true);
  });

  it('fails closed without an admin password hash and rejects a wrong password', async () => {
    const originalHash = process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD_HASH;
    await expect(auth.verifyPassword('password')).rejects.toThrow(
      'ADMIN_PASSWORD_HASH environment variable is missing.',
    );

    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('the-correct-test-password', 4);
    await expect(auth.verifyPassword('wrong-password')).resolves.toBe(false);

    if (originalHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = originalHash;
  });

  it('generates distinct serial values through the counter upsert contract', async () => {
    const serials = await Promise.all([
      generateSerialNumber(), generateSerialNumber(), generateSerialNumber(),
    ]);
    expect(new Set(serials).size).toBe(3);
    serials.forEach((serial) => expect(serial).toMatch(/^NACOSBHU\/\d{2}\/\d{2}\/\d{4}$/));
  });

  it('rejects malformed dates and unsafe external link schemes before writing', async () => {
    const { POST } = await import('../app/api/admin/memos/route');
    const { NextRequest } = await import('next/server');
    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);

    const validFields = {
      title: 'Validation Test',
      body: 'Test body',
      issuer: 'Tester',
      documentType: 'Internal Memorandum',
      addressedTo: 'All NACOSites',
      issuedAt: '2026-10-22T00:00:00.000Z',
      effectiveFrom: '2026-10-22T00:00:00.000Z',
    };

    const unsafeLinkResponse = await POST(new NextRequest('http://localhost/api/admin/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validFields, links: [{ label: 'unsafe', url: 'javascript:alert(1)' }] }),
    }));
    expect(unsafeLinkResponse.status).toBe(400);
    expect(mockState.prisma.memo.create).not.toHaveBeenCalled();

    const invalidDateResponse = await POST(new NextRequest('http://localhost/api/admin/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...validFields, issuedAt: 'not-a-date' }),
    }));
    expect(invalidDateResponse.status).toBe(400);
    expect(mockState.prisma.memo.create).not.toHaveBeenCalled();
  });

  it('creates a memo and its audit record through the authenticated API route', async () => {
    const { POST } = await import('../app/api/admin/memos/route');
    const { NextRequest } = await import('next/server');
    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);
    const request = new NextRequest('http://localhost/api/admin/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Integration Test Memo',
        summary: 'Testing',
        body: 'Content for the test.',
        issuer: 'Tester',
        documentType: 'Internal Memorandum',
        addressedTo: 'All NACOSites',
        issuerPhone: '+2348000000000',
        issuedAt: new Date('2026-10-22T00:00:00.000Z').toISOString(),
        effectiveFrom: new Date('2026-10-22T00:00:00.000Z').toISOString(),
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.memo.status).toBe('ACTIVE');
    expect(result.memo.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mockState.auditLogs).toHaveLength(1);
    expect(mockState.auditLogs[0].action).toBe('MEMO_CREATED');
    expect(mockState.auditLogs[0].memoId).toBe(result.memo.id);
  });

  it('rejects unauthenticated revocation and records an authenticated revocation', async () => {
    const memo = makeMemo();
    mockState.seedMemo(memo);
    const { PATCH } = await import('../app/api/admin/memos/[id]/route');
    const { NextRequest } = await import('next/server');

    vi.mocked(auth.isAuthenticated).mockResolvedValue(false);
    const denied = await PATCH(new NextRequest(`http://localhost/api/admin/memos/${memo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REVOKED' }),
    }), { params: Promise.resolve({ id: memo.id }) });
    expect(denied.status).toBe(401);
    expect((await mockState.prisma.memo.findUnique({ where: { id: memo.id } }))?.status).toBe('ACTIVE');

    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);
    const accepted = await PATCH(new NextRequest(`http://localhost/api/admin/memos/${memo.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REVOKED', revocationReason: 'Test revoke' }),
    }), { params: Promise.resolve({ id: memo.id }) });
    expect(accepted.status).toBe(200);
    const revoked = await mockState.prisma.memo.findUnique({ where: { id: memo.id } });
    expect(revoked?.status).toBe('REVOKED');
    expect(revoked?.revocationReason).toBe('Test revoke');
    expect(revoked?.revokedAt).toBeInstanceOf(Date);
    expect(mockState.auditLogs.filter((log) => log.action === 'MEMO_REVOKED')).toHaveLength(1);
  });

  it('redirects serial-number lookups and gracefully handles unknown IDs', async () => {
    const memo = makeMemo();
    mockState.seedMemo(memo);
    const verificationPage = await import('../app/verify/[id]/page');
    await expect(verificationPage.default({
      params: Promise.resolve({ id: encodeURIComponent(memo.serialNumber) }),
    })).rejects.toThrow('NEXT_REDIRECT');
    expect(mockState.prisma.memo.findUnique).toHaveBeenCalledWith({
      where: { serialNumber: memo.serialNumber },
    });

    const notFound = await verificationPage.default({ params: Promise.resolve({ id: 'UNKNOWN123' }) });
    expect(JSON.stringify(notFound)).toContain('RECORD NOT FOUND');
  });
});
