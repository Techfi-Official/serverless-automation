const {
    readALLS3BucketData,
    readDynamoDB,
    writeDynamoDB,
    writeS3BucketData,
    readSpecificS3BucketData,
    readS3URLBucketData,
} = require('./aws')

class S3BucketAndDynamoDB {
    constructor(postID, imageId, instruction, platform, imageUrl) {
        this.imageId = imageId || ''
        this.instruction = instruction || ''
        this.platform = platform || ''
        this.imageUrl = imageUrl || ''
        if (postID != null) {
            this.postID = postID
        } else {
            throw new Error('id is required')
        }
    }

    // ---- GET & POST S3BUCKET
    async getAllS3Data() {
        return await readALLS3BucketData(this.postID)
    }

    // ---- GET & POST S3BUCKET
    async getSortedS3Data(imageId) {
        return await readSpecificS3BucketData(this.postID, imageId)
    }

    async postS3Data(data) {
        this.writeDynamoDB()
        return await writeS3BucketData(this.postID, this.imageId, data)
    }

    getS3URLData() {
        return readS3URLBucketData(this.postID, this.imageId)
    }

    // --------------------------------

    getDynamoDBdata() {
        return readDynamoDB(this.postID)
    }

    writeDynamoDB() {
        return writeDynamoDB(
            this.postID,
            this.imageId,
            this.instruction,
            this.platform,
            this.imageUrl
        )
    }
}

module.exports.S3BucketAndDynamoDB = S3BucketAndDynamoDB
