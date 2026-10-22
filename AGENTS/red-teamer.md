# Red-Team Notes — NACOS QR Supabase Migration

## Findings

### MEDIUM — Production DB connection not yet switched
- **Attack/failure:** A deployment still using Neon while documentation and schema point to Supabase can create split-brain records or fail at runtime after an env change.
- **Impact:** Issued memos could be written to one database and verified against another.
- **Remediation:** Keep the production switch gated on environment verification, source/target row counts, relation reconciliation, and a controlled smoke test.
- **Status:** OPEN.

### MEDIUM — Database credentials and trust boundary
- **Attack:** Exposing database credentials or granting table-wide REST access would allow direct access outside the custom admin flow.
- **Impact:** Unauthorized reads/writes to authoritative memo and audit records.
- **Remediation:** Keep credentials server-only; RLS is enabled; only the server-side `nacos_app` role has table policies, while public roles have no table privileges. Do not add public policies for direct table access.
- **Status:** Baseline applied; `nacos_app` password and production connection configuration pending.

### LOW/INFO — RLS has no policies
- **Observation:** Supabase advisor flags all five tables for RLS enabled without policies.
- **Reason:** Intentional deny-by-default Data API behavior. The current app is designed to access the database from the Next.js server through Prisma, not from browser clients.
- **Verification needed:** Confirm public Data API roles cannot select/insert/update/delete any application table after connection configuration.

### OPEN — End-to-end runtime testing unavailable
- **Observation:** Vercel runtime and build log endpoints returned 403 from the available connector.
- **Impact:** No verified root cause for the previously reported Internal Server Error.
- **Remediation:** Restore authorized log access or perform direct browser/runtime tests after env configuration.
