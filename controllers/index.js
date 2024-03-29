const express = require('express')
const router = express.Router()

router.get(['/'], require('./api').getDataRenderHTML)

router.post(['/post-data'], require('./api').postData)

router.post(['/post-image-ai'], require('./api').postImageAI)

module.exports = router
