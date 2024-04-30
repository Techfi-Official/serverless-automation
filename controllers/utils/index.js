module.exports.authUserApiKey = (req, res, next) => {
    const userApiKey = req.headers['api-key']
    if (userApiKey && userApiKey === process.env.API_KEY_LAMBDA) {
        next()
    } else {
        res.status(401).send('Unauthorized to lambda user API key')
    }
}
