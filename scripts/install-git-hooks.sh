#!/usr/bin/env bash
# Install git hooks for security

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Installing git hooks...${NC}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Make hook executable
chmod +x scripts/pre-commit-hook.sh

# Install pre-commit hook
if [ -f ".git/hooks/pre-commit" ]; then
    echo -e "${YELLOW}Pre-commit hook already exists. Backing up...${NC}"
    cp .git/hooks/pre-commit .git/hooks/pre-commit.backup
fi

ln -sf ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit

echo -e "${GREEN}✓ Pre-commit hook installed${NC}"
echo -e "${YELLOW}This hook will prevent committing sensitive files${NC}"
echo ""
echo "To bypass hook temporarily (not recommended):"
echo "  git commit --no-verify"
