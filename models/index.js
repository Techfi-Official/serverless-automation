const { readS3BucketData, readDynamoDB, writeDynamoDB } = require('./aws')
const { nanoid } = require('nanoid')

class S3BucketAndDynamoDB {
    constructor(id = '', imageID = '', instruction = '', name = '') {
        this.imageID = imageID || nanoid()
        this.instruction = instruction
        this.name = name
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

    writeDynamoDB() {
        return writeDynamoDB(this.id, this.instruction, this.name)
    }
}

module.exports.S3BucketAndDynamoDB = S3BucketAndDynamoDB
