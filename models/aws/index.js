const s3Client = require('./s3Client')
const ddbDocClient = require('./dynamoDBClient')

const {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    ListObjectsV2Command,
} = require('@aws-sdk/client-s3')
const { QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb')

// Writes a fragment's data to an S3 Object in a Bucket
// https://github.com/awsdocs/aws-sdk-for-javascript-v3/blob/main/doc_source/s3-example-creating-buckets.md#upload-an-existing-object-to-an-amazon-s3-bucket
async function writeS3BucketData(postID, imageId, data) {
    // Create the PUT API params from our details
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        // Our key will be a mix of the ownerID and fragment id, written as a path
        Key: `${postID}/${imageId}`,
        Body: data,
        ContentType: 'image/png',
    }

    // Create a PUT Object command to send to S3
    const command = new PutObjectCommand(params)

    try {
        // Use our client to send the command
        await s3Client.send(command)
    } catch (err) {
        // If anything goes wrong, log enough info that we can debug
        throw new Error('unable to upload s3 data')
    }
}
const streamToBuffer = (stream) =>
    new Promise((resolve, reject) => {
        // As the data streams in, we'll collect it into an array.
        const chunks = []
        // Streams have events that we can listen for and run
        // code.  We need to know when new `data` is available,
        // if there's an `error`, and when we're at the `end`
        // of the stream.

        // When there's data, add the chunk to our chunks list
        stream.on('data', (chunk) => chunks.push(chunk))
        // When there's an error, reject the Promise
        stream.on('error', reject)
        // When the stream is done, resolve with a new Buffer of our chunks
        stream.on('end', () => resolve(Buffer.concat(chunks)))
    })

// Reads a fragment's data from S3 and returns (Promise<Buffer>)
// https://github.com/awsdocs/aws-sdk-for-javascript-v3/blob/main/doc_source/s3-example-creating-buckets.md#getting-a-file-from-an-amazon-s3-bucket
// eslint-disable-next-line no-unused-vars
// This function only returns all S3 buckets based on only ClientId
async function readALLS3BucketData(postID) {
    // Create the PUT API params from our details

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        // Our key will be a mix of the ownerID and fragment id, written as a path
        Prefix: `${postID}/`,
    }

    // Create a GET Object command to send to S3
    const command = new ListObjectsV2Command(params)

    try {
        // Get the object from the Amazon S3 bucket. It is returned as a ReadableStream.

        const { Contents } = await s3Client.send(command)
        console.log('Contents', Contents)
        if (Contents?.length > 0) {
            const filteredContentsImageKeys = Contents.map(
                (content) => content.Key
            )
            // Convert the ReadableStream to a Buffer
            // Fetch all image buffers
            const imageBuffers = await Promise.all(
                filteredContentsImageKeys.map(async (key) => {
                    const params = {
                        Bucket: process.env.AWS_S3_BUCKET_NAME,
                        Key: key,
                    }
                    const command = new GetObjectCommand(params)
                    return await s3Client.send(command)
                })
            )
            return imageBuffers.map((img) => ({
                metaData: streamToBuffer(img.Body),
            }))
        } else return []
    } catch (err) {
        console.log('err', err)
        throw new Error('unable to read s3 data')
    }
}

async function readSpecificS3BucketData(postID, imageIds) {
    try {
        // Convert the ReadableStream to a Buffer
        // Fetch all image buffers
        const imageBuffers = await Promise.all(
            imageIds.map(async (imageId) => {
                const params = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: `${postID}/${imageId}`,
                }
                const command = new GetObjectCommand(params)
                return { src: await s3Client.send(command), key: imageId }
            })
        )

        console.log('src', imageBuffers)

        return imageBuffers.map(({ src, key }) => {
            console.log('src', src.Body)
            return {
                metaData: streamToBuffer(src.Body),
                key,
            }
        })
    } catch (err) {
        console.log('err', err)
        throw new Error('unable to read s3 data')
    }
}

function readS3URLBucketData(postID, imageId) {
    try {
        const imageS3Url = {
            src: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${postID}/${imageId}`,
            key: imageId,
        }
        return imageS3Url
    } catch (err) {
        console.log('err', err)
        throw new Error('unable to read s3 URL data')
    }
}

async function deleteS3BucketData(ownerId, id) {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `${ownerId}/${id}`,
    }

    const command = new DeleteObjectCommand(params)

    try {
        await s3Client.send(command)
    } catch (err) {
        throw new Error('unable to delete s3 data')
    }
}

async function readDynamoDB(postID, clientId) {
    console.log('Entering readDynamoDB function');
    // Configure our GET params, with the name of the table and key (partition key + sort key)
    const params = {
        TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
        IndexName: 'clientIdCreatedAtIndex',
        KeyConditionExpression: 'postID = :postID AND clientId = :clientId',
        ExpressionAttributeValues: {
            ':postID': postID,
            ':clientId': clientId,
        },
        ProjectionExpression: 'imageId, platform, instruction, imageUrl',
        ScanIndexForward: global.sharedData?.isSorted ?? false,
        Limit: global.sharedData?.limit ?? 10,
    }

    // Create a GET command to send to DynamoDB
    const command = new QueryCommand(params)

    try {
        console.log('Sending command to DynamoDB');
        // Wait for the data to come back from AWS
        const data = await ddbDocClient.send(command)

        // We may or may not get back any data (e.g., no item found for the given key).
        // If we get back an item (fragment), we'll return it.  Otherwise we'll return `undefined`.
        console.log('Returning Items:', data?.Items);
        return data?.Items
    } catch (err) {
        console.error('Error in DynamoDB query:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        throw new Error('unable to read data from DynamoDB')
    }
}
// Create readPostData
async function readPostsData(scheduleID) {
    // Configure our GET params, with the name of the table and key (partition key + sort key)
    const params = {
        TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
        Key: {
            scheduleID: scheduleID,
        },
    }

    // Create a GET command to send to DynamoDB
    const command = new QueryCommand(params)

    try {
        return await ddbDocClient.send(command)
    } catch (err) {
        throw new Error(err)
    }
}
// Create readClientData
async function readClientData(clientId) {
    // Configure our GET params, with the name of the table and key (partition key + sort key)
    const params = {
        TableName: process.env.AWS_DYNAMODB_CLIENTS_TABLE_NAME,
        Key: {
            clientId: clientId,
        },
    }

    // Create a GET command to send to DynamoDB
    const command = new QueryCommand(params)

    try {
        return await ddbDocClient.send(command)
    } catch (err) {
        throw new Error(err)
    }
}
// Create readPostCount
async function readPostCount(platform) {
    // Configure our GET params, with the name of the table and key (partition key + sort key)
    const params = {
        TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
        Key: {
            platform: platform,
        },
    }

    // Create a GET command to send to DynamoDB
    const command = new QueryCommand(params)

    try {
        return await ddbDocClient.send(command)
    } catch (err) {
        throw new Error(err)
    }
}
async function writeDynamoDB(postID, imageId, instruction, platform, imageUrl) {
    // Configure our PUT params, with the name of the table and item (attributes and keys)
    const params = {
        TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
        Item: {
            postID: postID,
            imageId: imageId,
            platform: platform,
            instruction: instruction,
            imageUrl: imageUrl,
            createdAt: new Date().toISOString(), // ISO string format timestamp
            updatedAt: new Date().toISOString(),
        },
    }

    // Create a PUT command to send to DynamoDB
    const command = new PutCommand(params)

    try {
        return await ddbDocClient.send(command)
    } catch (err) {
        throw new Error(err)
    }
}

module.exports.writeS3BucketData = writeS3BucketData
module.exports.readALLS3BucketData = readALLS3BucketData
module.exports.deleteS3BucketData = deleteS3BucketData
module.exports.readDynamoDB = readDynamoDB
module.exports.writeDynamoDB = writeDynamoDB
module.exports.readClientData = readClientData
module.exports.readPostsData = readPostsData
module.exports.readPostCount = readPostCount
module.exports.readSpecificS3BucketData = readSpecificS3BucketData
module.exports.readS3URLBucketData = readS3URLBucketData