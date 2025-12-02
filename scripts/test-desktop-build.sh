#!/bin/bash
set -e

echo "=== Testing Desktop Build ==="

# Verify dist structure
echo "Checking dist structure..."

if [ -f "packages/desktop/dist/main/index.js" ]; then
    echo "✓ Main process built"
else
    echo "✗ Main process missing"
    exit 1
fi

if [ -f "packages/desktop/dist/preload/index.js" ]; then
    echo "✓ Preload built"
else
    echo "✗ Preload missing"
    exit 1
fi

if [ -f "packages/desktop/dist/renderer/index.html" ]; then
    echo "✓ Renderer built"
else
    echo "✗ Renderer missing"
    exit 1
fi

if [ -d "packages/desktop/dist/renderer/assets" ]; then
    echo "✓ Assets directory exists"
else
    echo "✗ Assets directory missing"
    exit 1
fi

# Check for required files in assets
CSS_COUNT=$(ls packages/desktop/dist/renderer/assets/*.css 2>/dev/null | wc -l)
JS_COUNT=$(ls packages/desktop/dist/renderer/assets/*.js 2>/dev/null | wc -l)

if [ "$CSS_COUNT" -gt 0 ]; then
    echo "✓ CSS files present ($CSS_COUNT files)"
else
    echo "✗ CSS files missing"
    exit 1
fi

if [ "$JS_COUNT" -gt 0 ]; then
    echo "✓ JS files present ($JS_COUNT files)"
else
    echo "✗ JS files missing"
    exit 1
fi

echo ""
echo "=== Desktop Build Test Passed ==="

