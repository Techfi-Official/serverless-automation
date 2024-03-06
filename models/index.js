const { readS3BucketData } = require('./aws')
const { nanoid } = require('nanoid')

class S3Bucket {
    constructor(ownerId = '', imageID = '') {
        this.imageID = imageID || nanoid()

        if (ownerId != null) {
            this.ownerId = ownerId
        } else {
            throw new Error('ownerId is required')
        }
    }

    getData() {
        return readS3BucketData(this.ownerId, this.imageID)
    }
}

module.exports.S3Bucket = S3Bucket
