import json
import boto3
import logging
import random
import base64
import datetime
import io
import os
import time

# Define Logger
logger = logging.getLogger()
logging.basicConfig()
logger.setLevel(logging.INFO)

sagemaker_client = boto3.client("sagemaker-runtime")
sagemaker = boto3.client('sagemaker')
s3 = boto3.client('s3')
dynamodb = boto3.client('dynamodb')

def check_endpoint_status(endpoint_name):
    try:
        response = sagemaker.describe_endpoint(EndpointName=endpoint_name)
        status = response['EndpointStatus']
        return status
    except Exception as e:
        print(f"Error checking endpoint status: {str(e)}")
        return None


def update_seed(prompt_dict, seed=None):
    """
    Update the seed value for the KSampler node in the prompt dictionary.

    Args:
        prompt_dict (dict): The prompt dictionary containing the node information.
        seed (int, optional): The seed value to set for the KSampler node. If not provided, a random seed will be generated.

    Returns:
        dict: The updated prompt dictionary with the seed value set for the KSampler node.
    """
    # set seed for KSampler node
    for i in prompt_dict:
        if "inputs" in prompt_dict[i]:
            if (
                prompt_dict[i]["class_type"] == "KSampler"
                and "seed" in prompt_dict[i]["inputs"]
            ):
                if seed is None:
                    # TODO: this generation is not same as the one in the activepieces workflow
                    generated_seed = random.randint(0, int(1e10))
                    prompt_dict[i]["inputs"]["seed"] = generated_seed
                    logger.info("Generated seed: %s", generated_seed)
                else:
                    generated_seed = random.randint(0, int(1e10))
                    prompt_dict[i]["inputs"]["seed"] = generated_seed
                    logger.info("Set seed: %s", seed)
    return prompt_dict

def update_prompt_text(prompt_dict, positive_prompt, negative_prompt):
    """
    Update the prompt text in the given prompt dictionary.

    Args:
        prompt_dict (dict): The dictionary containing the prompt information.
        positive_prompt (str): The new text to replace the positive prompt placeholder.
        negative_prompt (str): The new text to replace the negative prompt placeholder.

    Returns:
        dict: The updated prompt dictionary.
    """
    # replace prompt text for CLIPTextEncode node
    for i in prompt_dict:
        if "inputs" in prompt_dict[i]:
            if (
                prompt_dict[i]["class_type"] == "CLIPTextEncode"
                and "text" in prompt_dict[i]["inputs"]
            ):
                if prompt_dict[i]["inputs"]["text"] == "POSITIVE_PROMT_PLACEHOLDER":
                    prompt_dict[i]["inputs"]["text"] = positive_prompt
                elif prompt_dict[i]["inputs"]["text"] == "NEGATIVE_PROMPT_PLACEHOLDER":
                    prompt_dict[i]["inputs"]["text"] = negative_prompt
    return prompt_dict


def invoke_from_prompt(prompt_file, positive_prompt, negative_prompt, seed=None):
    """
    Invokes the SageMaker endpoint with the provided prompt data.

    Args:
        prompt_file (str): The path to the JSON file in ./workflow/ containing the prompt data.
        positive_prompt (str): The positive prompt to be used in the prompt data.
        negative_prompt (str): The negative prompt to be used in the prompt data.
        seed (int, optional): The seed value for randomization. Defaults to None.

    Returns:
        dict: The response from the SageMaker endpoint.

    Raises:
        FileNotFoundError: If the prompt file does not exist.
    """
    logger.info("prompt: %s", prompt_file)

    # read the prompt data from json file
    with open("./workflow/" + prompt_file) as prompt_file:
        prompt_text = prompt_file.read()

    prompt_dict = json.loads(prompt_text)
    logger.info("seed: %s", seed)
    prompt_dict = update_seed(prompt_dict, seed)
    logger.info("seed: %s", seed)
    logger.info("prompt_dict: %s", prompt_dict)
    prompt_dict = update_prompt_text(prompt_dict, positive_prompt, negative_prompt)
    logger.info("prompt_dict: %s", prompt_dict)
    prompt_text = json.dumps(prompt_dict)

    endpoint_name = os.environ["ENDPOINT_NAME"]
    content_type = "application/json"
    accept = "*/*"
    payload = prompt_text
    logger.info("Final payload to invoke sagemaker:")
    logger.info(json.dumps(payload, indent=4))
    response = sagemaker_client.invoke_endpoint(
        EndpointName=endpoint_name,
        ContentType=content_type,
        Accept=accept,
        Body=payload,
    )
    logger.info("Response from sagemaker:")
    logger.info(response)
    # TODO: check response status code and return if not 200
    
    return response


def lambda_handler(event: dict, context: dict):
    """
    Lambda function handler for processing events.

    Args:
        event (dict): The event from lambda function URL.
        context (dict): The runtime information of the Lambda function.

    Returns:
        dict: The response data for lambda function URL.
    """
    try:
        bucket_name = os.environ['AWS_S3_BUCKET_NAME']
        object_key = f"img_{int(time.time())}"
        endpoint_name = os.environ['ENDPOINT_NAME']
    except KeyError as e:
        logger.error(f"Error: {e}")
        return {
            "statusCode": 400,
            "body": json.dumps(
                {
                    "error": "Missing required parameter",
                }
            ),
        }
        
    logger.info("Event:")
    logger.info(json.dumps(event, indent=2))
    request = json.loads(event["body"])

    try:
        prompt_file = request.get("prompt_file", "workflow_api.json")
        schedule_id = request.get("scheduleID")
        
        client_id = request.get("clientID")
        logger.info("First client_id: %s", client_id)
        
        client_id = request.get("clientID", "techfi1992")
        logger.info("client_id: %s", client_id)
        
        positive_prompt = request["positive_prompt"]
        negative_prompt = request.get("negative_prompt", "")
        
        logger.info("schedule_id: %s", schedule_id)
        # Check endpoint status
        status = check_endpoint_status(endpoint_name)
        print(f"Creating status: {status}")
        if status == 'InService':
            for _ in range(3):
                response = invoke_from_prompt(
                    prompt_file=prompt_file,
                    positive_prompt=positive_prompt,
                    negative_prompt=negative_prompt,
                )
                response_body = response["Body"].read()
                image_id = f"image_{int(time.time())}_{random.randint(0, 1000)}"
                object_key = f"{client_id}/{image_id}"
                # store the image in s3 bucket
                try:
                    s3.put_object(Bucket=bucket_name, Key=object_key, Body=response_body)
                    image_url = f"https://{bucket_name}.s3.amazonaws.com/{object_key}"
                except Exception as e:
                    logger.error(f"Error: {e}")
                    return {
                        "statusCode": 500,
                        "body": json.dumps(
                            {
                                "error": "s3 put object was not successful",
                            }
                        ),
                    }
                # Add a new item to the dynamoDB table
                try:
                    logger.info("Adding item to dynamoDB table")
                    logger.info("schedule_id: %s", schedule_id)
                    logger.info("image_id: %s", image_id)
                    logger.info("client_id: %s", client_id)
                    logger.info("image_url: %s", image_url)
                    logger.info("negative_prompt: %s", negative_prompt)
                    logger.info("positive_prompt: %s", positive_prompt)
                    dynamo_db_item = {
                        "scheduleID": {"S": schedule_id},
                        "imageID": {"S": image_id},
                        "clientID": {"S": client_id},
                        "imageURL": {"S": image_url},
                        "negative_prompt": {"S": negative_prompt},
                        "positive_prompt": {"S": positive_prompt},
                        "postID": {"S": str(random.randint(100, 999))},  # Assuming postID is generated randomly
                        "uploadedAt": {"S": datetime.datetime.utcnow().isoformat() + "Z"}
                    }
                    dynamodb.put_item(
                        TableName=os.environ['AWS_DYNAMODB_IMAGES_TABLE_NAME'],
                        Item=dynamo_db_item
                    )
                except Exception as e:
                    logger.error(f"Error: {e}")
                    return {
                        "statusCode": 500,
                        "body": json.dumps(
                            {
                                "error": "Failed to save image to dynamoDB",
                            }
                        ),
                    }
                
        else:
            return "Endpoint {} is not in service. Current status: {}".format(endpoint_name, status)
    except KeyError as e:
        logger.error(f"Error: {e}")
        return {
            "statusCode": 400,
            "body": json.dumps(
                {
                    "error": "Missing required parameter",
                }
            ),
        }

    # Fetch last 3 items from dynamodb
    response = dynamodb.query(
        TableName=os.environ['AWS_DYNAMODB_IMAGES_TABLE_NAME'],
        KeyConditionExpression='scheduleID = :scheduleID',
        ExpressionAttributeValues={
            ':scheduleID': {'S': schedule_id}
        },
        ScanIndexForward=False,
        Limit=3
    )
    items = response.get('Items', [])
    # return urls of the images
    urls = [item['imageURL']['S'] for item in items]
    return urls


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, stream=sys.stdout)
    # event = {
    #     "body": "{\"positive_prompt\": \"hill happy dog\",\"negative_prompt\": \"hill\",\"prompt_file\": \"workflow_api.json\",\"seed\": 123}"
    # }
    lambda_handler(event, None)
