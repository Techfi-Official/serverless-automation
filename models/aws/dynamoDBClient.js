// src/model/data/aws/ddbDocClient.js

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
// Helper library for working with converting DynamoDB types to/from JS
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb')

/**
 * If AWS credentials are configured in the environment, use them. Normally when we connect to DynamoDB from a deployment in AWS, we won't bother with this.  But if you're testing locally, you'll need
 * these, or if you're connecting to LocalStack or DynamoDB Local
 * @returns Object | undefined
 */
const getCredentials = () => {
    if (
        process.env.AWS_ACCESSES_KEY_ID &&
        process.env.AWS_SECRET_ACCESSES_KEY
    ) {
        // See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/interfaces/dynamodbclientconfig.html#credentials
        const credentials = {
            accessKeyId: process.env.AWS_ACCESSES_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESSES_KEY,
        }
        return credentials
    }
}

/**
 * If an AWS DynamoDB Endpoint is configured in the environment, use it.
 * @returns string | undefined
 */
const getDynamoDBEndpoint = () => {
    if (process.env.AWS_DYNAMODB_ENDPOINT_URL) {
        return process.env.AWS_DYNAMODB_ENDPOINT_URL
    }
}

// Create and configure an Amazon DynamoDB client object.
const ddbClient = new DynamoDBClient({
    region: process.env.AWS_REGIONS,
    endpoint: getDynamoDBEndpoint(),
    credentials: getCredentials(),
})

// Instead of exposing the ddbClient directly, we'll wrap it with a helper
// that will simplify converting data to/from DynamoDB and JavaScript (i.e.
// marshalling and unmarshalling typed attribute data)
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient)

module.exports = ddbDocClient
