const awsServerlessExpress = require('aws-serverless-express')
const express = require('express')
const app = express()
const path = require('path')
const cors = require('cors')
const helmet = require('helmet')
const axios = require('axios')
require('dotenv').config()

const PORT = process.env.PORT || 3000
// Set the view engine to EJS for templating
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))
// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: true }))
// Serve static files
app.use(express.static(path.join(__dirname, 'public')))

app.use(express.json())

app.use(
    helmet.contentSecurityPolicy({
        directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'img-src': [
                "'self'",
                'data:',
                'blob:',
                'https://d39oted90y97ty.cloudfront.net',
            ],
            'script-src': [
                "'self'",
                'https://d39oted90y97ty.cloudfront.net',
                'https://a2pejekyml.execute-api.us-east-1.amazonaws.com/PROD/post-image-ai',
                'https://code.jquery.com/jquery-3.6.0.js',
                'https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js',
                'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css',
                'https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js',
            ],
        },
    })
)
// Use CORS middleware so we can make requests across origins
app.use(
    cors({
        origin: [
            'https://d39oted90y97ty.cloudfront.net',
            'https://a2pejekyml.execute-api.us-east-1.amazonaws.com',
        ],
        methods: ['GET', 'POST'],
    })
)
// // Main route
// app.get('/', (req, res) => {
//     const tweet = req.query.tweet
//     res.render('index', {
//         title: 'Server-Side Rendered Page on AWS Lambda',
//         tweet: tweet ?? 'N/A',
//         image: null,
//     })
// })
app.post('/new-tweet', async (req, res) => {
    const tweetInstructions = req.body || null
    console.log(`tweetInstructions`, tweetInstructions)
    //write fetch function to post tweet
    // if tweetInstructions is null, return error
    if (!tweetInstructions) {
        res.status(400).send('Invalid Request')
    } else {
        try {
            await axios.post(
                process.env.API_URL,
                JSON.stringify(tweetInstructions),
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
            return res
                .status(201)
                .send(
                    '<h3>Message sent successfully please check your Email Address</h3>'
                )
        } catch (error) {
            console.log(`error`, error)
            console.log(tweetInstructions)
            res.status(500).send(
                'Something went wrong, please contact to <b>techfi1992@gmail.com</b>'
            )
        }
    }
})

app.use('/', require('./controllers'))

app.post('/edit-tweet', async (req, res) => {
    const newTweet = req.body || null
    console.log(`newTweet`, newTweet)
    //write fetch function to post tweet
    // if newTweet is null, return error
    if (!newTweet) {
        res.status(400).send('Invalid Request')
    } else {
        try {
            await axios.post(
                process.env.EDIT_API_URL,
                JSON.stringify(newTweet),
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            )
            return res
                .status(201)
                .send(
                    '<h3>Message sent successfully please check your Email Address</h3>'
                )
        } catch (error) {
            console.log(`error`, error)
            console.log(newTweet)
            res.status(500).send(
                'Something went wrong, please contact to <b>techfi1992@gmail.com</b>'
            )
        }
    }
})
const server = awsServerlessExpress.createServer(app)

if (process.env.NODE_DEV)
    app.listen(PORT, function (err) {
        if (err) console.log('Error in server setup')
        console.log('Server listening on Port', PORT)
    })
else
    exports.handler = (event, context) => {
        // The callback is used to customize the response
        context.callbackWaitsForEmptyEventLoop = false

        awsServerlessExpress.proxy(
            server,
            event,
            context,
            'CALLBACK',
            (error, response) => {
                if (error) {
                    context.fail(error)
                } else {
                    // Adjust the response to set Content-Type to text/html
                    response.headers['Content-Type'] = 'text/html'

                    // Ensure no isBase64Encoded flag unless your content is actually base64 encoded
                    response.isBase64Encoded = false

                    context.succeed(response)
                }
            }
        )
    }
