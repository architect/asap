let test = require('tape')
let { join } = require('path')
let proxyquire = require('proxyquire')
let reader = params => params
let readStub = () => reader
let sut = join(process.cwd())
let asap = proxyquire(sut, {
  './read': readStub,
})
let { http } = require('@architect/req-res-fixtures')
let reqs = http.req
let req = reqs.arc6.getIndex
let proxyReq = reqs.arc6.getProxyPlus

let stagingBucket = 'my-staging-bucket'
let productionBucket = 'my-production-bucket'
let basicBucketConfig = {
  bucket: {
    staging: stagingBucket,
  },
}

test('Set up env', t => {
  t.plan(1)
  t.ok(asap, 'Loaded asap')
})

test('Config: bucket', async t => {
  t.plan(5)
  let proxy = asap()

  // Test no bucket config
  let result = await proxy(req)
  t.equal(result.statusCode, 502, 'Missing bucket config responds with 502')
  t.match(result.body, /Index not found/, 'Missing bucket config presents helpful error')

  // Test ARC_STATIC_BUCKET
  process.env.ARC_STATIC_BUCKET = productionBucket
  result = await proxy(req)
  t.equal(result.Bucket, productionBucket, 'ARC_STATIC_BUCKET sets bucket')

  // Test ARC_STATIC_BUCKET vs config
  proxy = asap({
    bucket: {
      production: stagingBucket,
    },
  })
  result = await proxy(req)
  t.equal(result.Bucket, productionBucket, 'ARC_STATIC_BUCKET overrides config')
  delete process.env.ARC_STATIC_BUCKET

  // Test config.bucket
  proxy = asap({
    bucket: {
      staging: stagingBucket,
    },
  })
  result = await proxy(req)
  t.equal(result.Bucket, stagingBucket, 'config.bucket sets bucket')
})

test('Config: SPA', async t => {
  t.plan(14)
  let proxy, result
  let bucket = { staging: stagingBucket }

  /**
   * SPA enabled
   */
  // Test spa: true to `get /`
  proxy = asap({ bucket, spa: true })
  result = await proxy(req)
  t.equal(result.Key, 'index.html', 'ASAP calls root index.html requesting /')
  t.equal(result.config.spa, true, `SPA config is enabled`)

  // Test spa: true to `get /{proxy+}`
  proxy = asap({ bucket, spa: true })
  result = await proxy(proxyReq)
  t.equal(result.Key, 'index.html', 'ASAP calls root index.html, even when not requesting /')
  t.equal(result.config.spa, true, `SPA config is enabled`)

  // Test ARC_STATIC_SPA: 'true' > spa: false
  process.env.ARC_STATIC_SPA = 'true'
  proxy = asap({ bucket, spa: false })
  result = await proxy(proxyReq)
  t.equal(result.Key, 'index.html', 'ASAP always calls root index.html, even when not requesting /')
  t.equal(result.config.spa, true, `SPA config is enabled`)
  delete process.env.ARC_STATIC_SPA

  /**
   * SPA disabled
   */
  // Test spa: false with root
  proxy = asap({ bucket, spa: false })
  result = await proxy(req)
  t.equal(result.Key, 'index.html', 'ASAP calls root index.html requesting /')
  t.equal(result.config.spa, false, `SPA config is disabled`)

  // Test spa: false to `get /{proxy+}`
  proxy = asap({ bucket, spa: false })
  result = await proxy(proxyReq)
  t.equal(result.Key, 'nature/hiking/index.html', 'ASAP to a dir calls $DIR/index.html')
  t.equal(result.config.spa, false, `SPA config is disabled`)

  // Test spa: false with folder
  let trailingSlash = JSON.parse(JSON.stringify(proxyReq))
  trailingSlash.path = trailingSlash.path + '/'
  result = await proxy(trailingSlash)
  t.equal(result.Key, 'nature/hiking/index.html', 'ASAP to a dir calls $DIR/index.html')
  t.equal(result.config.spa, false, `SPA config is disabled`)

  // Test ARC_STATIC_SPA = 'false' > spa: true
  process.env.ARC_STATIC_SPA = 'false'
  proxy = asap({ bucket, spa: true })
  result = await proxy(proxyReq)
  t.equal(result.Key, 'nature/hiking/index.html', 'ASAP to a dir calls $DIR/index.html')
  t.equal(result.config.spa, false, `SPA config is disabled`)
  delete process.env.ARC_STATIC_SPA

  t.end()
})

/*
// TODO Test config.alias? (undocumented, may retire)
test('Config: alias', t => {
  proxy = asap({
    alias: req.path
  })
  t.end()
})
*/

test('IfNoneMatch param', async t => {
  t.plan(1)
  let ifNoneMatchReq = JSON.parse(JSON.stringify(req))
  ifNoneMatchReq.headers['If-None-Match'] = 'foo'
  let proxy = asap(basicBucketConfig)
  let result = await proxy(ifNoneMatchReq)
  t.equal(result.IfNoneMatch, 'foo', 'IfNoneMatch param correctly set')
})

// rootPath
test('rootPath param', async t => {
  t.plan(3)
  let proxy = asap(basicBucketConfig)

  // Control
  let result = await proxy(proxyReq)
  t.notOk(result.rootPath, 'rootPath param not set')

  let params = proxyReq
  params.requestContext = {
    path: '/staging/nature/hiking',
  }
  result = await proxy(proxyReq)
  t.equal(result.rootPath, 'staging', 'rootPath param correctly set: staging')

  params.requestContext.path = '/production/nature/hiking'
  result = await proxy(proxyReq)
  t.equal(result.rootPath, 'production', 'rootPath param correctly set: production')
})

test('Read shape', async t => {
  t.plan(4)
  let proxy = asap(basicBucketConfig)
  let result = await proxy(req)
  // Need hasOwnProperty to check for existence of existing undefined properties
  // eslint-disable-next-line
  let checkParam = param => result.hasOwnProperty(param)
  t.ok(checkParam('Key'), 'Read params include Key')
  t.ok(checkParam('Bucket'), 'Read params include Bucket')
  t.ok(checkParam('IfNoneMatch'), 'Read params include IfNoneMatch')
  t.ok(checkParam('config'), 'Read params include config')
})
