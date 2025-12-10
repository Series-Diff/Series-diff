"""
Lambda function for ECS service scaling with EventBridge scheduling.
"""

import pulumi
import pulumi_aws as aws
import os


def create_scaling_lambda(
    cluster: aws.ecs.Cluster,
    service: aws.ecs.Service,
    scale_down_cron: str,
    scale_up_cron: str,
) -> aws.lambda_.Function:
    """
    Create a Lambda function to scale ECS service with EventBridge rules.

    Args:
        cluster: ECS cluster
        service: ECS service to scale
        scale_down_cron: Cron expression for scaling down
        scale_up_cron: Cron expression for scaling up

    Returns:
        Lambda Function resource
    """
    # Get the lambda directory relative to this module
    # This file is in infra/modules/, so go up one level to infra/, then into lambda/scale
    current_file_dir = os.path.dirname(os.path.abspath(__file__))
    infra_dir = os.path.dirname(current_file_dir)  # infra/
    lambda_path = os.path.join(infra_dir, "lambda", "scale")

    # IAM role for Lambda
    lambda_role = aws.iam.Role(
        "lambda-role",
        assume_role_policy="""{
            "Version": "2012-10-17",
            "Statement": [{
                "Action": "sts:AssumeRole",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Effect": "Allow"
            }]
        }""",
        tags={"Name": "ecs-scaling-lambda-role"},
    )

    # Attach basic execution policy
    aws.iam.RolePolicyAttachment(
        "lambda-basic-policy",
        role=lambda_role.name,
        policy_arn="arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    )

    # Attach ECS full access policy
    aws.iam.RolePolicyAttachment(
        "lambda-ecs-policy",
        role=lambda_role.name,
        policy_arn="arn:aws:iam::aws:policy/AmazonECS_FullAccess",
    )

    # Lambda function
    scale_lambda = aws.lambda_.Function(
        "scale-lambda",
        name="ecs-scaling-lambda",
        runtime="python3.13",
        role=lambda_role.arn,
        handler="handler.main",
        code=pulumi.AssetArchive({".": pulumi.FileArchive(lambda_path)}),
        environment=aws.lambda_.FunctionEnvironmentArgs(
            variables={
                "CLUSTER_NAME": cluster.name,
                "SERVICE_NAME": service.name,
            }
        ),
        timeout=60,
        tags={"Name": "ecs-scaling-lambda"},
    )

    # EventBridge rules for scheduling
    rule_scale_down = aws.cloudwatch.EventRule(
        "scale-down-rule",
        name="ecs-scale-down",
        description="Scale down ECS service (weekday evenings)",
        schedule_expression=scale_down_cron,
        tags={"Name": "ecs-scale-down-rule"},
    )

    rule_scale_up = aws.cloudwatch.EventRule(
        "scale-up-rule",
        name="ecs-scale-up",
        description="Scale up ECS service (weekday mornings)",
        schedule_expression=scale_up_cron,
        tags={"Name": "ecs-scale-up-rule"},
    )

    # Lambda permissions for EventBridge
    aws.lambda_.Permission(
        "allow-scale-down",
        action="lambda:InvokeFunction",
        function=scale_lambda.name,
        principal="events.amazonaws.com",
        source_arn=rule_scale_down.arn,
    )

    aws.lambda_.Permission(
        "allow-scale-up",
        action="lambda:InvokeFunction",
        function=scale_lambda.name,
        principal="events.amazonaws.com",
        source_arn=rule_scale_up.arn,
    )

    # Event targets
    aws.cloudwatch.EventTarget(
        "target-scale-down",
        rule=rule_scale_down.name,
        arn=scale_lambda.arn,
        input='{"desired_count": 0}',
    )

    aws.cloudwatch.EventTarget(
        "target-scale-up",
        rule=rule_scale_up.name,
        arn=scale_lambda.arn,
        input='{"desired_count": 1}',
    )

    return scale_lambda
