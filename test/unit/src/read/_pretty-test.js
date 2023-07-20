let isNode18 = require('../../../../src/lib/is-node-18')
let test = require('tape')
let mockfs = require('mock-fs')
let proxyquire = require('proxyquire')
let { join } = require('path')
let env = process.env.ARC_ENV
let sandboxPath = join(process.cwd(), 'public')

let errorState
let buf = msg => Buffer.from(msg)
// Tried to use 'aws-sdk-mock', wasn't able to get it working with aws.whatever().promise()
/* eslint-disable fp/no-class */
class S3Stub {
  constructor () {
    return {
      getObject: ({ Key }) => {
        // Good responses (only checking body here)
        // eslint-disable-next-line
        let got = { promise: async function () {
          return { Body: buf(`got ${Key}`) }
        } }

        // Failed requests (aws-sdk completely blows up)
        let thrower = {
          promise: async function () {
            let err = new Error(errorState)
            err.name = errorState
            throw err
          }
        }

        if (isFolder) {
          if (Key.includes('ok/hi')) return got
          if (Key.includes('notOk')) return thrower
        }
        if (Key.includes('404') && !errorState) return got
        return thrower
      }
    }
  }
}

let reset = () => {
  Key = isFolder = errorState = undefined
  mockfs.restore()
}

let sut = join(process.cwd(), 'src', 'read', '_pretty')
let pretty

let Key
let isFolder
let Bucket = 'a-bucket'
let headers = {}

if (!isNode18) {
  test('Set up env', t => {
    t.plan(1)
    process.env.__TESTING__ = true
    pretty = proxyquire(sut, {
      'aws-sdk/clients/s3': S3Stub
    })
    t.ok(pretty, 'Loaded pretty')
  })

  test('Peek and find nested index.html', async t => {
    t.plan(4)
    // AWS
    process.env.ARC_ENV = 'staging'
    Key = 'ok/hi'
    isFolder = true
    let result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder
    })
    t.equal(result.body, 'got ok/hi/index.html', 'Successfully peeked into an S3 folder without a trailing slash')

    // Fingerprinting enabled
    let assets = {
      'ok/hi/index.html': 'ok/hi/index-abc12.html'
    }
    result = await pretty({
      Bucket,
      Key,
      assets,
      headers,
      isFolder
    })
    t.equal(result.body, 'got ok/hi/index-abc12.html', 'Successfully peeked into an S3 folder with fingerprinting enabled')

    // Fingerprinting enabled with prefix
    let prefix = 'a-prefix'
    result = await pretty({
      Bucket,
      Key: `${prefix}/${Key}`,
      assets,
      headers,
      isFolder,
      prefix
    })
    t.equal(result.body, 'got a-prefix/ok/hi/index-abc12.html', 'Successfully peeked into an S3 folder with fingerprinting and prefix enabled')

    // Local
    process.env.ARC_ENV = 'testing'
    let msg = 'got ok/hi/index.html from local!'
    mockfs({
      'ok/hi/index.html': buf(msg)
    })
    result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder,
      sandboxPath: '',
    })
    t.equal(result.body, msg, 'Successfully peeked into a local folder without a trailing slash')
    reset()
  })

  test('Peek and do not find nested index.html', async t => {
    t.plan(4)
    // AWS
    process.env.ARC_ENV = 'staging'
    Key = 'notOk',
    isFolder = true
    errorState = 'NoSuchKey'
    let result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 if S3 file is not found')
    t.match(result.body, /NoSuchKey/, 'Error message included in response from S3')

    // Local
    process.env.ARC_ENV = 'testing'
    result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder,
      sandboxPath,
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 if local file is not found')
    t.match(result.body, /NoSuchKey/, 'Error message included in response from local')
    reset()
  })

  test('Return a custom 404', async t => {
    t.plan(8)
    // AWS
    process.env.ARC_ENV = 'staging'
    Key = 'getCustom404'
    let result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 with custom 404 error from S3')
    t.equal(result.body, 'got 404.html', 'Output is custom 404 page from S3 at: 404.html')

    // Fingerprinting enabled
    let assets = {
      '404.html': '404-abc12.html'
    }
    result = await pretty({
      Bucket,
      Key,
      assets,
      headers,
      isFolder
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 with custom 404 error from S3')
    t.equal(result.body, 'got 404-abc12.html', 'Output is custom 404 page from S3 at: 404-abc12.html')

    // Fingerprinting enabled with prefix
    let prefix = 'a-prefix'
    result = await pretty({
      Bucket,
      Key: `${prefix}/${Key}`,
      assets,
      headers,
      isFolder,
      prefix
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 with custom 404 error from S3')
    t.equal(result.body, 'got a-prefix/404-abc12.html', 'Output is custom 404 page from S3 at: a-prefix/404-abc12.html')

    // Local
    process.env.ARC_ENV = 'testing'
    // Update mockfs to find a 404
    let msg = 'got 404 from local!'
    mockfs({ '404.html': buf(msg) })
    result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder,
      sandboxPath: '',
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 with custom 404 error from local')
    t.equal(result.body, msg, 'Output is custom 404 page from local')
    reset()
  })

  test('Return the default 404', async t => {
    t.plan(6)
    let result
    // AWS
    process.env.ARC_ENV = 'staging'
    Key = 'cantfindme'
    errorState = 'NoSuchKey'
    result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 if S3 file is not found')
    t.match(result.body, /NoSuchKey/, 'Error message included in response from S3')

    // Local
    process.env.ARC_ENV = 'testing'
    // Update mockfs to find a nothing
    mockfs({})
    Key = 'cantfindme'
    errorState = 'NoSuchKey'
    result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder,
      sandboxPath,
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 if local file is not found')
    t.match(result.body, /NoSuchKey/, 'Error message included in response from local')

    // Check casing
    mockfs({
      '404.HTML': 'yo'
    })
    errorState = 'NoSuchKey'
    result = await pretty({
      Bucket,
      Key,
      headers,
      isFolder,
      sandboxPath: '',
    })
    t.equal(result.statusCode, 404, 'Returns statusCode of 404 if local file is not found')
    t.match(result.body, /NoSuchKey/, 'Error message included in response from local')
    reset()
  })

  test('Teardown', t => {
    t.plan(1)
    process.env.ARC_ENV = env
    delete process.env.__TESTING__
    t.pass('Done')
  })
}
