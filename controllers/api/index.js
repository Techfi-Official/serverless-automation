const axios = require('axios')
const { nanoid } = require('nanoid')

const { S3BucketAndDynamoDB } = require('../../models')
const imageConversion = require('../../utils')
module.exports.getDataRenderHTML = async (req, res) => {
    try {
        let tableData = ''
        let outputBuffer = []
        if (req.query.id) {
            const s3 = new S3BucketAndDynamoDB(req.query.id)

            const s3Data = await s3.getS3Data()
            tableData = await s3.getDynamoDBdata()
            console.log(`tableData fetched items`, tableData)
            console.log(`Data fetched items`, s3Data)
            // Await the completion of all promises inside Promise.all
            outputBuffer = await Promise.all(
                s3Data.map(async (image) => {
                    try {
                        console.log('Processing image:', image)
                        const dataImg = await image.metaData // Ensure this is correct
                        console.log('dataImg', await imageConversion(dataImg))
                        return await imageConversion(dataImg)
                    } catch (error) {
                        console.error('Error converting image:', error)
                        return null // Or handle as appropriate
                    }
                })
            )

            console.log('All images processed')
        } else {
            res.status(400).send('Invalid Request, request id is missing')
            return
        }

        res.type('text/html')

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

module.exports.postData = async (req, res) => {
    const data = req.body || null
    console.log(`data`, data)
    const dynamodb = new S3BucketAndDynamoDB(
        data?.id,
        null,
        data?.instruction,
        data?.name
    )
    dynamodb.writeDynamoDB()

    if (!data?.instruction || !data?.name) {
        res.status(400).send(
            `Invalid Request ${data?.instruction} and ${!data?.name}`
        )
    } else {
        try {
            return res
                .status(201)
                .send(`<h3>Message sent successfully ${data?.instruction}</h3>`)
        } catch (error) {
            console.log(`error`, error)
            console.log(data)
            res.status(500).send(
                'Something went wrong, please contact to <b>Email Address</b>'
            )
        }
    }
}

module.exports.postImageAI = async (req, res) => {
    const data = req.body || null

    if (!data?.id || !data?.text || !data?.platform) {
        res.status(400).send('Invalid Request')
    }

    const input = {
        workflow_values: {
            positive_prompt: data.text,
            negative_prompt: data.text_neg ?? '',
            seed: Math.floor(Math.random() * 100000),
        },
    }

    try {
        await axios
            .post(
                `${process.env.SERVER_AI_MODEL}/development/predict`,
                JSON.stringify(input),
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Api-Key ${process.env.API_KEY}`,
                    },
                }
            )
            .then(async (response) => {
                const image = await response.data
                console.log('Success 2:', response.body)
                const instanceData = new S3BucketAndDynamoDB(
                    data.id,
                    nanoid(),
                    data.text,
                    data.platform
                )
                await instanceData.postS3Data(
                    Buffer.from(image.result[0].data, 'base64')
                )
                res.setHeader('Content-Type', 'application/json')
                res.status(201).json({ image: image.result[0].data })
            })
            .catch((error) => {
                console.error('Error:', error)
                res.status(500).send('Error in fetching image')
            })
    } catch (error) {
        console.error(error)
        res.status(500).send('An error occurred while fetching the image')
    }
}
