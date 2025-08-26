# CHANGELOG

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
- RATE_LIMIT_MAX (default: 120) - Maximum requests per window
- RATE_LIMIT_EXEMPT_PATHS (default: "/health,/readiness") - Comma-separated exempt paths
- RATE_LIMIT_REDIS_PREFIX (default: "rl:") - Redis key prefix for rate limiting
- GIT_COMMIT (optional) - Git commit hash, auto-detected if not provided
- BUILD_TIME (optional) - Build timestamp, auto-detected if not provided

### Technical Implementation
- Fixed-window rate limiting using Redis INCR with expiry
- User-based rate limiting (by user ID if authenticated, otherwise by IP)
- Fail-safe rate limiting that disables on Redis errors
- Cached version information to prevent repeated git command execution
- TODO placeholders for future enhancements (sliding window, per-route limits, metrics)

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










