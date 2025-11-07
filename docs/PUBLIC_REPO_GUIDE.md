# Public Repository Security Guide

This guide explains how this repository is designed to be public-safe and how to maintain that security.

## Overview

This infrastructure code is designed to be shared publicly while keeping your sensitive data private. It uses a **template-based approach** where:

- ✅ **Templates are committed** (with placeholder values)
- ❌ **Actual configs are git-ignored** (with your real values)

## What's Safe in Public Repos?

### ✅ Always Safe to Commit

1. **Template files**
   - `Pulumi.dev.yaml.example`
   - `Pulumi.prod.yaml.example`
   - Contains: `ACCOUNT_ID`, `YOUR_ORG`, `example.com`

2. **Infrastructure code**
   - All files in `infra/modules/`
   - Shows: AWS services and architecture patterns
   - Doesn't show: Your specific configuration

3. **Documentation**
   - Setup guides, configurations, best practices
   - Generic examples only

4. **Scripts**
   - Setup scripts, utilities
   - No hardcoded credentials

### ❌ Never Commit

1. **Stack configuration files**
   ```
   Pulumi.dev.yaml      # Your actual dev config
   Pulumi.prod.yaml     # Your actual prod config
   Pulumi.staging.yaml  # Your actual staging config
   ```

2. **Files containing**:
   - AWS Account IDs (from certificate ARNs)
   - Your domain names
   - Your GitHub organization/repository
   - Your S3 bucket names
   - Any credentials or tokens

## File Structure

```
.
├── Pulumi.yaml                      # ✅ Committed (template backend URL)
├── Pulumi.dev.yaml.example          # ✅ Committed (template)
├── Pulumi.dev.yaml                  # ❌ Git-ignored (YOUR config)
├── Pulumi.prod.yaml.example         # ✅ Committed (template)
├── Pulumi.prod.yaml                 # ❌ Git-ignored (YOUR config)
├── SECURITY.md                      # ✅ Committed (security policy)
├── infra/                           # ✅ Committed (all code)
├── scripts/
│   ├── setup-config.sh              # ✅ Committed (setup helper)
│   ├── setup-github-token.sh        # ✅ Committed (token helper)
│   ├── pre-commit-hook.sh           # ✅ Committed (security check)
│   └── install-git-hooks.sh         # ✅ Committed (hook installer)
└── .gitignore                       # ✅ Committed (ignores Pulumi.*.yaml)
```

## Setup Process

### For Original Author (You)

#### Step 1: Create Your Local Config

```bash
# Run setup script
./scripts/setup-config.sh

# This creates Pulumi.dev.yaml from template
# With YOUR real values (git-ignored)
```

#### Step 2: Install Security Hooks

```bash
# Install pre-commit hooks
./scripts/install-git-hooks.sh

# This prevents accidental commits of sensitive files
```

#### Step 3: Verify Git-Ignore

```bash
# Check what's tracked
git status

# Should NOT show:
# - Pulumi.dev.yaml
# - Pulumi.prod.yaml

# Should show:
# - Pulumi.dev.yaml.example
# - Pulumi.prod.yaml.example
```

#### Step 4: Test Security

```bash
# Try to commit your config (should fail)
git add Pulumi.dev.yaml
git commit -m "test"

# Should get error:
# ERROR: Attempting to commit sensitive file
```

### For Contributors (Others)

When someone clones your public repo:

```bash
# 1. Clone
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO

# 2. Run setup
./scripts/setup-config.sh
# Creates their own Pulumi.*.yaml (git-ignored)

# 3. They configure with THEIR values:
#    - Their AWS account
#    - Their domain
#    - Their certificates
#    - Their GitHub repo (or fork)

# 4. Install hooks
./scripts/install-git-hooks.sh

# 5. Deploy to their own AWS account
make deploy
```

## What Gets Exposed?

### In Public Repo ✅

**Infrastructure patterns:**
- ECS Fargate setup
- Amplify configuration
- ALB with HTTPS
- Lambda scaling
- WAF rules structure

**Technology choices:**
- Python + Pulumi
- Flask + React
- AWS services used

**Architecture:**
- How components connect
- Security best practices
- Cost optimization patterns

### NOT in Public Repo ❌

**Your specific deployment:**
- Your AWS account ID
- Your domain name
- Your GitHub organization
- Your certificate ARNs
- Your S3 bucket names

**Credentials:**
- AWS access keys
- GitHub tokens
- Any passwords

## Migration to Public Repo

If you have an existing private repo with real values:

### Step 1: Create Templates

```bash
# Backup your configs
cp Pulumi.dev.yaml Pulumi.dev.yaml.backup
cp Pulumi.prod.yaml Pulumi.prod.yaml.backup

# Create templates
cp Pulumi.dev.yaml.backup Pulumi.dev.yaml.example
cp Pulumi.prod.yaml.backup Pulumi.prod.yaml.example
```

### Step 2: Replace Sensitive Values

Edit `.example` files and replace:

```yaml
# Before (real values)
hostedZoneDomain: mycompany.com
certificateArn: arn:aws:acm:eu-north-1:123456789012:certificate/abc-123
githubRepoUrl: https://github.com/mycompany/my-repo

# After (placeholders)
hostedZoneDomain: example.com  # REPLACE: Your domain
certificateArn: arn:aws:acm:REGION:ACCOUNT_ID:certificate/CERTIFICATE_ID  # REPLACE
githubRepoUrl: https://github.com/YOUR_ORG/YOUR_REPO  # REPLACE
```

### Step 3: Update .gitignore

Verify `.gitignore` includes:

```gitignore
# Pulumi configuration
Pulumi.dev.yaml
Pulumi.prod.yaml
Pulumi.staging.yaml
Pulumi.*.yaml
!Pulumi.yaml
!Pulumi.*.yaml.example
```

### Step 4: Clean Git History (If Needed)

If you've previously committed sensitive data:

```bash
# Install git-filter-repo
pip install git-filter-repo

# Remove file from history
git filter-repo --path Pulumi.dev.yaml --invert-paths

# Or use BFG Repo-Cleaner
java -jar bfg.jar --delete-files Pulumi.dev.yaml
```

**Warning:** This rewrites history. Coordinate with team!

### Step 5: Verify Before Publishing

```bash
# Check tracked files
git ls-files | grep "Pulumi"

# Should only show:
# Pulumi.yaml
# Pulumi.dev.yaml.example
# Pulumi.prod.yaml.example

# Search for sensitive patterns
git grep "arn:aws:acm.*[0-9]{12}" -- "*.yaml"
# Should only find examples with ACCOUNT_ID placeholder

# Check for real domains
git grep "mycompany.com" -- "*.yaml"
# Should find nothing

# Check for real GitHub repos
git grep "github.com/mycompany" -- "*.yaml"
# Should find nothing
```

### Step 6: Make Repository Public

1. Go to GitHub repository settings
2. Scroll to "Danger Zone"
3. Click "Change visibility"
4. Select "Public"
5. Confirm

## Maintaining Security

### Before Every Commit

```bash
# Always check what you're committing
git status
git diff --cached

# If you see Pulumi.dev.yaml or Pulumi.prod.yaml:
# - STOP
# - Don't commit
# - They should be git-ignored
```

### Regular Audits

```bash
# Monthly check for sensitive data
git grep -i "arn:aws" -- "*.yaml" | grep -v example
git grep -i "github.com" -- "*.yaml" | grep -v example | grep -v YOUR_ORG

# Should find nothing in non-example files
```

### Team Education

Share this checklist with contributors:

- [ ] Never commit `Pulumi.*.yaml` (except `.example`)
- [ ] Always use templates for your values
- [ ] Install git hooks for protection
- [ ] Review `git status` before committing
- [ ] Use `git diff --cached` to review changes
- [ ] Report any exposed secrets immediately

## Example Workflow

### Developer A (You) - Initial Setup

```bash
# 1. Create templates with placeholders
vim Pulumi.dev.yaml.example  # Add YOUR_ORG placeholders

# 2. Commit templates
git add Pulumi.dev.yaml.example
git commit -m "Add configuration template"

# 3. Create your local config
cp Pulumi.dev.yaml.example Pulumi.dev.yaml
vim Pulumi.dev.yaml  # Add real values

# 4. Verify it's ignored
git status  # Should NOT show Pulumi.dev.yaml

# 5. Deploy
make deploy
```

### Developer B (Contributor) - Using Templates

```bash
# 1. Clone public repo
git clone https://github.com/YOUR_ORG/YOUR_REPO.git

# 2. Run setup
./scripts/setup-config.sh  # Creates Pulumi.dev.yaml

# 3. Deploy to their account
make deploy  # Uses their AWS account
```

## Troubleshooting

### "Configuration file not found"

```bash
# You forgot to create local config
./scripts/setup-config.sh

# Or manually:
cp Pulumi.dev.yaml.example Pulumi.dev.yaml
vim Pulumi.dev.yaml  # Add your values
```

### "Git is tracking my config file"

```bash
# Check if accidentally added
git status

# If yes, remove from tracking
git rm --cached Pulumi.dev.yaml
git commit -m "Remove config from tracking"

# Verify .gitignore includes it
cat .gitignore | grep "Pulumi.*.yaml"
```

### "Pre-commit hook failing"

```bash
# Good! It's working.
# You're trying to commit a sensitive file.

# Check what you're committing
git status

# Don't use --no-verify unless you're absolutely sure
```

### "Accidentally committed secrets"

See [SECURITY.md](../SECURITY.md) incident response section.

## Benefits of This Approach

### ✅ Advantages

1. **Shareable**: Can open-source your infrastructure patterns
2. **Reusable**: Others can use your setup as template
3. **Secure**: No exposure of your specific deployment
4. **Collaborative**: Easy for team to contribute
5. **Educational**: Shows best practices to community

### ⚠️ Considerations

1. **Initial setup required**: Contributors must run setup scripts
2. **Documentation critical**: Must explain template system
3. **Discipline needed**: Team must follow security practices
4. **Git hooks helpful**: But can be bypassed

## Checklist Before Going Public

- [ ] All config files have `.example` versions with placeholders
- [ ] `.gitignore` includes all `Pulumi.*.yaml` (except `.example`)
- [ ] No AWS account IDs in tracked files
- [ ] No real domain names in tracked files
- [ ] No GitHub org/repo names in tracked files
- [ ] `Pulumi.yaml` backend URL is placeholder
- [ ] Setup scripts created and tested
- [ ] Pre-commit hooks created and tested
- [ ] `SECURITY.md` documentation complete
- [ ] Tested cloning and setup as new contributor
- [ ] Git history cleaned (if previously had secrets)
- [ ] Team educated on security practices
- [ ] Incident response plan documented

## Questions?

- **Q: Can I commit Pulumi.yaml?**
  - A: Yes, but replace S3 bucket name with placeholder

- **Q: What about documentation examples?**
  - A: Always use `example.com`, `YOUR_ORG`, `ACCOUNT_ID`

- **Q: Can I share my actual config?**
  - A: Only through secure channels (encrypted), never in git

- **Q: What if I need environment-specific code?**
  - A: Use Pulumi stack configurations, not code changes

- **Q: How do I onboard new team members?**
  - A: Share this guide, have them run setup scripts

## Additional Resources

- [SECURITY.md](../SECURITY.md) - Security policy
- [.gitignore](../.gitignore) - Git ignore patterns
- [scripts/](../scripts/) - Setup and security scripts
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
