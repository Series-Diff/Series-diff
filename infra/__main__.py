"""
Main Pulumi program entry point.
Orchestrates the creation of all infrastructure components.
"""

import pulumi
import os

from infra_config import InfraConfig
from modules.ecr import create_ecr_repository, build_and_push_image
from modules.networking import create_networking
from modules.ecs import (
    create_ecs_cluster,
    create_ecs_task_definition,
    create_ecs_service,
)
from modules.redis import create_redis
from modules.alb import create_alb, create_target_group
from modules.dns import create_dns_record
from modules.lambda_scaling import create_scaling_lambda
from modules.lambda_executor import create_plugin_executor_lambda
from modules.amplify import create_amplify_app
from modules.cognito import create_cognito_resources

# Get the project root directory (parent of infra/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load configuration
config = InfraConfig()

# Export configuration for reference
pulumi.export("region", config.aws_region)
pulumi.export("environment", config.environment)

# ECR and Docker Image
ecr_repo = create_ecr_repository(config.environment)
flask_api_path = os.path.join(PROJECT_ROOT, "Flask-API")
pulumi.log.info(f"Flask API path: {flask_api_path}")
pulumi.log.info(
    f"Dockerfile exists: {os.path.exists(os.path.join(flask_api_path, 'Dockerfile'))}"
)
api_image = build_and_push_image(ecr_repo, flask_api_path, config.environment)
pulumi.export("image_url", api_image.ref)

# Networking
networking = create_networking(config.environment)
valkey_resource = create_redis(networking, config.environment)
valkey_endpoint = valkey_resource.endpoints.apply(lambda eps: eps[0].address)
pulumi.export("redis_endpoint", valkey_endpoint)
pulumi.export("vpc_id", networking["vpc_id"])
pulumi.export("subnet_ids", networking["subnet_ids"])

# Cognito (optional, controlled by config)
cognito = None
if config.cognito_enabled:
    cognito = create_cognito_resources(
        domain_prefix=config.cognito_domain_prefix,
        callback_urls=config.cognito_callback_urls,
    )
    pulumi.export("cognito_user_pool_id", cognito["user_pool"].id)
    pulumi.export("cognito_user_pool_client_id", cognito["user_pool_client"].id)
    pulumi.export("cognito_domain", cognito["domain"].domain)

# Application Load Balancer
target_group = create_target_group(networking["vpc_id"], config.environment)
alb_resources = create_alb(
    networking=networking,
    target_group=target_group,
    certificate_arn=config.certificate_arn,
    environment=config.environment,
    cognito_config=cognito if config.cognito_enabled else None,
)

# Plugin Executor Lambda
plugin_executor = create_plugin_executor_lambda(config.environment)
pulumi.export("plugin_executor_function_name", plugin_executor["function_name"])

# ECS Cluster and Service
cluster = create_ecs_cluster()
task_definition = create_ecs_task_definition(
    image_ref=api_image.ref,
    region=config.aws_region,
    plugin_executor_function_name=plugin_executor["function_name"],
    redis_endpoint=valkey_endpoint
)
service = create_ecs_service(
    cluster=cluster,
    task_definition=task_definition,
    networking=networking,
    target_group=target_group,
    alb_resources=alb_resources,
)

# DNS
dns_record = create_dns_record(
    hosted_zone_domain=config.hosted_zone_domain,
    subdomain=config.be_subdomain,
    alb=alb_resources["alb"],
)
pulumi.export("api_dns_record_name", dns_record.name)
pulumi.export("api_dns_record_fqdn", dns_record.fqdn)

# API URL for frontend
api_url = pulumi.Output.concat("https://", dns_record.fqdn)
pulumi.export("api_url", api_url)

# Lambda Scaling
if config.lambda_scaling_enabled:
    create_scaling_lambda(
        cluster=cluster,
        service=service,
        scale_down_cron=config.scale_down_cron,
        scale_up_cron=config.scale_up_cron,
    )

# Amplify for React Frontend
amplify_resources = create_amplify_app(
    hosted_zone_domain=config.hosted_zone_domain,
    fe_subdomain=config.fe_subdomain,
    api_url=api_url,
    github_repo_url=config.github_repo_url,
    github_branch=config.github_branch,
    github_token_ssm_param=config.github_token_param_name,
    cognito_config=cognito if config.cognito_enabled else None,
)
pulumi.export("amplify_app_url", amplify_resources["app"].default_domain)
pulumi.export(
    "amplify_custom_domain",
    pulumi.Output.concat(
        "https://", config.fe_subdomain, ".", config.hosted_zone_domain
    ),
)

# Trigger
