"""
ECS Cluster, Task Definition, and Service.
"""

import pulumi
import pulumi_aws as aws
from typing import Dict, Any

from infra_config import InfraConfig


def create_ecs_cluster() -> aws.ecs.Cluster:
    """
    Create an ECS cluster.

    Returns:
        ECS Cluster resource
    """
    config = InfraConfig()

    cluster = aws.ecs.Cluster(
        f"comparison-tool-{config.environment}",
        name=f"comparison-tool-{config.environment}-cluster",
        tags={
            "Name": f"comparison-tool-{config.environment}-cluster",
            "Environment": config.environment,
        },
    )

    return cluster


def create_ecs_task_definition(
    image_ref: pulumi.Output[str], region: str
) -> aws.ecs.TaskDefinition:
    """
    Create an ECS task definition for the Flask API.

    Args:
        image_ref: Docker image reference
        region: AWS region

    Returns:
        ECS Task Definition resource
    """
    config = InfraConfig()

    # IAM role for ECS task execution
    task_exec_role = aws.iam.Role(
        f"task-exec-role-{config.environment}",
        name=f"ecs-task-execution-{config.environment}",
        assume_role_policy="""{
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "sts:AssumeRole",
                "Principal": {"Service": "ecs-tasks.amazonaws.com"},
                "Effect": "Allow"
            }]
        }""",
        tags={
            "Name": f"ecs-task-execution-{config.environment}",
            "Environment": config.environment,
        },
    )

    aws.iam.RolePolicyAttachment(
        f"task-exec-policy-{config.environment}",
        role=task_exec_role.name,
        policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    )

    # CloudWatch log group for container logs
    log_group = aws.cloudwatch.LogGroup(
        f"flask-api-log-group-{config.environment}",
        name=f"/ecs/flask-api-{config.environment}-logs",
        retention_in_days=config.ecs_log_retention_days,
        tags={
            "Name": f"flask-api-{config.environment}-logs",
            "Environment": config.environment,
        },
    )

    # Task definition
    task_definition = aws.ecs.TaskDefinition(
        f"task-def-{config.environment}",
        family=f"flask-api-{config.environment}",
        cpu=config.ecs_task_cpu,
        memory=config.ecs_task_memory,
        network_mode="awsvpc",
        requires_compatibilities=["FARGATE"],
        execution_role_arn=task_exec_role.arn,
        container_definitions=pulumi.Output.all(
            image_ref, region, log_group.name
        ).apply(
            lambda args: f"""
            [{{
                "name": "flask-api",
                "image": "{args[0]}",
                "portMappings": [{{
                    "containerPort": 5000,
                    "protocol": "tcp"
                }}],
                "logConfiguration": {{
                    "logDriver": "awslogs",
                    "options": {{
                        "awslogs-group": "{args[2]}",
                        "awslogs-region": "{args[1]}",
                        "awslogs-stream-prefix": "app"
                    }}
                }},
                "environment": [
                    {{"name": "FLASK_APP", "value": "main.py"}},
                    {{"name": "FLASK_ENV", "value": "{config.environment}"}},
                    {{"name": "ENVIRONMENT", "value": "{config.environment}"}}
                ],
                "healthCheck": {{
                    "command": ["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"],
                    "interval": 30,
                    "timeout": 5,
                    "retries": 3,
                    "startPeriod": 60
                }}
            }}]
            """
        ),
        tags={
            "Name": f"flask-api-{config.environment}-task-definition",
            "Environment": config.environment,
        },
    )

    return task_definition


def create_ecs_service(
    cluster: aws.ecs.Cluster,
    task_definition: aws.ecs.TaskDefinition,
    networking: Dict[str, Any],
    target_group: aws.lb.TargetGroup,
    alb_resources: Dict[str, Any],
) -> aws.ecs.Service:
    """
    Create an ECS service.

    Args:
        cluster: ECS cluster
        task_definition: ECS task definition
        networking: Networking resources (subnets, security groups)
        target_group: ALB target group
        alb_resources: ALB resources (for dependency)

    Returns:
        ECS Service resource
    """
    config = InfraConfig()

    service = aws.ecs.Service(
        f"flask-api-{config.environment}",
        name=f"flask-api-{config.environment}-service",
        cluster=cluster.arn,
        task_definition=task_definition.arn,
        desired_count=config.ecs_desired_count,
        launch_type="FARGATE",
        network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
            assign_public_ip=True,
            subnets=networking["subnet_ids"],
            security_groups=[networking["fargate_sg"].id],
        ),
        load_balancers=[
            aws.ecs.ServiceLoadBalancerArgs(
                target_group_arn=target_group.arn,
                container_name="flask-api",
                container_port=5000,
            )
        ],
        tags={
            "Name": f"flask-api-{config.environment}-service",
            "Environment": config.environment,
        },
        opts=pulumi.ResourceOptions(
            depends_on=[alb_resources["https_listener"], alb_resources["http_listener"]]
        ),
    )

    return service
