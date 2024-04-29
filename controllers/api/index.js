const axios = require('axios')
const { nanoid } = require('nanoid')

const { S3BucketAndDynamoDB } = require('../../models')
const imageConversion = require('../../utils')
module.exports.getDataRenderHTML = async (req, res) => {
    try {
        let tableData = null
        let outputBuffer = []
        if (req.query.id) {
            const s3 = new S3BucketAndDynamoDB(req.query.id)
            global.sharedData = { limit: 4, isSorted: false }
            tableData = await s3.getDynamoDBdata()
            const s3Data = await s3.getSortedS3Data(
                tableData.map((item) => item.imageId)
            )

            console.log(`tableData fetched items`, tableData)
            console.log(`Data fetched items`, s3Data)
            // Await the completion of all promises inside Promise.all
            outputBuffer = await Promise.all(
                s3Data.map(async (image) => {
                    try {
                        console.log('Processing image:', image)
                        const dataImg = await image.metaData
                        return await imageConversion(dataImg)
                    } catch (error) {
                        console.error('Error converting image:', error)
                        return null // Or handle as appropriate
                    }
                })
            )
        } else {
            res.status(400).send('Invalid Request, request id is missing')
            return
        }

        res.type('text/html')

        // Send the converted image buffer as a response
        res.render('index', {
            title: 'Server-Side Rendered Page on AWS Lambda',
            tweet: tableData[0].instruction ?? 'N/A',
            platform: tableData[0].platform,
            images: outputBuffer.map((buffer) => buffer.toString('base64')),
        })
    } catch (err) {
        res.status(500).send(`Image Error Process => ${err.message}`)
    }
}

module.exports.postDataAndImageAI = async (req, res) => {
    const data = req.body || null

    // Validate the request body
    if (
        !data?.instruction ||
        !data?.clientId ||
        !data?.platform ||
        !data?.topic
    ) {
        res.status(400).send(`Invalid Request`)
    }

    const input = {
        workflow_values: {
            seed: Math.floor(Math.random() * 10000),
            positive_prompt: data.instruction,
            negative_prompt: 'blurry, text, low quality',
        },
    }
    await axios
        .post(
            `${process.env.SERVER_AI_MODEL}/development/predict`,
            JSON.stringify(input),
            {
                headers: {
                    Authorization: `Api-Key ${process.env.API_KEY}`,
                },
            }
        )
        .then(async (response) => {
            const image = await response.data
            console.log('Image generated : ', image.result.length)
            try {
                for (const imgData of image.result) {
                    const instanceData = new S3BucketAndDynamoDB(
                        data.clientId,
                        nanoid(),
                        data.instruction,
                        data.platform,
                        data.topic
                    )

                    await instanceData.postS3Data(
                        Buffer.from(imgData.data, 'base64')
                    )
                }

                return res
                    .status(201)
                    .send(
                        `<h3>Message sent successfully ${data?.instruction}</h3>`
                    )
            } catch (error) {
                console.log(`error`, error)
                res.status(500).end(
                    'Something went wrong, please contact to <b>Email Address</b>'
                )
            }
        })
        .catch((error) => {
            console.error('Error:', error)
            res.status(500).end('Error in fetching image')
        })
}

// TODO: Implement the postImageAI function into webhook Activepieces API
module.exports.postWebhook = async (req, res) => {
    const data = req.body || null

    if (
        !data?.clientId ||
        !data?.mainText ||
        !data?.platform ||
        !data?.textInstruction ||
        !data?.imgInstruction
    ) {
        res.status(400).send('Invalid Request')
        return
    }

    const input = {
        clientId: data?.clientId,
        mainText: data.mainText,
        platform: data.platform,
        textInstruction: data.textInstruction,
        imgInstruction: data.imgInstruction,
    }
    console.log('Success 2:', process.env.WEBHOOK_SERVER)
    try {
        await axios
            .post(`${process.env.WEBHOOK_SERVER}`, JSON.stringify(input), {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(async () => {
                res.setHeader('Content-Type', 'application/json')
                res.status(201).json({
                    text: 'Response sent, check your email update',
                })
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

module.exports.wakeAIModel = async (req, res) => {
    await axios
        .post(`https://app.baseten.co/model_versions/31l4l1q/wake`, null, {
            method: 'POST',
            headers: {
                Authorization: `Api-Key GGfBURzN.4tZiaT0L0EY3lGEpeJm27aR4xVFRxn0X`,
            },
        })
        .then(async () => {
            res.setHeader('Content-Type', 'application/json')
            res.status(200).json({
                text: "Model's wake up call sent successfully",
            })
        })
        .catch((error) => {
            console.error('Error:', error)
            res.status(500).send('Error in calling API ' + error.message)
        })
}
