const { readS3BucketData, readDynamoDB } = require('./aws')
const { nanoid } = require('nanoid')

class S3Bucket {
    constructor(id = '', imageID = '') {
        this.imageID = imageID || nanoid()

        if (id != null) {
            this.id = id
        } else {
            throw new Error('id is required')
        }
    }

    getS3Data() {
        return readS3BucketData(this.id, this.imageID)
    }
    getDynamoDBdata() {
        return readDynamoDB(this.id, 'twitter')
    }
}

module.exports.S3Bucket = S3Bucket
