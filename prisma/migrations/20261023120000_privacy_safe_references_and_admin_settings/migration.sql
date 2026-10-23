-- Privacy-aware memo references and self-service admin settings.
-- Existing records retain integrityVersion=1 so their historical HMAC stays valid.
ALTER TABLE public."Memo"
  ALTER COLUMN "publicId" DROP NOT NULL,
  ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
  ADD COLUMN "officeCode" TEXT NOT NULL DEFAULT 'PRES',
  ADD COLUMN "officeName" TEXT NOT NULL DEFAULT 'Office of the President',
  ADD COLUMN "integrityVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE public."Memo"
  ADD CONSTRAINT "Memo_visibility_check"
    CHECK ("visibility" IN ('PUBLIC', 'CONFIDENTIAL')),
  ADD CONSTRAINT "Memo_integrityVersion_check"
    CHECK ("integrityVersion" IN (1, 2));

CREATE INDEX "Memo_visibility_status_idx"
  ON public."Memo"("visibility", "status");

ALTER TABLE public."SerialCounter"
  RENAME COLUMN "yearMonth" TO "counterKey";

CREATE TABLE public."AdminConfig" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "adminPathHash" TEXT,
  "adminPasswordHash" TEXT,
  "authVersion" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminConfig_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AdminConfig_singleton_check" CHECK ("id" = 1)
);

ALTER TABLE public."AdminConfig" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."AdminConfig" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."AdminConfig" TO nacos_app;

CREATE POLICY "nacos_app_runtime_access" ON public."AdminConfig"
  FOR ALL TO nacos_app USING (true) WITH CHECK (true);

-- Existing app records remain publicly verifiable for backward compatibility.
-- New private records must have no publicId; the application enforces this invariant.
