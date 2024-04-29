let _s3

module.exports = async function getS3 () {
  if (_s3) return _s3
  let awsLite = require('@aws-lite/client')
  let { s3 } = await awsLite({
    region: process.env.AWS_REGION || 'us-west-2',
    plugins: [ import('@aws-lite/s3') ],
  })
  _s3 = s3.GetObject
  return _s3
}
