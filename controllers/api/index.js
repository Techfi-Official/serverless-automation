const { S3Bucket } = require('../../models')
const imageConversion = require('../../utils')
module.exports = async (req, res) => {
    try {
        let tableData = ''
        let outputBuffer = []
        if (req.query.id) {
            const s3 = new S3Bucket(req.query.id)

            const s3Data = await s3.getS3Data()
            tableData = await s3.getDynamoDBdata()

            console.log(`Data fetched: ${s3Data.length} items`)
            // Await the completion of all promises inside Promise.all
            outputBuffer = await Promise.all(
                s3Data.map(async (image) => {
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
        }

        res.type('text/html')

        res.setHeader('Cache-Control', 'no-cache')
        // Send the converted image buffer as a response
        res.render('index', {
            title: 'Server-Side Rendered Page on AWS Lambda',
            tweet: tableData?.instruction ?? 'N/A',
            images: outputBuffer.map((buffer) => buffer.toString('base64')),
        })
    } catch (err) {
        res.status(500).send(`Image Error Process => ${err.message}`)
    }
}
