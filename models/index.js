const {
    readS3BucketData,
    readDynamoDB,
    writeDynamoDB,
    writeS3BucketData,
} = require('./aws')

class S3BucketAndDynamoDB {
    constructor(clientId, imageId, instruction, platform) {
        this.imageId = imageId || ''
        this.instruction = instruction || ''
        this.platform = platform || ''
        if (clientId != null) {
            this.clientId = clientId
        } else {
            throw new Error('id is required')
        }
    }

    // ---- GET & POST S3BUCKET
    async getS3Data() {
        return await readS3BucketData(this.clientId)
    }

    async postS3Data(data) {
        this.writeDynamoDB()
        return await writeS3BucketData(this.clientId, this.imageId, data)
    }

    // --------------------------------

    getDynamoDBdata() {
        return readDynamoDB(this.clientId)
    }

    writeDynamoDB() {
        return writeDynamoDB(
            this.clientId,
            this.imageId,
            this.instruction,
            this.platform
        )
    }
}

module.exports.S3BucketAndDynamoDB = S3BucketAndDynamoDB
