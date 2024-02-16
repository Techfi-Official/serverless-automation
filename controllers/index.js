const express = require('express')
const router = express.Router()

router.get(['/getBucket'], require('./api'))

module.exports = router
