#!/bin/bash
############################################################################
#### script to create a COMFYUI models artifact for SageMaker inference ####
############################################################################
set -e # Exit on error
set -u # Exit on undefined variable


MODEL_VERSION="sample"
#AWS_ACCOUNT_ID and AWS_DEFAULT_REGION comes from the 'aws configure list'
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text)
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$(aws configure get region || true)}"
S3_BUCKET="comfyui-sagemaker-${AWS_ACCOUNT_ID}-${AWS_DEFAULT_REGION}"
MODEL_FILE="model-artificact-${MODEL_VERSION}.tgz"
S3_PATH="s3://$S3_BUCKET/$MODEL_FILE"

# retrieve the secret key from the AWS Secret Manager
json_secret=$(aws secretsmanager get-secret-value --secret-id hf_access_token --query SecretString --output text)
HF_TOKEN=$(echo "${json_secret}" | awk -F'"' '{print $4}')

# target folder for downloading model artifact
TARGET_DIR="model-artifact"
# target file for tar-gzip archive of model artifact
TARGET_FILE="model-artifact.tgz"

download_huggingface() {
    # Check if HF_TOKEN is set
    if [ -z "$HF_TOKEN" ]; then
    echo "Error: HF_TOKEN is not set."
    exit 1
    fi
    # wget -nc "$1" -P "$2" || wget -N "$1" -P "$2"
    # download huggingface models from URL if it does not exist in the current directory with '--nc' ( prevents overwriting existing files)
    # then download based on new timestamp version  from remote if available '-N'
    wget --header="Authorization: Bearer ${HF_TOKEN}" -nc "$1" -P "$2" || wget --header="Authorization: Bearer ${HF_TOKEN}" -N "$1" -P "$2" || wget -nc "$1" -P "$2"
}

# initialize empty folder structure
mkdir -p "${TARGET_DIR}"
DIRS=(checkpoints clip clip_vision configs controlnet embeddings loras upscale_models vae gligen custom_nodes unet)
for dir in "${DIRS[@]}"
do
    mkdir -p "${TARGET_DIR}/${dir}"
done
index=1
while IFS= read -r line || [ -n "$line" ]; do
    read -r url type <<<$(awk '{print $1, $2}' <<< "$line")
    # Ensure both url and type are not empty
    if [ -z "$url" ] || [ -z "$type" ]; then
        echo "Warning: incomplete line $index."
        exit 1
    fi
    echo "Processing: ${index} - $type model"
    # stable-diffusion-xl-base-1.0 => model-artifact/checkpoints
    download_huggingface "$url" "${TARGET_DIR}/$type"
    index=$((index + 1))
done < "model_call.txt"

if [ -z "${S3_PATH}" ]; then
    exit 0
fi
echo "Creating ${TARGET_FILE}..."
# tar gzip the folder and upload to S3
if [ -n "$(which pigz)" ]; then
    # use pigz to speed up compression on multiple cores
    tar -cv -C "${TARGET_DIR}" . | pigz -1 > "${TARGET_FILE}"
else
    # tar is slower
    tar -czvf ${TARGET_FILE} -C ${TARGET_DIR} .
fi
echo "Uploading ${S3_PATH}..."
aws s3 cp "${TARGET_FILE}" "${S3_PATH}"