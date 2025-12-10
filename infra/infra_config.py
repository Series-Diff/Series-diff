"""
Configuration management for infrastructure.
Centralizes all configuration values and provides validation.
"""

import pulumi


class InfraConfig:
    """Infrastructure configuration with validation."""

    def __init__(self):
        self.pulumi_config = pulumi.Config()

        # AWS Configuration
        self.aws_region = pulumi.Config("aws").require("region")
        self.environment = pulumi.get_stack()

        # Domain Configuration
        self.hosted_zone_domain = self.pulumi_config.require("hostedZoneDomain")
        # For non-prod environments, add environment suffix to subdomains
        subdomain_suffix = "" if self.environment == "prod" else f"-{self.environment}"
        self.be_subdomain = (
            self.pulumi_config.get("beSubdomain") or f"api{subdomain_suffix}"
        )
        self.fe_subdomain = (
            self.pulumi_config.get("feSubdomain") or f"www{subdomain_suffix}"
        )

        # Certificate
        self.certificate_arn = self.pulumi_config.require("certificateArn")

        # GitHub Configuration
        self.github_repo_url = self.pulumi_config.require("githubRepoUrl")
        self.github_token_param_name = (
            self.pulumi_config.get("githubTokenParamName")
            or "/comparison_tool/github_token"
        )
        self.github_branch = self.pulumi_config.get("githubBranch") or (
            "main" if self.environment == "prod" else "dev"
        )

        # ECS Configuration
        self.ecs_task_cpu = self.pulumi_config.get("ecsTaskCpu") or "256"
        self.ecs_task_memory = self.pulumi_config.get("ecsTaskMemory") or "512"
        self.ecs_desired_count = self.pulumi_config.get_int("ecsDesiredCount") or 1
        self.ecs_log_retention_days = (
            self.pulumi_config.get_int("ecsLogRetentionDays") or 3
        )

        # Lambda Scaling Configuration
        self.lambda_scaling_enabled = (
            self.pulumi_config.get_bool("lambdaScalingEnabled") or True
        )
        self.scale_down_cron = (
            self.pulumi_config.get("scaleDownCron") or "cron(0 20 ? * MON-FRI *)"
        )
        self.scale_up_cron = (
            self.pulumi_config.get("scaleUpCron") or "cron(0 8 ? * MON-FRI *)"
        )

        # Cognito Configuration (disabled by default)
        self.cognito_enabled = self.pulumi_config.get_bool("cognitoEnabled") or False
        self.cognito_domain_prefix = (
            self.pulumi_config.get("cognitoDomainPrefix")
            or f"comparison-tool-{self.environment}"
        )

        # Cognito callback URLs (required if Cognito is enabled)
        if self.cognito_enabled:
            fe_url = f"https://{self.fe_subdomain}.{self.hosted_zone_domain}"
            self.cognito_callback_urls = [fe_url, f"{fe_url}/callback"]
        else:
            self.cognito_callback_urls = []

        self._validate()

    def _validate(self):
        """Validate configuration values."""
        # Validate region is in EU
        if not self.aws_region.startswith("eu-"):
            pulumi.log.warn(
                f"Region {self.aws_region} is not in EU. Consider using an EU region."
            )

        # Validate certificate ARN format
        if not self.certificate_arn.startswith("arn:aws:acm:"):
            raise ValueError("certificateArn must be a valid ACM certificate ARN")

        # Validate GitHub repo URL
        if not self.github_repo_url.startswith("https://github.com/"):
            raise ValueError("githubRepoUrl must be a valid GitHub HTTPS URL")

        # Validate cron expressions if scaling is enabled
        if self.lambda_scaling_enabled:
            if not self.scale_down_cron.startswith("cron("):
                raise ValueError("scaleDownCron must be a valid cron expression")
            if not self.scale_up_cron.startswith("cron("):
                raise ValueError("scaleUpCron must be a valid cron expression")
