# Application Infrastructure

This repository contains the infrastructure-as-code (IaC) for deploying a full-stack application on AWS using Pulumi. The stack includes:

- **Backend**: Flask API running on AWS ECS Fargate
- **Frontend**: React application hosted on AWS Amplify
- **Infrastructure**: Application Load Balancer, ECR, Route53, CloudWatch, Lambda
- **Optional**: Amazon Cognito for authentication

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────────────┐        │
│  │              │         │                      │        │
│  │  Route53     │────────▶│   Application LB     │        │
│  │  (DNS)       │         │   (ALB + Cognito)    │        │
│  │              │         │                      │        │
│  └──────────────┘         └──────────┬───────────┘        │
│                                      │                     │
│                           ┌──────────▼───────────┐        │
│                           │                      │        │
│                           │    ECS Fargate       │        │
│                           │    (Flask API)       │        │
│                           │                      │        │
│                           └──────────────────────┘        │
│                                                             │
│  ┌──────────────┐         ┌──────────────────────┐        │
│  │              │         │                      │        │
│  │  Amplify     │────────▶│   React Frontend     │        │
│  │  (Hosting)   │         │   (Static Site)      │        │
│  │              │         │                      │        │
│  └──────────────┘         └──────────────────────┘        │
│                                                             │
│  ┌──────────────┐         ┌──────────────────────┐        │
│  │              │         │                      │        │
│  │  EventBridge │────────▶│   Lambda Function    │        │
│  │  (Scheduler) │         │   (ECS Scaling)      │        │
│  │              │         │                      │        │
│  └──────────────┘         └──────────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

Before you begin, ensure you have the following installed and configured:

1. **Python 3.9+** - [Download](https://www.python.org/downloads/)
2. **AWS CLI** - [Installation Guide](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. **Pulumi CLI** - [Installation Guide](https://www.pulumi.com/docs/get-started/install/)
4. **Docker** - [Installation Guide](https://docs.docker.com/get-docker/)
5. **Make** - Usually pre-installed on Linux/macOS, [Windows installation](http://gnuwin32.sourceforge.net/packages/make.htm)
6. **Node.js 18+** - For local frontend development (optional)

### AWS Prerequisites

- AWS Account with appropriate permissions
- AWS credentials configured (using `aws-sso-login` and `awsume`)
- ACM certificate for your domain (see [AWS Setup Guide](docs/AWS_SETUP.md))
- Route53 hosted zone for your domain
- S3 bucket for Pulumi state (`pulumi-state-bucket`)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd <repo-name>

# Run complete setup (creates venv, installs dependencies, configures Pulumi)
make dev-setup

# Activate virtual environment
source venv/bin/activate
```

### 2. Configure Your Stack

Edit `Pulumi.dev.yaml` with your specific values:

```yaml
config:
  aws:region: eu-north-1
  comparison-tool:hostedZoneDomain: your-domain.com
  comparison-tool:certificateArn: arn:aws:acm:eu-north-1:xxx:certificate/xxx
  comparison-tool:githubRepoUrl: https://github.com/your-org/your-repo
  # ... see file for all options
```

### 3. Deploy Infrastructure

```bash
# Preview changes
make preview

# Deploy to AWS
make deploy

# View outputs (URLs, IDs, etc.)
make outputs
```

### 4. Access Your Application

After deployment completes:

- **Frontend**: `https://www.your-domain.com`
- **Backend API**: `https://api.your-domain.com`
- **Amplify Console**: Check AWS Amplify console for build status

## 📖 Documentation

- **[AWS Setup Guide](docs/AWS_SETUP.md)** - Complete AWS account setup for beginners
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Detailed deployment instructions
- **[Configuration Guide](docs/CONFIGURATION.md)** - All configuration options explained

## 🛠️ Available Commands

Run `make help` to see all available commands:

```bash
make help              # Show all commands
make init              # Initialize virtual environment
make check-aws         # Verify AWS credentials
make preview           # Preview infrastructure changes
make deploy            # Deploy infrastructure
make destroy           # Destroy infrastructure
make logs              # View ECS container logs
make outputs           # Show stack outputs
make clean             # Clean temporary files
```

## 🏗️ Project Structure

```
.
├── /                             # Application code
│   ├── client/                   # React frontend
│   └── Flask-API/                # Flask backend
├── infra/                        # Infrastructure code
│   ├── __main__.py               # Main entry point
│   ├── config.py                 # Configuration management
│   ├── modules/                  # Infrastructure modules
│   │   ├── alb.py                # Application Load Balancer
│   │   ├── amplify.py            # AWS Amplify
│   │   ├── cognito.py            # Amazon Cognito (optional)
│   │   ├── dns.py                # Route53 DNS
│   │   ├── ecr.py                # ECR & Docker builds
│   │   ├── ecs.py                # ECS cluster & service
│   │   ├── lambda_scaling.py     # Lambda scaling function
│   │   └── networking.py         # VPC, subnets, security groups
│   ├── lambda/                   # Lambda function code
│   │   └── scale/
│   │       └── handler.py
│   └── buildspecs/               # Build specifications
│       └── amplify-react.yml
├── docs/                         # Documentation
│   ├── AWS_SETUP.md
│   ├── CONFIGURATION.md
│   └── DEPLOYMENT.md
├── Pulumi.yaml                   # Pulumi project config
├── Pulumi.dev.yaml               # Development stack config
├── Pulumi.prod.yaml.example      # Production template
├── Makefile                      # Automation commands
├── requirements.txt              # Python dependencies
└── .gitignore
```

## 🔐 Authentication (Optional)

Cognito authentication is **disabled by default**. To enable:

1. Set `cognitoEnabled: true` in your `Pulumi.*.yaml`
2. Deploy: `make deploy`
3. Create users in Cognito User Pool via AWS Console
4. Users will authenticate via ALB before accessing the API

See [Configuration Guide](docs/CONFIGURATION.md) for details.

## 📊 Monitoring & Logs

```bash
# View ECS container logs
make logs

# View logs in AWS Console
aws logs tail /ecs/flask-api-logs --follow

# Check Lambda scaling logs
aws logs tail /aws/lambda/ecs-scaling-lambda --follow
```

## 🔄 Scaling

### Automatic Scaling (Lambda)

By default, the ECS service scales automatically:
- **Scale down** to 0 tasks at 8 PM UTC weekdays
- **Scale up** to 1 task at 8 AM UTC weekdays

Configure in `Pulumi.*.yaml`:
```yaml
comparison-tool:lambdaScalingEnabled: true
comparison-tool:scaleDownCron: "cron(0 20 ? * MON-FRI *)"
comparison-tool:scaleUpCron: "cron(0 8 ? * MON-FRI *)"
```

### Manual Scaling

```bash
# Scale to specific count
aws ecs update-service \
  --cluster comparison-tool-cluster \
  --service flask-api-service \
  --desired-count 2
```

## 🌍 Environments

### Development
```bash
make deploy STACK=dev
```

### Production
```bash
# Copy example config
cp Pulumi.prod.yaml.example Pulumi.prod.yaml

# Edit with production values
vim Pulumi.prod.yaml

# Deploy to production
make prod-deploy
```

## 🧹 Cleanup

```bash
# Destroy infrastructure
make destroy

# Clean local files
make clean

# Full cleanup including venv
make clean-all
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test with `make preview`
4. Submit a pull request

## 📝 License

See [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**Issue**: "AWS credentials not configured"
```bash
# Solution: Configure AWS credentials
awsume <your-profile-name>
make check-aws
```

**Issue**: "Certificate ARN invalid"
```bash
# Solution: Create ACM certificate first
# See docs/AWS_SETUP.md for instructions
```

**Issue**: "GitHub token invalid"
```bash
# Solution: Update SSM parameter
aws ssm put-parameter \
  --name /comparison_tool/github_token \
  --value "YOUR_TOKEN" \
  --type SecureString \
  --overwrite
```

**Issue**: Docker build fails
```bash
# Solution: Ensure Docker is running
docker ps

# Login to AWS ECR
aws ecr get-login-password --region eu-north-1 | \
  docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-north-1.amazonaws.com
```

## 📞 Support

For issues and questions:
1. Check [Documentation](docs/)
2. Review [Troubleshooting](#-troubleshooting)
3. Open an issue in this repository

## 🔗 Useful Links

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
