-- Initial schema for NACOS QR on Supabase PostgreSQL.
-- RLS is enabled with no Data API policies by design: all access goes through
-- the authenticated Next.js server using a private database connection.
CREATE TABLE public."Memo" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "serialNumber" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "body" TEXT NOT NULL,
  "issuedAt" TIMESTAMP(3) NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "issuer" TEXT NOT NULL,
  "issuerPhone" TEXT,
  "department" TEXT NOT NULL,
  "documentType" TEXT NOT NULL DEFAULT 'Other',
  "contentHash" TEXT NOT NULL,
  "officialDocumentHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revocationReason" TEXT,
  CONSTRAINT "Memo_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Memo_publicId_key" UNIQUE ("publicId"),
  CONSTRAINT "Memo_serialNumber_key" UNIQUE ("serialNumber")
);

CREATE TABLE public."MemoLink" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "memoId" TEXT NOT NULL,
  CONSTRAINT "MemoLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemoLink_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES public."Memo"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE public."SerialCounter" (
  "yearMonth" TEXT NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SerialCounter_pkey" PRIMARY KEY ("yearMonth")
);

CREATE TABLE public."LoginAttempt" (
  "id" TEXT NOT NULL,
  "ipAddress" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "success" BOOLEAN NOT NULL,
  CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE public."AuditLog" (
  "id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "metadata" TEXT,
  "memoId" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuditLog_memoId_fkey" FOREIGN KEY ("memoId") REFERENCES public."Memo"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Memo_createdAt_idx" ON public."Memo"("createdAt");
CREATE INDEX "Memo_status_idx" ON public."Memo"("status");
CREATE INDEX "MemoLink_memoId_idx" ON public."MemoLink"("memoId");
CREATE INDEX "LoginAttempt_ipAddress_timestamp_idx" ON public."LoginAttempt"("ipAddress", "timestamp");
CREATE INDEX "AuditLog_memoId_timestamp_idx" ON public."AuditLog"("memoId", "timestamp");
CREATE INDEX "AuditLog_timestamp_idx" ON public."AuditLog"("timestamp");

ALTER TABLE public."Memo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MemoLink" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SerialCounter" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."Memo", public."MemoLink", public."SerialCounter", public."LoginAttempt", public."AuditLog" FROM anon, authenticated;
