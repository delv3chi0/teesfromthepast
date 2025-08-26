# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Admin Console: Dynamic Runtime Configuration Layer**
  - In-memory dynamic configuration system for real-time operational changes
  - Runtime API endpoints for rate limiting, security, tracing, and audit log management
  - Enhanced middleware integration with dynamic overrides (ephemeral, lost on restart)
  - New operational tabs: Metrics, Rate Limiting, Security, Health, Tracing, Config, Enhanced Audit Logs
  - Tab order: Dashboard | Users | Orders | Designs | Inventory | Devices | Metrics | Rate Limiting | Security | Health | Tracing | Config | Audit Logs

- **Enhanced Audit Logging**
  - Ring buffer for real-time audit log access (configurable size, default 500 entries)
  - Server-side filtering by category and case-insensitive text search
  - Enhanced audit log panel with tail mode (auto-refresh every 5s)
  - Expandable row details with metadata JSON preview

- **Dynamic Rate Limiting Enhancements**
  - Real-time rate limit configuration without server restart
  - Dynamic path and role-based overrides management
  - Precedence: Role overrides > Path overrides > Global settings
  - Immediate application to new requests

- **Dynamic Security Headers**
  - Real-time CSP report-only mode toggle
  - Dynamic Cross-Origin Embedder Policy (COEP) enable/disable
  - Immediate application to subsequent requests

- **Request Tracing System**
  - Request ID tracking with configurable header name
  - Recent request IDs ring buffer (last 100 requests)
  - Request correlation for distributed debugging

- **Comprehensive Admin UI Components**
  - Reusable SectionCard, KeyValueGrid, JSONPreview components
  - EditableNumberRow for inline number editing with validation
  - ToggleRow for boolean settings with immediate feedback
  - Graceful fallback when backend features unavailable

- **Metrics Instrumentation Foundation**
  - Prometheus metrics collection with prom-client
  - HTTP request counters and duration histograms
  - Rate limiting metrics (rate_limited_total)
  - Redis error metrics (redis_errors_total)
  - /metrics endpoint with ENABLE_METRICS environment variable guard
  - Default metrics enabled in non-production, must be explicitly enabled in production

- **Advanced Rate Limit Algorithms**
  - Support for multiple rate limiting algorithms: fixed (default), sliding window, token bucket
  - RATE_LIMIT_ALGORITHM environment variable for algorithm selection
  - Sliding window approximation using two adjacent windows with interpolation
  - Token bucket implementation with Redis-based token persistence and TTL
  - X-RateLimit-Algorithm header in responses

- **Per-Route and Per-Role Rate Limit Overrides**
  - RATE_LIMIT_OVERRIDES environment variable for path-based overrides
  - RATE_LIMIT_ROLE_OVERRIDES environment variable for role-based overrides
  - Priority order: role override > path override > global configuration
  - Format: "pathPrefix:max[:algo]" for path overrides
  - Format: "role|pathPrefix:max[:algo]" for role overrides

- **Enhanced Request ID Propagation**
  - Support for custom REQUEST_ID_HEADER environment variable (default: X-Request-Id)
  - Use existing request ID from header if present, otherwise generate new one
  - Integration with logger via child logger with requestId context
  - Consistent request ID propagation across all log events

- **Enhanced Health and Readiness Endpoints**
  - Detailed /health endpoint with system information, version, Redis status, rate limiter info
  - New /readiness endpoint with dependency checks
  - Redis connectivity verification in readiness checks
  - REDIS_REQUIRED_FOR_READINESS environment variable (default: false)
  - 503 status when critical dependencies unavailable and required

- **Graceful Shutdown Implementation**
  - SIGTERM and SIGINT signal handling
  - In-flight request tracking with configurable timeout
  - GRACEFUL_SHUTDOWN_TIMEOUT environment variable (default: 15000ms)
  - Redis connection cleanup on shutdown
  - Log flushing before process exit
  - Rejection of new requests during shutdown

- **Security Header Hardening**
  - Comprehensive Content Security Policy with report-only mode
  - CSP_REPORT_ONLY environment variable (default: true)
  - Cross-Origin-Embedder-Policy with ENABLE_COEP toggle (default: false)
  - Enhanced Permissions-Policy with restrictive baseline
  - Additional security headers: Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy
  - Configurable path skipping for security headers

- **OpenAPI Specification**
  - Complete OpenAPI 3.0.3 specification in backend/openapi/openapi.yaml
  - Documentation for all operational endpoints (/health, /readiness, /version, /metrics)
  - Error response schemas and rate limiting response patterns
  - OpenAPI validation script using @redocly/cli
  - npm run openapi:validate command for spec validation

- Version endpoint (GET /version) with commit, build time, version, and environment info
- Auto-detection of git commit and build time at startup
- Redis-backed global rate limiting middleware with configurable limits
- Support for rate limit exempt paths (startsWith matching)
- Rate limiting headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
- Graceful fallback when Redis unavailable (X-RateLimit-Disabled header)
- HTTP 429 responses with Retry-After header when rate limits exceeded
- Environment variable validation for rate limiting configuration
- Version information caching for performance
- Print version script (npm run print:version)
- Comprehensive documentation updates (README.md, SITE_MANUAL.md)
- Version verification and rate limit tuning runbooks

### Environment Variables Added
- **ENABLE_METRICS** (default: true in non-production, false in production) - Enable/disable metrics collection
- **RATE_LIMIT_ALGORITHM** (default: "fixed") - Rate limiting algorithm: fixed|sliding|token_bucket
- **RATE_LIMIT_OVERRIDES** (optional) - Per-route rate limit overrides: "pathPrefix:max[:algo];..."
- **RATE_LIMIT_ROLE_OVERRIDES** (optional) - Per-role rate limit overrides: "role|pathPrefix:max[:algo];..."
- **REQUEST_ID_HEADER** (default: "X-Request-Id") - Custom request ID header name
- **GRACEFUL_SHUTDOWN_TIMEOUT** (default: 15000) - Graceful shutdown timeout in milliseconds
- **REDIS_REQUIRED_FOR_READINESS** (default: false) - Require Redis for readiness checks
- **CSP_REPORT_ONLY** (default: true) - Use Content-Security-Policy-Report-Only header
- **ENABLE_COEP** (default: false) - Enable Cross-Origin-Embedder-Policy header
- RATE_LIMIT_MAX (default: 120) - Maximum requests per window
- RATE_LIMIT_EXEMPT_PATHS (default: "/health,/readiness") - Comma-separated exempt paths
- RATE_LIMIT_REDIS_PREFIX (default: "rl:") - Redis key prefix for rate limiting
- GIT_COMMIT (optional) - Git commit hash, auto-detected if not provided
- BUILD_TIME (optional) - Build timestamp, auto-detected if not provided

### Technical Implementation
- **Metrics Collection**: Prometheus-compatible metrics with request counters, latency histograms
- **Advanced Rate Limiting**: Multiple algorithms with Redis-based storage and fallback mechanisms
- **Graceful Shutdown**: Comprehensive shutdown handling with in-flight request tracking
- **Security Hardening**: Multi-layered security headers with configurable policies
- **Enhanced Observability**: Detailed health checks and operational endpoints
- Fixed-window rate limiting using Redis INCR with expiry
- User-based rate limiting (by user ID if authenticated, otherwise by IP)
- Fail-safe rate limiting that disables on Redis errors
- Cached version information to prevent repeated git command execution

---

## Previous Changes (Historical)

8/13 - Worked on formatting the ProductStudio
8/14 - Updated AI generator to high quality images. 1024 -> 2048, made a big difference.
8/15 - Removed all mockups and starting from scratch, building products to carry.
  Updated the image generator look and feel - added image to image processing
8/16 - Continued designing the image generator
  Started a new conversation
  Overhaul on adminpage, cleared products.
  Need to setup products to add product cards to shop page.
  Designs tab returned too much data, need to extend
  Updated MyDesigns to limit per page.
  Generator looks like TV with VCR now.
  Image to Imagea works.
  Need to fine tune images, added custom buttons.
8/17 - Adjusted authentciation tokens so they dont log the user out after 30 minutes
  This took all day and moved on to a second day - implementing CSRF and CORS
8/18 - Still working on getting auth to work again, locked out of site. :-/
8/19 - Finally got logged back, not sure if we accomplished anything.
  Purging the conversation and starting a new one. 
8/20 - Worked on the Admin console - added Devices and Audit Logs, not compleley working but added.

8/23 - Fixed up a way to run a script to try and backup current site status for new convesrations.
  Added revoke button and refresh buttons to the devices page. limited audit logs page to 25, still needs additional formatting but dont know what. 
  Free trial for sendgrid expired - its 20 a month, switching to 'Resend', its free for ~1000 emails a month
8/24 - Got 'Resend' deployed and working on the contact us page. Working on making the user creation flow and email verifcation proper. Updated Admin console to have verified badges for users who verified emails. Added better view info for customer and limited designs to 8 then provided expand buttons.
Setting up hCAPTCHA on Contact, Login, Register and Password change. 










