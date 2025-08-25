# CHANGELOG

## [v0.2.1] - 2025-08-25 (Wave 2: Platform Safety & Visibility)

### Added
- **Version Endpoint**: `GET /version` returns operational metadata (commit SHA, build time, version, environment info)
- **Rate Limiting**: Redis-backed sliding window rate limiting with configurable thresholds
  - Default: 120 requests per 60-second window  
  - Configurable via `RATE_LIMIT_WINDOW_SEC`, `RATE_LIMIT_MAX`, `RATE_LIMIT_EXEMPT_PATHS`, `RATE_LIMIT_REDIS_PREFIX`
  - In-memory fallback when Redis unavailable
  - Proper 429 responses with retry headers
  - Abuse tracking and logging for security monitoring
- **Version Script**: `npm run print:version` for local version checking
- **Documentation**: Comprehensive README.md with quick start and environment variables
- **Runbooks**: Version verification and rate limit tuning procedures

### Technical Details
- Lean implementation philosophy: minimal yet high-impact features only
- /version endpoint uses git metadata with fallbacks for operational visibility  
- Rate limiting supports both authenticated users (by user ID) and anonymous (by IP)
- Exempt paths bypass rate limiting entirely for health checks
- TODO markers for future enhancements: token bucket algorithm, per-endpoint policies, dynamic reconfiguration

### Documentation Updates
- SITE_MANUAL.md: Updated endpoint inventory, environment variables, runbooks, and checklist
- README.md: Created with architecture overview and configuration reference
- Moved rate limiting and /version from "Next" to "Completed" in roadmap

---

## Previous Informal Log:

CHANGE LOG:

8/13 - Worked on formatting the ProductStuiod
8/14 - Updated AI generator to high quality images. 1024 -> 2048, made a big differece.
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










