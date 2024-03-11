const Replicate = require('replicate')
const fs = require('fs')
const axios = require('axios')

const jsonFilePath = process.cwd() + '/data/workflow.json'

const { S3BucketAndDynamoDB } = require('../../models')
const imageConversion = require('../../utils')
module.exports.getData = async (req, res) => {
    try {
        let tableData = ''
        let outputBuffer = []
        if (req.query.id) {
            const s3 = new S3BucketAndDynamoDB(req.query.id)

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
    const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
        userAgent: 'https://www.npmjs.com/package/create-replicate',
    })
    const model =
        'fofr/any-comfyui-workflow:f8bbe354839d762488971160872eac54dc1c9e61462e91743d360d1d640020c6'

    fs.readFile(jsonFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err)
            return
        }
        // Parse the JSON data and convert it into a JavaScript object
        const jsonObject = JSON.parse(data)
        // Posting positive text prompt
        jsonObject['6'].inputs.text = req.body.text
        // Use the jsonObject here
        console.log(jsonObject['6'].inputs.text)
        const input = {
            workflow_json: JSON.stringify(jsonObject),
            randomise_seeds: true,
            return_temp_files: false,
        }
        console.log('Running...')
        replicate.run(model, { input }).then(async (output) => {
            console.log(output)
            try {
                const response = await axios.get(output, {
                    responseType: 'arraybuffer',
                })
                const imageBuffer = Buffer.from(response.data, 'binary')
                res.setHeader('Content-Type', 'image/png')
                res.status(201).send(imageBuffer)
            } catch (error) {
                console.error(error)
                res.status(500).send(
                    'An error occurred while fetching the image'
                )
            }
        })
    })
}
