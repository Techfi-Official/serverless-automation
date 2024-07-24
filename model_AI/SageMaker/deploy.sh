#!/bin/bash

set -e # Exit on error
set -u # Exit on undefined variable
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$(aws configure get region)}"
echo "AWS_DEFAULT_REGION: ${AWS_DEFAULT_REGION}"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
echo "AWS_ACCOUNT_ID: ${AWS_ACCOUNT_ID}"

# Set global variables for deployment, to be run after prepare_env functions
configure() {
    # Application name prefix for resourceis provisioned (and also CloudFormation stack name)
    APP_NAME="comfyui"

    # Git reference of ComfyUI (should be a commit id instead of a branch name for production)
    COMFYUI_GIT_REF="v0.0.1"

    # S3 bucket for deployment files (model artifact and Lambda package)
    # Note: Adjust ComfyUIModelExecutionRole in template.yaml to grant S3 related permissions if the bucket name does not contain "SageMaker", "Sagemaker" or "sagemaker".
    S3_BUCKET="comfyui-sagemaker-${AWS_ACCOUNT_ID}-${AWS_DEFAULT_REGION}"

    # Filename of lambda package on S3 bucket used during CloudFormation deployment
    LAMBDA_FILE="lambda-57adae.zip"

    # Identifier of SageMaker model and endpoint config
    MODEL_VERSION="sample"

    # Filename of model artifact on S3 bucket
    MODEL_FILE="model-artificact-${MODEL_VERSION}.tgz"

    # ECR repository of SageMaker inference image
    IMAGE_REPO="comfyui-sagemaker"

    # Image tag of SageMaker inference image
    IMAGE_TAG="latest"

    # ECR registry for SageMaker inference image
    IMAGE_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com"

    # Full image URI for SageMaker inference image
    IMAGE_URI="${IMAGE_REGISTRY}/${IMAGE_REPO}:${IMAGE_TAG}"

    # Instance type of SageMaker endpoint
    SAGEMAKER_INSTANCE_TYPE="ml.g4dn.xlarge"

    # Whether to enable auto scaling for the SageMaker endpoint
    SAGEMAKER_AUTO_SCALING="true"

    # Authentication type for the Lambda URL (NONE or AWS_IAM)
    LAMBDA_URL_AUTH_TYPE="AWS_IAM"
}

configure

aws cloudformation deploy --template-file config/template.yml \
    --stack-name "$APP_NAME" \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    --parameter-overrides \
    AppName="$APP_NAME" \
    DeploymentBucket="$S3_BUCKET" \
    LambdaPackageS3Key="lambda/$LAMBDA_FILE" \
    ModelVersion="$MODEL_VERSION" \
    ModelDataS3Key="$MODEL_FILE" \
    ModelEcrImage="$IMAGE_REPO:$IMAGE_TAG" \
    SageMakerInstanceType="$SAGEMAKER_INSTANCE_TYPE" \
    SageMakerAutoScaling="$SAGEMAKER_AUTO_SCALING" \
    LambdaUrlAuthType="$LAMBDA_URL_AUTH_TYPE"

echo -e  "\n Done"