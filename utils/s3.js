const AWS = require('aws-sdk');

// Configure AWS with your access and secret key. 
// (It's recommended to use environment variables or IAM roles instead of hardcoding)
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_ENV,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_ENV,
    region: 'us-east-1' // Replace with your S3 bucket's region
});

// Create an S3 instance
const s3 = new AWS.S3();


module.exports = function getS3FileUrl(bucketName, fileName) {
   
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Expires: 60 // URL expiration time in seconds
    };
    
    // Generate a signed URL for read access
    return s3.getSignedUrl('getObject', params);
}