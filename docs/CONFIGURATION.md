# Configuration Guide

This guide explains all configuration options available in `Pulumi.*.yaml` files and how to customize your infrastructure.

## Table of Contents

1. [Configuration Structure](#configuration-structure)
2. [AWS Configuration](#aws-configuration)
3. [Domain Configuration](#domain-configuration)
4. [ECS Configuration](#ecs-configuration)
5. [Lambda Scaling Configuration](#lambda-scaling-configuration)
6. [Cognito Authentication Configuration](#cognito-authentication-configuration)
7. [GitHub Configuration](#github-configuration)
8. [Advanced Configuration](#advanced-configuration)
9. [Environment-Specific Settings](#environment-specific-settings)
10. [Configuration Best Practices](#configuration-best-practices)

---

## Configuration Structure

Configuration files follow this naming pattern:
- `Pulumi.yaml` - Project-level configuration (rarely changed)
- `Pulumi.dev.yaml` - Development environment
- `Pulumi.prod.yaml` - Production environment
- `Pulumi.<stack-name>.yaml` - Custom stack configurations

### File Format

```yaml
config:
  aws:region: value
  comparison-tool:parameter: value
  comparison-tool:anotherParameter: value
```

---

## AWS Configuration

### Region

```yaml
aws:region: eu-north-1
```

**Description**: AWS region for deployment

**Supported values**: Any AWS region, preferably in EU:
- `eu-north-1` - Stockholm
- `eu-west-1` - Ireland
- `eu-west-2` - London
- `eu-west-3` - Paris
- `eu-central-1` - Frankfurt
- `eu-south-1` - Milan

**Default**: None (required)

**Notes**:
- ACM certificate must be in same region
- Some services may not be available in all regions
- Consider latency to your users

---

## Domain Configuration

### Hosted Zone Domain

```yaml
comparison-tool:hostedZoneDomain: example.com
```

**Description**: Root domain managed in Route53

**Example**: `example.com`, `myapp.io`

**Default**: None (required)

**Prerequisites**:
- Domain registered (Route53 or external)
- Route53 hosted zone created
- DNS nameservers configured (if external domain)

### Backend Subdomain

```yaml
comparison-tool:beSubdomain: api
```

**Description**: Subdomain for backend API

**Example values**: `api`, `backend`, `api-v1`

**Default**: `api`

**Result**: Creates DNS record `api.example.com` → ALB

### Frontend Subdomain

```yaml
comparison-tool:feSubdomain: www
```

**Description**: Subdomain for frontend application

**Example values**: `www`, `app`, `portal`

**Default**: `www`

**Result**: Creates DNS record `www.example.com` → Amplify

**Note**: Root domain (`example.com`) automatically redirects to this subdomain

### Certificate ARN

```yaml
comparison-tool:certificateArn: arn:aws:acm:eu-north-1:123456789012:certificate/abc-123
```

**Description**: ACM certificate ARN for HTTPS

**Format**: `arn:aws:acm:<region>:<account-id>:certificate/<certificate-id>`

**Default**: None (required)

**How to get**:
```bash
aws acm list-certificates --region eu-north-1
```

**Requirements**:
- Must be in same region as deployment
- Must cover your domain (e.g., `*.example.com`)
- Must be validated (status: ISSUED)

---

## ECS Configuration

### Task CPU

```yaml
comparison-tool:ecsTaskCpu: "256"
```

**Description**: CPU units for ECS task (1 vCPU = 1024 units)

**Supported values**:
- `"256"` - 0.25 vCPU (~$15/month)
- `"512"` - 0.5 vCPU (~$30/month)
- `"1024"` - 1 vCPU (~$60/month)
- `"2048"` - 2 vCPU (~$120/month)
- `"4096"` - 4 vCPU (~$240/month)

**Default**: `"256"`

**Recommendations**:
- Development: `"256"`
- Production: `"512"` or `"1024"`

### Task Memory

```yaml
comparison-tool:ecsTaskMemory: "512"
```

**Description**: Memory (MB) for ECS task

**Supported values** (must match CPU):

| CPU | Memory Options (MB) |
|-----|---------------------|
| 256 | 512, 1024, 2048 |
| 512 | 1024, 2048, 3072, 4096 |
| 1024 | 2048, 3072, 4096, 5120, 6144, 7168, 8192 |
| 2048 | 4096 - 16384 (1 GB increments) |
| 4096 | 8192 - 30720 (1 GB increments) |

**Default**: `"512"`

**Recommendations**:
- Development: `"512"`
- Production: `"1024"` or `"2048"`

### Desired Count

```yaml
comparison-tool:ecsDesiredCount: 1
```

**Description**: Number of ECS tasks to run

**Range**: 0-10 (practical limit, can be higher)

**Default**: `1`

**Recommendations**:
- Development: `1`
- Production: `2` (for high availability)
- High traffic: `3+` with auto-scaling

**Cost impact**: Linear (2 tasks = 2x cost)

### Log Retention

```yaml
comparison-tool:ecsLogRetentionDays: 3
```

**Description**: CloudWatch Logs retention period (days)

**Supported values**:
- `1`, `3`, `5`, `7`, `14`, `30`, `60`, `90`, `120`, `150`, `180`, `365`, `400`, `545`, `731`, `1827`, `3653`

**Default**: `3`

**Recommendations**:
- Development: `3` or `7`
- Production: `30` or `90`
- Compliance: `365+`

**Cost impact**: ~$0.50 per GB per month stored

---

## Lambda Scaling Configuration

Automatically scales ECS service up/down based on schedule.

### Enable/Disable Scaling

```yaml
comparison-tool:lambdaScalingEnabled: true
```

**Description**: Enable scheduled ECS scaling

**Values**: `true` or `false`

**Default**: `true`

**Use cases**:
- Development: `true` (save costs after hours)
- Production: `false` (always available)

### Scale Down Schedule

```yaml
comparison-tool:scaleDownCron: "cron(0 20 ? * MON-FRI *)"
```

**Description**: When to scale down to 0 tasks

**Format**: AWS EventBridge cron expression

**Default**: `"cron(0 20 ? * MON-FRI *)"` (8 PM UTC, Monday-Friday)

**Cron format**: `cron(minute hour day month day-of-week year)`

**Examples**:
```yaml
# 6 PM UTC, weekdays
"cron(0 18 ? * MON-FRI *)"

# 10 PM UTC, every day
"cron(0 22 ? * * *)"

# 8 PM CET (7 PM UTC), weekdays
"cron(0 19 ? * MON-FRI *)"

# Never (disable scale down)
# Just set lambdaScalingEnabled: false
```

**Important**: Cron uses UTC timezone!

### Scale Up Schedule

```yaml
comparison-tool:scaleUpCron: "cron(0 8 ? * MON-FRI *)"
```

**Description**: When to scale up to desired count

**Format**: Same as scale down

**Default**: `"cron(0 8 ? * MON-FRI *)"` (8 AM UTC, Monday-Friday)

**Examples**:
```yaml
# 7 AM UTC, weekdays
"cron(0 7 ? * MON-FRI *)"

# 6 AM CET (5 AM UTC), weekdays
"cron(0 5 ? * MON-FRI *)"

# 9 AM UTC, Monday and Thursday
"cron(0 9 ? * MON,THU *)"
```

### Timezone Conversion Table

| Local Time | CET (Winter) | CEST (Summer) |
|------------|--------------|---------------|
| 6 AM | cron(0 5 ...) | cron(0 4 ...) |
| 7 AM | cron(0 6 ...) | cron(0 5 ...) |
| 8 AM | cron(0 7 ...) | cron(0 6 ...) |
| 9 AM | cron(0 8 ...) | cron(0 7 ...) |
| 6 PM | cron(0 17 ...) | cron(0 16 ...) |
| 7 PM | cron(0 18 ...) | cron(0 17 ...) |
| 8 PM | cron(0 19 ...) | cron(0 18 ...) |
| 9 PM | cron(0 20 ...) | cron(0 19 ...) |

---

## Cognito Authentication Configuration

**Status**: Disabled by default, enable for production

### Enable Cognito

```yaml
comparison-tool:cognitoEnabled: false
```

**Description**: Enable Amazon Cognito authentication

**Values**: `true` or `false`

**Default**: `false`

**When to enable**:
- ❌ Development: Usually disabled
- ✅ Production: Recommended if app has sensitive data
- ✅ Beta/Staging: Test authentication flow

**Cost**: ~$0.0055 per monthly active user (first 50,000 free)

### Cognito Domain Prefix

```yaml
comparison-tool:cognitoDomainPrefix: comparison-tool-dev
```

**Description**: Unique prefix for Cognito hosted UI domain

**Format**: Lowercase alphanumeric and hyphens only

**Default**: `comparison-tool-<stack-name>`

**Result**: Creates domain `comparison-tool-dev.auth.eu-north-1.amazoncognito.com`

**Requirements**:
- Must be globally unique across all AWS accounts
- 1-63 characters
- Cannot start/end with hyphen

**Examples**:
```yaml
# Development
cognitoDomainPrefix: myapp-dev-2024

# Production
cognitoDomainPrefix: myapp-prod

# Staging
cognitoDomainPrefix: myapp-staging-eu
```

### How Authentication Works

When `cognitoEnabled: true`:

1. **ALB Authentication** (Option A - Default):
   - User visits `https://api.example.com`
   - ALB redirects to Cognito login page
   - User authenticates
   - ALB forwards request to Flask API with user identity
   - No code changes needed in Flask

2. **JWT Validation** (Option B - For Advanced Use):
   - React app handles Cognito authentication
   - Flask API validates JWT tokens
   - Requires code changes in both frontend and backend
   - See "Backend JWT Validation" section below

### Cognito Callback URLs

Automatically configured as:
```
https://www.example.com
https://www.example.com/callback
```

Based on your `hostedZoneDomain` and `feSubdomain`.

---

## GitHub Configuration

### Repository URL

```yaml
comparison-tool:githubRepoUrl: https://github.com/your-org/your-repo
```

**Description**: GitHub repository URL for Amplify

**Format**: `https://github.com/<owner>/<repo>`

**Default**: None (required)

**Requirements**:
- Must be HTTPS URL
- Repository must be accessible with provided token
- Must contain `app/client/` directory with React app

### GitHub Token Parameter

```yaml
comparison-tool:githubTokenParamName: /sample_app/github_token
```

**Description**: AWS SSM Parameter Store path for GitHub token

**Default**: `/sample_app/github_token`

**Setup**:
```bash
aws ssm put-parameter \
  --name /sample_app/github_token \
  --value "YOUR_TOKEN" \
  --type SecureString \
  --region eu-north-1
```

**Token requirements**:
- Type: Personal Access Token (Classic)
- Scopes: `repo` (all), `admin:repo_hook`
- Expiration: 90+ days recommended

---

## Advanced Configuration

### Custom VPC (Future Enhancement)

Currently uses default VPC. To use custom VPC, modify `infra/modules/networking.py`:

```python
# Instead of:
vpc = aws.ec2.get_vpc(default=True)

# Use:
vpc = aws.ec2.Vpc("custom-vpc",
    cidr_block="10.0.0.0/16",
    enable_dns_hostnames=True,
    enable_dns_support=True,
    tags={"Name": "comparison-tool-vpc"}
)
```

### Custom Security Group Rules

Modify `infra/modules/networking.py` to add rules:

```python
# Example: Allow SSH from specific IP
{
    "protocol": "tcp",
    "from_port": 22,
    "to_port": 22,
    "cidr_blocks": ["YOUR_IP/32"],
    "description": "SSH access"
}
```

### Multiple Environments in Same Account

Use stack names:

```bash
# Development
pulumi stack init dev
pulumi stack select dev

# Staging
pulumi stack init staging
pulumi stack select staging

# Production
pulumi stack init prod
pulumi stack select prod
```

Each stack is isolated and has separate `Pulumi.<stack>.yaml`.

---

## Environment-Specific Settings

### Development (Pulumi.dev.yaml)

```yaml
config:
  aws:region: eu-north-1
  comparison-tool:ecsTaskCpu: "256"
  comparison-tool:ecsTaskMemory: "512"
  comparison-tool:ecsDesiredCount: 1
  comparison-tool:ecsLogRetentionDays: 3
  comparison-tool:lambdaScalingEnabled: true
  comparison-tool:cognitoEnabled: false
```

**Characteristics**:
- Minimal resources
- Auto-scaling enabled
- Short log retention
- No authentication
- **Cost**: ~$40-50/month

### Staging (Pulumi.staging.yaml)

```yaml
config:
  aws:region: eu-north-1
  comparison-tool:ecsTaskCpu: "512"
  comparison-tool:ecsTaskMemory: "1024"
  comparison-tool:ecsDesiredCount: 1
  comparison-tool:ecsLogRetentionDays: 14
  comparison-tool:lambdaScalingEnabled: false
  comparison-tool:cognitoEnabled: true
```

**Characteristics**:
- Production-like setup
- Always available
- Authentication enabled
- Medium log retention
- **Cost**: ~$80-100/month

### Production (Pulumi.prod.yaml)

```yaml
config:
  aws:region: eu-north-1
  comparison-tool:ecsTaskCpu: "1024"
  comparison-tool:ecsTaskMemory: "2048"
  comparison-tool:ecsDesiredCount: 2
  comparison-tool:ecsLogRetentionDays: 90
  comparison-tool:lambdaScalingEnabled: false
  comparison-tool:cognitoEnabled: true
```

**Characteristics**:
- High availability (2+ tasks)
- More resources
- Long log retention
- Always available
- Authentication enabled
- **Cost**: ~$150-200/month

---

## Configuration Best Practices

### 1. Version Control

```bash
# Commit configuration templates
git add Pulumi.yaml
git add Pulumi.*.yaml.example
git commit -m "Add configuration templates"

# Don't commit actual configs with secrets (optional)
# Add to .gitignore:
# Pulumi.dev.yaml
# Pulumi.prod.yaml
```

### 2. Use Environment Variables

For sensitive values:

```bash
# Set config from environment
pulumi config set aws:region $AWS_REGION
pulumi config set comparison-tool:certificateArn $CERT_ARN --secret
```

### 3. Document Changes

Add comments to your YAML:

```yaml
config:
  # Increased to 512 for better performance - 2024-01-15
  comparison-tool:ecsTaskCpu: "512"
```

### 4. Validate Before Deploy

```bash
# Always preview first
make preview STACK=prod

# Check configuration
make check-config STACK=prod
```

### 5. Separate Secrets

Never commit:
- Certificate ARNs (usually safe, but avoid)
- GitHub tokens (always in SSM)
- Any passwords or API keys

### 6. Use Descriptive Stack Names

```bash
# Good
dev, staging, prod
dev-eu, prod-us
feature-auth, feature-api-v2

# Avoid
test, test2, my-stack
```

### 7. Regular Audits

```bash
# Review current configuration
pulumi config

# Compare stacks
diff Pulumi.dev.yaml Pulumi.prod.yaml
```

---

## Backend JWT Validation (Option B)

If you prefer Flask to validate JWT tokens directly instead of ALB authentication:

### 1. Disable ALB Cognito

Keep `cognitoEnabled: true` but modify `infra/modules/alb.py`:

```python
# In create_alb function, use direct forward instead of authenticate-cognito
https_listener = aws.lb.Listener(
    "https-listener",
    load_balancer_arn=alb.arn,
    port=443,
    protocol="HTTPS",
    ssl_policy="ELBSecurityPolicy-TLS13-1-2-2021-06",
    certificate_arn=certificate_arn,
    default_actions=[aws.lb.ListenerDefaultActionArgs(
        type="forward",
        target_group_arn=target_group.arn,
    )]
)
```

### 2. Add to Flask (app/Flask-API/main.py)

```python
import jwt
import requests
from functools import wraps
from flask import request, jsonify

# Get Cognito public keys
COGNITO_REGION = os.environ.get('AWS_REGION', 'eu-north-1')
COGNITO_POOL_ID = os.environ.get('COGNITO_USER_POOL_ID')
COGNITO_KEYS_URL = f'https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_POOL_ID}/.well-known/jwks.json'

def get_cognito_keys():
    response = requests.get(COGNITO_KEYS_URL)
    return response.json()

def verify_token(token):
    # Decode and verify JWT token
    # Implementation here...
    pass

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'No token provided'}), 401

        try:
            payload = verify_token(token)
            request.user = payload
            return f(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid token'}), 401

    return decorated

@app.route('/api/protected')
@require_auth
def protected_route():
    return jsonify({'message': f"Hello {request.user['email']}"})
```

### 3. Update React (app/client/src/App.js)

```javascript
import { Amplify } from 'aws-amplify';
import { withAuthenticator } from '@aws-amplify/ui-react';

Amplify.configure({
  Auth: {
    region: process.env.REACT_APP_AWS_REGION,
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    userPoolWebClientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
  }
});

function App() {
  // Your app code
}

export default withAuthenticator(App);
```

---

## Configuration Validation

### Validate Configuration File

```python
# infra/config.py includes validation
# Run to check:
python3 -c "from infra.config import InfraConfig; InfraConfig()"
```

### Common Validation Errors

**Error**: `certificateArn must be a valid ACM certificate ARN`
```yaml
# Fix: Ensure correct format
comparison-tool:certificateArn: arn:aws:acm:eu-north-1:123456789012:certificate/abc-123
```

**Error**: `githubRepoUrl must be a valid GitHub HTTPS URL`
```yaml
# Wrong:
comparison-tool:githubRepoUrl: git@github.com:org/repo.git

# Correct:
comparison-tool:githubRepoUrl: https://github.com/org/repo
```

**Error**: `scaleDownCron must be a valid cron expression`
```yaml
# Wrong:
comparison-tool:scaleDownCron: "0 20 * * 1-5"

# Correct (AWS EventBridge format):
comparison-tool:scaleDownCron: "cron(0 20 ? * MON-FRI *)"
```

---

## Next Steps

- ✅ Configuration complete
- → [Deployment Guide](DEPLOYMENT.md) - Deploy your infrastructure
- → Test different configurations in development
- → Plan production configuration
- → Set up monitoring and alerts

---

## Additional Resources

- [Pulumi Configuration Documentation](https://www.pulumi.com/docs/concepts/config/)
- [AWS EventBridge Cron Expressions](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html#eb-cron-expressions)
- [ECS Task Definitions](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definitions.html)
- [Cognito Authentication Flow](https://docs.aws.amazon.com/cognito/latest/developerguide/authentication-flow.html)
