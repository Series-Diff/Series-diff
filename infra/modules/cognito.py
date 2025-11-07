"""
Amazon Cognito resources for user authentication.
This module is disabled by default. Enable via config: cognitoEnabled=true
"""
import pulumi_aws as aws
from typing import List, Dict, Any


def create_cognito_resources(
    domain_prefix: str,
    callback_urls: List[str]
) -> Dict[str, Any]:
    """
    Create Cognito User Pool, Client, and Domain for authentication.

    This sets up Option A: ALB with Cognito authentication.
    Users authenticate via Cognito before reaching the Flask API.

    Args:
        domain_prefix: Unique prefix for Cognito domain (e.g., comparison-tool-dev)
        callback_urls: List of allowed callback URLs after authentication

    Returns:
        Dict containing Cognito resources (user_pool, user_pool_client, domain)
    """
    # Cognito User Pool
    user_pool = aws.cognito.UserPool(
        "user-pool",
        name="comparison-tool-users",
        # Password policy
        password_policy=aws.cognito.UserPoolPasswordPolicyArgs(
            minimum_length=8,
            require_lowercase=True,
            require_uppercase=True,
            require_numbers=True,
            require_symbols=True,
            temporary_password_validity_days=7
        ),
        # User attributes
        auto_verified_attributes=["email"],
        username_attributes=["email"],
        # Account recovery
        account_recovery_setting=aws.cognito.UserPoolAccountRecoverySettingArgs(
            recovery_mechanisms=[
                aws.cognito.UserPoolAccountRecoverySettingRecoveryMechanismArgs(
                    name="verified_email",
                    priority=1
                )
            ]
        ),
        # Email configuration (uses Cognito default)
        email_configuration=aws.cognito.UserPoolEmailConfigurationArgs(
            email_sending_account="COGNITO_DEFAULT"
        ),
        # MFA configuration (optional)
        # mfa_configuration="OPTIONAL",
        # Schema attributes
        schemas=[
            aws.cognito.UserPoolSchemaArgs(
                name="email",
                attribute_data_type="String",
                required=True,
                mutable=True
            ),
            aws.cognito.UserPoolSchemaArgs(
                name="name",
                attribute_data_type="String",
                required=False,
                mutable=True
            )
        ],
        tags={
            "Name": "comparison-tool-user-pool"
        }
    )

    # Cognito User Pool Client (for ALB authentication)
    user_pool_client = aws.cognito.UserPoolClient(
        "user-pool-client",
        name="comparison-tool-alb-client",
        user_pool_id=user_pool.id,
        # OAuth configuration for ALB
        generate_secret=True,  # Required for ALB authentication
        allowed_oauth_flows=["code"],
        allowed_oauth_scopes=["openid", "profile", "email"],
        allowed_oauth_flows_user_pool_client=True,
        callback_urls=callback_urls,
        logout_urls=callback_urls,
        supported_identity_providers=["COGNITO"],
        # Token validity
        access_token_validity=1,  # 1 hour
        id_token_validity=1,      # 1 hour
        refresh_token_validity=30,  # 30 days
        token_validity_units=aws.cognito.UserPoolClientTokenValidityUnitsArgs(
            access_token="hours",
            id_token="hours",
            refresh_token="days"
        ),
        # Prevent user existence errors
        prevent_user_existence_errors="ENABLED"
    )

    # Cognito Domain (required for hosted UI)
    domain = aws.cognito.UserPoolDomain(
        "user-pool-domain",
        domain=domain_prefix,
        user_pool_id=user_pool.id
    )

    return {
        "user_pool": user_pool,
        "user_pool_client": user_pool_client,
        "domain": domain
    }
