const { S3Bucket } = require('../../models')
const imageConversion = require('../../utils')
module.exports = async (req, res) => {
    try {
        const s3 = new S3Bucket()
        console.log('hi')
        const data = await s3.getData()
        const tweet = req.query.tweet
        // Await the completion of all promises inside Promise.all
        const outputBuffer = await Promise.all(
            data.map(async (image) => {
                // Assuming metaData is a promise. If it's not, remove await.
                const dataImg = await image.metaData
                return imageConversion(dataImg)
            })
        )
        console.log('I am here')
        res.type('text/html')

        res.setHeader('Cache-Control', 'no-cache')
        // Send the converted image buffer as a response
        res.render('index', {
            title: 'Server-Side Rendered Page on AWS Lambda',
            tweet: tweet ?? 'N/A',
            images: outputBuffer.map((buffer) => buffer.toString('base64')),
        })
    } catch (err) {
        res.status(500).send(`Image Error Process`)
    }
}
