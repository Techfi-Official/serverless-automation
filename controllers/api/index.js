const axios = require('axios')
const { nanoid } = require('nanoid')
const sgMail = require('@sendgrid/mail')
const crypto = require('crypto')
const aws4  = require('aws4')
const https = require('https')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const { S3BucketAndDynamoDB } = require('../../models')
const imageConversion = require('../../utils')
module.exports.getDataRenderHTML = async (req, res) => {
    let tableData = null
    let imageUrls = []
    try {
        if (req.query.id) {
            const s3 = new S3BucketAndDynamoDB(req.query.id)
            global.sharedData = { limit: 4, isSorted: false }
            try {
                console.log('Attempting to get DynamoDB data...')
                tableData = await s3.getDynamoDBdata()
            } catch (error) {
                console.error('Error in getDynamoDBdata:', error)
                return res.status(500).send(`Error fetching data: ${error.message}`)
            }
            if (!tableData || tableData.length === 0) {
                console.log('No data returned from getDynamoDBdata')
                return res.status(404).send('No data found for the given ID')
            }
            const s3Data = await s3.getSortedS3Data(
                tableData.map((item) => item.imageId)
            )
            console.log('Starting Promise.all for image processing');
            // Collect last 3 image URLs
            imageUrls = s3Data.slice(-3).map((image) => image.url)
            console.log('All image processing completed. imageUrls length:', imageUrls.length);
        } else {
            res.status(400).send('Invalid Request, request id is missing')
            return
        }

        res.type('text/html')

        // Send the image URLs as a response
        res.render('index', {
            title: 'Server-Side Rendered Page on AWS Lambda',
            tweet: tableData[0].instruction ?? 'N/A',
            platform: tableData[0].platform,
            images: imageUrls,
        })
    } catch (err) {
        res.render('index', {
            title: 'Server-Side Rendered Page on AWS Lambda',
            tweet: 'N/A',
            platform: 'twitter',
            images: [],
        })
    }
}

module.exports.postDataAndImageAI = async (req, res) => {
    const data = req.body || null

    // Validate the request body
    if (
        !data?.positive_instruction ||
        !data?.clientId ||
        !data?.platform ||
        !data?.topic
    ) {
        res.status(400).send(`Invalid Request`)
    }
    const requestBody = {
        positive_prompt: data.positive_instruction,
        negative_prompt:
            data?.negative_instruction || 'misshape, wrong text, six fingers',
        prompt_file: 'workflow_api.json',
        seed: Math.floor(Math.random() * 10000),
    }

    const bodyHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(requestBody))
        .digest('hex')
    const request = {
        host: new URL(process.env.SERVER_AI_MODEL).host,
        method: 'POST',
        path: new URL(process.env.SERVER_AI_MODEL).pathname,
        headers: {
            'Content-Type': 'application/json',
            'X-Amz-Content-Sha256': bodyHash,
        },
        body: JSON.stringify(requestBody),
        service: 'lambda',
    }
    const signedRequest = aws4.sign(request, {
        accessKeyId: process.env.AWS_ACCESSES_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESSES_KEY,
        region: process.env.AWS_REGIONS,
    })   
    await axios({
        method: signedRequest.method,
        url: process.env.SERVER_AI_MODEL,
        headers: signedRequest.headers,
        data: signedRequest.body,
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    })
        .then(async (response) => {
            const image = response.data
            let imageURLs = []

            if (image.toLowerCase().includes('none'))
                res.status(500).end(
                        'Something went wrong, please contact to <b>Email Address</b>'
                )
                 
            try {
                for (const imgData of [image]) {
                    const instanceData = new S3BucketAndDynamoDB(
                        data.clientId,
                        nanoid(),
                        data.positive_instruction,
                        data.platform,
                        data.topic
                    )

                    await instanceData.postS3Data(
                        Buffer.from(imgData, 'base64')
                    )

                    imageURLs.push(instanceData.getS3URLData())
                }
                console.log('Image generated : ', imageURLs)
                res.status(201).json({ imageURLs })
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
        .post(`https://app.baseten.co/model_versions/wp2jppq/wake`, null, {
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

module.exports.sendEmail = async (req, res) => {
    const {
        imageSrc1,
        imageSrc2,
        imageSrc3,
        approveLink,
        disapproveLink,
        editLink,
        postBody,
        email,
        platform,
        companyName,
    } = req.body
    // Basic validation
    if (
        !approveLink ||
        !disapproveLink ||
        !email ||
        !postBody ||
        !platform ||
        !companyName
    ) {
        return res.status(400).json({ message: 'Missing required fields' })
    }

    // Define a mapping from platforms to their respective email template IDs
    const templateIdMap = {
        twitter: process.env.TWEET_EMAIL_TEMPLATE_ID,
        facebook: process.env.FACEBOOK_EMAIL_TEMPLATE_ID,
        instagram: process.env.INSTAGRAM_EMAIL_TEMPLATE_ID,
        linkedin: process.env.LINKEDIN_EMAIL_TEMPLATE_ID,
    }

    const platformTemplateId = templateIdMap[platform] // Fetch the template ID based on the platform

    if (!platformTemplateId) {
        return res.status(400).json({ message: 'Invalid platform' })
    }

    try {
        // Prepare the email data using the SendGrid template
        const msg = {
            to: email,
            from: process.env.EMAIL_FROM,
            templateId: process.env.TWEET_EMAIL_TEMPLATE_ID,
            dynamicTemplateData: {
                subject: 'Check Your New Generated Tweet!',
                imageSrc1,
                imageSrc2,
                imageSrc3,
                approveLink,
                disapproveLink,
                editLink,
                postBody,
                companyName,
            },
        }

        // Send email
        await sgMail.send(msg)

        res.status(200).json({ message: 'Email sent successfully!' })
    } catch (error) {
        // console.error('Email sending error:', error);
        res.status(500).json({
            message: 'Failed to send email',
            error: error.message,
        })
    }
}
