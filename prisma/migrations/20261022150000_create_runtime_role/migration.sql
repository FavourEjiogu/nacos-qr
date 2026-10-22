-- Least-privilege application role for runtime Prisma queries.
-- Set its password out-of-band in the Supabase SQL Editor/credential manager.
CREATE ROLE nacos_app LOGIN;
GRANT USAGE ON SCHEMA public TO nacos_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."Memo",
  public."MemoLink",
  public."SerialCounter",
  public."LoginAttempt",
  public."AuditLog"
TO nacos_app;

CREATE POLICY "nacos_app_runtime_access" ON public."Memo"
  FOR ALL TO nacos_app USING (true) WITH CHECK (true);
CREATE POLICY "nacos_app_runtime_access" ON public."MemoLink"
  FOR ALL TO nacos_app USING (true) WITH CHECK (true);
CREATE POLICY "nacos_app_runtime_access" ON public."SerialCounter"
  FOR ALL TO nacos_app USING (true) WITH CHECK (true);
CREATE POLICY "nacos_app_runtime_access" ON public."LoginAttempt"
  FOR ALL TO nacos_app USING (true) WITH CHECK (true);
CREATE POLICY "nacos_app_runtime_access" ON public."AuditLog"
  FOR ALL TO nacos_app USING (true) WITH CHECK (true);

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nacos_app;
