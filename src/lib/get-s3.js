let s3

module.exports = async function getS3 () {
  if (s3) return s3
  // eslint-disable-next-line
  let awsLite = require('@aws-lite/client')
  s3 = await awsLite({
    autoloadPlugins: false,
    region: process.env.AWS_REGION || 'us-west-2',
    plugins: [ '@aws-lite/s3' ],
  })
  return s3
}
