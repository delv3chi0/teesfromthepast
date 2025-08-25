
### `chatpack/docs/CHANGELOG.md`
```md
# CHANGELOG

Format:
- `YYYY-MM-DD HH:MM TZ` — short summary
  - detail lines…

---

## 2025-01-28 — Checkout & upload improvements
- Backend: Added POST /api/checkout root alias that maps to /create-payment-intent to fix "Cannot POST /api/checkout" errors
- Backend: Increased JSON body limit from 10MB to 25MB to reduce 413 errors on large print file uploads
- Backend: Enhanced upload controller to accept both `imageData` (preferred) and legacy `dataUrl` fields for backward compatibility
- Backend: Added 413 response with size guidance when decoded image exceeds 22MB limit
- Frontend: Updated ProductStudio to send `imageData` instead of `dataUrl` for new uploads
- Frontend: Added specific 413 error handling with user-friendly toast messages showing size limits
- Frontend: Added missing black tee right view mockup placeholder to prevent 404 loops
- Backend: Improved error logging with [Upload] prefix for better debugging

## 2025-08-23 18:59 PT — Admin polish & docs bootstrap
- Devices: added **bulk checkboxes** with black checked state; full readable Session ID; “Auto-refresh” control shows **black label** and **white menu items**.
- Orders/Designs/Users: column widths relaxed, readability improved, refresh buttons switched to black outline for contrast.
- Added `checkpoint` script to always build `FILEMAP.md`, `diff.patch`, and **compose `context.md`**.
- Added starter docs: **ARCHITECTURE, DECISIONS, CHAT-CONTRACT, HANDOFF**.

## 2025-08-23 15:30 PT — CORS fix
- Backend: ensured CORS includes Vercel origin and custom headers (`Authorization`, `x-session-id`).

## 2025-08-15 — Product Studio export
- Offscreen Fabric canvas export sized to placement; upload to `/upload/printfile`; cart line item persists preview + print file.
