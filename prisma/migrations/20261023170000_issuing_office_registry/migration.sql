-- Persist issuing-office identity and enforce unique office codes in PostgreSQL.
-- This prevents two concurrent admin sessions from registering different offices
-- under the same code and then issuing ambiguous references.
CREATE TABLE public."IssuingOffice" (
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IssuingOffice_pkey" PRIMARY KEY ("code")
);

INSERT INTO public."IssuingOffice" ("code", "name") VALUES
  ('PRES', 'Office of the President'),
  ('VP', 'Office of the Vice President'),
  ('SEC', 'Office of the Secretary General'),
  ('FIN', 'Office of the Financial Secretary'),
  ('TREAS', 'Office of the Treasurer'),
  ('PRO', 'Office of the Public Relations Officer'),
  ('WELF', 'Office of the Welfare Director'),
  ('SPORT', 'Office of the Director of Sports'),
  ('SOC', 'Office of the Social Director'),
  ('ACAD', 'Office of the Academic Director'),
  ('TECH', 'Office of the Technical Director');

ALTER TABLE public."Memo"
  ADD CONSTRAINT "Memo_officeCode_fkey"
  FOREIGN KEY ("officeCode")
  REFERENCES public."IssuingOffice"("code")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;

ALTER TABLE public."IssuingOffice" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."IssuingOffice" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."IssuingOffice" TO nacos_app;
CREATE POLICY "nacos_app_runtime_access" ON public."IssuingOffice"
  FOR ALL TO nacos_app USING (true) WITH CHECK (true);
