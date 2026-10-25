import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { generateMemoHash, generatePublicId, verifyMemoHash } from '@/lib/crypto';
import { generateSerialNumber } from '@/lib/serial';
import { isValidAdminPath } from '@/lib/admin-config';
import { resolveIssuingOffice } from '@/lib/offices';
import * as auth from '@/lib/auth';

const mockState = vi.hoisted(() => {
  type RecordData = Record<string, any>;
  const memos = new Map<string, RecordData>();
  const auditLogs: RecordData[] = [];
  const counters = new Map<string, number>();
  const loginAttempts: RecordData[] = [];
  const offices = new Map<string, string>();
  let adminConfig: RecordData | null = null;
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
      const key = where.counterKey;
      const previous = counters.get(key);
      const lastValue = previous === undefined
        ? create.lastValue
        : previous + (update?.lastValue?.increment ?? 0);
      counters.set(key, lastValue);
      return { counterKey: key, lastValue };
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
    findFirst: vi.fn(async ({ where }: RecordData) => findMemo(where)),
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
  prisma.issuingOffice = {
    findUnique: vi.fn(async ({ where }: RecordData) => {
      const name = offices.get(where.code);
      return name === undefined ? null : { code: where.code, name };
    }),
    create: vi.fn(async ({ data }: RecordData) => {
      if (offices.has(data.code)) {
        const error: RecordData = new Error('Unique office code violation');
        error.code = 'P2002';
        throw error;
      }
      offices.set(data.code, data.name);
      return { ...data, createdAt: new Date() };
    }),
  };
  prisma.$queryRaw = vi.fn(async () => []);
  prisma.adminConfig = {
    findUnique: vi.fn(async () => adminConfig),
    upsert: vi.fn(async ({ create, update }: RecordData) => {
      if (!adminConfig) {
        adminConfig = { authVersion: 0, adminPathHash: null, adminPasswordHash: null, ...create };
      } else {
        for (const [key, value] of Object.entries(update ?? {})) {
          if (value && typeof value === 'object' && 'increment' in value) {
            adminConfig[key] = Number(adminConfig[key] ?? 0) + Number((value as RecordData).increment);
          } else {
            adminConfig[key] = value;
          }
        }
      }
      return { ...adminConfig };
    }),
  };
  prisma.loginAttempt = {
    count: vi.fn(async ({ where }: RecordData) => loginAttempts.filter((attempt) =>
      attempt.ipAddress === where.ipAddress &&
      attempt.success === where.success &&
      attempt.timestamp >= where.timestamp.gte,
    ).length),
    create: vi.fn(async ({ data }: RecordData) => {
      const attempt = { ...data, id: `attempt-${loginAttempts.length + 1}`, timestamp: new Date() };
      loginAttempts.push(attempt);
      return attempt;
    }),
  };
  prisma.auditLog = {
    create: vi.fn(async ({ data }: RecordData) => {
      const log = { ...data, id: `audit-${++auditSequence}`, timestamp: new Date() };
      auditLogs.push(log);
      return log;
    }),
    findMany: vi.fn(async ({ where = {} }: RecordData = {}) =>
      auditLogs.filter((log) => Object.entries(where).every(([key, value]) => log[key] === value)),
    ),
  };
  prisma.$transaction = vi.fn(async (callback: (tx: RecordData) => Promise<unknown>) => callback(prisma));
  prisma.$disconnect = vi.fn(async () => undefined);

  return {
    prisma,
    memos,
    auditLogs,
    counters,
    loginAttempts,
    reset() {
      memos.clear();
      auditLogs.length = 0;
      counters.clear();
      loginAttempts.length = 0;
      offices.clear();
      adminConfig = null;
      memoSequence = 0;
      auditSequence = 0;
      linkSequence = 0;
    },
    seedMemo(memo: RecordData) { memos.set(memo.id, memo); },
    seedOffice(code: string, name: string) { offices.set(code, name); },
    getAdminConfig() { return adminConfig ? { ...adminConfig } : null; },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockState.prisma }));
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>();
  return {
    ...actual,
    isAuthenticated: vi.fn(),
    createSession: vi.fn(async () => undefined),
  };
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
    publicId: generatePublicId(),
    serialNumber: 'NACOS/BHU/PRES/PUB/2026/0001',
    title: 'Test Memo',
    summary: 'A verification fixture',
    body: 'This is a test memo.',
    issuer: 'Test Issuer',
    issuerPhone: null,
    addressedTo: 'All NACOSites',
    documentType: 'Internal Memorandum',
    visibility: 'PUBLIC',
    officeCode: 'PRES',
    officeName: 'Office of the President',
    integrityVersion: 2,
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

afterAll(async () => {
  await mockState.prisma.$disconnect();
});

describe('NACOS QR identifiers and integrity', () => {
  it('generates high-entropy public IDs in the expected alphabet', () => {
    const first = generatePublicId();
    const second = generatePublicId();
    expect(first).toHaveLength(26);
    expect(second).toHaveLength(26);
    expect(first).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
    expect(second).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]+$/);
    expect(first).not.toEqual(second);
  });

  it('signs public/private classification and issuing-office identity', () => {
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
      { visibility: 'CONFIDENTIAL' },
      { officeCode: 'SEC' },
      { officeName: 'Office of the Secretary General' },
      { issuedAt: new Date('2026-10-23T00:00:00.000Z') },
      { effectiveFrom: new Date('2026-10-23T00:00:00.000Z') },
      { expiresAt: new Date('2027-10-23T00:00:00.000Z') },
    ]) {
      const tampered = { ...base, ...changed };
      expect(generateMemoHash(tampered)).not.toBe(hash);
      expect(verifyMemoHash(tampered, hash)).toBe(false);
    }
  });

  it('preserves v1 integrity signatures for records already issued before this migration', () => {
    const legacy = makeMemo({
      integrityVersion: 1,
      publicId: '7Y2KF94Q',
      serialNumber: 'NACOSBHU/26/10/0001',
    });
    const legacyHash = generateMemoHash(legacy);
    expect(verifyMemoHash(legacy, legacyHash)).toBe(true);
  });

  it('keeps operational revocation state outside the content HMAC', () => {
    const active = makeMemo();
    const revoked = { ...active, status: 'REVOKED', revocationReason: 'Test reason' };
    expect(verifyMemoHash(revoked, active.contentHash)).toBe(true);
  });
});

describe('Issuing-office registry', () => {
  it('rejects reserved codes and accepts valid unique custom office codes', () => {
    expect(resolveIssuingOffice('OTHER', 'OTHER', 'Committee on Communications')).toBeNull();
    expect(resolveIssuingOffice('OTHER', 'PRES', 'Other Presidency')).toBeNull();
    expect(resolveIssuingOffice('OTHER', 'COMMS', 'Committee on Communications')).toEqual({
      code: 'COMMS',
      name: 'Committee on Communications',
      label: 'Committee on Communications',
    });
  });
});

describe('NACOS QR reference numbering', () => {
  it('generates atomic public serials scoped by year and office', async () => {
    const issuedAt = new Date('2026-10-22T00:00:00.000Z');
    const serials = await Promise.all([
      generateSerialNumber({ visibility: 'PUBLIC', officeCode: 'PRES', issuedAt }),
      generateSerialNumber({ visibility: 'PUBLIC', officeCode: 'PRES', issuedAt }),
      generateSerialNumber({ visibility: 'PUBLIC', officeCode: 'PRES', issuedAt }),
    ]);
    expect(new Set(serials).size).toBe(3);
    serials.forEach((serial) => expect(serial).toMatch(/^NACOS\/BHU\/PRES\/PUB\/2026\/\d{4,}$/));
  });

  it('starts a new public sequence on month and year boundaries without resetting older months', async () => {
    const october31 = new Date('2026-10-31T23:59:59.000Z');
    const november1 = new Date('2026-11-01T00:00:00.000Z');
    const january1 = new Date('2027-01-01T00:00:00.000Z');

    const octoberFirst = await generateSerialNumber({ visibility: 'PUBLIC', officeCode: 'PRES', issuedAt: october31 });
    const novemberFirst = await generateSerialNumber({ visibility: 'PUBLIC', officeCode: 'PRES', issuedAt: november1 });
    const octoberSecond = await generateSerialNumber({ visibility: 'PUBLIC', officeCode: 'PRES', issuedAt: october31 });
    const januaryFirst = await generateSerialNumber({ visibility: 'PUBLIC', officeCode: 'PRES', issuedAt: january1 });

    expect(octoberFirst).toBe('NACOS/BHU/PRES/PUB/2026/10/0001');
    expect(novemberFirst).toBe('NACOS/BHU/PRES/PUB/2026/11/0001');
    expect(octoberSecond).toBe('NACOS/BHU/PRES/PUB/2026/10/0002');
    expect(januaryFirst).toBe('NACOS/BHU/PRES/PUB/2027/01/0001');
    expect(mockState.counters.has('PUBLIC:PRES:2026:10')).toBe(true);
    expect(mockState.counters.has('PUBLIC:PRES:2026:11')).toBe(true);
    expect(mockState.counters.has('PUBLIC:PRES:2027:01')).toBe(true);
  });

  it('generates unpredictable private references without touching public counters', async () => {
    const before = mockState.prisma.serialCounter.upsert.mock.calls.length;
    const first = await generateSerialNumber({
      visibility: 'CONFIDENTIAL',
      officeCode: 'PRES',
      issuedAt: new Date('2026-10-22T00:00:00.000Z'),
    });
    const second = await generateSerialNumber({
      visibility: 'CONFIDENTIAL',
      officeCode: 'PRES',
      issuedAt: new Date('2026-10-22T00:00:00.000Z'),
    });
    expect(first).toMatch(/^NACOS\/BHU\/PRES\/CONF\/2026\/[23456789ABCDEFGHJKLMNPQRSTUVWXYZ-]+$/);
    expect(first).not.toBe(second);
    expect(mockState.prisma.serialCounter.upsert).toHaveBeenCalledTimes(before);
  });
});

describe('NACOS QR authentication and issuance APIs', () => {
  it('fails closed when no bootstrap password hash is configured', async () => {
    const originalHash = process.env.ADMIN_PASSWORD_HASH;
    delete process.env.ADMIN_PASSWORD_HASH;
    await expect(auth.verifyPassword('password')).rejects.toThrow('Admin password hash is not configured.');
    if (originalHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = originalHash;
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
      visibility: 'PUBLIC',
      officeCode: 'PRES',
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

  it('creates a public memo with an office reference, public ID, and audit trail', async () => {
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
        issuer: 'Office of the President',
        documentType: 'Internal Memorandum',
        addressedTo: 'All NACOSites',
        issuerPhone: '+2348000000000',
        visibility: 'PUBLIC',
        officeCode: 'PRES',
        issuedAt: '2026-10-22T00:00:00.000Z',
        effectiveFrom: '2026-10-22T00:00:00.000Z',
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.memo.visibility).toBe('PUBLIC');
    expect(result.memo.officeCode).toBe('PRES');
    expect(result.memo.serialNumber).toMatch(/^NACOS\/BHU\/PRES\/PUB\/2026\/\d{4,}$/);
    expect(result.memo.publicId).toHaveLength(26);
    expect(result.memo.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mockState.auditLogs).toHaveLength(1);
    expect(mockState.auditLogs[0].action).toBe('MEMO_CREATED');
    expect(mockState.auditLogs[0].memoId).toBe(result.memo.id);
  });

  it('prevents reusing an issuing-office code for a different office name', async () => {
    mockState.seedOffice('COMMS', 'Committee on Communications');
    const { POST } = await import('../app/api/admin/memos/route');
    const { NextRequest } = await import('next/server');
    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);

    const response = await POST(new NextRequest('http://localhost/api/admin/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Conflicting office code',
        body: 'This must not be issued.',
        issuer: 'Another Office',
        documentType: 'Internal Memorandum',
        addressedTo: 'Members',
        visibility: 'PUBLIC',
        officeCode: 'OTHER',
        customOfficeCode: 'COMMS',
        customOfficeName: 'Committee on Student Affairs',
        issuedAt: '2026-10-22T00:00:00.000Z',
        effectiveFrom: '2026-10-22T00:00:00.000Z',
      }),
    }));

    expect(response.status).toBe(409);
    expect(mockState.prisma.memo.create).not.toHaveBeenCalled();
  });

  it('keeps confidential records off public lookup and omits their public IDs', async () => {
    const { POST } = await import('../app/api/admin/memos/route');
    const { NextRequest } = await import('next/server');
    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);
    const response = await POST(new NextRequest('http://localhost/api/admin/memos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Private Appointment Letter',
        body: 'Confidential recipient-only content.',
        issuer: 'Office of the President',
        documentType: 'External Communication',
        addressedTo: 'Named recipient',
        visibility: 'CONFIDENTIAL',
        officeCode: 'PRES',
        issuedAt: '2026-10-22T00:00:00.000Z',
        effectiveFrom: '2026-10-22T00:00:00.000Z',
      }),
    }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.memo.visibility).toBe('CONFIDENTIAL');
    expect(result.memo.publicId).toBeNull();
    expect(result.memo.serialNumber).toMatch(/^NACOS\/BHU\/PRES\/CONF\/2026\/[23456789ABCDEFGHJKLMNPQRSTUVWXYZ-]+$/);
    mockState.seedMemo(result.memo);

    const verificationPage = await import('../app/verify/[id]/page');
    const verification = await verificationPage.default({
      params: Promise.resolve({ id: encodeURIComponent(result.memo.serialNumber) }),
    });
    expect(JSON.stringify(verification)).toContain('CONFIDENTIAL');
    expect(JSON.stringify(verification)).toContain('VERIFIED — ACTIVE');
    expect(JSON.stringify(verification)).toContain('anyone who obtains them can view this verification record');
    expect(mockState.prisma.memo.findFirst).toHaveBeenCalledWith({
      where: { serialNumber: result.memo.serialNumber },
      include: { links: true },
    });
  });

  it('requires authentication for revocation and audits a successful revocation', async () => {
    const memo = makeMemo();
    mockState.seedMemo(memo);
    const { PATCH } = await import('../app/api/admin/memos/[id]/route');
    const { NextRequest } = await import('next/server');
    vi.mocked(auth.isAuthenticated).mockResolvedValue(false);
    const denied = await PATCH(new NextRequest(`http://localhost/api/admin/memos/${memo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REVOKED' }),
    }), { params: Promise.resolve({ id: memo.id }) });
    expect(denied.status).toBe(401);
    expect((await mockState.prisma.memo.findUnique({ where: { id: memo.id } }))?.status).toBe('ACTIVE');

    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);
    const accepted = await PATCH(new NextRequest(`http://localhost/api/admin/memos/${memo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'REVOKED', revocationReason: 'Test revoke' }),
    }), { params: Promise.resolve({ id: memo.id }) });
    expect(accepted.status).toBe(200);
    const revoked = await mockState.prisma.memo.findUnique({ where: { id: memo.id } });
    expect(revoked?.status).toBe('REVOKED');
    expect(revoked?.revocationReason).toBe('Test revoke');
    expect(revoked?.revokedAt).toBeInstanceOf(Date);
    expect(mockState.auditLogs.filter((log) => log.action === 'MEMO_REVOKED')).toHaveLength(1);
  });

  it('changes the admin password and invalidates older sessions', async () => {
    const { POST } = await import('../app/api/admin/settings/route');
    const { NextRequest } = await import('next/server');
    const previousHash = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('old-test-password-123', 4);
    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);
    try {
      const response = await POST(new NextRequest('http://localhost/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change-password',
          currentPassword: 'old-test-password-123',
          newPassword: 'a-new-test-password-2026',
          confirmPassword: 'a-new-test-password-2026',
        }),
      }));
      expect(response.status).toBe(200);
      const updated = mockState.getAdminConfig();
      expect(updated?.authVersion).toBe(1);
      expect(await bcrypt.compare('a-new-test-password-2026', updated?.adminPasswordHash ?? '')).toBe(true);
      expect(auth.createSession).toHaveBeenCalledTimes(1);
      expect(mockState.auditLogs.some((log) => log.action === 'ADMIN_PASSWORD_CHANGED')).toBe(true);
    } finally {
      if (previousHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
      else process.env.ADMIN_PASSWORD_HASH = previousHash;
    }
  });

  it('rotates the admin URL and permits recovery without retaining the new path in plaintext', async () => {
    const { POST } = await import('../app/api/admin/settings/route');
    const { NextRequest } = await import('next/server');
    const previousHash = process.env.ADMIN_PASSWORD_HASH;
    const previousRoute = process.env.ADMIN_ROUTE_SECRET;
    process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('current-test-password-2026', 4);
    process.env.ADMIN_ROUTE_SECRET = 'temporary-bootstrap-route-secret-keep-safe';
    vi.mocked(auth.isAuthenticated).mockResolvedValue(true);
    try {
      expect(await isValidAdminPath(process.env.ADMIN_ROUTE_SECRET)).toBe(true);
      const response = await POST(new NextRequest('http://localhost/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rotate-path', currentPassword: 'current-test-password-2026' }),
      }));
      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.newPath).toHaveLength(32);
      const stored = mockState.getAdminConfig();
      expect(stored?.authVersion).toBe(1);
      expect(stored?.adminPathHash).toMatch(/^[a-f0-9]{64}$/);
      expect(stored?.adminPathHash).not.toBe(result.newPath);
      expect(await isValidAdminPath(result.newPath)).toBe(true);
      expect(await isValidAdminPath(process.env.ADMIN_ROUTE_SECRET)).toBe(false);
    } finally {
      if (previousHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
      else process.env.ADMIN_PASSWORD_HASH = previousHash;
      if (previousRoute === undefined) delete process.env.ADMIN_ROUTE_SECRET;
      else process.env.ADMIN_ROUTE_SECRET = previousRoute;
    }
  });
});
