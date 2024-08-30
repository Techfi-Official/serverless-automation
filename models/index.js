const {
    readALLS3BucketData,
    readClientData,
    readPostsData,
    readPostCount,
    readDynamoDB,
    writeDynamoDB,
    writeS3BucketData,
    readSpecificS3BucketData,
    readS3URLBucketData,
} = require('./aws')

class S3BucketAndDynamoDB {
    constructor(scheduleID, clientId, imageId, instruction, platform, imageUrl) {
        this.imageId = imageId || ''
        this.clientId = clientId || ''
        this.instruction = instruction || ''
        this.platform = platform || ''
        this.imageUrl = imageUrl || ''
        if (scheduleID != null) {
            this.scheduleID = scheduleID
        } else {
            throw new Error('id is required')
        }
    }
    // GET CLIENT DATA
    async getClientData() {
        return await readClientData(this.clientId)
    }
    // CHECK IF POST IS PUBLISHED
    async getPosts() {
        return await readPostsData(this.scheduleID)
    }
    // ---- GET & POST S3BUCKET
    async getAllS3Data() {
        return await readALLS3BucketData(this.postID)
    }
    // GET POST COUNT
    async getPostCount(platform) {
        return await readPostCount(platform)
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
