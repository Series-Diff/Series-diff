"""
AWS Amplify for React frontend hosting and deployment.
"""
import pulumi
import pulumi_aws as aws
from typing import Dict, Any, Optional
import os


def create_amplify_app(
    hosted_zone_domain: str,
    fe_subdomain: str,
    api_url: pulumi.Output[str],
    github_repo_url: str,
    github_token_ssm_param: str,
    cognito_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create AWS Amplify app for React frontend with custom domain.

    Args:
        hosted_zone_domain: Root domain (e.g., example.com)
        fe_subdomain: Frontend subdomain (e.g., www)
        api_url: Backend API URL
        github_repo_url: GitHub repository URL
        github_token_ssm_param: SSM parameter name containing GitHub token
        cognito_config: Optional Cognito configuration for frontend

    Returns:
        Dict containing Amplify app and branch resources
    """
    # Get the buildspec file path relative to this module
    # This file is in infra/modules/, so go up one level to infra/, then into buildspecs/
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    infra_dir = os.path.dirname(current_file_dir)  # infra/
    buildspec_path = os.path.join(infra_dir, "buildspecs", "amplify-react.yml")

    # Get GitHub token from SSM
    github_token_param = aws.ssm.Parameter(
        "githubToken",
        name=github_token_ssm_param,
        description="GitHub token for Amplify app deployment",
        type="SecureString",
        value="",
        opts=pulumi.ResourceOptions(
            ignore_changes=["value"]
        ),
        tags={
            "Name": "amplify-github-token"
        }
    )

    # Read buildspec from file
    with open(buildspec_path, "r") as f:
        buildspec_content = f.read()

    # Create Amplify App
    fe_full_name = f"{fe_subdomain}.{hosted_zone_domain}"

    amplify_app = aws.amplify.App(
        "reactApp",
        name="comparison-tool-react",
        repository=github_repo_url,
        access_token=github_token_param.value,
        build_spec=buildspec_content,
        # Custom redirect rules
        custom_rules=[
            # Redirect apex domain to www subdomain
            {
                "source": f"https://{hosted_zone_domain}",
                "target": f"https://{fe_full_name}",
                "status": "301",
                "condition": None,
            },
            # SPA routing - redirect all routes to index.html
            {
                "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)$)([^.]+$)/>",
                "target": "/index.html",
                "status": "200",
                "condition": None,
            }
        ],
        # Environment variables for React app
        environment_variables={
            "REACT_APP_API_URL": api_url,
            # Add Cognito config if enabled
            **(
                {
                    "REACT_APP_COGNITO_USER_POOL_ID": cognito_config["user_pool"].id,
                    "REACT_APP_COGNITO_CLIENT_ID": cognito_config["user_pool_client"].id,
                    "REACT_APP_COGNITO_REGION": aws.get_region().name,
                } if cognito_config else {}
            )
        },
        tags={
            "Name": "comparison-tool-react-amplify"
        }
    )

    # Create main branch
    master_branch = aws.amplify.Branch(
        "masterBranch",
        app_id=amplify_app.id,
        branch_name="main",
        framework="React",
        enable_auto_build=True,
        stage="PRODUCTION",
        tags={
            "Name": "main-branch"
        }
    )

    # Custom domain association
    domain_association = aws.amplify.DomainAssociation(
        "customDomain",
        app_id=amplify_app.id,
        domain_name=hosted_zone_domain,
        enable_auto_sub_domain=True,
        sub_domains=[
            # www subdomain
            aws.amplify.DomainAssociationSubDomainArgs(
                branch_name=master_branch.branch_name,
                prefix=fe_subdomain
            ),
            # Root domain (apex)
            aws.amplify.DomainAssociationSubDomainArgs(
                branch_name=master_branch.branch_name,
                prefix=""
            ),
        ]
    )

    return {
        "app": amplify_app,
        "branch": master_branch,
        "domain": domain_association
    }
