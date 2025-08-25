
### `chatpack/docs/CHANGELOG.md`
```md
# CHANGELOG

Format:
- `YYYY-MM-DD HH:MM TZ` — short summary
  - detail lines…

---

## 2025-01-27 — Enhancement Bundle: Upload Limits, Checkout Alias, Request Tracking
- **Backend Infrastructure**: Added centralized constants (`backend/config/constants.js`) with configurable JSON (25MB) and printfile (22MB) limits via environment variables.
- **Request Tracking**: Added nanoid-based request ID generation (`X-Req-Id` header) and lightweight request logging with method, path, status, duration, and request ID.
- **Upload Enhancements**: Upload controller now accepts both `imageData` (base64) and `dataUrl` formats with preflight size estimation; returns structured 413 errors with recommendations when file exceeds limit.
- **Checkout Alias**: Added `POST /api/checkout` route that reuses existing payment intent logic for simplified API access.
- **Security**: Enhanced login rate limiting (10 req/min per IP) with `Retry-After` header when exceeded.
- **Frontend**: ProductStudio now performs client-side size estimation with 80% threshold warnings, shows progress spinner overlay during uploads, and handles structured 413 errors gracefully.
- **Testing**: Added comprehensive tests for checkout alias validation and upload size limits with mocked Cloudinary.
- **Utilities**: Created mockup URL generator with Cloudinary optimizations and placeholder black mockup comments.

## 2025-08-23 18:59 PT — Admin polish & docs bootstrap
- Devices: added **bulk checkboxes** with black checked state; full readable Session ID; “Auto-refresh” control shows **black label** and **white menu items**.
- Orders/Designs/Users: column widths relaxed, readability improved, refresh buttons switched to black outline for contrast.
- Added `checkpoint` script to always build `FILEMAP.md`, `diff.patch`, and **compose `context.md`**.
- Added starter docs: **ARCHITECTURE, DECISIONS, CHAT-CONTRACT, HANDOFF**.

## 2025-08-23 15:30 PT — CORS fix
- Backend: ensured CORS includes Vercel origin and custom headers (`Authorization`, `x-session-id`).

## 2025-08-15 — Product Studio export
- Offscreen Fabric canvas export sized to placement; upload to `/upload/printfile`; cart line item persists preview + print file.
