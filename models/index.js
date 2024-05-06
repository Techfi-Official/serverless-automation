const {
    readALLS3BucketData,
    readDynamoDB,
    writeDynamoDB,
    writeS3BucketData,
    readSpecificS3BucketData,
    readS3URLBucketData,
} = require('./aws')

class S3BucketAndDynamoDB {
    constructor(clientId, imageId, instruction, platform, topic) {
        this.imageId = imageId || ''
        this.instruction = instruction || ''
        this.platform = platform || ''
        this.topic = topic || ''
        if (clientId != null) {
            this.clientId = clientId
        } else {
            throw new Error('id is required')
        }
    }

    // ---- GET & POST S3BUCKET
    async getAllS3Data() {
        return await readALLS3BucketData(this.clientId)
    }

    // ---- GET & POST S3BUCKET
    async getSortedS3Data(imageId) {
        return await readSpecificS3BucketData(this.clientId, imageId)
    }

    async postS3Data(data) {
        this.writeDynamoDB()
        return await writeS3BucketData(this.clientId, this.imageId, data)
    }

    getS3URLData() {
        return readS3URLBucketData(this.clientId, this.imageId)
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
            this.platform,
            this.topic
        )
    }
}

module.exports.S3BucketAndDynamoDB = S3BucketAndDynamoDB
