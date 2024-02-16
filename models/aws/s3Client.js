const { S3Client } = require('@aws-sdk/client-s3')

const getCredentials = () => {
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        // See https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/modules/credentials.html
        const credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            // Optionally include the AWS Session Token, too (e.g., if you're connecting to AWS from your laptop).
            // Not all situations require this, so we won't check for it above, just use it if it is present.
            sessionToken: process.env.AWS_SESSION_TOKEN || '',
        }
        console.log('Getting credentials from environment variables')
        return credentials
    }
}

module.exports = new S3Client({
    // The region is always required
    region: process.env.AWS_REGION,
    // Credentials are optional if you connect to AWS remotely from your laptop
    credentials: getCredentials(),
    // We always want to use path style key names
    forcePathStyle: true,
})
