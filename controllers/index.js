const express = require('express')
const router = express.Router()

router.get(['/'], require('./api').getData)

router.post(['/post-data'], require('./api').postData)

module.exports = router
