# TeesFromThePast – Platform Manual (Living Document)

Status: Living – update after every merged backend/platform PR  
Owner: @delv3chi0  
Last Updated: (INSERT DATE ON MERGE)  
Version Tag (recommended): v0.2.0 (post Tasks 1–10)

---

## 1. Purpose & High-Level Overview

TeesFromThePast is (assumed) an e‑commerce style application for selling or showcasing vintage / historical T‑shirts.  
The backend has recently undergone a structured hardening initiative (Tasks 1–10) adding observability, auth/session rotation, feature flags, job queue, caching, CI/CD scaffolds, and documentation.

This manual centralizes:
- System architecture and component responsibilities
- Feature inventory and behavior
- Operational endpoints & workflows
- Environment variable reference
- Security & compliance posture (current + gaps)
- Deployment & rollback procedures
- Runbooks & playbooks (initial)
- Roadmap / checklist (completed vs future)
- Update & contribution process
- Glossary

Use this as a single “source of truth” to onboard contributors and operate the platform.

---

## 2. Architecture Overview

### 2.1 Logical Components
| Component | Responsibility | Technology (Assumed/Implemented) |
|-----------|----------------|----------------------------------|
| Web Frontend | User-facing UI (hosted on Vercel) | Next.js or similar (not materially changed in Tasks 1–10) |
| Backend API | Core business logic, auth, feature flags, jobs, metrics | Node.js/Express (assumed from typical setup) |
| Persistence (DB) | Product/user/order data (schema details not yet formalized here) | Likely Postgres (assumed) |
| Redis | Sessions / refresh token blacklist, feature flag cache, job queue, general caching, idempotency keys | Redis |
| Job Queue | Asynchronous/background tasks (email tests now; extensible) | BullMQ |
| Observability Stack | Health/readiness endpoints, metrics, tracing | OpenTelemetry instrumentation + /metrics exposition |
| CI/CD Scaffold | Lint, (placeholder) tests, security scan, Dependabot updates | GitHub Actions |
| Feature Flags Layer | Tiered evaluation (in-memory defaults, JSON file, env overrides) | Custom module + file watchers |
| Security Middleware | Core HTTP security headers, CORS, request size guard | Helmet, CORS, custom wrappers |
| Validation Layer | Request schema validation (scaffold) | zod (assumed) |

### 2.2 Deployment Topology
- Backend: Render (auto-deploy from main; ensure main merges trigger builds)
- Frontend: Vercel (UI only – backend changes may not redeploy UI)
- Redis: Managed instance (single-region currently)
- Jobs run inside same process (no separate worker right now unless separately spawned – confirm if a dedicated worker process is needed later)

### 2.3 Data Flows (High Level)
1. User authentication: Login issues access JWT + rotating refresh token (store refresh token client-side secure; rotation invalidates prior JTI).
2. Access-protected API calls: Bearer access token validated via middleware (req.auth set).
3. Refresh: Client calls POST /auth/refresh -> new access + refresh; previous refresh token JTI blacklisted.
4. Jobs: Authenticated admin (or test) request POST /jobs/test -> job queued in BullMQ -> processed asynchronously -> status accessible via GET /jobs/:id/status.
5. Feature flag evaluation: Routes call isFlagEnabled(name) -> resolves layered source stack -> influences conditional route logic (e.g., exposing test job endpoint).
6. Caching: getOrSet() wraps retrieval logic; idempotency middleware prevents duplicate POST side-effects by keying on Idempotency-Key header.
7. Observability: /health (lightweight self-check), /readiness (deeper: dependencies), /metrics (Prometheus-compatible), tracing integrated via OpenTelemetry spans.
8. CI pipeline ensures minimal gates (lint, placeholder test, npm audit, coverage baseline) + Dependabot dependency upgrades.

---

## 3. Endpoint Inventory

(Adjust actual routes if naming differs in code.)

| Route | Method | Auth Required | Description | Notes |
|-------|--------|---------------|-------------|-------|
| /health | GET | No | Liveness probe | Fast, internal state only |
| /readiness | GET | No | Readiness probe (checks dependencies) | May degrade vs fail |
| /metrics | GET | Possibly (token) | Prometheus metrics | Protect if exposed publicly |
| /flags | GET | Optional (internal) | Returns all flag values + metadata | For admin dashboards |
| /flags/reload | POST | Yes (FLAG_ADMIN_TOKEN) | Forces reload from file/env sources | 401 if token invalid |
| /auth/refresh | POST | No (needs refresh token payload) | Rotates refresh, issues new access/refresh pair | Old refresh invalidated |
| /auth/logout | POST | Access or refresh context | Blacklists active refresh token JTI | Client should discard tokens |
| /auth/2fa/setup | POST | Auth | Stub – returns mock secret / TODO | 501 or placeholder |
| /auth/2fa/verify | POST | Auth | Stub – placeholder verify | Not implemented fully |
| /jobs/test | POST | Possibly yes + feature flag + ENABLE_JOB_TESTING | Enqueues sample job | Not enabled in prod by default |
| /jobs/:id/status | GET | Maybe restricted | Returns job state (waiting, active, completed, failed) | Make sure to avoid leaking info |
| (Sample POST route with idempotency) | POST | Varies | Demonstrates idempotent behavior | Repeat returns same body |
| /version | GET | No | Build metadata (commit, buildTime, version, env) | **NOW IMPLEMENTED** - Returns JSON with commit SHA, build time, package version, and environment info |

---

## 4. Feature Inventory & Behavior

### 4.1 Authentication & Session (Task 6)
- Access token: Short-lived JWT (contains sub, exp, maybe jti)
- Refresh token: Rotating; each refresh invalidates previous token
- Blacklisting: Redis stores invalid JTIs; refreshed/ logged-out tokens cannot be reused
- Logout: Adds current refresh token’s JTI to blacklist
- 2FA: Stub endpoints prepared; full TOTP pipeline deferred (TODO markers)
- Security Considerations:
  - Ensure JWT_SECRET strong & rotated with caution (document rotation in runbook)
  - Potential need for single-session mode (future enhancement)

### 4.2 Background Job Queue (Task 7)
- BullMQ queue factory abstraction
- Sample job (e.g., email.sendTest) demonstrating logging & correlation
- Graceful shutdown plan (pause/drain)
- Retry/backoff policies standardized (config)
- Future: dedicated worker scale-out, dead-letter queue, metrics

### 4.3 Feature Flags (Task 8)
- Layered resolution: defaults -> JSON file (config/feature-flags.json) -> environment FLAG_<NAME>=on/off -> future remote provider (interface stub)
- Hot reload: POST /flags/reload or dev file watch (ENABLE_FLAG_WATCH=1)
- Unknown flag returns false + debug log
- Security: reload requires FLAG_ADMIN_TOKEN

### 4.4 Caching & Performance (Task 9)
- Read-through cache utility getOrSet(key, ttlSeconds, producerFn)
- Idempotency middleware: Idempotency-Key header persists response signature + status in Redis for IDEMPOTENCY_TTL seconds
- Slow query logging wrapper logs warnings > DB_SLOW_QUERY_MS
- Metrics counters: cache_hits_total, cache_misses_total (if metrics enabled)
- Future: stale-while-revalidate, per-route decorators, multi-tier caches

### 4.5 Observability & Error Handling (Earlier Tasks)
- Health & readiness endpoints
- Unified error envelope JSON { error: { code, message, details? } }
- OpenTelemetry tracing (spans around requests, ready for downstream propagation)
- Metrics exposure (/metrics) – gauge/counters/histograms (expandable)
- Logging: structured, correlation-friendly, redaction for sensitive keys (configured earlier)

### 4.6 Security Middleware
- Helmet (baseline headers)
- CORS configured via ALLOWED_ORIGINS
- Request body size guard (prevent abuse)
- TODO: fine-grained CSP, rate limiting, brute-force defense, IP reputation

### 4.7 Validation
- zod (or similar) request schema middleware scaffold
- Example validation on at least one route
- TODO: full coverage across all input surfaces

### 4.8 CI/CD & Quality Gates (Task 10)
- GitHub Actions workflow quality.yml:
  - Install, lint, placeholder test, npm audit, coverage threshold (lines ~50% with TODO to raise)
- Dependabot weekly updates (.github/dependabot.yml)
- Security scan script npm run security:scan (npm audit --audit-level=high)
- TODO placeholders for SAST (CodeQL), container scan, SBOM

### 4.9 Documentation & Roadmap
- NEXT_10_BACKEND_TASKS.md updated with statuses
- README updated with new env vars & endpoints
- This manual centralizes & extends details (living doc)

---

## 5. Environment Variables Reference

(Confirm exact names in code after merges; update mismatches.)

| Variable | Purpose | Example | Required | Notes |
|----------|---------|---------|----------|-------|
| JWT_SECRET | Sign/verify JWTs | (random 32+ chars) | Yes | Rotate carefully; triggers logout-like effect |
| JWT_ACCESS_TTL | Access token lifetime (e.g. “5m”) | 5m | Yes | Short lived |
| JWT_REFRESH_TTL | Refresh token lifetime (e.g. “30d”) | 30d | Yes | Longer duration |
| REDIS_URL | Redis connection string | rediss://... | Yes | Used by tokens, cache, jobs, idempotency, rate limiting |
| RATE_LIMIT_WINDOW | Rate limit window in milliseconds | 60000 | No | Default: 60000 (1 minute) |
| RATE_LIMIT_MAX | Maximum requests per window | 120 | No | Default: 120 requests |
| RATE_LIMIT_EXEMPT_PATHS | Paths exempt from rate limiting | /health,/readiness | No | Comma-separated list |
| RATE_LIMIT_REDIS_PREFIX | Redis key prefix for rate limiting | rl: | No | Default: "rl:" |
| ENABLE_2FA | Enable 2FA flow (stub) | 0 | No | Future full implementation |
| FLAG_ADMIN_TOKEN | Auth token for /flags/reload | (secret) | Recommended | Keep distinct from JWT secret |
| ENABLE_FLAG_WATCH | Dev hot reload via fs.watch | 1 (dev) | No | Don’t enable in prod |
| ENABLE_JOB_TESTING | Allow POST /jobs/test | 0 | No | Temp enable for manual tests |
| ENABLE_METRICS | Expose /metrics | 1 | No | Protect with network or auth |
| METRICS_AUTH_TOKEN | Token for /metrics (if enforced) | (secret) | Conditional | Implement if not public |
| ALLOWED_ORIGINS | CORS origins (comma-delimited) | https://app.example.com | Yes (prod) | Fallback to * not recommended |
| IDEMPOTENCY_TTL | Retention for idempotency records | 120 | No | Seconds |
| DB_SLOW_QUERY_MS | Warn threshold for DB queries | 300 | No | Adjust after profiling |
| NODE_ENV | Environment mode | production | Yes | Standard |
| LOG_LEVEL | Verbosity for logger | info | No | debug in dev |
| FLAG_<NAME> | Override individual flags | on/off | As needed | e.g., FLAG_NEW_CART=on |
| GIT_COMMIT | Version endpoint commit ref | 6f3609b | No | **NOW SUPPORTED** - Auto-detected via git if not set |
| BUILD_TIME | Version endpoint build timestamp | 2025-08-25T23:50:58.883Z | No | **NOW SUPPORTED** - Auto-generated if not set |

Add new variables here as features mature. Keep alphabetized for clarity.

---

## 6. Security Posture Summary (Current vs Gaps)

Current:
- JWT rotation + blacklist
- Redis-backed session invalidation
- Basic Helmet headers
- CORS controlled
- Input validation scaffold
- Idempotency for chosen POST route
- Limited metrics exposure (optionally gated)

Gaps / TODO:
- Comprehensive rate limiting (per IP + per account)
- Brute force detection on auth endpoints
- CSRF not needed for pure API + bearer tokens (confirm usage)
- Advanced content security policy
- Secrets rotation runbook
- Full 2FA (TOTP, recovery codes)
- Audit logging (security events)
- CodeQL + dependency scanning beyond npm audit
- Penetration testing / fuzz coverage

---

## 7. Operational Runbooks (Initial Draft)

### 7.1 Deployment (Render)
1. Merge to main.
2. Render auto-deploy triggers (verify in dashboard).
3. Confirm latest commit hash appears in deployment logs.
4. Run smoke:
   - curl /health
   - curl /readiness
   - (auth test) refresh flow
   - If any fail -> rollback.

### 7.2 Rollback
1. Identify last good commit hash (e.g., from git log).
2. git revert <bad_merge_commit> (or revert squash commit).
3. Push to main -> redeploy.
4. Verify health & targeted endpoints.

### 7.3 JWT Secret Rotation
1. Announce maintenance window (if token invalidations matter).
2. Add new secret as NEXT_JWT_SECRET (if dual-secret scheme implemented later – not yet).
3. Roll servers with code that accepts old & signs new (future enhancement).
4. After grace period, remove old secret variable.
(Current simple approach: direct replace JWT_SECRET – all tokens immediately invalid.)

### 7.4 Redis Outage / Degradation
Symptoms: refresh fails, jobs stuck, cache misses frequent.
Actions:
1. Check Redis status (monitoring or redis-cli PING).
2. Failover / restart managed instance.
3. Purge corrupted keys only if necessary (idempotency & blacklist recompute not critical; losing blacklist allows reused tokens – consider strict fallback).
4. Post-mortem document cause/time/impact.

### 7.5 Job Queue Backlog
1. GET /jobs/:id/status (spot-check).
2. Inspect Redis for queue size (BullMQ UI or CLI if added).
3. If worker throughput insufficient: scale horizontally (future separate worker process).
4. Clear dead-letter queues (future feature) after diagnosing failures.

### 7.6 Feature Flag Update
1. Edit config/feature-flags.json in repo (or set env FLAG_<NAME>).
2. Deploy or POST /flags/reload with correct token.
3. Verify via GET /flags.
4. Document change rationale (append to a Flag Changes log – future).

### 7.7 Idempotency Issue (Duplicate Side-Effects)
1. Check Redis for key presence (Idempotency-Key).
2. Confirm TTL sufficient for client retries.
3. For critical endpoints, expand to store richer metadata or extend TTL.

### 7.8 Slow Queries
1. Review logs for “slow query” warnings (durationMs).
2. Identify query pattern + parameters.
3. Add index / restructure query.
4. Adjust DB_SLOW_QUERY_MS if noise too high (but prefer query tuning first).

### 7.9 Incident Triage Checklist
- What’s the symptom (availability, latency, errors)?
- Scope (all users, subset, just one endpoint)?
- Recent deploy? (Check commit timeline)
- External dependency status (Redis, DB)
- Mitigation: rollback vs hotfix vs scale
- Communicate status updates (internal channel)
- Post-mortem: root cause, actions, prevention

---

## 8. Monitoring & Metrics

Core (current):
- HTTP request counters & latency histograms (inferred)
- cache_hits_total / cache_misses_total
- Potential queue metrics (expand soon)
- Health / readiness signals

Recommended Additions:
- job_processed_total{status=...}
- refresh_token_rotation_total{result=success|failure}
- rate_limited_total (after rate limiting)
- flag_evaluations_total{flag, result}
- idempotency_replay_total

Alert Ideas (future):
- High 5xx rate over 5 min
- Readiness failing
- Slow queries > threshold spike
- Cache miss ratio exceeds X%
- Queue backlog length > Y

---

## 9. Logging & Tracing

Logging Patterns:
- Structured (JSON) with keys: level, msg, timestamp, traceId (?).
- Security events (logout, failed refresh) should be elevated (info/warn).
- Slow queries produce warn with durationMs.

Tracing:
- Ensure inbound request span -> child spans for DB calls, queue enqueue.
- Future: propagate trace context into BullMQ jobs (currently minimal correlation; TODO: include traceId in job data).

---

## 10. Development Workflow

Suggested Local Flow:
1. git pull main
2. Create feature branch: feature/<short-description>
3. Implement changes with cohesive commits
4. Run lint, (future tests)
5. Update docs (README + this manual if relevant) BEFORE pushing
6. Open PR with summary + endpoints/env vars list
7. After merge, verify in staging/prod.

Doc Update Principle:
- Any new endpoint/environment variable must appear in:
  - README (quick start)
  - This manual (sections 3 & 5)
  - If large: add runbook updates

---

## 11. Checklist / Roadmap (Living)

### 11.1 Completed (Tasks 1–10)
1. Config initialization & logger hardening
2. Config readiness helper
3. Roadmap documentation creation
4. Health & readiness endpoints
5. OpenTelemetry tracing + baseline metrics
6. Unified error handling
7. Security middleware scaffold
8. Validation middleware scaffold
9. Auth refresh rotation + blacklist + logout + 2FA stubs
10. Job queue abstraction (BullMQ) + sample job + status
11. Feature flags service + hot reload + secure admin endpoint
12. Caching layer + idempotency + slow query logging
13. CI quality workflow + Dependabot + security scan script
14. Documentation updates (README, tasks)
15. This centralized manual (initial version)

### 11.2 High-Priority Next (Recommended Sequence)
A. ✅ **COMPLETED** - Rate Limiting & Abuse Protection  
B. ✅ **COMPLETED** - /version endpoint + commit metadata + tag discipline  
C. Expanded validation coverage (all mutating endpoints)  
D. Runbooks expansion (secrets rotation, incident matrix, queue operations)  
E. Auth hardening (2FA full TOTP, session/device management)  
F. Advanced feature flags (remote provider, evaluation metrics)  
G. Observability enrichment (job metrics, custom dashboards)  
H. Performance caching enhancements (stale-while-revalidate, selective invalidation)  
I. Security SAST & Container / SBOM in CI  
J. Test suite build-out & raise coverage thresholds (>80%)  

### 11.3 Deferred / Strategic Future
- Multi-region readiness (distributed cache, idempotency)
- Multi-tenant isolation (if planned)
- Audit/event ledger store
- Payment gateway integration hardening (if applicable)
- SLA / error budgets & governance
- Chaos testing harness
- Blue/green or canary deployment strategy

---

## 12. Future Enhancements Detail (Brief)

| Area | Enhancement | Value |
|------|-------------|-------|
| Rate Limiting | Redis sliding window per IP/sub | Prevent abuse & brute force |
| 2FA | Full TOTP, recovery codes | Stronger account security |
| Feature Flags | Remote source + metrics | Dynamic control & experimentation |
| Jobs | Dedicated worker processes + DLQ | Reliability & scale |
| Caching | Stale-while-revalidate + tagging | Latency reduction without staleness risk |
| Observability | Job & auth metrics | Faster incident triage |
| Security | CodeQL, Trivy, SBOM | Shift-left + supply chain |
| Testing | Integration + contract tests | Confidence in deploys |
| Versioning | /version + CHANGELOG discipline | Faster rollback diagnostics |

---

## 13. Conventions

| Category | Convention |
|---------|------------|
| Branch names | feature/<topic>, fix/<issue>, chore/<task> |
| Commit prefixes | feat:, fix:, chore:, docs:, refactor:, test: |
| PR Titles | feat(scope): summary (Task #x) |
| Error JSON shape | { error: { code, message, details? } } |
| Logging Levels | debug (dev), info (normal ops), warn (slow query / partial failure), error (unexpected) |
| Flags naming | snake_case or lowerCamel? (Pick one; current assumed lowerCamel) |
| Environment variable naming | UPPER_SNAKE_CASE, secrets never committed |

---

## 14. Testing Strategy (Current + Planned)

Current:
- Manual post-deploy smoke tests
- Placeholder CI test step

Planned Phases:
1. Minimal critical integration tests (auth rotation, idempotency)
2. Contract tests for external interfaces (if any)
3. Load/perf baseline (k6/Gatling) for critical endpoints
4. Security tests (dependency, static, dynamic)

Coverage Roadmap:
- Start at ~50% lines (enforced)
- Phase up to 65%, 75%, 85% after stabilized

---

## 15. Risk Register (Short Form)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Missing rate limits => abuse | Med | High | Implement sliding window soon |
| Redis outage => auth refresh issues | Low | Med | Add retry/backoff + fallback mode |
| Token secret leakage | Low | High | Restrict access, rotate process |
| Job queue growth (no worker scale) | Med | Med | Introduce dedicated workers |
| Incomplete validation => bad data | Med | Med | Expand validation coverage |
| Lack of tests => regression | High | Med/High | Incrementally add suites |
| Flag misuse (no audit) | Low | Low/Med | Add flag evaluation metrics |
| Manual deploy mistakes | Med | Med | Add /version endpoint & runbooks |

---

## 16. Glossary

| Term | Definition |
|------|------------|
| Access Token | Short-lived JWT used for API authorization |
| Refresh Token | Long-lived rotating credential used to obtain new access tokens |
| JTI | Unique token ID allowing blacklist/invalidation |
| BullMQ | Job queue library atop Redis |
| Feature Flag | Runtime switch controlling conditional logic |
| Idempotency | Guarantee repeated identical POST doesn’t duplicate side-effects |
| Readiness | Endpoint indicating full dependency health |
| Liveness (Health) | Endpoint indicating process is alive |
| Stale-While-Revalidate | Caching strategy serving cached while refreshing asynchronously (future) |
| DLQ | Dead-letter queue for failed jobs (future) |
| SAST | Static Application Security Testing |
| SBOM | Software Bill of Materials |

---

## 17. Update Procedure for This Manual

When introducing new functionality:
1. Add endpoint to Section 3.
2. Add env vars to Section 5.
3. If operational impact: update runbook section.
4. If security posture changes: adjust Section 6.
5. Add to checklist (Completed vs Next).
6. Increment version tag (Section 1) after deploy.

Commit message pattern: docs(manual): update for <feature> (Task #x)  
Consider enforcing a PR checklist item “Updated manual? Y/N”.

---

## 18. Immediate Next Recommended Action

~~Implement Rate Limiting + /version Endpoint bundle (Tasks A + part of C).~~ **COMPLETED IN WAVE 2**
- ✅ Add /version endpoint with build metadata
- ✅ Add Redis-based fixed window rate limiter (configurable thresholds)
- ✅ Document new env vars: RATE_LIMIT_MAX, RATE_LIMIT_EXEMPT_PATHS, RATE_LIMIT_REDIS_PREFIX
- ⏳ Update metrics: rate_limited_total (future enhancement)

**Next Priority**: Expanded validation coverage (all mutating endpoints)

---

## 19. CHANGELOG (Excerpt – Proposed v0.2.0)

(Not yet tagged – finalize after confirmation.)

### Added
- Auth refresh rotation & blacklist
- Job queue (BullMQ) + sample job
- Feature flags service + reload
- Caching (read-through), idempotency, slow query logging
- Health, readiness, metrics, tracing
- Unified error handling
- CI workflow + Dependabot
- Security & validation scaffolds
- Documentation (roadmap + manual)

### Next
- Rate limiting, /version, validation coverage

---

## 20. Open Questions / Assumptions

| Topic | Assumption | Action |
|-------|------------|--------|
| Database engine | Postgres | Validate & document schema |
| Worker process separation | Not yet separate | Decide when scaling |
| Metrics auth | Token-based or network restricted | Confirm & document |
| Job retention policy | Defaults | Set explicit cleanup strategy |
| Secret storage | Managed via Render dashboard | Consider secret manager integration |
| Frontend consumption of new endpoints | Minimal so far | Plan UI integration (feature flags, job status) |

---

## 21. Appendices

### 21.1 Smoke Test Script (Copy/Paste)
```bash
API=https://api.example.com
echo "Health:"; curl -s $API/health; echo
echo "Readiness:"; curl -s $API/readiness; echo
echo "Flags:"; curl -s $API/flags | head
echo "Unauthorized flag reload (should 401):"
curl -i -X POST $API/flags/reload | head -n 10
# Add refresh & job endpoint tests with appropriate tokens/headers.
```

### 21.2 Example Rate Limiter Design (Future)
- Key: rl:<scope>:<ip or user>
- Sliding window stored as sorted timestamps
- Evaluate count within window; if > threshold, return 429
- Metrics increment rate_limited_total

---

## 22. Maintenance Log (Start Recording)
| Date | Change | By | Notes |
|------|--------|----|------|
| (Fill on merge) | Manual created | @copilot | Initial version |

---

End of Manual
