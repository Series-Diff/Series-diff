.PHONY: help init install check-aws preview deploy destroy logs clean test-lambda

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

init: ## Initialize Python virtual environment and install dependencies
	@echo "$(GREEN)Initializing Python virtual environment...$(NC)"
	@python3 -m venv venv
	@echo "$(GREEN)Installing Python dependencies...$(NC)"
	@. venv/bin/activate && pip install --upgrade pip
	@. venv/bin/activate && pip install -r requirements.txt
	@echo "$(GREEN)✓ Initialization complete!$(NC)"
	@echo "$(YELLOW)Run 'source venv/bin/activate' to activate the virtual environment$(NC)"

setup-config: ## Create Pulumi configuration from templates
	@chmod +x scripts/setup-config.sh
	@./scripts/setup-config.sh

setup-github-token: ## Setup GitHub token in AWS SSM
	@chmod +x scripts/setup-github-token.sh
	@./scripts/setup-github-token.sh

install: ## Install/update dependencies
	@echo "$(GREEN)Installing/updating dependencies...$(NC)"
	@. venv/bin/activate && pip install -r requirements.txt
	@echo "$(GREEN)✓ Dependencies installed$(NC)"

check-aws: ## Check AWS credentials and configuration
	@echo "$(GREEN)Checking AWS configuration...$(NC)"
	@if ! command -v aws &> /dev/null; then \
		echo "$(RED)✗ AWS CLI not found. Please install it first.$(NC)"; \
		exit 1; \
	fi
	@if ! aws sts get-caller-identity &> /dev/null; then \
		echo "$(RED)✗ AWS credentials not configured or expired.$(NC)"; \
		echo "$(YELLOW)Please run: awsume <profile-name>$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ AWS credentials valid$(NC)"
	@aws sts get-caller-identity

check-config: ## Validate Pulumi configuration
	@echo "$(GREEN)Checking Pulumi configuration for stack: $(STACK)...$(NC)"
	@if [ ! -f "Pulumi.$(STACK).yaml" ]; then \
		echo "$(RED)✗ Configuration file Pulumi.$(STACK).yaml not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Configuration file found$(NC)"
	@. venv/bin/activate && pulumi config -s $(STACK)

login: ## Login to Pulumi S3 backend
	@echo "$(GREEN)Logging in to Pulumi S3 backend...$(NC)"
	@. venv/bin/activate && pulumi login s3://pulumi-state-bucket-5ae360c

stack-init: login ## Initialize a new Pulumi stack
	@echo "$(GREEN)Initializing stack: $(STACK)...$(NC)"
	@. venv/bin/activate && pulumi stack init $(STACK) || echo "$(YELLOW)Stack already exists$(NC)"
	@. venv/bin/activate && pulumi stack select $(STACK)
	@echo "$(GREEN)✓ Stack $(STACK) ready$(NC)"

preview: check-aws check-config ## Preview infrastructure changes
	@echo "$(GREEN)Previewing changes for stack: $(STACK)...$(NC)"
	@. venv/bin/activate && pulumi preview -s $(STACK)

deploy: check-aws check-config ## Deploy infrastructure
	@echo "$(GREEN)Deploying infrastructure for stack: $(STACK)...$(NC)"
	@. venv/bin/activate  && pulumi up -s $(STACK)

deploy-yes: check-aws check-config ## Deploy infrastructure without confirmation
	@echo "$(GREEN)Deploying infrastructure for stack: $(STACK) (auto-approve)...$(NC)"
	@. venv/bin/activate  && pulumi up -s $(STACK) --yes

destroy: check-aws ## Destroy infrastructure (with confirmation)
	@echo "$(RED)WARNING: This will destroy all infrastructure for stack: $(STACK)$(NC)"
	@. venv/bin/activate && pulumi destroy -s $(STACK)

destroy-yes: check-aws ## Destroy infrastructure without confirmation
	@echo "$(RED)Destroying infrastructure for stack: $(STACK) (auto-approve)...$(NC)"
	@. venv/bin/activate && pulumi destroy -s $(STACK) --yes

refresh: check-aws ## Refresh stack state with actual infrastructure
	@echo "$(GREEN)Refreshing stack state: $(STACK)...$(NC)"
	@. venv/bin/activate && pulumi refresh -s $(STACK)

outputs: ## Show stack outputs
	@echo "$(GREEN)Stack outputs for: $(STACK)$(NC)"
	@. venv/bin/activate && pulumi stack output -s $(STACK)

logs: check-aws ## View ECS task logs (requires stack outputs)
	@echo "$(GREEN)Fetching ECS logs...$(NC)"
	@aws logs tail /ecs/flask-api-logs --follow

test-lambda: check-aws ## Test Lambda scaling function manually
	@echo "$(GREEN)Testing Lambda scaling function...$(NC)"
	@FUNCTION_NAME=$$(. venv/bin/activate && cd infra && pulumi stack output -s $(STACK) --json | jq -r '.lambda_function_name // empty'); \
	if [ -z "$$FUNCTION_NAME" ]; then \
		echo "$(RED)Lambda function not found in outputs$(NC)"; \
		exit 1; \
	fi; \
	aws lambda invoke \
		--function-name $$FUNCTION_NAME \
		--payload '{"desired_count": 1}' \
		response.json && cat response.json && rm response.json

clean: ## Clean temporary files and caches
	@echo "$(GREEN)Cleaning temporary files...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf dist/ build/ 2>/dev/null || true
	@echo "$(GREEN)✓ Cleanup complete$(NC)"

clean-all: clean ## Clean everything including venv
	@echo "$(YELLOW)Removing virtual environment...$(NC)"
	@rm -rf venv/
	@echo "$(GREEN)✓ Full cleanup complete$(NC)"

# Development helpers
dev-setup: init setup-config login stack-init check-config ## Complete setup for new developers
	@echo "$(GREEN)════════════════════════════════════════$(NC)"
	@echo "$(GREEN)   Development Environment Ready!$(NC)"
	@echo "$(GREEN)════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Activate virtual environment: $(GREEN)source venv/bin/activate$(NC)"
	@echo "  2. Setup GitHub token: $(GREEN)make setup-github-token$(NC)"
	@echo "  3. Review configuration: $(GREEN)vim Pulumi.$(STACK).yaml$(NC)"
	@echo "  4. Preview changes: $(GREEN)make preview$(NC)"
	@echo "  5. Deploy: $(GREEN)make deploy$(NC)"

# Production deployment helpers
prod-deploy: ## Deploy to production (requires confirmation)
	@echo "$(RED)═══════════════════════════════════════════$(NC)"
	@echo "$(RED)   PRODUCTION DEPLOYMENT$(NC)"
	@echo "$(RED)═══════════════════════════════════════════$(NC)"
	@read -p "Are you sure you want to deploy to PRODUCTION? [yes/no]: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		$(MAKE) deploy STACK=prod; \
	else \
		echo "$(YELLOW)Deployment cancelled$(NC)"; \
	fi
	
lint: ## Run code linting (flake8)
	@echo "$(GREEN)Running flake8 linter...$(NC)"
	@# Uruchamiamy flake8 wewnątrz środowiska poetry w katalogu Flask-API
	@cd Flask-API && poetry run flake8 . --exclude .venv,__pycache__

# Quick commands
up: deploy ## Alias for deploy
down: destroy ## Alias for destroy
