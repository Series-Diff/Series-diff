# AWS Setup Guide for Beginners

This guide walks you through setting up an AWS account and all prerequisites needed to deploy this application infrastructure.

## Table of Contents

1. [AWS Account Setup](#1-aws-account-setup)
2. [IAM User and Permissions](#2-iam-user-and-permissions)
3. [AWS CLI Configuration](#3-aws-cli-configuration)
4. [Domain and Route53](#4-domain-and-route53)
5. [ACM Certificate](#5-acm-certificate)
6. [S3 Bucket for Pulumi State](#6-s3-bucket-for-pulumi-state)
7. [GitHub Personal Access Token](#7-github-personal-access-token)
8. [Verification](#8-verification)

---

## 1. AWS Account Setup

### Create AWS Account

1. Go to [AWS Sign Up](https://portal.aws.amazon.com/billing/signup)
2. Follow the registration process
3. Provide payment information (required, but you can use free tier)
4. Verify your email and phone number

### Enable MFA (Recommended)

1. Sign in to [AWS Console](https://console.aws.amazon.com/)
2. Click your name (top right) → Security credentials
3. Under "Multi-factor authentication (MFA)", click "Assign MFA device"
4. Follow the setup wizard (use authenticator app like Google Authenticator)

---

## 2. IAM User and Permissions

### Create IAM User

Instead of using root credentials, create an IAM user:

1. Open [IAM Console](https://console.aws.amazon.com/iam/)
2. Click "Users" → "Create user"
3. Username: `pulumi-deployer` (or your preference)
4. Check "Provide user access to AWS Management Console" (optional)
5. Click "Next"

### Attach Permissions

For this infrastructure, the user needs extensive permissions. Choose one:

**Option A: Administrator Access (Easiest)**
- Attach policy: `AdministratorAccess`
- ⚠️ Use only for development/testing environments

**Option B: Least Privilege (Recommended for Production)**
Create a custom policy with these services:
- EC2 (VPC, Security Groups)
- ECS (Cluster, Task Definition, Service)
- ECR (Repository)
- ELB/ALB (Load Balancer, Target Groups, Listeners)
- IAM (Roles, Policies)
- CloudWatch (Log Groups, Event Rules)
- Lambda (Functions)
- Route53 (DNS Records)
- Amplify (Apps, Branches, Domains)
- ACM (Certificate read access)
- SSM (Parameter Store)
- Cognito (User Pools, optional)

### Create Access Keys

1. Select your user → "Security credentials" tab
2. Scroll to "Access keys" → "Create access key"
3. Select "Command Line Interface (CLI)"
4. Check the confirmation box
5. Click "Create access key"
6. **Important**: Download and save these credentials securely:
   - Access Key ID: `AKIAIOSFODNN7EXAMPLE`
   - Secret Access Key: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
7. ⚠️ Never commit these to Git!

---

## 3. AWS CLI Configuration

### Install AWS CLI

**macOS**:
```bash
brew install awscli
```

**Linux**:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Windows**:
Download installer from [AWS CLI Installation](https://aws.amazon.com/cli/)

### Configure AWS CLI

Since you're using `aws-sso-login` and `awsume`, follow your organization's SSO setup. For basic setup:

```bash
aws configure --profile your-profile-name
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: eu-north-1 (or your preferred EU region)
# - Default output format: json
```

### Verify Configuration

```bash
# Activate your AWS profile
awsume your-profile-name

# Test access
aws sts get-caller-identity

# Should output:
# {
#     "UserId": "AIDAIOSFODNN7EXAMPLE",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/pulumi-deployer"
# }
```

---

## 4. Domain and Route53

### Option A: Register Domain with Route53

1. Open [Route53 Console](https://console.aws.amazon.com/route53/)
2. Click "Registered domains" → "Register domain"
3. Search for available domain
4. Follow registration process (costs ~$12-15/year for .com)
5. Route53 automatically creates a hosted zone

### Option B: Use Existing Domain

If you already own a domain with another registrar (GoDaddy, Namecheap, etc.):

1. Open [Route53 Console](https://console.aws.amazon.com/route53/)
2. Click "Hosted zones" → "Create hosted zone"
3. Enter your domain name (e.g., `example.com`)
4. Type: Public hosted zone
5. Click "Create hosted zone"
6. **Important**: Note the 4 name servers (NS records)

#### Update Name Servers at Your Registrar

1. Log in to your domain registrar
2. Find DNS/Name Server settings
3. Replace existing name servers with AWS Route53 NS records
4. Example NS records from Route53:
   ```
   ns-1234.awsdns-12.org
   ns-567.awsdns-34.com
   ns-890.awsdns-56.co.uk
   ns-123.awsdns-78.net
   ```
5. Save changes (propagation takes 24-48 hours, usually faster)

### Verify DNS Propagation

```bash
# Check name servers
dig NS example.com +short

# Should show Route53 name servers
```

---

## 5. ACM Certificate

AWS Certificate Manager (ACM) provides free SSL/TLS certificates.

### Request Certificate

1. Open [ACM Console](https://console.aws.amazon.com/acm/) in **eu-north-1** (or your deployment region)
2. Click "Request certificate"
3. Choose "Request a public certificate" → "Next"

### Configure Certificate

**Domain names**:
```
example.com
*.example.com
```
(Use wildcard to cover all subdomains)

**Validation method**: DNS validation (recommended)

**Key algorithm**: RSA 2048

Click "Request"

### Validate Certificate

1. Click on your certificate
2. Under "Domains", click "Create records in Route53"
3. Click "Create records" (this adds CNAME records to Route53)
4. Wait 5-30 minutes for validation
5. Status will change to "Issued"

### Copy Certificate ARN

Once issued:
```
arn:aws:acm:eu-north-1:123456789012:certificate/12345678-1234-1234-1234-123456789012
```

Save this ARN for `Pulumi.*.yaml` configuration.

---

## 6. S3 Bucket for Pulumi State

Pulumi needs an S3 bucket to store infrastructure state.

### Create S3 Bucket

```bash
# Set your region
export AWS_REGION=eu-north-1

# Create bucket (name must be globally unique)
aws s3 mb s3://pulumi-state-bucket-your-org --region $AWS_REGION

# Enable versioning (recommended)
aws s3api put-bucket-versioning \
  --bucket pulumi-state-bucket-your-org \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket pulumi-state-bucket-your-org \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access (security best practice)
aws s3api put-public-access-block \
  --bucket pulumi-state-bucket-your-org \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### Update Pulumi Configuration

Edit `Pulumi.yaml`:
```yaml
backend:
  url: s3://pulumi-state-bucket-your-org
```

---

## 7. GitHub Personal Access Token

Amplify needs a GitHub token to access your repository.

### Create Token

1. Go to [GitHub Settings](https://github.com/settings/tokens)
2. Click "Developer settings" → "Personal access tokens" → "Tokens (classic)"
3. Click "Generate new token (classic)"
4. Note: "Amplify deployment access"
5. Expiration: 90 days (or longer)
6. Select scopes:
   - `repo` (all)
   - `admin:repo_hook` (read and write)
7. Click "Generate token"
8. **Copy the token immediately** (you won't see it again!)
   ```
   11ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABC
   ```

### Store Token in AWS SSM

```bash
# Store token in Parameter Store
aws ssm put-parameter \
  --name /comparison_tool/github_token \
  --value "YOUR_ACTUAL_TOKEN_HERE" \
  --type SecureString \
  --description "GitHub token for Amplify deployment" \
  --region eu-north-1
```

### Verify Token Storage

```bash
# List parameter (doesn't show value)
aws ssm describe-parameters --region eu-north-1 | grep github_token

# Get value (for verification only, don't log this)
aws ssm get-parameter \
  --name /comparison_tool/github_token \
  --with-decryption \
  --region eu-north-1
```

---

## 8. Verification

### Pre-Deployment Checklist

Run these commands to verify everything is set up:

```bash
# 1. AWS Credentials
awsume your-profile-name
aws sts get-caller-identity

# 2. AWS Region
aws configure get region
# Should output: eu-north-1 (or your chosen region)

# 3. Route53 Hosted Zone
aws route53 list-hosted-zones --query "HostedZones[?Name=='example.com.']"

# 4. ACM Certificate
aws acm list-certificates --region eu-north-1

# 5. S3 Bucket
aws s3 ls | grep pulumi-state-bucket

# 6. GitHub Token
aws ssm get-parameter --name /comparison_tool/github_token --region eu-north-1

# 7. Docker
docker --version
docker ps
```

### All Green?

You're ready to deploy! Proceed to [Deployment Guide](DEPLOYMENT.md).

---

## Common Issues

### Issue: "Access Denied" errors

**Solution**: Check IAM permissions
```bash
aws iam list-attached-user-policies --user-name pulumi-deployer
```

### Issue: Certificate stuck in "Pending validation"

**Solution**: Check Route53 CNAME records were created
```bash
aws route53 list-resource-record-sets --hosted-zone-id YOUR_ZONE_ID
```

### Issue: S3 bucket name already exists

**Solution**: S3 bucket names are globally unique. Try different name:
```bash
aws s3 mb s3://pulumi-state-your-unique-name-12345 --region eu-north-1
```

### Issue: GitHub token invalid

**Solution**: Tokens expire. Generate new one and update SSM:
```bash
aws ssm put-parameter \
  --name /comparison_tool/github_token \
  --value "NEW_TOKEN" \
  --type SecureString \
  --overwrite \
  --region eu-north-1
```

---

## Cost Estimation

Approximate monthly costs for development environment:

| Service | Cost |
|---------|------|
| ECS Fargate (1 task, 0.25 vCPU, 0.5 GB) | ~$15 |
| Application Load Balancer | ~$20 |
| Route53 Hosted Zone | $0.50 |
| ACM Certificate | Free |
| Amplify Hosting | ~$1 (first 1000 build minutes free) |
| CloudWatch Logs (3 days retention) | ~$1 |
| Data Transfer | ~$5 |
| **Total** | **~$42-45/month** |

**Production environment**: ~$80-120/month (with 2 tasks, longer log retention)

**Cost savings with Lambda scaling**: ~30-40% reduction by scaling down after hours

---

## Security Best Practices

1. ✅ Enable MFA on root account
2. ✅ Use IAM users, not root credentials
3. ✅ Enable CloudTrail logging
4. ✅ Use least privilege IAM policies
5. ✅ Enable S3 bucket versioning
6. ✅ Enable S3 bucket encryption
7. ✅ Rotate access keys every 90 days
8. ✅ Enable VPC Flow Logs (optional, costs extra)
9. ✅ Use AWS Config for compliance (optional)
10. ✅ Set up billing alerts

---

## Next Steps

1. ✅ Complete this AWS setup
2. → Proceed to [Configuration Guide](CONFIGURATION.md)
3. → Then [Deployment Guide](DEPLOYMENT.md)
4. → Finally, deploy with `make deploy`

---

## Additional Resources

- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [Pulumi AWS Documentation](https://www.pulumi.com/docs/clouds/aws/)
