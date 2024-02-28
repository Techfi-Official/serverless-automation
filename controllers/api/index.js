const { S3Bucket } = require('../../models')
const imageConversion = require('../../utils')
module.exports = async (req, res) => {
    try {
        const s3 = new S3Bucket()

        const data = await s3.getData()
        const tweet = req.query.tweet
        console.log(`Data fetched: ${data.length} items`)
        // Await the completion of all promises inside Promise.all
        const outputBuffer = await Promise.all(
            data.map(async (image) => {
                try {
                    console.log('Processing image:', image)
                    const dataImg = await image.metaData // Ensure this is correct
                    return await imageConversion(dataImg)
                } catch (error) {
                    console.error('Error converting image:', error)
                    return null // Or handle as appropriate
                }
            })
        )

        console.log('All images processed')
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
