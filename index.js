const express = require("express");
const app = express();
const path = require("path");
const fetch = require("node-fetch-commonjs");

const PORT = process.env.PORT || 3000;
// Set the view engine to EJS for templating
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: true }));
// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Main route
app.get("/", (req, res) => {
  const tweet = req.query.tweet || null;
  console.log(`tweet`, tweet);
  res.render("index", {
    title: "Server-Side Rendered Page on AWS Lambda",
    tweet: tweet,
  });
});

app.post("/new-tweet", async (req, res) => {
  console.log("api", process.env.API_URL);
  const tweetInstructions = req.body || null;
  console.log(`tweetInstructions`, tweetInstructions);
  //write fetch function to post tweet
  // if tweetInstructions is null, return error
  if (!tweetInstructions) {
    res.status(400).send("Invalid Request");
  } else {
    try {
      await fetch(process.env.API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: tweetInstructions.tweetInstructions,
      });
      return res.status(201).send(
        "<h3>Message sent successfully please check your Email Address</h3>"
      );
    } catch (error) {
        res.status(500).send("Something went wrong, please contact to <b>techfi1992@gmail.com</b>");
    }
  }
});

app.listen(PORT, () => {
  // Listening API endpoints in localhost
  console.log(`Server is running on http://localhost:${PORT}`);
});
