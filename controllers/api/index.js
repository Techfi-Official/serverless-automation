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
        // Check if the request query contains an 'id' parameter
        if (req.query.id) {
            // Initialize an instance of S3BucketAndDynamoDB with the scheduleID and id from the request query
            const s3 = new S3BucketAndDynamoDB(req.query.scheduleID, req.query.id)
            // Set global shared data for limiting and sorting purposes
            global.sharedData = { limit: 4, isSorted: false }
            try {
                // Attempt to fetch DynamoDB data
                console.log('Attempting to get DynamoDB data...')
                tableData = await s3.getDynamoDBdata()
            } catch (error) {
                // Log and return an error response if DynamoDB data fetching fails
                console.error('Error in getDynamoDBdata:', error)
                return res.status(500).send(`Error fetching data: ${error.message}`)
            }
            // Check if no data was returned from DynamoDB
            if (!tableData || tableData.length === 0) {
                console.log('No data returned from getDynamoDBdata')
                return res.status(404).send('No data found for the given ID')
            }
            console.log('tableData:', tableData);
            console.log('tableData[0]', tableData[0].platform);

            console.log('tableData type:', typeof tableData);

            console.log('Starting Promise.all for image processing');
            // Extract the last 3 image URLs from the S3 data
            imageUrls = [tableData[0].imageSrc1, tableData[0].imageSrc2, tableData[0].imageSrc3];
            console.log('All image processing completed. imageUrls length:', imageUrls.length);
            console.log('imageUrls:', imageUrls);
        } else {
            // Return an error response if the request 'id' is missing
            res.status(400).send('Invalid Request, request id is missing')
            return
        }

        // Set the response content type to HTML
        res.type('text/html')

        // Render the 'index' template with the fetched data and send it as a response
        res.render('index', {
            title: 'Server-Side Rendered Page on AWS Lambda',
            tweet: tableData[0].postBody ?? 'N/A',
            platform: tableData[0].platform,
            images: imageUrls,
        })
    } catch (err) {
        // Catch any errors that occur during the process and render a default template with minimal data
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

    console.log('ozan data', data)

    if (
        !data?.platform ||
        !data?.scheduleID ||
        !data?.clientID
    ) {
        res.status(400).send('Invalid Request')
        return
    }
    // initialize S3BucketAndDynamoDB with scheduleID and clientID and platform
    const s3BucketAndDynamoDB = new S3BucketAndDynamoDB(data.scheduleID, data.clientID, data.platform)

    // get latest created post with scheduleID and clientID and platform
    const latestPosts = await s3BucketAndDynamoDB.getPosts()
    console.log('latestPosts', latestPosts)
    // Sort posts by createdAt in descending order and get the latest post
    const posts = latestPosts.Items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    console.log('sorted posts', posts)
    const latestPost = posts[0]
    console.log('latestPost', latestPost)

    let isAnyPostPublished = false;
    for (const post of posts) {
        if (post.isPublished) {
            isAnyPostPublished = true;
            break;
        }
    }

    const input = {
        clientID: data?.clientID,
        platform: data.platform,
        scheduleID: data.scheduleID,
        postBody: latestPost.postBody,
        image: latestPost.imageSrc1,
        imageSrc1: latestPost.imageSrc1,
        imageSrc2: latestPost.imageSrc2,
        imageSrc3: latestPost.imageSrc3,
    }

    let url = ''
    if(data.platform === 'twitter') {
        url = process.env.TWITTER_API_URL + `?id=${data.clientID}&scheduleID=${data.scheduleID}&platform=${data.platform}`
    } else if(data.platform === 'facebook') {
        url = process.env.FACEBOOK_API_URL + `?id=${data.clientID}&scheduleID=${data.scheduleID}&platform=${data.platform}`
    } else if(data.platform === 'instagram') {
        url = process.env.INSTAGRAM_API_URL + `?id=${data.clientID}&scheduleID=${data.scheduleID}&platform=${data.platform}`
    } else if(data.platform === 'linkedin') {
        url = process.env.LINKEDIN_API_URL + `?id=${data.clientID}&scheduleID=${data.scheduleID}&platform=${data.platform}`
    }

    try {
        if(isAnyPostPublished) {
            res.status(200).json({
                status: 'published'
            })
        }
        await axios
            .post(url, JSON.stringify(input), {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(async () => {
                res.setHeader('Content-Type', 'application/json')
                res.status(201).json({
                    text: 'Response sent, check your email update',
                    status: 'successfully_published'
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
            templateId: platformTemplateId,
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

module.exports.approvePost = async (req, res) => {
    console.log('approve post function is called');
    const { scheduleID, platform, clientID } = req.body;

    // Validate the request body
    if (!scheduleID || !platform || !clientID) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        console.log('approve post is trying');
        const s3BucketAndDynamoDB = new S3BucketAndDynamoDB(scheduleID, clientID);
        
        // Find the post from DynamoDB using the scheduleID
        const posts = await s3BucketAndDynamoDB.getPosts(); // Call the method on the instance
        console.log("here are the posts", posts);

        if (!posts || posts.Count === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Extract the post data
        const postsData = posts.Items;

        // Iterate through each post, modify the necessary fields, and update them in DynamoDB
        for (const post of postsData) {
            post.isPublished = true;
            post.publishedAt = new Date().toISOString();

            // Save the updated post back to DynamoDB
            console.log('updating the post', post);
            post.updatedAt = new Date().toISOString();
            const updatedPost = await s3BucketAndDynamoDB.writePostDynamoDB(post); // Call on the instance
            console.log('after update', updatedPost);
        }

        res.status(200).json({ message: 'Posts approved successfully', posts: postsData });
    } catch (error) {
        console.error('Error approving post:', error);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
// TODO: disapprove post url can be added to track when user click disapprove button in the email template 

module.exports.checkScheduleIdValidity = async (req, res) => {
    const { scheduleID, clientID, platform } = req.body

    if (!scheduleID || !clientID || !platform) {
        return res.status(400).json({ message: 'Missing required fields' })
    }

    try {
        // Get client platform limit from dynamoDB clients table
        // create new object with platform and clientID
        const s3BucketAndDynamoDB = new S3BucketAndDynamoDB(scheduleID, clientID, platform)
        // TODO: Below line is not gonna work because we are using some other table then posts
        const clientData = await s3BucketAndDynamoDB.getClientData()
        console.log('clientData', clientData)
        const twitterLimit = clientData.twitterLimit
        const facebookLimit = clientData.facebookLimit
        const instagramLimit = clientData.instagramLimit
        const linkedinLimit = clientData.linkedinLimit
        console.log('twitterLimit', twitterLimit)
        console.log('facebookLimit', facebookLimit)
        console.log('instagramLimit', instagramLimit)
        console.log('linkedinLimit', linkedinLimit)

        // Check if any post is published wi
        const posts = await S3BucketAndDynamoDB.getPosts()
        console.log('posts', posts)
        if (posts.length > 0) {
            for (const post of posts) {
                if (post.isPublished) {
                    return res.status(200).json({ message: 'Post already published' })
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
            const postCount = posts.length
            if (platformLimits[platform] <= postCount) {
                res.status(200).json({ message: 'Disable regeneration for this platform' })
                return
            }
        }
        return res.status(200).json({ message: 'Schedule ID is valid' })
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error', error: error.message })
    }
}

module.exports.proxy = async (req, res) => {
    // extract clientID from req.body
    const clientID = req.body.id
    console.log('clientID', clientID)
    const scheduleID = req.body.scheduleID
    console.log('scheduleID', scheduleID)
    const platform = req.body.platform
    console.log('platform', platform)
    // determine the url based on platform
    let url = ''
    if (platform === 'twitter') {
        url = process.env.TWITTER_API_URL + `?id=${clientID}&scheduleID=${scheduleID}`
    } else if (platform === 'facebook') {
        url = process.env.FACEBOOK_API_URL + `?id=${clientID}&scheduleID=${scheduleID}`
    } else if (platform === 'instagram') {
        url = process.env.INSTAGRAM_API_URL + `?id=${clientID}&scheduleID=${scheduleID}`
    } else if (platform === 'linkedin') {
        url = process.env.LINKEDIN_API_URL + `?id=${clientID}&scheduleID=${scheduleID}`
    }

    try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req.body),
        });
        const data = await response.json();
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
}
