const express = require('express')
const { authUserApiKey } = require('./utils')
const router = express.Router()
const {
    postDataAndImageAI,
    getDataRenderHTML,
    postWebhook,
    wakeAIModel,
    sendEmail,
} = require('./api')

router.get(['/'], getDataRenderHTML)

router.get(['/wake-ai-model'], authUserApiKey, wakeAIModel)

router.post(['/post-data-image-ai'], authUserApiKey, postDataAndImageAI)

router.post(['/send-email'], authUserApiKey, sendEmail)

router.post(['/post-webhook'], postWebhook)

router.post(['/post-image-ai'], require('./api').postImageAI)

module.exports = router
