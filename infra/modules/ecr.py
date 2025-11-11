"""
ECR repository and Docker image building.
"""
import os
import pulumi_aws as aws
import pulumi_docker_build as docker_build


def create_ecr_repository() -> aws.ecr.Repository:
    """
    Create an ECR repository for the Flask API.
    
    Returns:
        ECR Repository resource
    """
    ecr_repository = aws.ecr.Repository(
        "flask-api",
        name="flask-api",
        image_scanning_configuration=aws.ecr.RepositoryImageScanningConfigurationArgs(
            scan_on_push=True
        ),
        tags={
            "Name": "flask-api-repository"
        }
    )
    
    return ecr_repository


def build_and_push_image(ecr_repo: aws.ecr.Repository, context_path: str) -> docker_build.Image:
    """
    Build and push Docker image to ECR with caching.
    
    Args:
        ecr_repo: ECR repository to push to
        context_path: Path to Docker build context
        
    Returns:
        Docker image resource
    """
    # Get auth credentials for ECR
    auth_token = aws.ecr.get_authorization_token_output(
        registry_id=ecr_repo.registry_id
    )
    
    # Build and push image
    image = docker_build.Image(
        "flask-api-image",
        # Tag image with ECR repository URL
        tags=[ecr_repo.repository_url.apply(
            lambda url: f"{url}:latest"
        )],
        context=docker_build.BuildContextArgs(
            location=context_path,
        ),
        # Use pushed image as cache source
        cache_from=[docker_build.CacheFromArgs(
            registry=docker_build.CacheFromRegistryArgs(
                ref=ecr_repo.repository_url.apply(
                    lambda url: f"{url}:latest"
                ),
            ),
        )],
        # Include inline cache with pushed image
        cache_to=[docker_build.CacheToArgs(
            inline=docker_build.CacheToInlineArgs(),
        )],
        # Build for AMD64 architecture
        platforms=[
            docker_build.Platform.LINUX_AMD64
        ],
        # Push to ECR
        push=True,
        # Provide ECR credentials
        registries=[docker_build.RegistryArgs(
            address=ecr_repo.repository_url,
            password=auth_token.password,
            username=auth_token.user_name,
        )],
    )
    
    return image
