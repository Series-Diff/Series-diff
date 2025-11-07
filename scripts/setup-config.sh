#!/usr/bin/env bash
# Setup configuration from templates
# This script helps you create your local Pulumi configuration files

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Pulumi Configuration Setup${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Check if running from project root
if [ ! -f "Pulumi.yaml" ]; then
    echo -e "${RED}Error: Please run this script from the project root directory${NC}"
    exit 1
fi

# Function to prompt for input
prompt_input() {
    local var_name=$1
    local prompt_text=$2
    local default_value=$3
    local current_value=""
    
    if [ -n "$default_value" ]; then
        read -p "$(echo -e ${YELLOW}${prompt_text}${NC} [${default_value}]: )" current_value
        current_value=${current_value:-$default_value}
    else
        read -p "$(echo -e ${YELLOW}${prompt_text}${NC}: )" current_value
    fi
    
    eval "$var_name='$current_value'"
}

# Function to create config from template
create_config() {
    local stack=$1
    local template_file="Pulumi.${stack}.yaml.example"
    local output_file="Pulumi.${stack}.yaml"
    
    echo -e "\n${GREEN}Creating configuration for stack: ${stack}${NC}\n"
    
    if [ -f "$output_file" ]; then
        read -p "$(echo -e ${YELLOW}${output_file} already exists. Overwrite?${NC} [y/N]: )" overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Skipping ${stack} configuration${NC}"
            return
        fi
    fi
    
    # Prompt for values
    prompt_input AWS_REGION "AWS Region" "eu-north-1"
    prompt_input DOMAIN "Your domain name" "example.com"
    prompt_input BE_SUBDOMAIN "Backend subdomain" "api"
    prompt_input FE_SUBDOMAIN "Frontend subdomain" "www"
    
    echo -e "\n${BLUE}Certificate ARN format: arn:aws:acm:REGION:ACCOUNT_ID:certificate/CERT_ID${NC}"
    prompt_input CERT_ARN "ACM Certificate ARN"
    
    prompt_input GITHUB_REPO "GitHub repository URL" "https://github.com/YOUR_ORG/YOUR_REPO"
    
    # Copy template and replace values
    cp "$template_file" "$output_file"
    
    # Use sed to replace placeholders (macOS and Linux compatible)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|aws:region:.*|aws:region: $AWS_REGION|" "$output_file"
        sed -i '' "s|hostedZoneDomain:.*|hostedZoneDomain: $DOMAIN  # Your domain|" "$output_file"
        sed -i '' "s|beSubdomain:.*|beSubdomain: $BE_SUBDOMAIN|" "$output_file"
        sed -i '' "s|feSubdomain:.*|feSubdomain: $FE_SUBDOMAIN|" "$output_file"
        sed -i '' "s|certificateArn:.*|certificateArn: $CERT_ARN|" "$output_file"
        sed -i '' "s|githubRepoUrl:.*|githubRepoUrl: $GITHUB_REPO|" "$output_file"
    else
        # Linux
        sed -i "s|aws:region:.*|aws:region: $AWS_REGION|" "$output_file"
        sed -i "s|hostedZoneDomain:.*|hostedZoneDomain: $DOMAIN  # Your domain|" "$output_file"
        sed -i "s|beSubdomain:.*|beSubdomain: $BE_SUBDOMAIN|" "$output_file"
        sed -i "s|feSubdomain:.*|feSubdomain: $FE_SUBDOMAIN|" "$output_file"
        sed -i "s|certificateArn:.*|certificateArn: $CERT_ARN|" "$output_file"
        sed -i "s|githubRepoUrl:.*|githubRepoUrl: $GITHUB_REPO|" "$output_file"
    fi
    
    echo -e "${GREEN}✓ Created ${output_file}${NC}"
}

# Setup Pulumi.yaml backend
setup_backend() {
    echo -e "\n${GREEN}Setting up Pulumi backend${NC}\n"
    
    prompt_input S3_BUCKET "S3 bucket name for Pulumi state" "pulumi-state-bucket-$(whoami)"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|url: s3://.*|url: s3://$S3_BUCKET|" "Pulumi.yaml"
    else
        sed -i "s|url: s3://.*|url: s3://$S3_BUCKET|" "Pulumi.yaml"
    fi
    
    echo -e "${GREEN}✓ Updated Pulumi.yaml with backend: s3://$S3_BUCKET${NC}"
    
    # Offer to create bucket
    read -p "$(echo -e ${YELLOW}Create S3 bucket now?${NC} [y/N]: )" create_bucket
    if [[ $create_bucket =~ ^[Yy]$ ]]; then
        echo -e "\n${BLUE}Creating S3 bucket...${NC}"
        
        prompt_input AWS_REGION_BUCKET "AWS Region for bucket" "$AWS_REGION"
        
        if aws s3 mb "s3://$S3_BUCKET" --region "$AWS_REGION_BUCKET" 2>/dev/null; then
            echo -e "${GREEN}✓ Created S3 bucket: $S3_BUCKET${NC}"
            
            # Enable versioning
            aws s3api put-bucket-versioning \
                --bucket "$S3_BUCKET" \
                --versioning-configuration Status=Enabled
            echo -e "${GREEN}✓ Enabled versioning${NC}"
            
            # Enable encryption
            aws s3api put-bucket-encryption \
                --bucket "$S3_BUCKET" \
                --server-side-encryption-configuration '{
                    "Rules": [{
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }]
                }'
            echo -e "${GREEN}✓ Enabled encryption${NC}"
            
            # Block public access
            aws s3api put-public-access-block \
                --bucket "$S3_BUCKET" \
                --public-access-block-configuration \
                    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
            echo -e "${GREEN}✓ Enabled public access block${NC}"
        else
            echo -e "${RED}Failed to create bucket (may already exist)${NC}"
        fi
    fi
}

# Main menu
echo "Which stack would you like to configure?"
echo "  1) dev"
echo "  2) prod"
echo "  3) both"
echo "  4) backend only"
echo ""
read -p "Select option [1-4]: " choice

case $choice in
    1)
        create_config "dev"
        setup_backend
        ;;
    2)
        create_config "prod"
        setup_backend
        ;;
    3)
        create_config "dev"
        create_config "prod"
        setup_backend
        ;;
    4)
        setup_backend
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   Setup Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "\n${YELLOW}Important: Configuration files contain sensitive data!${NC}"
echo -e "${YELLOW}They are git-ignored by default. Never commit them to public repos.${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "  1. Review your configuration files: ${GREEN}Pulumi.*.yaml${NC}"
echo -e "  2. Setup GitHub token: ${GREEN}scripts/setup-github-token.sh${NC}"
echo -e "  3. Initialize Pulumi: ${GREEN}make dev-setup${NC}"
echo -e "  4. Deploy: ${GREEN}make deploy${NC}"
echo ""
