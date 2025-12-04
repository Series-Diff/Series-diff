"""
Application Load Balancer, Target Groups, and Listeners.
"""
import pulumi_aws as aws
from typing import Dict, Any, Optional


def create_target_group(vpc_id: str, environment: str) -> aws.lb.TargetGroup:
    """
    Create a target group for the Flask API.
    
    Args:
        vpc_id: VPC ID
        
    Returns:
        Target Group resource
    """
    target_group = aws.lb.TargetGroup(
        "tg",
        name="flask-api-tg",
        port=5000,
        protocol="HTTP",
        target_type="ip",
        vpc_id=vpc_id,
        health_check=aws.lb.TargetGroupHealthCheckArgs(
            path="/",
            protocol="HTTP",
            matcher="200",
            interval=30,
            timeout=5,
            healthy_threshold=2,
            unhealthy_threshold=3
        ),
        tags={
            "Name": f"flask-{environment}-tg",
            "Environment": environment
        }
    )
    
    return target_group


def create_alb(
    networking: Dict[str, Any],
    target_group: aws.lb.TargetGroup,
    certificate_arn: str,
    environment: str,
    cognito_config: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create an Application Load Balancer with listeners.
    
    Args:
        networking: Networking resources (subnets, security groups)
        target_group: Target group to forward traffic to
        certificate_arn: ACM certificate ARN for HTTPS
        environment: Stack environment name
        cognito_config: Optional Cognito configuration for authentication
        
    Returns:
        Dict containing ALB and listener resources
    """
    # Create ALB
    alb = aws.lb.LoadBalancer(
        f"alb-{environment}",
        name=f"flask-api-{environment}-alb",
        internal=False,
        load_balancer_type="application",
        security_groups=[networking["alb_sg"].id],
        subnets=networking["subnet_ids"],
        enable_deletion_protection=False,
        tags={
            "Name": f"flask-api-{environment}-alb",
            "Environment": environment
        }
    )
    
    # HTTPS Listener with optional Cognito authentication
    if cognito_config:
        # With Cognito authentication (Option A)
        https_listener = aws.lb.Listener(
            f"https-listener-{environment}",
            load_balancer_arn=alb.arn,
            port=443,
            protocol="HTTPS",
            ssl_policy="ELBSecurityPolicy-TLS13-1-2-2021-06",
            certificate_arn=certificate_arn,
            default_actions=[
                # First authenticate with Cognito
                aws.lb.ListenerDefaultActionArgs(
                    type="authenticate-cognito",
                    authenticate_cognito=aws.lb.ListenerDefaultActionAuthenticateCognitoArgs(
                        user_pool_arn=cognito_config["user_pool"].arn,
                        user_pool_client_id=cognito_config["user_pool_client"].id,
                        user_pool_domain=cognito_config["domain"].domain,
                        on_unauthenticated_request="authenticate",
                        scope="openid profile email"
                    ),
                    order=1
                ),
                # Then forward to target group
                aws.lb.ListenerDefaultActionArgs(
                    type="forward",
                    target_group_arn=target_group.arn,
                    order=2
                )
            ],
            tags={
                "Name": f"alb-https-listener-cognito-{environment}",
                "Environment": environment
            }
        )
    else:
        # Without authentication (direct forward)
        https_listener = aws.lb.Listener(
            f"https-listener-{environment}",
            load_balancer_arn=alb.arn,
            port=443,
            protocol="HTTPS",
            ssl_policy="ELBSecurityPolicy-TLS13-1-2-2021-06",
            certificate_arn=certificate_arn,
            default_actions=[aws.lb.ListenerDefaultActionArgs(
                type="forward",
                target_group_arn=target_group.arn,
            )],
            tags={
                "Name": f"alb-https-listener-{environment}",
                "Environment": environment
            }
        )
    
    # HTTP Listener - redirect to HTTPS
    http_listener = aws.lb.Listener(
        f"http-listener-{environment}",
        load_balancer_arn=alb.arn,
        port=80,
        protocol="HTTP",
        default_actions=[aws.lb.ListenerDefaultActionArgs(
            type="redirect",
            redirect=aws.lb.ListenerDefaultActionRedirectArgs(
                port="443",
                protocol="HTTPS",
                status_code="HTTP_301"
            )
        )],
        tags={
            "Name": f"alb-http-listener-{environment}",
            "Environment": environment
        }
    )
    
    return {
        "alb": alb,
        "https_listener": https_listener,
        "http_listener": http_listener
    }
