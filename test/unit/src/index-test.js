let test = require('tape')
let { join } = require('path')
let proxyquire = require('proxyquire')
let reader = params => params
let readStub = () => reader
let sut = join(process.cwd())
let asap = proxyquire(sut, {
  './read': readStub
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
  }
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
      production: stagingBucket
    }
  })
  result = await proxy(req)
  t.equal(result.Bucket, productionBucket, 'ARC_STATIC_BUCKET overrides config')
  delete process.env.ARC_STATIC_BUCKET

  // Test config.bucket
  proxy = asap({
    bucket: {
      staging: stagingBucket
    }
  })
  result = await proxy(req)
  t.equal(result.Bucket, stagingBucket, 'config.bucket sets bucket')
})

test('Config: SPA', async t => {
  t.plan(6)

  // Test spa:true to get /
  let proxy = asap({
    bucket: {
      staging: stagingBucket
    },
    spa: true
  })
  let result = await proxy(req)
  t.equal(result.Key, 'index.html', 'spa:true calls root index.html requesting /')

  // Test spa: true to get /{proxy+}
  proxy = asap({
    bucket: {
      staging: stagingBucket
    },
    spa: true
  })
  result = await proxy(proxyReq)
  t.equal(result.Key, 'index.html', 'spa:true always calls root index.html, even when not requesting /')

  // Test spa:false
  process.env.ARC_STATIC_SPA = 'false'
  proxy = asap({
    bucket: {
      staging: stagingBucket
    },
    spa: true
  })
  result = await proxy(proxyReq)
  t.notEqual(result.Key, 'index.html', 'spa:false does not necessarily call for index.html')
  t.notOk(result.config.spa, `ARC_STATIC_SPA = 'false' disables spa config`)

  // Test spa:false with root
  result = await proxy(req)
  t.equal(result.Key, 'index.html', 'spa:false still calls for root index.html, when requesting /')

  // Test spa:false with folder
  let trailingSlash = JSON.parse(JSON.stringify(proxyReq))
  trailingSlash.path = trailingSlash.path + '/'
  result = await proxy(trailingSlash)
  t.equal(result.Key, 'nature/hiking/index.html', 'spa:false to a dir calls $DIR/index.html')
  console.log(result)
  delete process.env.ARC_STATIC_SPA
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
    path: '/staging/nature/hiking'
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
