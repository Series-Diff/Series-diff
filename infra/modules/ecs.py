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
    cluster = aws.ecs.Cluster(
        "comparison-tool",
        name="comparison-tool-cluster",
        tags={
            "Name": "comparison-tool-cluster"
        }
    )

    return cluster


def create_ecs_task_definition(image_ref: pulumi.Output[str], region: str) -> aws.ecs.TaskDefinition:
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
        "task-exec-role",
        assume_role_policy="""{
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "sts:AssumeRole",
                "Principal": {"Service": "ecs-tasks.amazonaws.com"},
                "Effect": "Allow"
            }]
        }""",
        tags={
            "Name": "ecs-task-execution-role"
        }
    )

    aws.iam.RolePolicyAttachment(
        "task-exec-policy",
        role=task_exec_role.name,
        policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
    )

    # CloudWatch log group for container logs
    log_group = aws.cloudwatch.LogGroup(
        "flask-api-log-group",
        name="/ecs/flask-api-logs",
        retention_in_days=config.ecs_log_retention_days,
        tags={
            "Name": "flask-api-logs"
        }
    )

    # Task definition
    task_definition = aws.ecs.TaskDefinition(
        "task-def",
        family="flask-api",
        cpu=config.ecs_task_cpu,
        memory=config.ecs_task_memory,
        network_mode="awsvpc",
        requires_compatibilities=["FARGATE"],
        execution_role_arn=task_exec_role.arn,
        container_definitions=pulumi.Output.all(
            image_ref,
            region,
            log_group.name
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
                    {{"name": "FLASK_ENV", "value": "production"}}
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
            "Name": "flask-api-task-definition"
        }
    )

    return task_definition


def create_ecs_service(
    cluster: aws.ecs.Cluster,
    task_definition: aws.ecs.TaskDefinition,
    networking: Dict[str, Any],
    target_group: aws.lb.TargetGroup,
    alb_resources: Dict[str, Any]
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
        "flask-api",
        name="flask-api-service",
        cluster=cluster.arn,
        task_definition=task_definition.arn,
        desired_count=config.ecs_desired_count,
        launch_type="FARGATE",
        network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
            assign_public_ip=True,
            subnets=networking["subnet_ids"],
            security_groups=[networking["fargate_sg"].id]
        ),
        load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
            target_group_arn=target_group.arn,
            container_name="flask-api",
            container_port=5000
        )],
        tags={
            "Name": "flask-api-service"
        },
        opts=pulumi.ResourceOptions(
            depends_on=[
                alb_resources["https_listener"],
                alb_resources["http_listener"]
            ]
        )
    )

    return service
