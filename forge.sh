#!/usr/bin/env bash
# sf-claude-context-forge — universal entry point
# Usage: ./forge.sh [--dry-run] [--demo] [--runtime node|python]

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     sf-claude-context-forge  v1.0.0     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Parse args
RUNTIME=""
EXTRA_ARGS=""
for arg in "$@"; do
  case $arg in
    --runtime=node) RUNTIME="node" ;;
    --runtime=python) RUNTIME="python" ;;
    --dry-run) EXTRA_ARGS="$EXTRA_ARGS --dry-run" ;;
    --demo) EXTRA_ARGS="$EXTRA_ARGS --demo" ;;
  esac
done

# Auto-detect runtime if not specified
if [ -z "$RUNTIME" ]; then
  if command -v node &>/dev/null; then
    RUNTIME="node"
    echo -e "${GREEN}✓ Detected Node.js $(node --version)${NC}"
  elif command -v python3 &>/dev/null; then
    RUNTIME="python"
    echo -e "${GREEN}✓ Detected Python $(python3 --version)${NC}"
  else
    echo -e "${RED}✗ No runtime found. Install Node.js 18+ or Python 3.10+${NC}"
    exit 1
  fi
fi

# Run with selected runtime
if [ "$RUNTIME" = "node" ]; then
  echo -e "${CYAN}▶ Running forge with Node.js...${NC}"
  node forge.js $EXTRA_ARGS
elif [ "$RUNTIME" = "python" ]; then
  echo -e "${CYAN}▶ Running forge with Python...${NC}"
  python3 forge.py $EXTRA_ARGS
fi

echo ""
echo -e "${GREEN}✓ Forge complete. Skills written to .claude/skills/, reference docs to generated/reference/${NC}"
