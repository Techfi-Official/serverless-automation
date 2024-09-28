const axios = require('axios')
const { nanoid } = require('nanoid')
const sgMail = require('@sendgrid/mail')
const crypto = require('crypto')
const aws4  = require('aws4')
const https = require('https')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const { S3BucketAndDynamoDB } = require('../../models')
// const imageConversion = require('../../utils')
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
            const s3Data = await s3.getS3URLData()
            console.log('s3Data:', s3Data);
            console.log('Starting Promise.all for image processing');
            // Collect last 3 image URLs
            imageUrls = s3Data.slice(-3).map((image) => image.imageUrl)
            console.log('All image processing completed. imageUrls length:', imageUrls.length);
            console.log('imageUrls:', imageUrls);
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
// TODO: I think this function is not used
module.exports.postDataAndImageAI = async (req, res) => {
    const data = req.body || null

    // Validate the request body
    if (
        !data?.positive_instruction ||
        !data?.platform
    ) {
        res.status(400).send(`Invalid Request`)
    }
    const requestBody = {
        positive_prompt: data.positive_instruction,
        negative_prompt:
            data?.negative_instruction || 'misshape, wrong text, six fingers',
        prompt_file: 'workflow_api.json',
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
                for (const imgData of image) {
                    const instanceData = new S3BucketAndDynamoDB(
                        nanoid(),
                        data.positive_instruction,
                        data.platform
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
        !data?.mainText ||
        !data?.platform ||
        !data?.textInstruction ||
        !data?.imgInstruction ||
        !data?.scheduleID ||
        !data?.clientID
    ) {
        res.status(400).send('Invalid Request')
        return
    }

    const input = {
        clientID: data?.clientID,
        mainText: data.mainText,
        platform: data.platform,
        textInstruction: data.textInstruction,
        imgInstruction: data.imgInstruction,
        scheduleID: data.scheduleID,
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
    console.log('sendEmail function called')
    console.log('req.body', req.body)
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
        scheduleID
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
    console.log('email', email)
    // Define a mapping from platforms to their respective email template IDs
    const templateIdMap = {
        twitter: process.env.TWEET_EMAIL_TEMPLATE_ID,
        facebook: process.env.FACEBOOK_EMAIL_TEMPLATE_ID,
        instagram: process.env.INSTAGRAM_EMAIL_TEMPLATE_ID,
        linkedin: process.env.LINKEDIN_EMAIL_TEMPLATE_ID,
    }
    console.log('platform', platform)
    const platformTemplateId = templateIdMap[platform] // Fetch the template ID based on the platform

    if (!platformTemplateId) {
        return res.status(400).json({ message: 'Invalid platform' })
    }

    try {
        // Create an instance of S3BucketAndDynamoDB
        const clientID = email.split('@')[0]
        console.log('ozan clientID', clientID)
        const s3BucketAndDynamoDB = new S3BucketAndDynamoDB(
            scheduleID, // Pass the required parameters
            clientID,
            platform,
            email,
            companyName,
            postBody,
            false,      // isPublished
            null,       // publishedAt
            imageSrc1,
            imageSrc2,
            imageSrc3,
            approveLink,
            disapproveLink,
            editLink
        );

        // Record the post before sending email
        const postRecorded = await s3BucketAndDynamoDB.writeDynamoDB();

        // Check if the post was recorded successfully
        if (!postRecorded) {
            return res.status(500).json({ message: 'Failed to record the post in DynamoDB' });
        }

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
        console.error('Email sending error:', error);
        res.status(500).json({
            message: 'Failed to send email',
            error: error.message,
        })
    }
}

module.exports.checkScheduleIdValidity = async (req, res) => {
    const { scheduleID, clientID } = req.body

    if (!scheduleID || !clientID) {
        return res.status(400).json({ message: 'Missing required fields' })
    }

    try {
        // Get client platform limit from dynamoDB clients table
        // TODO: Below line is not gonna work because we are using some other table then posts
        const clientData = await S3BucketAndDynamoDB.getClientData()
        console.log('clientData', clientData)
        const twitterLimit = clientData.twitterLimit
        const facebookLimit = clientData.facebookLimit
        const instagramLimit = clientData.instagramLimit
        const linkedinLimit = clientData.linkedinLimit
        console.log('twitterLimit', twitterLimit)
        console.log('facebookLimit', facebookLimit)
        console.log('instagramLimit', instagramLimit)
        console.log('linkedinLimit', linkedinLimit)

        // Check if any post is published with the scheduleID
        const posts = await S3BucketAndDynamoDB.getPosts(scheduleID)
        console.log('posts', posts)
        if (posts.length > 0) {
            for (const post of posts) {
                if (post.isPublished) {
                    return res.status(400).json({ message: 'Post already published' })
                }
            }
        }
        // Check if number of posts are less than platform limit
        const platformLimits = {
            twitter: twitterLimit,
            facebook: facebookLimit,
            instagram: instagramLimit,
            linkedin: linkedinLimit,
        }

        for (const platform of platformLimits) {
            // TODO: This function not implemented yet default is 5
            // const postCount = await S3BucketAndDynamoDB.getPostCount(platform)
            const postCount = 5
            if (postCount < platformLimits[platform]) {
                return res.status(200).json({ message: 'Schedule ID is valid' })
            }
        }
        return res.status(400).json({ message: 'Schedule ID is not valid' })
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}