const sharp = require('sharp')
module.exports = async function (data) {
    try {
        return await sharp(data).png().toBuffer()
    } catch (err) {
        throw new Error(err)
    }
}
