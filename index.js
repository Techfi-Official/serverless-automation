const awsServerlessExpress = require("aws-serverless-express");
const express = require('express');
const app = express();
const path = require("path");
const getS3FileUrl = require('./utils/s3'); 
const fetch = require('node-fetch-commonjs');

const isRunningOnLambda = !!process.env.LAMBDA_TASK;
const PORT = process.env.PORT || 8080;
// Set the view engine to EJS for templating
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: true }));
// Serve static files
!isRunningOnLambda && app.use(express.static(path.join(__dirname, 'public')));

// Main route
app.get("/", (req, res) => {
  const staticData = !!isRunningOnLambda ? getS3FileUrl("automation-static-files","style.css") : null;
  const tweet = req.query.tweet || null;
  console.log(`tweet`, tweet);
  res.render("index", { title: "Server-Side Rendered Page on AWS Lambda", cssUrl : staticData, tweet: tweet});
});

app.post("/new-tweet", (req, res) => {
  console.log('api', process.env.API_URL)
  const tweetInstructions = req.body || null;
  console.log(`tweetInstructions`, tweetInstructions);
  //write fetch function to post tweet
  // if tweetInstructions is null, return error
  if(!tweetInstructions) {
    res.status(400).send('Invalid Request');
  } else {
    fetch(process.env.API_URL, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: tweetInstructions.tweetInstructions
  })
  .then(res => {
    console.log(`res`, res);
    return res.json()
  })
  .then(data => {
      // Log the response from the server
      // show an alert to the user saying the tweet was generated
      alert('Tweet Generated!');
      console.log(data);
      // Reload the page
      location.reload();
  })
  .catch(err => console.error(err));
  }
});

// Create the AWS Serverless Express server
const server = awsServerlessExpress.createServer(app);

if (isRunningOnLambda)
  // Lambda handler function
  exports.handler = (event, context) => {
    awsServerlessExpress.proxy(server, event, context);
    console.log(`Running on Lambda`, event);
  };
else
  app.listen((PORT), () => {
  // Listening API endpoints in localhost
    console.log(`Server is running on http://localhost:${PORT}`);
  });
