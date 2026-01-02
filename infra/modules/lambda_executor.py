"""
Lambda function and ECR repository for sandboxed plugin execution.
Uses container image to include large scientific Python libraries.
"""

import os
import json
import pulumi
import pulumi_aws as aws
import pulumi_docker_build as docker_build

from infra_config import InfraConfig


def create_plugin_executor_ecr(environment: str) -> aws.ecr.Repository:
    """Create ECR repository for plugin executor Lambda image."""
    return aws.ecr.Repository(
        f"plugin-executor-{environment}",
        name=f"plugin-executor-{environment}",
        image_scanning_configuration=aws.ecr.RepositoryImageScanningConfigurationArgs(
            scan_on_push=True
        ),
        force_delete=True,
        tags={
            "Name": f"plugin-executor-{environment}-repository",
            "Environment": environment,
        },
    )


def build_plugin_executor_image(
    ecr_repo: aws.ecr.Repository, environment: str
) -> docker_build.Image:
    """Build and push plugin executor container image to ECR."""
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    infra_dir = os.path.dirname(current_file_dir)
    lambda_path = os.path.join(infra_dir, "lambda", "plugin_executor")

    auth_token = aws.ecr.get_authorization_token_output(
        registry_id=ecr_repo.registry_id
    )

    image = docker_build.Image(
        f"plugin-executor-image-{environment}",
        tags=[ecr_repo.repository_url.apply(lambda url: f"{url}:latest")],
        context=docker_build.BuildContextArgs(
            location=lambda_path,
        ),
        cache_from=[
            docker_build.CacheFromArgs(
                registry=docker_build.CacheFromRegistryArgs(
                    ref=ecr_repo.repository_url.apply(lambda url: f"{url}:latest"),
                ),
            )
        ],
        cache_to=[
            docker_build.CacheToArgs(
                inline=docker_build.CacheToInlineArgs(),
            )
        ],
        platforms=[docker_build.Platform.LINUX_AMD64],
        push=True,
        registries=[
            docker_build.RegistryArgs(
                address=ecr_repo.repository_url,
                password=auth_token.password,
                username=auth_token.user_name,
            )
        ],
    )

    return image


def create_plugin_executor_lambda(environment: str) -> dict:
    """
    Create Lambda function for plugin execution with container image.

    Returns:
        dict with 'function' (Lambda Function) and 'function_name' (Output[str])
    """
    config = InfraConfig()

    ecr_repo = create_plugin_executor_ecr(environment)
    image = build_plugin_executor_image(ecr_repo, environment)

    lambda_role = aws.iam.Role(
        f"plugin-executor-role-{environment}",
        name=f"plugin-executor-role-{environment}",
        assume_role_policy=json.dumps({
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "sts:AssumeRole",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Effect": "Allow"
            }]
        }),
        tags={
            "Name": f"plugin-executor-role-{environment}",
            "Environment": environment,
        },
    )

    aws.iam.RolePolicyAttachment(
        f"plugin-executor-basic-policy-{environment}",
        role=lambda_role.name,
        policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    )

    lambda_function = aws.lambda_.Function(
        f"plugin-executor-{environment}",
        name=f"plugin-executor-{environment}",
        package_type="Image",
        image_uri=image.ref,
        role=lambda_role.arn,
        timeout=120,
        memory_size=512,
        tags={
            "Name": f"plugin-executor-{environment}",
            "Environment": environment,
        },
    )

    return {
        "function": lambda_function,
        "function_name": lambda_function.name,
        "ecr_repo": ecr_repo,
    }
