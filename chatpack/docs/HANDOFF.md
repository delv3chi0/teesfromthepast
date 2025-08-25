# HANDOFF (Paste this at the TOP of a new chat)

**Project:** TeesFromThePast — React + Chakra, Fabric.js Product Studio, Admin Console, small Express API.

**What the next assistant MUST know:**
- Admin tabs exist and must remain readable; Devices tab has bulk checkboxes and auto-refresh; show full session IDs (wrapping is OK).
- Product Studio exports a transparent PNG sized to the placement and uploads to `/upload/printfile` with size validation.
- **Constants**: Use `backend/config/constants.js` for JSON_BODY_LIMIT_MB, MAX_PRINTFILE_DECODED_MB, and REQUEST_ID_HEADER.
- **Request tracking**: All requests include `X-Req-Id` header; logs show method, path, status, duration, request ID.
- **Upload limits**: 22MB decoded size limit with client-side warnings at 80% threshold and structured 413 error responses.
- **Checkout**: Both `/checkout/create-payment-intent` and `/checkout` endpoints work identically.

**How to get context fast:**
- I have a folder `chatpack/` in the repo. The file `chatpack/context.md` is the one-file snapshot of the codebase & docs. Ask me for it if I haven’t pasted it yet.

**Rules for changes:**
- Provide *drop-in* files. Don’t give line-patch instructions.
- Do not “pretty refactor” working pages unless asked.
