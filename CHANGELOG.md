# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Wave 2 Implementation

### Added
- **Version endpoint** (`GET /version`) exposing build and runtime metadata
  - Returns commit SHA, build time, package version, and environment info
  - Obtains commit via `GIT_COMMIT` env var or `git rev-parse --short HEAD`
  - Build time from `BUILD_TIME` env var or current timestamp
  - Graceful fallback to 'unknown' values on failures

- **Baseline Redis-backed rate limiting middleware**
  - Fixed window algorithm using Redis INCR with atomic expiration
  - Configurable via new environment variables:
    - `RATE_LIMIT_MAX` (default: 120 requests per window)
    - `RATE_LIMIT_EXEMPT_PATHS` (default: "/health,/readiness")
    - `RATE_LIMIT_REDIS_PREFIX` (default: "rl:")
  - Key resolution: authenticated user ID or client IP address
  - Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
  - Rate limit exceeded responses include `Retry-After` header
  - **Fail-open design**: When Redis unavailable, sets `X-RateLimit-Disabled: true` and skips enforcement
  - Path exemption for operational endpoints

- **Enhanced operational endpoints**
  - Improved `/health` endpoint with JSON response format
  - New `/readiness` endpoint for deployment health checks
  - Consistent response format across operational endpoints

### Changed
- Rate limiting now uses layered approach: baseline global + existing adaptive per-route
- Health endpoint response format changed from plain text "OK" to JSON structure
- Updated environment variable documentation in `.env.example`

### Technical Details
- Preserves existing `RATE_LIMIT_WINDOW` variable for consistency
- Redis connection with retry logic and error handling
- Graceful degradation when Redis is unavailable
- Version info cached after first retrieval for performance

### Out of Scope (Documented)
- Sliding window or token bucket algorithms
- Per-route rate limits beyond existing adaptive system  
- Distributed synchronization beyond single Redis instance
- Advanced abuse analytics integration
- Dynamic configuration reload
- Comprehensive automated test suite expansion

## [Previous] - v0.2.0 (Proposed)

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