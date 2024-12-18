const {
    readALLS3BucketData,
    readClientData,
    readPostsData,
    readPostCount,
    readDynamoDB,
    writeDynamoDB,
    writePostDynamoDB,
    writeS3BucketData,
    readSpecificS3BucketData,
    readS3URLBucketData,
} = require('./aws')

class S3BucketAndDynamoDB {
    constructor(scheduleID, clientID, platform, email, companyName, postBody, isPublished, publishedAt, imageSrc1, imageSrc2, imageSrc3, approveLink, disapproveLink, editLink) {
        this.scheduleID = scheduleID || ''
        this.clientID = clientID || ''
        this.platform = platform || ''
        this.email = email || ''
        this.companyName = companyName || ''
        this.postBody = postBody || ''
        this.isPublished = isPublished || ''
        this.publishedAt = publishedAt || ''
        this.imageSrc1 = imageSrc1 || ''
        this.imageSrc2 = imageSrc2 || ''
        this.imageSrc3 = imageSrc3 || ''
        this.approveLink = approveLink || ''
        this.disapproveLink = disapproveLink || ''
        this.editLink = editLink || ''

        if (scheduleID != null) {
            this.scheduleID = scheduleID
        } else {
            throw new Error('id is required')
        }
    }
    // GET CLIENT DATA
    async getClientData() {
        return await readClientData(this.clientID)
    }
    // CHECK IF POST IS PUBLISHED
    async getPosts() {
        return await readPostsData(this.scheduleID)
    }
    // ---- GET & POST S3BUCKET
    async getAllS3Data() {
        return await readALLS3BucketData(this.scheduleID)
    }
    // GET POST COUNT
    async getPostCount(platform) {
        return await readPostCount(platform)
    }

    // ---- GET & POST S3BUCKET
    async getSortedS3Data(imageId) {
        return await readSpecificS3BucketData(this.scheduleID, imageId)
    }

    async postS3Data(data) {
        this.writeDynamoDB()
        return await writeS3BucketData(this.scheduleID, this.imageId, data)
    }

    getS3URLData() {
        return readS3URLBucketData(this.scheduleID, this.imageId)
    }

    // --------------------------------

    getDynamoDBdata() {
        return readDynamoDB(this.scheduleID, this.clientID)
    }

    writeDynamoDB(tableName, item) {
        // Ensure scheduleID is included in the item
        const itemWithScheduleID = {
            ...item,
            scheduleID: this.scheduleID
        };
        return writeDynamoDB(tableName, itemWithScheduleID);
    }

    writePostDynamoDB(post) {
        return writePostDynamoDB(post);
    }

    async writeImageS3(imageKey, imageBuffer) {
        return await writeS3BucketData(this.clientID, this.scheduleID, imageKey, imageBuffer)
    }

    async writeImageDynamoDB(tableName, item) {
        return await writeDynamoDB(tableName, item)
    }
}

module.exports.S3BucketAndDynamoDB = S3BucketAndDynamoDB
