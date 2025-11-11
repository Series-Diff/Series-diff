"""
Lambda function to scale ECS service desired count.
Triggered by EventBridge rules for scheduled scaling.
"""
import os
import json
import boto3

ecs_client = boto3.client('ecs')

def main(event, context):
    """
    Scale ECS service based on event input.
    
    Event format:
    {
        "desired_count": 0  # or 1, or any other number
    }
    """
    cluster_name = os.environ['CLUSTER_NAME']
    service_name = os.environ['SERVICE_NAME']
    
    # Get desired count from event, default to 1
    desired_count = event.get('desired_count', 1)
    
    print(f"Scaling ECS service {service_name} in cluster {cluster_name} to {desired_count}")
    
    try:
        response = ecs_client.update_service(
            cluster=cluster_name,
            service=service_name,
            desiredCount=desired_count
        )
        
        print(f"Successfully updated service. New desired count: {desired_count}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Service scaled to {desired_count}',
                'service': service_name,
                'cluster': cluster_name
            })
        }
    except Exception as e:
        print(f"Error scaling service: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
