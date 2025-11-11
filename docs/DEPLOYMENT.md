# Deployment Guide

This guide provides detailed instructions for deploying the infrastructure to AWS.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Configuration](#configuration)
4. [First Deployment](#first-deployment)
5. [Verification](#verification)
6. [Post-Deployment](#post-deployment)
7. [Updates and Maintenance](#updates-and-maintenance)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have completed:

- ✅ [AWS Setup Guide](AWS_SETUP.md) - All AWS resources configured
- ✅ Python 3.9+ installed
- ✅ AWS CLI configured with valid credentials
- ✅ Docker running
- ✅ Pulumi CLI installed
- ✅ Git repository cloned

### Quick Check

```bash
# Verify all prerequisites
python3 --version          # Should be 3.9+
aws --version              # Should be 2.x
pulumi version             # Should be latest
docker --version           # Should be 20.x+
awsume your-profile        # Activate AWS credentials
aws sts get-caller-identity # Should show your AWS account
```

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/your-repo.git
cd your-repo
```

### 2. Run Initial Setup

```bash
# This will:
# - Create Python virtual environment
# - Install dependencies
# - Login to Pulumi backend
# - Initialize stack
make dev-setup
```

Expected output:
```
✓ Initialization complete!
✓ Dependencies installed
✓ Pulumi logged in
✓ Stack dev ready
```

### 3. Activate Virtual Environment

```bash
source venv/bin/activate
```

---

## Configuration

### 1. Edit Configuration File

Open `Pulumi.dev.yaml` and update with your values:

```yaml
config:
  # AWS Configuration
  aws:region: eu-north-1                    # Your AWS region
  
  # Domain Configuration
  sample-app:hostedZoneDomain: example.com  # Your domain
  sample-app:beSubdomain: api               # Backend subdomain
  sample-app:feSubdomain: www               # Frontend subdomain
  
  # Certificate ARN (from ACM)
  sample-app:certificateArn: arn:aws:acm:eu-north-1:123456789012:certificate/abc123
  
  # GitHub Configuration
  sample-app:githubRepoUrl: https://github.com/your-org/your-repo
  sample-app:githubTokenParamName: /sample_app/github_token
  
  # ECS Configuration
  sample-app:ecsTaskCpu: "256"              # Task CPU units
  sample-app:ecsTaskMemory: "512"           # Task memory (MB)
  sample-app:ecsDesiredCount: 1             # Number of tasks
  sample-app:ecsLogRetentionDays: 3         # CloudWatch log retention
  
  # Lambda Scaling (optional)
  sample-app:lambdaScalingEnabled: true
  sample-app:scaleDownCron: "cron(0 20 ? * MON-FRI *)"  # 8 PM UTC
  sample-app:scaleUpCron: "cron(0 8 ? * MON-FRI *)"     # 8 AM UTC
  
  # Cognito (disabled by default)
  sample-app:cognitoEnabled: false
  sample-app:cognitoDomainPrefix: sample-app-dev
```

### 2. Validate Configuration

```bash
make check-config
```

This displays your current configuration and validates format.

### 3. Adjust Timezone for Scaling (if needed)

The default cron expressions use UTC. To adjust for your timezone:

**Example: Central European Time (CET/CEST = UTC+1/UTC+2)**

For 8 PM local time:
- Winter (CET): 8 PM = 7 PM UTC → `cron(0 19 ? * MON-FRI *)`
- Summer (CEST): 8 PM = 6 PM UTC → `cron(0 18 ? * MON-FRI *)`

**Recommendation**: Use UTC times consistently or choose one timezone offset.

---

## First Deployment

### 1. Preview Changes

Always preview before deploying:

```bash
make preview
```

This shows:
- Resources to be created
- Expected changes
- Potential issues

Review the output carefully. You should see ~20-30 resources to be created.

### 2. Deploy Infrastructure

```bash
make deploy
```

You'll be prompted:
```
Do you want to perform this update? [yes/no]: yes
```

### 3. Deployment Progress

The deployment will:
1. Create ECR repository
2. Build and push Docker image (~5-10 minutes)
3. Create networking resources (VPC, security groups)
4. Create ECS cluster and task definition
5. Create Application Load Balancer
6. Create DNS records
7. Create Lambda function and EventBridge rules
8. Create Amplify app
9. Configure custom domain

**Total time**: 15-25 minutes for first deployment

### 4. Monitor Progress

```bash
# In another terminal, watch outputs as they become available
watch -n 5 'make outputs'
```

---

## Verification

### 1. Check Stack Outputs

```bash
make outputs
```

Expected outputs:
```yaml
amplify_app_url: d1234abcd.amplifyapp.com
amplify_custom_domain: https://www.example.com
api_dns_record_fqdn: api.example.com
api_url: https://api.example.com
environment: dev
image_url: 123456789012.dkr.ecr.eu-north-1.amazonaws.com/flask-api:latest
region: eu-north-1
vpc_id: vpc-abc123
```

### 2. Test Backend API

```bash
# Test health endpoint
curl https://api.example.com/health

# Expected response:
# {"status": "healthy"}
```

### 3. Test Frontend

Open browser: `https://www.example.com`

**Note**: First Amplify build takes 5-10 minutes. Check build status:

```bash
# Get Amplify app ID from outputs
APP_ID=$(cd infra && pulumi stack output --json | jq -r '.amplify_app_id // empty')

# Check build status
aws amplify list-jobs --app-id $APP_ID --branch-name main --max-results 1
```

### 4. Verify DNS Resolution

```bash
# Check API DNS
dig api.example.com +short

# Check Frontend DNS (may take longer)
dig www.example.com +short
```

### 5. Check ECS Service

```bash
# List running tasks
aws ecs list-tasks \
  --cluster sample-app-cluster \
  --service-name flask-api-service

# Describe service
aws ecs describe-services \
  --cluster sample-app-cluster \
  --services flask-api-service
```

### 6. View Logs

```bash
# View ECS logs
make logs

# Or directly with AWS CLI
aws logs tail /ecs/flask-api-logs --follow
```

---

## Post-Deployment

### 1. Configure Amplify Build Triggers

Amplify automatically deploys when you push to the `main` branch.

To manually trigger build:
```bash
aws amplify start-job \
  --app-id $APP_ID \
  --branch-name main \
  --job-type RELEASE
```

### 2. Create Cognito Users (if enabled)

If you enabled Cognito authentication:

```bash
# Get User Pool ID
USER_POOL_ID=$(cd infra && pulumi stack output cognito_user_pool_id)

# Create user
aws cognito-idp admin-create-user \
  --user-pool-id $USER_POOL_ID \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id $USER_POOL_ID \
  --username user@example.com \
  --password "YourSecurePassword123!" \
  --permanent
```

### 3. Set Up Monitoring (Optional)

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name sample-app-dev \
  --dashboard-body file://dashboard.json
```

### 4. Configure Alerts (Optional)

```bash
# Create SNS topic for alerts
aws sns create-topic --name sample-app-alerts

# Subscribe email
aws sns subscribe \
  --topic-arn arn:aws:sns:eu-north-1:123456789012:sample-app-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com

# Create CloudWatch alarm for ECS service
aws cloudwatch put-metric-alarm \
  --alarm-name ecs-service-running-tasks \
  --alarm-description "Alert when no tasks are running" \
  --metric-name RunningTaskCount \
  --namespace ECS/ContainerInsights \
  --statistic Average \
  --period 300 \
  --threshold 1 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 2
```

---

## Updates and Maintenance

### Update Infrastructure Code

```bash
# Pull latest changes
git pull origin main

# Preview changes
make preview

# Apply changes
make deploy
```

### Update Application Code

**Backend (Flask API)**:
```bash
# Pulumi automatically rebuilds and pushes new Docker image
make deploy
```

**Frontend (React)**:
```bash
# Push changes to GitHub main branch
git add .
git commit -m "Update frontend"
git push origin main

# Amplify automatically builds and deploys
```

### Manual Force Rebuild

**Backend**:
```bash
# Force ECS service to use new task definition
aws ecs update-service \
  --cluster sample-app-cluster \
  --service flask-api-service \
  --force-new-deployment
```

**Frontend**:
```bash
# Trigger Amplify build
aws amplify start-job \
  --app-id $APP_ID \
  --branch-name main \
  --job-type RELEASE
```

### Scale ECS Service

```bash
# Scale to 2 tasks
aws ecs update-service \
  --cluster sample-app-cluster \
  --service flask-api-service \
  --desired-count 2

# Verify
aws ecs describe-services \
  --cluster sample-app-cluster \
  --services flask-api-service \
  --query 'services[0].desiredCount'
```

### Update Configuration

```bash
# Edit configuration
vim Pulumi.dev.yaml

# Preview changes
make preview

# Apply changes
make deploy
```

### Refresh Stack State

If infrastructure was modified outside Pulumi:

```bash
make refresh
```

---

## Troubleshooting

### Deployment Fails: "Certificate not found"

**Problem**: ACM certificate doesn't exist or ARN is incorrect

**Solution**:
```bash
# List certificates in your region
aws acm list-certificates --region eu-north-1

# Update Pulumi.dev.yaml with correct ARN
```

### Deployment Fails: "Docker build failed"

**Problem**: Docker not running or permissions issue

**Solution**:
```bash
# Check Docker
docker ps

# Login to ECR
aws ecr get-login-password --region eu-north-1 | \
  docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.eu-north-1.amazonaws.com
```

### ECS Tasks Not Starting

**Problem**: Task definition issues or capacity problems

**Solution**:
```bash
# Check service events
aws ecs describe-services \
  --cluster sample-app-cluster \
  --services flask-api-service \
  --query 'services[0].events[:5]'

# Check task logs
aws logs tail /ecs/flask-api-logs --follow
```

### ALB Health Check Failing

**Problem**: Backend not responding on health check endpoint

**Solution**:
```bash
# Check target health
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names flask-api-tg \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)

# Common fixes:
# 1. Ensure Flask app has /health endpoint
# 2. Check security group allows traffic
# 3. Verify container port (5000)
```

### Amplify Build Failing

**Problem**: Build errors in React app

**Solution**:
```bash
# View build logs in Amplify Console
aws amplify list-jobs \
  --app-id $APP_ID \
  --branch-name main \
  --max-results 1

# Common fixes:
# 1. Check package.json scripts
# 2. Verify Node version compatibility
# 3. Check environment variables
```

### DNS Not Resolving

**Problem**: Route53 records not propagating

**Solution**:
```bash
# Check Route53 records
aws route53 list-resource-record-sets \
  --hosted-zone-id $(aws route53 list-hosted-zones \
    --query "HostedZones[?Name=='example.com.'].Id" \
    --output text | cut -d'/' -f3)

# Wait for propagation (up to 48 hours, usually faster)
# Use online tools: https://www.whatsmydns.net/
```

### Lambda Scaling Not Working

**Problem**: EventBridge rules not triggering

**Solution**:
```bash
# Check Lambda function logs
aws logs tail /aws/lambda/ecs-scaling-lambda --follow

# List EventBridge rules
aws events list-rules --name-prefix ecs-scale

# Manually test Lambda
make test-lambda
```

### GitHub Token Invalid

**Problem**: Amplify can't access repository

**Solution**:
```bash
# Generate new token at https://github.com/settings/tokens

# Update SSM parameter
aws ssm put-parameter \
  --name /sample_app/github_token \
  --value "NEW_TOKEN" \
  --type SecureString \
  --overwrite

# Re-deploy
make deploy
```

---

## Rollback

If deployment fails or causes issues:

### Rollback Infrastructure

```bash
# View stack history
cd infra
pulumi stack history

# Rollback to specific version
pulumi stack export --version 5 > backup.json
pulumi stack import < backup.json
```

### Rollback Application Code

```bash
# Git rollback
git revert HEAD
git push origin main

# Or checkout previous commit
git checkout <previous-commit-hash>
git push origin main --force
```

---

## Production Deployment

When ready for production:

### 1. Create Production Configuration

```bash
# Copy example
cp Pulumi.prod.yaml.example Pulumi.prod.yaml

# Edit with production values
vim Pulumi.prod.yaml
```

Key differences for production:
- Higher CPU/Memory: `512`/`1024`
- Multiple tasks: `desiredCount: 2`
- Longer log retention: `30` days
- Disable auto-scaling: `lambdaScalingEnabled: false`
- Enable Cognito: `cognitoEnabled: true`

### 2. Initialize Production Stack

```bash
make stack-init STACK=prod
```

### 3. Deploy to Production

```bash
# Preview first!
make preview STACK=prod

# Deploy with confirmation
make prod-deploy
```

### 4. Production Post-Deployment

```bash
# Set up automated backups
# Configure CloudWatch alarms
# Enable AWS Config for compliance
# Set up AWS WAF (optional)
# Enable GuardDuty (security monitoring)
```

---

## Cleanup

To destroy all infrastructure:

```bash
# Development
make destroy

# Production (be careful!)
make destroy STACK=prod
```

**Note**: This will delete:
- ECS cluster and tasks
- Load balancer
- ECR repository and images
- Lambda functions
- Route53 records
- Amplify app

**Not deleted** (manual cleanup required):
- S3 Pulumi state bucket
- ACM certificates
- Route53 hosted zone
- SSM parameters
- CloudWatch log groups (after retention period)

---

## Best Practices

1. **Always preview first**: `make preview` before `make deploy`
2. **Use version control**: Commit infrastructure changes to Git
3. **Test in dev first**: Never test directly in production
4. **Monitor costs**: Set up AWS billing alerts
5. **Regular updates**: Keep dependencies up to date
6. **Backup state**: Pulumi state is in S3 with versioning
7. **Document changes**: Add comments to configuration changes
8. **Security scanning**: Regularly scan for vulnerabilities
9. **Rotate credentials**: Update access keys every 90 days
10. **Review logs**: Regularly check CloudWatch logs for issues

---

## Next Steps

- ✅ Infrastructure deployed
- → [Configuration Guide](CONFIGURATION.md) - Detailed configuration options
- → Set up monitoring and alerts
- → Configure CI/CD for application code
- → Implement automated testing
- → Plan for disaster recovery

---

## Support

For issues:
1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review [AWS Setup Guide](AWS_SETUP.md)
3. Check Pulumi logs: `cd infra && pulumi logs`
4. Open issue in repository

---

## Additional Resources

- [Pulumi AWS Reference](https://www.pulumi.com/registry/packages/aws/)
- [AWS ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
