import pulumi_aws as aws

def create_redis(networking: dict, environment: str):
    """
    Creates Serverless Valkey (Redis-compatible) Cache resources.
    """
    valkey_sg = aws.ec2.SecurityGroup(
        f"valkey-sg-{environment}",
        description="Allow Valkey traffic from Fargate",
        vpc_id=networking["vpc_id"],
        ingress=[
            aws.ec2.SecurityGroupIngressArgs(
                protocol="tcp",
                from_port=6379,
                to_port=6379,
                security_groups=[networking["fargate_sg"].id],
                description="Allow connection from Fargate App",
            ),
        ],
        egress=[
            aws.ec2.SecurityGroupEgressArgs(
                protocol="-1",
                from_port=0,
                to_port=0,
                cidr_blocks=["0.0.0.0/0"],
            ),
        ],
        tags={
            "Name": f"valkey-sg-{environment}",
            "Environment": environment,
        },
    )

    serverless_cache = aws.elasticache.ServerlessCache(
        f"valkey-{environment}",
        engine="valkey",
        name=f"seriesdiff-valkey-{environment}",
        description=f"Serverless Valkey for {environment}",
        subnet_ids=networking["subnet_ids"],
        security_group_ids=[valkey_sg.id],
        major_engine_version="7", 
        tags={
            "Environment": environment,
        },
    )

    return serverless_cache