let readLocal = require('./_local')
let readS3 = require('./_s3')

module.exports = function read ({ env }) {
  let { ARC_LOCAL, NODE_ENV } = process.env
  let local = env === 'testing' || NODE_ENV === 'testing' || ARC_LOCAL
  return local ? readLocal : readS3
}
