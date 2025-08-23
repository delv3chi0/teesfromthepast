#!/usr/bin/env bash
set -euo pipefail
rg -n --hidden --iglob '!node_modules' \
  -e 'AKIA[0-9A-Z]{16}' \
  -e '(api|secret|token|key)[^a-zA-Z0-9]?[=:][^[:space:]]{12,}' \
  -e '-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----' \
  || true
