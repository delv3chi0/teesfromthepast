
### `chatpack/docs/CHANGELOG.md`
```md
# CHANGELOG

Format:
- `YYYY-MM-DD HH:MM TZ` — short summary
  - detail lines…

---

## 2025-08-23 18:59 PT — Admin polish & docs bootstrap
- Devices: added **bulk checkboxes** with black checked state; full readable Session ID; “Auto-refresh” control shows **black label** and **white menu items**.
- Orders/Designs/Users: column widths relaxed, readability improved, refresh buttons switched to black outline for contrast.
- Added `checkpoint` script to always build `FILEMAP.md`, `diff.patch`, and **compose `context.md`**.
- Added starter docs: **ARCHITECTURE, DECISIONS, CHAT-CONTRACT, HANDOFF**.

## 2025-08-23 15:30 PT — CORS fix
- Backend: ensured CORS includes Vercel origin and custom headers (`Authorization`, `x-session-id`).

## 2025-08-15 — Product Studio export
- Offscreen Fabric canvas export sized to placement; upload to `/upload/printfile`; cart line item persists preview + print file.
