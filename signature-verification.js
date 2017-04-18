const crypto = require('crypto')

// const secretKey = Buffer.from(, 'utf8')

module.exports = {
  getHash: (data) => {
    return crypto.createHmac('sha256', process.env.WEBHOOKS_SECRET_KEY)
      .update(data)
      .digest('hex');
  }
}