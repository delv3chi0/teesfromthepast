# DECISIONS (Lightweight ADRs)

## ADR-001 — Use Fabric.js for canvas editing
- We need free-form transforms, clipping to a print rectangle, and export to high-res PNG.
- Fabric.js is widely used and works without a server-side headless step.

## ADR-002 — Placement math via fractions
- Placements are stored as `{x,y,w,h}` **fractions** of the mockup image bounds.
- Keeps layout independent of screen or mockup pixel size.

## ADR-003 — Export sizes
- Defaults: 4200×4800 (front/back), 3600×3600 (sides).
- Chosen to meet common DTG vendor minimums while keeping file sizes reasonable.

## ADR-004 — Sessions list is the source of truth
- “Revoke all for user” and single revoke operate on `/admin/sessions`.
- If you revoke **your** current session, immediately clear storage and redirect to `/login?redirect=/admin`.

## ADR-005 — Docs handoff model
- Human-curated docs live in `chatpack/docs/…`.
- On each checkpoint we **compose** a single `chatpack/context.md` that includes a compact summary and pointers + an up-to-date FILEMAP and diff.
