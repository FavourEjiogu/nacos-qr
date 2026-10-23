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
- **Status:** Table grants and role scope verified; `nacos_app` password and production connection configuration remain pending.

### LOW/INFO — Migration metadata has no RLS policy
- **Observation:** Supabase advisor flags only public._prisma_migrations because RLS is enabled without a policy.
- **Reason:** Intentional. Runtime and public roles should not read or mutate Prisma migration metadata.
- **Verification:** The five application tables have a policy scoped to nacos_app; anon and authenticated have no table privileges.

### OPEN — End-to-end runtime testing unavailable
- **Observation:** Vercel runtime and build log endpoints returned 403 from the available connector.
- **Impact:** No verified root cause for the previously reported Internal Server Error.
- **Remediation:** Restore authorized log access or perform direct browser/runtime tests after env configuration.

### HIGH — Source database reconciliation is still required
- **Observation:** Supabase is verified empty, but the legacy Neon counts have not yet been read.
- **Impact:** Switching production without a source count can make any earlier records/QRs appear missing.
- **Remediation:** Use a read-only count comparison before cutover. If the source is empty, record that evidence; otherwise perform a preserve-ID/time/hash/link migration and verify counts.
- **Status:** OPEN.

### LOW — Custom office codes are guarded at issue time
- **Observation:** A code may be used only for one office name; the API rejects reuse when an existing memo proves the code is bound to another name.
- **Residual risk:** Concurrent first-time custom-office creation could still race because the office registry is application-owned rather than a separate normalized table.
- **Mitigation:** Keep office-code selection limited to designated administrators and use the predefined list wherever possible.
