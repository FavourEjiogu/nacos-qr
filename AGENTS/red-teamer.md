# Red-Team Notes — NACOS QR Supabase Migration

## Findings

### HIGH — Production DB connection not yet switched
- **Attack/failure:** A deployment still using Neon while documentation and schema point to Supabase can create split-brain records or fail at runtime after an env change.
- **Impact:** Issued memos could be written to one database and verified against another.
- **Remediation:** Keep the production switch gated on environment verification, source/target row counts, relation reconciliation, and a controlled smoke test.
- **Status:** OPEN.

### MEDIUM — Database credentials and trust boundary
- **Attack:** Exposing database credentials or granting table-wide REST access would allow direct access outside the custom admin flow.
- **Impact:** Unauthorized reads/writes to authoritative memo and audit records.
- **Remediation:** Keep credentials server-only; RLS is enabled; only the server-side `nacos_app` role has table policies, while public roles have no table privileges. Do not add public policies for direct table access.
- **Status:** RLS/grants/policies verified; `nacos_app` password remains unset and Vercel Supabase connection configuration is missing.

### LOW/INFO — Migration metadata has no RLS policy
- **Observation:** Supabase advisor flags only public._prisma_migrations because RLS is enabled without a policy.
- **Reason:** Intentional. Runtime and public roles should not read or mutate Prisma migration metadata.
- **Verification:** The five application tables have a policy scoped to nacos_app; anon and authenticated have no table privileges.

### OPEN — End-to-end runtime testing unavailable
- **Observation:** Vercel denied protected preview fetches (403); build status is readable and the deployment is READY, but database-backed endpoints cannot be called via the current connector scope.
- **Impact:** No verified root cause for the previously reported Internal Server Error.
- **Remediation:** Restore authorized log access or perform direct browser/runtime tests after env configuration.

### HIGH — Source database reconciliation is still required
- **Observation:** Supabase is verified empty, but the legacy Neon counts have not yet been read.
- **Impact:** Switching production without a source count can make any earlier records/QRs appear missing.
- **Remediation:** Use a read-only count comparison before cutover. If the source is empty, record that evidence; otherwise perform a preserve-ID/time/hash/link migration and verify counts.
- **Status:** OPEN.

### MITIGATED — Custom office code collision
- **Observation:** Office codes are primary keys in the persistent IssuingOffice registry. Issuance takes a transaction-scoped advisory lock by code, rechecks the registered name, and writes the memo, serial counter, and audit record in one transaction.
- **Mitigation:** The database foreign key prevents memos from referencing unregistered offices; a name/code mismatch returns HTTP 409. Continue to use the predefined office list where possible.
