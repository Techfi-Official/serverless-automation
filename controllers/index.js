const express = require('express')
const { authUserApiKey } = require('./utils')
const router = express.Router()
const {
    postDataAndImageAI,
    getDataRenderHTML,
    postWebhook,
    wakeAIModel,
    sendEmail,
    approvePost,
    checkScheduleIdValidity,
    proxy,
    getFluxImage
} = require('./api')

router.get(['/'], getDataRenderHTML)

router.post(['/proxy'], proxy)

router.get(['/wake-ai-model'], authUserApiKey, wakeAIModel)

router.post(['/get-flux-image'], authUserApiKey, getFluxImage)

router.post(['/post-data-image-ai'], authUserApiKey, postDataAndImageAI)

router.post(['/send-email'], authUserApiKey, sendEmail)

router.post('/approve-post', authUserApiKey, approvePost)

router.post(['/post-webhook'], postWebhook)

router.post(['/check-schedule-id-validity'], checkScheduleIdValidity)

// router.post(['/post-image-ai'], require('./api').postImageAI)

module.exports = router