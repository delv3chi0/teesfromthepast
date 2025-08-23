#!/usr/bin/env bash
set -euo pipefail

# ===== Config =====
BACKEND_BASE_URL="${BACKEND_BASE_URL:-http://localhost:5001}"
API_PREFIX="${API_PREFIX:-/api}"
RG_BIN="${RG_BIN:-rg}"   # use ripgrep if available, else grep -R
if command -v rg >/dev/null 2>&1; then RG="rg -n --hidden --glob '!node_modules'"; else RG="grep -RIn --exclude-dir=node_modules"; fi

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

ok()   { printf "\033[32m✔\033[0m %s\n" "$*"; }
warn() { printf "\033[33m!\033[0m %s\n" "$*"; }
err()  { printf "\033[31m✘\033[0m %s\n" "$*"; }
sec()  { printf "\n\033[36m=== %s ===\033[0m\n" "$*"; }

# ===== 1) Auth / Security =====
sec "Auth / Security"
if $RG 'cookie-parser|cookieParser' backend/app.js >/dev/null 2>&1; then
  warn "cookieParser still present in backend/app.js (JWT-only setups usually remove it)."
else
  ok "cookieParser not found in backend/app.js."
fi

if $RG 'req\.cookies|cookies\[' backend/middleware >/dev/null 2>&1; then
  warn "Found cookie access in middleware (protect?) — JWT-only flow shouldn’t read cookies."
  $RG 'req\.cookies|cookies\[' backend/middleware || true
else
  ok "No cookie reads in middleware."
fi

# Per-route rate limits on /auth/login and /auth/register
if $RG 'rateLimit' backend/routes/auth.js >/dev/null 2>&1; then
  if $RG 'router\.post\(["'\'']/login["'\''],.*rateLimit' backend/routes/auth.js >/dev/null 2>&1; then
    ok "Login route appears to have a per-route rate limit."
  else
    warn "No explicit per-route rate limit detected on /auth/login."
  fi
  if $RG 'router\.post\(["'\'']/register["'\''],.*rateLimit' backend/routes/auth.js >/dev/null 2>&1; then
    ok "Register route appears to have a per-route rate limit."
  else
    warn "No explicit per-route rate limit detected on /auth/register."
  fi
else
  warn "No rateLimit usage detected in backend/routes/auth.js."
fi

# ===== 2) CORS =====
sec "CORS allowlist"
if $RG 'cors\(|new\s+Cors\(|allowedOrigins|origin:\s*\[' backend/app.js >/dev/null 2>&1; then
  ok "CORS config found in backend/app.js:"
  $RG -n 'cors\(|allowedOrigins|origin:\s*\[|credentials' backend/app.js || true
else
  warn "Couldn’t find obvious CORS allowlist in backend/app.js."
fi

# ===== 3) Stripe / Orders =====
sec "Stripe webhook idempotency & order fields"
# Idempotency: look for storing Stripe event.id
if $RG 'event\.id' backend/routes/stripeWebhook.js >/dev/null 2>&1; then
  if $RG 'findById\(|findOne\(|updateOne\(|create\(' backend/routes/stripeWebhook.js | $RG 'event\.id' >/dev/null 2>&1; then
    ok "Webhook references event.id with DB ops (likely idempotent)."
  else
    warn "event.id referenced but no clear DB persistence; idempotency uncertain."
  fi
else
  warn "No event.id usage spotted in stripeWebhook.js (idempotency likely missing)."
fi

# Order fields check
if [ -f backend/models/Order.js ]; then
  $RG -n 'billing(Address)?|shipping(Address)?|phone|paymentIntent(Id)?' backend/models/Order.js || true
  for field in billingAddress shippingAddress phone paymentIntentId stripePaymentIntentId; do
    if $RG -q "$field" backend/models/Order.js; then ok "Order schema includes $field."; else warn "Order schema missing $field."; fi
  done
else
  err "backend/models/Order.js not found."
fi

# ===== 4) Printful / Cloudinary =====
sec "Printful payload & Cloudinary usage"
if $RG -q 'preview_url' backend; then
  ok "Found preview_url in backend (good for Printful)."
else
  warn "preview_url not found in backend — Printful previews may be missing."
fi
if $RG -q 'file_url' backend; then
  ok "Found file_url in backend (Printful line-item files)."
else
  warn "file_url not found in backend — verify Printful payload."
fi

# Frontend Cloudinary optimizations: f_auto,q_auto usage
if $RG -q 'f_auto|q_auto' frontend; then
  ok "Frontend references Cloudinary f_auto/q_auto transforms."
else
  warn "No f_auto/q_auto found in frontend — consider adding for image optimization."
fi

# ===== 5) Frontend legacy usages =====
sec "Frontend legacy references"
if $RG -q 'ProductStudioCanvas\.jsx' frontend; then
  warn "Legacy ProductStudioCanvas.jsx referenced in frontend (verify if still used)."
  $RG -n 'ProductStudioCanvas\.jsx' frontend || true
else
  ok "No references to ProductStudioCanvas.jsx."
fi

if $RG -q 'imageDataUrl' frontend; then
  warn "Found legacy imageDataUrl references in frontend (prefer publicUrl/thumbUrl)."
  $RG -n 'imageDataUrl' frontend || true
else
  ok "No imageDataUrl references found in frontend."
fi

# ===== 6) Environment / Stripe mode =====
sec "Environment / Stripe mode"
# Try to infer from local .env files
if $RG -q 'STRIPE_SECRET_KEY' backend/.env* 2>/dev/null; then
  ok "Found STRIPE_SECRET_KEY entry in backend/.env* (inspect prefix sk_test_ vs sk_live_)."
  $RG -n 'STRIPE_SECRET_KEY' backend/.env* 2>/dev/null || true
else
  warn "No STRIPE_SECRET_KEY found in backend/.env* files (may be set in Render env)."
fi
echo "Tip: run on the server:  echo \$STRIPE_SECRET_KEY | sed -E 's/(sk_[a-z]+)_.*/\\1/.../'"

# ===== 7) Cleanups (legacy/backup) =====
sec "Cleanups"
legacy_hits=0
if $RG -q '\.bak($|\.|/)' .; then
  warn "Found *.bak files:"
  $RG -n '\.bak($|\.|/)' . || true
  legacy_hits=1
fi
if $RG -q '/api/csrf|csrf\(' backend 2>/dev/null; then
  warn "Found CSRF references/routes:"
  $RG -n '/api/csrf|csrf\(' backend || true
  legacy_hits=1
fi
if [ "$legacy_hits" -eq 0 ]; then
  ok "No obvious legacy *.bak or CSRF leftovers."
fi

# ===== 8) Optional live checks (if backend is running) =====
sec "Live HTTP checks (optional)"
set +e
curl -fsS "$BACKEND_BASE_URL/" >/dev/null && ok "Backend root reachable: $BACKEND_BASE_URL/" || warn "Backend root not reachable at $BACKEND_BASE_URL/"
curl -fsS "$BACKEND_BASE_URL/health" >/dev/null && ok "/health reachable" || warn "/health not reachable"
curl -fsS -X OPTIONS "$BACKEND_BASE_URL$API_PREFIX/auth/login" -H 'Origin: http://localhost:5173' >/dev/null && ok "Preflight to /auth/login ok (Origin localhost:5173)" || warn "Preflight failed for /auth/login (localhost origin)"
set -e

sec "Done"
