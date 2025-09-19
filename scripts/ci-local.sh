#!/usr/bin/env bash
set -euo pipefail

# Local CI runner to mirror .github/workflows/ci.yml
# - Uses npm ci for reproducible installs
# - Runs tests and lint

echo "[ci-local] Installing deps with npm ci..."
npm ci

echo "[ci-local] Running tests..."
npm test

echo "[ci-local] Type checking..."
npm run type-check

echo "[ci-local] Running lint (strict)..."
npm run lint:ci

echo "[ci-local] All checks passed."
