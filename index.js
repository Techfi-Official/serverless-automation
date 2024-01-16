const awsServerlessExpress = require("aws-serverless-express");
const express = require('express');
const app = express();
const path = require("path");
const getS3FileUrl = require('./utils/s3'); 

const isRunningOnLambda = !!process.env.LAMBDA_TASK;
const PORT = process.env.PORT || 8080;
// Set the view engine to EJS for templating
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Serve static files
!isRunningOnLambda && app.use(express.static(path.join(__dirname, 'public')));

// Main route
app.get("/", (req, res) => {
  const staticData = !!isRunningOnLambda ? getS3FileUrl("automation-static-files","style.css") : null;
  res.render("index", { title: "Server-Side Rendered Page on AWS Lambda", cssUrl : staticData});
});

// Create the AWS Serverless Express server
const server = awsServerlessExpress.createServer(app);

if (isRunningOnLambda)
  // Lambda handler function
  exports.handler = (event, context) => {
    awsServerlessExpress.proxy(server, event, context);
  };
else
  app.listen((PORT), () => {
  // Listening API endpoints in localhost
    console.log(`Server is running on http://localhost:${PORT}`);
  });
