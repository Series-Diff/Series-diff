# Security Policy

## Sensitive Information

This repository is designed to be **public-safe**. No sensitive information should be committed.

### What's Safe to Commit ✅

- Template configuration files (`.example` files)
- Infrastructure code (`infra/` modules)
- Documentation
- Scripts (without credentials)
- `.gitignore` rules

### What's Never Committed ❌

- **Pulumi stack configurations** (`Pulumi.dev.yaml`, `Pulumi.prod.yaml`)
  - Contains: AWS account IDs, domain names, certificate ARNs
  - Stored: Locally only, git-ignored
  
- **AWS credentials**
  - Never stored in code
  - Use: `aws-sso-login` + `awsume` or AWS CLI profiles
  
- **GitHub tokens**
  - Stored: AWS SSM Parameter Store (encrypted)
  - Setup: Use `scripts/setup-github-token.sh`
  
- **Pulumi state files**
  - Stored: S3 backend (encrypted, versioned)
  - Never: In git repository

- **Secrets, API keys, passwords**
  - Stored: AWS SSM Parameter Store or Secrets Manager
  - Never: Hardcoded in code

## Setup for Contributors

### First-Time Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/YOUR_ORG/YOUR_REPO.git
   cd YOUR_REPO
   ```

2. **Create your local configuration**
   ```bash
   chmod +x scripts/setup-config.sh
   ./scripts/setup-config.sh
   ```
   
   This creates `Pulumi.*.yaml` files from templates with YOUR values.

3. **Setup GitHub token**
   ```bash
   chmod +x scripts/setup-github-token.sh
   ./scripts/setup-github-token.sh
   ```

4. **Verify git-ignore**
   ```bash
   git status
   # Should NOT show Pulumi.dev.yaml or Pulumi.prod.yaml
   ```

5. **Deploy**
   ```bash
   make dev-setup
   make deploy
   ```

## What Information is Exposed?

### In Public Repository ✅

- **Project structure**: Visible (normal for open source)
- **AWS services used**: Visible (ECS, Amplify, ALB, etc.)
- **Technology stack**: Visible (Python, Pulumi, Flask, React)
- **General architecture**: Visible (infrastructure patterns)

### NOT in Public Repository ❌

- **Your AWS account ID**: Hidden (from certificate ARNs)
- **Your domain name**: Hidden (from configuration)
- **Your GitHub repo**: Hidden (from configuration)
- **Your S3 bucket names**: Hidden (from Pulumi.yaml)
- **Any credentials**: Hidden (stored in AWS)

## Configuration Files

### Template Files (Committed)

```
Pulumi.yaml                    # Project config (template values)
Pulumi.dev.yaml.example        # Dev stack template
Pulumi.prod.yaml.example       # Prod stack template
```

### Actual Files (Git-Ignored)

```
Pulumi.dev.yaml                # Your dev config (git-ignored)
Pulumi.prod.yaml               # Your prod config (git-ignored)
Pulumi.staging.yaml            # Your staging config (git-ignored)
```

## Verifying Security

### Before Committing

Always check what you're committing:

```bash
# See what will be committed
git status
git diff --cached

# Should NOT show:
# - Pulumi.dev.yaml (unless it's .example)
# - Pulumi.prod.yaml (unless it's .example)
# - Any files with real credentials
```

### Audit Configuration Files

```bash
# Check for sensitive data in tracked files
git grep -i "arn:aws:acm" -- "*.yaml"  # Should only find .example files
git grep -i "github.com" -- "*.yaml"   # Should only find templates
```

### Check git-ignore

```bash
# Verify gitignore is working
git check-ignore -v Pulumi.dev.yaml
# Should output: .gitignore:XX:Pulumi.*.yaml	Pulumi.dev.yaml
```

## Accidental Commit of Secrets

If you accidentally commit sensitive data:

### Immediate Actions

1. **Remove from latest commit**
   ```bash
   # If not yet pushed
   git reset HEAD~1
   git add <only safe files>
   git commit -m "Your message"
   ```

2. **Remove from history** (if already pushed)
   ```bash
   # Use git-filter-repo (recommended)
   git filter-repo --path Pulumi.dev.yaml --invert-paths
   
   # Or BFG Repo-Cleaner
   bfg --delete-files Pulumi.dev.yaml
   ```

3. **Rotate compromised credentials**
   ```bash
   # Rotate GitHub token
   ./scripts/setup-github-token.sh
   
   # Rotate AWS credentials if exposed
   aws iam create-access-key --user-name your-user
   aws iam delete-access-key --access-key-id OLD_KEY_ID --user-name your-user
   ```

4. **Force push** (only if necessary and coordinated with team)
   ```bash
   git push --force
   ```

5. **Notify team** about the incident

### Prevention

- Always run `git status` before `git commit`
- Use `git diff --cached` to review changes
- Set up pre-commit hooks (see `.git/hooks/pre-commit.sample`)
- Review PRs carefully before merging

## Sharing Configuration Securely

### With Team Members

**Don't:** Send configuration files via email/Slack

**Do:** Use secure channels
```bash
# Option 1: Encrypted file transfer
gpg --encrypt --recipient team@example.com Pulumi.dev.yaml

# Option 2: Secure password manager (1Password, etc.)
# Store configuration in shared vault

# Option 3: Have each team member run setup script
./scripts/setup-config.sh
```

### For New Environments

```bash
# Create new stack configuration from template
cp Pulumi.dev.yaml.example Pulumi.staging.yaml

# Edit with staging-specific values
vim Pulumi.staging.yaml

# Git-ignore is already configured for all Pulumi.*.yaml
```

## AWS Best Practices

### IAM Permissions

Use least privilege principle:
```bash
# Create deployment user with minimal permissions
# See docs/AWS_SETUP.md for detailed permissions list
```

### Secrets Management

All secrets should use AWS Secrets Manager or SSM Parameter Store:

```bash
# Store secret
aws ssm put-parameter \
  --name /app/secret \
  --value "secret-value" \
  --type SecureString

# Retrieve in code (not stored in git)
secret = aws.ssm.get_parameter(name="/app/secret", with_decryption=True)
```

### S3 Backend Security

Pulumi state bucket should be:
- ✅ Versioned (for state recovery)
- ✅ Encrypted (AES256 or KMS)
- ✅ Private (no public access)
- ✅ Lifecycle policies (for cost management)

```bash
# Verify bucket security
aws s3api get-bucket-versioning --bucket YOUR_BUCKET
aws s3api get-bucket-encryption --bucket YOUR_BUCKET
aws s3api get-public-access-block --bucket YOUR_BUCKET
```

## Incident Response

### If credentials are exposed:

1. **Immediately rotate**
   - AWS access keys
   - GitHub tokens
   - Any other exposed credentials

2. **Review CloudTrail logs**
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=AccessKeyId,AttributeValue=EXPOSED_KEY
   ```

3. **Check for unauthorized access**
   - Review AWS CloudTrail
   - Check GitHub audit log
   - Review Amplify deployment history

4. **Document incident**
   - What was exposed
   - How long it was exposed
   - Actions taken
   - Lessons learned

## Reporting Security Issues

If you discover a security vulnerability:

1. **Don't** open a public issue
2. **Do** email: security@your-domain.com
3. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## Security Checklist

Before pushing code:

- [ ] No `Pulumi.dev.yaml` or `Pulumi.prod.yaml` in git status
- [ ] No AWS credentials in code
- [ ] No hardcoded secrets
- [ ] All secrets in AWS SSM/Secrets Manager
- [ ] `.gitignore` includes all sensitive file patterns
- [ ] Configuration templates use placeholder values
- [ ] Ran `git diff --cached` to review changes

## Resources

- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)
- [GitHub Security](https://docs.github.com/en/code-security)
- [Pulumi Secrets](https://www.pulumi.com/docs/concepts/secrets/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

## Questions?

For security-related questions, contact: security@your-domain.com
