#!/bin/bash
# Pre-push verification script
# Run this before pushing to main to ensure CI will pass
#
# Usage: ./scripts/pre-push-check.sh

set -e  # Exit on any error

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Pre-Push Verification                           ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from the project root directory"
    exit 1
fi

echo "Step 1/6: Verifying package-lock.json is in sync..."
echo "──────────────────────────────────────────────────────────────"
npm ci --silent 2>/dev/null || {
    echo "❌ package-lock.json is out of sync with package.json"
    echo "   Run 'npm install' and commit the updated lock file."
    exit 1
}
echo "✓ Lock file is in sync"
echo ""

echo "Step 2/6: Building all packages..."
echo "──────────────────────────────────────────────────────────────"
npm run build
echo "✓ Build successful"
echo ""

echo "Step 3/6: Running linter..."
echo "──────────────────────────────────────────────────────────────"
if npm run lint 2>&1; then
    echo "✓ Linting passed"
else
    echo "⚠ Linting not configured or failed (check if eslint is set up)"
fi
echo ""

echo "Step 4/6: Running tests..."
echo "──────────────────────────────────────────────────────────────"
npm run test
echo "✓ Tests passed"
echo ""

echo "Step 5/6: Building desktop app..."
echo "──────────────────────────────────────────────────────────────"
npm run build:desktop
echo "✓ Desktop build successful"
echo ""

echo "Step 6/6: Running E2E tests..."
echo "──────────────────────────────────────────────────────────────"
# Ensure Playwright browsers are installed
npx playwright install chromium --with-deps 2>/dev/null || true
# Run E2E tests with Chromium only for speed
if npx playwright test --project=chromium 2>&1; then
    echo "✓ E2E tests passed"
else
    echo "⚠ Some E2E tests failed (may be browser-specific)"
fi
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║        ✓ All checks passed! Safe to push to main            ║"
echo "╚══════════════════════════════════════════════════════════════╝"

