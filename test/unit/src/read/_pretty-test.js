let test = require('tape')
let mockTmp = require('mock-tmp')
let proxyquire = require('proxyquire')
let { join } = require('path')
let env = process.env.ARC_ENV
let sandboxPath = join(process.cwd(), 'public')

let errorState
let buf = msg => Buffer.from(msg)

function thrower () {
  let err = new Error(errorState)
  err.name = errorState
  throw err
}

async function getS3 () {
  return async function awsLiteS3 ({ Key }) {
    let got = { Body: buf(`got ${Key}`) }

    if (isFolder) {
      if (Key.includes('ok/hi')) return got
      if (Key.includes('notOk')) thrower()
    }
    if (Key.includes('404') && !errorState) return got
    thrower()
  }
}

let reset = () => {
  Key = isFolder = errorState = undefined
  mockTmp.reset()
}

let sut = join(process.cwd(), 'src', 'read', '_pretty')
let pretty

let Key
let isFolder
let tmp
let Bucket = 'a-bucket'
let headers = {}

test('Set up env', t => {
  t.plan(1)
  process.env.__TESTING__ = true
  pretty = proxyquire(sut, {
    '../lib/get-s3': getS3,
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
    isFolder,
  })
  t.equal(result.body, 'got ok/hi/index.html', 'Successfully peeked into an S3 folder without a trailing slash')

  // Fingerprinting enabled
  let assets = {
    'ok/hi/index.html': 'ok/hi/index-abc12.html',
  }
  result = await pretty({
    Bucket,
    Key,
    assets,
    headers,
    isFolder,
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
    prefix,
  })
  t.equal(result.body, 'got a-prefix/ok/hi/index-abc12.html', 'Successfully peeked into an S3 folder with fingerprinting and prefix enabled')

  // Local
  process.env.ARC_ENV = 'testing'
  let msg = 'got ok/hi/index.html from local!'
  tmp = mockTmp({
    'ok/hi/index.html': buf(msg),
  })
  result = await pretty({
    Bucket,
    Key,
    headers,
    isFolder,
    sandboxPath: tmp,
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
    isFolder,
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
    isFolder,
  })
  t.equal(result.statusCode, 404, 'Returns statusCode of 404 with custom 404 error from S3')
  t.equal(result.body, 'got 404.html', 'Output is custom 404 page from S3 at: 404.html')

  // Fingerprinting enabled
  let assets = {
    '404.html': '404-abc12.html',
  }
  result = await pretty({
    Bucket,
    Key,
    assets,
    headers,
    isFolder,
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
    prefix,
  })
  t.equal(result.statusCode, 404, 'Returns statusCode of 404 with custom 404 error from S3')
  t.equal(result.body, 'got a-prefix/404-abc12.html', 'Output is custom 404 page from S3 at: a-prefix/404-abc12.html')

  // Local
  process.env.ARC_ENV = 'testing'
  // Update mockTmp to find a 404
  let msg = 'got 404 from local!'
  let tmp = mockTmp({ '404.html': buf(msg) })
  result = await pretty({
    Bucket,
    Key,
    headers,
    isFolder,
    sandboxPath: tmp,
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
    isFolder,
  })
  t.equal(result.statusCode, 404, 'Returns statusCode of 404 if S3 file is not found')
  t.match(result.body, /NoSuchKey/, 'Error message included in response from S3')

  // Local
  process.env.ARC_ENV = 'testing'
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
  tmp = mockTmp({
    '404.HTML': 'yo',
  })
  errorState = 'NoSuchKey'
  result = await pretty({
    Bucket,
    Key,
    headers,
    isFolder,
    sandboxPath: tmp,
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
