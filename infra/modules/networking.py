"""
Networking resources: VPC, Subnets, Security Groups.
"""

import pulumi_aws as aws
from typing import Dict, Any


def create_networking(environment: str) -> Dict[str, Any]:
    """
    Create networking resources including VPC, subnets, and security groups.

    Returns:
        Dict containing VPC ID, subnet IDs, and security groups
    """
    # Use default VPC for simplicity
    vpc = aws.ec2.get_vpc(default=True)

    # Get subnets in the VPC
    subnets = aws.ec2.get_subnets(
        filters=[
            {
                "name": "vpc-id",
                "values": [vpc.id],
            }
        ]
    )

    # Security group for ALB
    alb_sg = aws.ec2.SecurityGroup(
        "alb-sg",
        vpc_id=vpc.id,
        description="Allow inbound HTTP and HTTPS to ALB",
        ingress=[
            {
                "protocol": "tcp",
                "from_port": 80,
                "to_port": 80,
                "cidr_blocks": ["0.0.0.0/0"],
                "description": "Allow HTTP from anywhere",
            },
            {
                "protocol": "tcp",
                "from_port": 443,
                "to_port": 443,
                "cidr_blocks": ["0.0.0.0/0"],
                "description": "Allow HTTPS from anywhere",
            },
        ],
        egress=[
            {
                "protocol": "-1",
                "from_port": 0,
                "to_port": 0,
                "cidr_blocks": ["0.0.0.0/0"],
                "description": "Allow all outbound traffic",
            }
        ],
        tags={"Name": "alb-security-group"},
    )

    # Security group for Fargate tasks
    fargate_sg = aws.ec2.SecurityGroup(
        "fargate-sg",
        vpc_id=vpc.id,
        description="Allow inbound traffic from ALB to Fargate tasks",
        ingress=[
            {
                "protocol": "tcp",
                "from_port": 5000,
                "to_port": 5000,
                "security_groups": [alb_sg.id],
                "description": "Allow traffic from ALB",
            }
        ],
        egress=[
            {
                "protocol": "-1",
                "from_port": 0,
                "to_port": 0,
                "cidr_blocks": ["0.0.0.0/0"],
                "description": "Allow all outbound traffic",
            }
        ],
        tags={"Name": "fargate-security-group"},
    )

    return {
        "vpc_id": vpc.id,
        "subnet_ids": subnets.ids,
        "alb_sg": alb_sg,
        "fargate_sg": fargate_sg,
    }
