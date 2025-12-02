#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=== MD-Edit Build Verification ==="
echo ""

cd "$(dirname "$0")/.."

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - Directory not found: $1"
        return 1
    fi
}

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 - File not found: $1"
        return 1
    fi
}

# 1. Clean
echo -e "${YELLOW}[1/8] Cleaning previous builds...${NC}"
npm run clean:dist 2>/dev/null || true
echo ""

# 2. Install dependencies
echo -e "${YELLOW}[2/8] Checking dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi
echo ""

# 3. Build shared package
echo -e "${YELLOW}[3/8] Building shared package...${NC}"
npm run build:shared
check_dir "packages/shared/dist" "Shared package built"
echo ""

# 4. Build server package
echo -e "${YELLOW}[4/8] Building server package...${NC}"
npm run build:server
check_dir "packages/server/dist" "Server package built"
echo ""

# 5. Build web package
echo -e "${YELLOW}[5/8] Building web package...${NC}"
npm run build:web
check_dir "packages/web/dist" "Web package built"
check_file "packages/web/dist/index.html" "Web index.html exists"
echo ""

# 6. Build desktop package (if electron is available)
echo -e "${YELLOW}[6/8] Building desktop package...${NC}"
if command -v npx &> /dev/null; then
    cd packages/desktop
    npm run build
    cd ../..
    check_dir "packages/desktop/dist/main" "Desktop main built"
    check_dir "packages/desktop/dist/preload" "Desktop preload built"
    check_dir "packages/desktop/dist/renderer" "Desktop renderer built"
else
    echo -e "${YELLOW}⚠${NC} Skipping desktop build (npx not available)"
fi
echo ""

# 7. Docker build test (if docker is available)
echo -e "${YELLOW}[7/8] Testing Docker builds...${NC}"
if command -v docker &> /dev/null; then
    echo "Building standalone Docker image..."
    if docker build -t md-edit:test . -q; then
        echo -e "${GREEN}✓${NC} Standalone Docker image built"
    else
        echo -e "${RED}✗${NC} Standalone Docker image failed"
    fi
    
    echo "Building production Docker image..."
    if docker build -f Dockerfile.prod -t md-edit:prod-test . -q; then
        echo -e "${GREEN}✓${NC} Production Docker image built"
    else
        echo -e "${RED}✗${NC} Production Docker image failed"
    fi
else
    echo -e "${YELLOW}⚠${NC} Skipping Docker builds (docker not available)"
fi
echo ""

# 8. Summary
echo -e "${YELLOW}[8/8] Verification Summary${NC}"
echo "=========================="
FAILED=0

check_dir "packages/shared/dist" "Shared package" || FAILED=1
check_dir "packages/server/dist" "Server package" || FAILED=1
check_dir "packages/web/dist" "Web package" || FAILED=1

if [ -d "packages/desktop/dist" ]; then
    check_dir "packages/desktop/dist/main" "Desktop main" || FAILED=1
    check_dir "packages/desktop/dist/preload" "Desktop preload" || FAILED=1
    check_dir "packages/desktop/dist/renderer" "Desktop renderer" || FAILED=1
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}=== All builds successful ===${NC}"
    exit 0
else
    echo -e "${RED}=== Some builds failed ===${NC}"
    exit 1
fi

