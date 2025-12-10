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
    github_branch: str,
    github_token_ssm_param: str,
    cognito_config: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Create AWS Amplify app for React frontend with custom domain.

    Args:
        hosted_zone_domain: Root domain (e.g., example.com)
        fe_subdomain: Frontend subdomain (e.g., www)
        api_url: Backend API URL
        github_repo_url: GitHub repository URL
        github_branch: GitHub branch to deploy from (e.g., 'dev', 'main')
        github_token_ssm_param: SSM parameter name containing GitHub token (required by Amplify API)
        cognito_config: Optional Cognito configuration for frontend

    Returns:
        Dict containing Amplify app and branch resources
    """
    # Get the buildspec file path relative to this module
    # This file is in infra/modules/, so go up one level to infra/, then into buildspecs/
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    infra_dir = os.path.dirname(current_file_dir)  # infra/
    buildspec_path = os.path.join(infra_dir, "buildspecs", "amplify-react.yml")

    # Get GitHub token from SSM (required by Amplify API even for public repos)
    try:
        existing_param = aws.ssm.get_parameter(
            name=github_token_ssm_param, with_decryption=True
        )
        access_token = pulumi.Output.secret(existing_param.value)
        pulumi.log.info(f"Using GitHub token from SSM: {github_token_ssm_param}")
    except Exception as e:
        pulumi.log.error(
            f"GitHub token parameter '{github_token_ssm_param}' not found in SSM."
        )
        pulumi.log.error(f"Please run: ./scripts/setup-github-token.sh")
        pulumi.log.error(f"Error: {e}")
        raise Exception(
            f"GitHub token required. Create it with: ./scripts/setup-github-token.sh"
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
        access_token=access_token,  # Required by Amplify API
        build_spec=buildspec_content,
        custom_rules=[
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
            },
        ],
        environment_variables={
            "REACT_APP_API_URL": api_url,
            # Add Cognito config if enabled
            **(
                {
                    "REACT_APP_COGNITO_USER_POOL_ID": cognito_config["user_pool"].id,
                    "REACT_APP_COGNITO_CLIENT_ID": cognito_config[
                        "user_pool_client"
                    ].id,
                    "REACT_APP_COGNITO_REGION": aws.get_region().name,
                    "REACT_APP_COGNITO_DOMAIN": cognito_config["domain"].domain.apply(
                        lambda d: f"{d}.auth.{aws.get_region().name}.amazoncognito.com"
                    ),
                }
                if cognito_config
                else {}
            ),
        },
        tags={"Name": "comparison-tool-react-amplify"},
    )

    # Create branch for deployment
    amplify_branch = aws.amplify.Branch(
        f"{github_branch}-branch",
        app_id=amplify_app.id,
        branch_name=github_branch,
        framework="React",
        enable_auto_build=True,
        stage="PRODUCTION" if github_branch == "main" else "DEVELOPMENT",
        tags={"Name": f"{github_branch}-branch", "Branch": github_branch},
    )

    # Custom domain association
    # Build subdomain list based on environment
    sub_domains = [
        # Primary subdomain (www-dev, www-staging, or www for prod)
        aws.amplify.DomainAssociationSubDomainArgs(
            branch_name=amplify_branch.branch_name, prefix=fe_subdomain
        ),
    ]

    # Only add root domain (apex) for production
    # Dev/staging shouldn't claim the root domain
    if github_branch == "main":
        sub_domains.append(
            aws.amplify.DomainAssociationSubDomainArgs(
                branch_name=amplify_branch.branch_name,
                prefix="",  # Root domain (example.com)
            )
        )

    domain_association = aws.amplify.DomainAssociation(
        f"customDomain-{github_branch}",
        app_id=amplify_app.id,
        domain_name=hosted_zone_domain,
        enable_auto_sub_domain=True,
        wait_for_verification=False,
        sub_domains=sub_domains,
    )

    return {"app": amplify_app, "branch": amplify_branch, "domain": domain_association}
