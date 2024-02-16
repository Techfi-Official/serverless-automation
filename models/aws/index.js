const s3Client = require('./s3Client')

const {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} = require('@aws-sdk/client-s3')

// Writes a fragment's data to an S3 Object in a Bucket
// https://github.com/awsdocs/aws-sdk-for-javascript-v3/blob/main/doc_source/s3-example-creating-buckets.md#upload-an-existing-object-to-an-amazon-s3-bucket
async function writeS3BucketData(ownerId, id, data) {
    // Create the PUT API params from our details
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        // Our key will be a mix of the ownerID and fragment id, written as a path
        Key: `Earbud.png`,
        Body: data,
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
async function readS3BucketData(ownerId, id) {
    // Create the PUT API params from our details

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        // Our key will be a mix of the ownerID and fragment id, written as a path
        Key: `Earbud.png`,
    }

    // Create a GET Object command to send to S3
    const command = new GetObjectCommand(params)

    try {
        // Get the object from the Amazon S3 bucket. It is returned as a ReadableStream.

        const data = await s3Client.send(command)

        // Convert the ReadableStream to a Buffer
        return streamToBuffer(data.Body)
    } catch (err) {
        console.log('err', err)
        throw new Error('unable to read s3 data')
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

module.exports.writeS3BucketData = writeS3BucketData
module.exports.readS3BucketData = readS3BucketData
module.exports.deleteS3BucketData = deleteS3BucketData
