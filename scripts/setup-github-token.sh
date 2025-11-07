#!/usr/bin/env bash
# Setup GitHub token in AWS SSM Parameter Store

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   GitHub Token Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check AWS credentials
if ! aws sts get-caller-identity &>/dev/null; then
    echo -e "${RED}Error: AWS credentials not configured${NC}"
    echo -e "${YELLOW}Please run: awsume <profile-name>${NC}"
    exit 1
fi

echo -e "${GREEN}✓ AWS credentials valid${NC}\n"

# Prompt for values
read -p "$(echo -e ${YELLOW}AWS Region${NC} [eu-north-1]: )" AWS_REGION
AWS_REGION=${AWS_REGION:-eu-north-1}

read -p "$(echo -e ${YELLOW}SSM Parameter name${NC} [/comparison_tool/github_token]: )" PARAM_NAME
PARAM_NAME=${PARAM_NAME:-/comparison_tool/github_token}

echo -e "\n${BLUE}To create a GitHub Personal Access Token:${NC}"
echo -e "  1. Go to: ${GREEN}https://github.com/settings/tokens${NC}"
echo -e "  2. Click 'Generate new token (Fine-grained tokens)'"
echo -e "  3. Select Only selected repositories: ${GREEN}<Org>/Comparison-Tool${NC}"
echo -e "  4. Add permissions : ${GREEN}Metadata/Read-Only${NC} and ${GREEN}Contents,Deployments,Webhooks/Read-Write${NC}"
echo -e "  5. Generate and copy the token\n"

read -sp "$(echo -e ${YELLOW}GitHub Personal Access Token${NC}: )" GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    echo -e "${RED}Error: Token cannot be empty${NC}"
    exit 1
fi

# Store in SSM
echo -e "\n${BLUE}Storing token in SSM Parameter Store...${NC}"

if aws ssm put-parameter \
    --name "$PARAM_NAME" \
    --value "$GITHUB_TOKEN" \
    --type SecureString \
    --description "GitHub token for Amplify deployment" \
    --region "$AWS_REGION" \
    --overwrite 2>/dev/null; then
    
    echo -e "${GREEN}✓ Token stored successfully${NC}"
    echo -e "\n${BLUE}Parameter details:${NC}"
    echo -e "  Name: ${GREEN}$PARAM_NAME${NC}"
    echo -e "  Region: ${GREEN}$AWS_REGION${NC}"
    echo -e "  Type: ${GREEN}SecureString${NC}"
    
else
    echo -e "${RED}Failed to store token${NC}"
    echo -e "${YELLOW}Check your AWS permissions${NC}"
    exit 1
fi

# Verify
echo -e "\n${BLUE}Verifying parameter...${NC}"
if aws ssm describe-parameters \
    --parameter-filters "Key=Name,Values=$PARAM_NAME" \
    --region "$AWS_REGION" \
    --query 'Parameters[0].Name' \
    --output text | grep -q "$PARAM_NAME"; then
    
    echo -e "${GREEN}✓ Parameter verified${NC}"
else
    echo -e "${RED}Warning: Could not verify parameter${NC}"
fi

echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Security note:${NC}"
echo -e "  • Token is encrypted at rest in AWS SSM"
echo -e "  • Token is never stored in git"
echo -e "  • Token can be rotated anytime using this script with --overwrite"
echo ""
