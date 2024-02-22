const express = require('express')
const router = express.Router()

router.get(['/'], require('./api'))

module.exports = router
