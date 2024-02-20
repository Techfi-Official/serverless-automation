const { S3Bucket } = require('../../models')
const imageConversion = require('../../utils')
module.exports = async (req, res) => {
    try {
        console.log('hi')
        const s3 = new S3Bucket()

        const data = await s3.getData()
        console.log('data', data)
        Promise.all(
            data.map(async (image) => {
                const data = await image.metaData
                return imageConversion(data)
            })
        )
            .then(async (outputBuffer) => {
                // Set the content type to image/png
                res.type('text/html')
                console.log('outputBuffer', outputBuffer)
                res.setHeader('Cache-Control', 'no-cache')
                // Send the converted image buffer as a response
                res.render('index', {
                    title: 'Server-Side Rendered Page on AWS Lambda',
                    tweet: 'N/A',
                    images: outputBuffer.map((outputBuffer) =>
                        outputBuffer.toString('base64')
                    ),
                })
            })
            .catch((err) => {
                console.error(err)
                res.status(500).send('Error processing image')
            })
    } catch (err) {
        res.status(404).send('sending bad request')
    }
}
