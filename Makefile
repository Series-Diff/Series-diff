.PHONY: help init dependencies refresh check-aws check-config login stack-init preview deploy destroy logs clean clean-all lint docker-build docker-push ci-deploy

# Default stack is dev
STACK ?= dev

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
NC := \033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Available commands:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'

# --- GLOBAL SETUP & DEPENDENCIES ---

init: ## Initialize ALL environments (Infra, Backend, Frontend)
	@echo "$(GREEN)Initializing Root Infrastructure (Poetry)...$(NC)"
	@python3 -m venv .venv
	@poetry config virtualenvs.in-project true
	@poetry install
	@echo "$(GREEN)Initializing Backend (Poetry)...$(NC)"
	@cd Flask-API && poetry config virtualenvs.in-project true && poetry install
	@echo "$(GREEN)Initializing Frontend (npm)...$(NC)"
	@cd client && npm install
	@echo "$(GREEN)✓ Project initialized!$(NC)"
	@echo run "source .venv/bin/activate" to activate the root virtual environment.

dependencies: ## Install/Update dependencies for ALL parts
	@echo "$(GREEN)Updating Infrastructure dependencies...$(NC)"
	@poetry lock && poetry install
	@echo "$(GREEN)Updating Backend dependencies...$(NC)"
	@cd Flask-API && poetry lock && poetry install
	@echo "$(GREEN)Updating Frontend dependencies...$(NC)"
	@cd client && npm install
	@echo "$(GREEN)✓ All dependencies up to date!$(NC)"

refresh: clean-all init ## NUCLEAR OPTION: Delete all envs and reinstall everything
	@echo "$(GREEN)✓ Environment freshly recreated!$(NC)"

# --- AWS & PULUMI HELPERS ---

setup-config: ## Create Pulumi configuration from templates
	@chmod +x scripts/setup-config.sh
	@./scripts/setup-config.sh

setup-github-token: ## Setup GitHub token in Pulumi Config
	@echo "$(YELLOW)Enter your GitHub Personal Access Token:$(NC)"
	@read -s TOKEN; \
	poetry run pulumi config set --secret githubToken $$TOKEN --stack $(STACK)

check-aws: ## Check AWS credentials
	@echo "$(GREEN)Checking AWS configuration...$(NC)"
	@if ! command -v aws &> /dev/null; then \
		echo "$(RED)✗ AWS CLI not found.$(NC)"; exit 1; \
	fi
	@if ! aws sts get-caller-identity &> /dev/null; then \
		echo "$(RED)✗ AWS credentials not configured or expired.$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ AWS credentials valid$(NC)"

check-config: ## Validate Pulumi configuration
	@echo "$(GREEN)Checking Pulumi configuration for stack: $(STACK)...$(NC)"
	@if [ ! -f "Pulumi.$(STACK).yaml" ]; then \
		echo "$(RED)✗ Configuration file Pulumi.$(STACK).yaml not found$(NC)"; \
		exit 1; \
	fi
	@poetry run pulumi config -s $(STACK) > /dev/null
	@echo "$(GREEN)✓ Configuration file valid$(NC)"

login: ## Login to Pulumi S3 backend
	@echo "$(GREEN)Logging in to Pulumi S3 backend...$(NC)"
	@poetry run pulumi login s3://pulumi-state-bucket-5ae360c

stack-init: login ## Initialize a new Pulumi stack
	@echo "$(GREEN)Initializing stack: $(STACK)...$(NC)"
	@poetry run pulumi stack init $(STACK) || echo "$(YELLOW)Stack already exists$(NC)"
	@poetry run pulumi stack select $(STACK)

preview: check-aws check-config ## Preview infrastructure changes
	@echo "$(GREEN)Previewing changes for stack: $(STACK)...$(NC)"
	@poetry run pulumi preview -s $(STACK)

deploy: check-aws check-config ## Deploy infrastructure
	@echo "$(GREEN)Deploying infrastructure for stack: $(STACK)...$(NC)"
	@poetry run pulumi up -s $(STACK)

deploy-yes: check-aws check-config ## Deploy infrastructure without confirmation
	@echo "$(GREEN)Deploying infrastructure for stack: $(STACK) (auto-approve)...$(NC)"
	@poetry run pulumi up -s $(STACK) --yes

destroy: check-aws ## Destroy infrastructure
	@echo "$(RED)WARNING: This will destroy all infrastructure for stack: $(STACK)$(NC)"
	@poetry run pulumi destroy -s $(STACK)

refresh-stack: check-aws ## Refresh stack state (Pulumi refresh)
	@echo "$(GREEN)Refreshing stack state: $(STACK)...$(NC)"
	@poetry run pulumi refresh -s $(STACK)

outputs: ## Show stack outputs
	@echo "$(GREEN)Stack outputs for: $(STACK)$(NC)"
	@poetry run pulumi stack output -s $(STACK)

logs: check-aws ## View ECS task logs
	@echo "$(GREEN)Fetching ECS logs for stack $(STACK)...$(NC)"
	@aws logs tail /ecs/flask-api-$(STACK)-logs --follow

# --- BACKEND & DOCKER ---

lint: ## Run code linting
	@echo "$(GREEN)Running flake8 linter...$(NC)"
	@cd Flask-API && poetry run black . && poetry run flake8 --ignore E501,W503,F541 --exclude .venv --max-line-length 127 .
	@echo "$(GREEN)✓ Linting complete!$(NC)"

ECR_REPOSITORY ?= flask-api
ECR_REGISTRY ?= local
IMAGE_TAG ?= latest

docker-build: ## Build backend image
	@echo "$(GREEN)Building Docker image for $(ECR_REPOSITORY)...$(NC)"
	@cd Flask-API && docker build --platform linux/amd64 -t $(ECR_REPOSITORY):$(IMAGE_TAG) .

docker-push: ## Push image to ECR
	@echo "$(GREEN)Pushing to ECR...$(NC)"
	@docker tag $(ECR_REPOSITORY):$(IMAGE_TAG) $(ECR_REGISTRY)/$(ECR_REPOSITORY):$(IMAGE_TAG)
	@docker tag $(ECR_REPOSITORY):$(IMAGE_TAG) $(ECR_REGISTRY)/$(ECR_REPOSITORY):latest
	@docker push $(ECR_REGISTRY)/$(ECR_REPOSITORY):$(IMAGE_TAG)
	@docker push $(ECR_REGISTRY)/$(ECR_REPOSITORY):latest

ci-deploy: check-config ## Deploy specific for CI environment
	@echo "$(GREEN)Deploying from CI environment...$(NC)"
	@poetry run pulumi up -s $(STACK) --yes --skip-preview

# --- CLEANUP ---

clean: ## Clean temporary files
	@echo "$(GREEN)Cleaning temporary files...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf dist/ build/ 2>/dev/null || true

clean-all: clean ## Clean EVERYTHING (venvs, node_modules)
	@echo "$(YELLOW)Removing all virtual environments and node_modules...$(NC)"
	@rm -rf .venv/
	@rm -rf Flask-API/.venv/
	@rm -rf client/node_modules/
	@echo "$(GREEN)✓ Full cleanup complete$(NC)"