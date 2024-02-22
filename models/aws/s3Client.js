const { S3Client } = require('@aws-sdk/client-s3')

const getCredentials = () => {
    if (
        process.env.AWS_ACCESSES_KEY_ID &&
        process.env.AWS_SECRET_ACCESSES_KEY
    ) {
        // See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules/credentials.html
        const credentials = {
            accessKeyId: process.env.AWS_ACCESSES_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESSES_KEY,
        }
        console.log('Getting credentials from environment variables')
        return credentials
    }
}

module.exports = new S3Client({
    // The region is always required
    region: process.env.AWS_REGIONS,
    // Credentials are optional if you connect to AWS remotely from your laptop
    credentials: getCredentials(),
    // We always want to use path style key names
    forcePathStyle: true,
})
