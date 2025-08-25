# CHAT-CONTRACT (How future assistants should help)

**Ground rules**
- Provide **drop-in files**, not “edit lines 12–19” instructions.
- **Do not** degrade readability. Admin tables must remain clear on the current theme.
- Prefer **small, focused changes** over sweeping refactors unless asked.

**When updating Admin UI**
- Preserve tab structure and theme tokens.
- Tables: headers should be readable; don’t compress columns so much that values are clipped.
- Devices tab: keep bulk actions, readable Session IDs (wrap long values), and the black-checked checkbox style.

**When updating Product Studio**
- Do not remove the print-area dashed box or placement math.
- Keep export logic: offscreen Fabric canvas → transparent PNG → `/upload/printfile`.
- Respect `getPlacement` fractions and `getExportPixelSize`.

**When adding backend endpoints**
- Reflect them in ARCHITECTURE and CHANGELOG.
- Ensure CORS supports the deployed frontends.
- Follow config init & logging rules: avoid top-level `getConfig()`; rely on lazy logger; use request correlation.

**Config & Logging Guidelines**
- Never call `getConfig()` at module top-level (will crash if imported before `validateConfig()`)
- Use `isConfigReady()` for conditional config access in early-imported modules
- Logger is safe for early import and provides request correlation
- Reflect new endpoints and configuration changes in ARCHITECTURE & CHANGELOG

**Handoff etiquette**
- Before leaving a conversation, run `./scripts/checkpoint.sh` (or ask for it) so the next chat can start by pasting `chatpack/context.md`.
