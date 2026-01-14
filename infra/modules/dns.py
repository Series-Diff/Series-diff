"""
Route53 DNS records.
"""

import pulumi_aws as aws


def create_dns_record(
    hosted_zone_domain: str, subdomain: str, alb: aws.lb.LoadBalancer
) -> aws.route53.Record:
    """
    Create a Route53 A record alias pointing to the ALB.

    Args:
        hosted_zone_domain: Root domain name (e.g., example.com)
        subdomain: Subdomain prefix (e.g., api)
        alb: Application Load Balancer to point to

    Returns:
        Route53 Record resource
    """
    # Lookup the hosted zone
    hosted_zone = aws.route53.get_zone(name=hosted_zone_domain, private_zone=False)

    # Construct full DNS name
    full_name = f"{subdomain}.{hosted_zone_domain}"

    # Create A record alias
    record = aws.route53.Record(
        f"{subdomain}-alb-record",
        zone_id=hosted_zone.zone_id,
        name=full_name,
        type="A",
        aliases=[
            aws.route53.RecordAliasArgs(
                name=alb.dns_name,
                zone_id=alb.zone_id,
                evaluate_target_health=True,
            )
        ],
    )

    return record
