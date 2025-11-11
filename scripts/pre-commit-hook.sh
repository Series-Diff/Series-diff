#!/usr/bin/env bash
# Pre-commit hook to prevent committing sensitive files
# To install: ln -s ../../scripts/pre-commit-hook.sh .git/hooks/pre-commit

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Patterns to check for sensitive files
SENSITIVE_PATTERNS=(
    "Pulumi.dev.yaml"
    "Pulumi.prod.yaml"
    "Pulumi.staging.yaml"
    "*.pem"
    "*.key"
    ".env"
    "credentials"
)

# Patterns for sensitive content in files
SENSITIVE_CONTENT=(
    "aws_access_key_id"
    "aws_secret_access_key"
    "github_pat_"
    "AKIA[0-9A-Z]{16}"  # AWS Access Key pattern
)

echo "Running pre-commit security checks..."

# Check for sensitive files
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    if git diff --cached --name-only | grep -q "$pattern"; then
        echo -e "${RED}ERROR: Attempting to commit sensitive file matching: $pattern${NC}"
        echo -e "${YELLOW}This file should be in .gitignore${NC}"
        exit 1
    fi
done

# Check for sensitive content in staged files
for file in $(git diff --cached --name-only | grep -v pre-commit-hook.sh); do
    if [ -f "$file" ]; then
        for pattern in "${SENSITIVE_CONTENT[@]}"; do
            if grep -q "$pattern" "$file" 2>/dev/null; then
                echo -e "${RED}ERROR: Sensitive content found in: $file${NC}"
                echo -e "${YELLOW}Pattern: $pattern${NC}"
                echo -e "${YELLOW}Please remove sensitive data before committing${NC}"
                exit 1
            fi
        done
    fi
done

# Check for AWS Account IDs in certificate ARNs (in non-example files)
for file in $(git diff --cached --name-only | grep "\.yaml$" | grep -v "\.example$"); do
    if [ -f "$file" ]; then
        if grep -E "arn:aws:acm:[^:]+:[0-9]{12}:" "$file" 2>/dev/null | grep -v "ACCOUNT_ID" > /dev/null; then
            echo -e "${RED}ERROR: Real AWS Account ID found in: $file${NC}"
            echo -e "${YELLOW}Configuration files with real values should not be committed${NC}"
            echo -e "${YELLOW}Use template files (.example) instead${NC}"
            exit 1
        fi
    fi
done

echo "✓ Pre-commit security checks passed"
exit 0
