let test = require('tape')
let { join } = require('path')
let sut = join(process.cwd(), 'src', 'format', 'response')
let normalize = require(sut)
let { gunzipSync } = require('zlib')

let ContentType = 'image/gif'
let ETag = 'etagvalue'
let fileContents = 'this is just some file contents\n'
let body = Buffer.from(fileContents)
function basicResponse () {
  return {
    // Generated response object
    response: {
      headers: {
        'content-type': ContentType,
        'cache-control': 'max-age=86400',
        etag: ETag,
      },
      body,
    },
    // S3 result object
    result: {
      ContentType,
      ETag,
      Body: body,
    },
    Key: 'this-is-fine.gif',
    config: { spa: true },
  }
}
let htmlKey = 'index.html'
let jsonKey = 'foo.json'

test('Set up env', t => {
  t.plan(1)
  t.ok(normalize, 'Loaded normalize')
})

test('Content-Type setting', t => {
  t.plan(10)
  let _basicResponse = basicResponse()
  let result = normalize(_basicResponse)
  t.equal(result.headers['content-type'], ContentType, `Retained content-type from content-type header: ${ContentType}`)

  delete _basicResponse.response.headers['content-type']
  t.notOk(_basicResponse.response.headers['content-type'], `headers['content-type'] removed`)
  _basicResponse.response.headers['Content-Type'] = ContentType
  result = normalize(_basicResponse)
  t.equal(result.headers['content-type'], ContentType, `Retained content-type from Content-Type header: ${ContentType}`)

  delete _basicResponse.response.headers['content-type']
  delete _basicResponse.response.headers['Content-Type']
  t.notOk(_basicResponse.response.headers['content-type'], `headers['content-type'] removed`)
  t.notOk(_basicResponse.response.headers['Content-Type'], `headers['Content-Type'] removed`)
  result = normalize(_basicResponse)
  t.equal(result.headers['content-type'], ContentType, `Retained content-type from result.ContentType param: ${ContentType}`)
  t.notOk(result.headers['Content-Type'], `Camel-case Content-Type header not present: ${ContentType}`)

  delete _basicResponse.result.ContentType
  delete _basicResponse.response.headers['content-type']
  delete _basicResponse.response.headers['Content-Type']
  t.notOk(_basicResponse.response.headers['content-type'], `headers['content-type'] removed`)
  t.notOk(_basicResponse.response.headers['Content-Type'], `headers['Content-Type'] removed`)
  t.notOk(_basicResponse.result.ContentType, `result.ContentType removed`)
  result = normalize(_basicResponse)
})

test('Cache-Control setting', t => {
  t.plan(4)
  let _basicResponse = basicResponse()
  let result = normalize(_basicResponse)
  t.equal(result.headers['cache-control'], 'public, max-age=0, must-revalidate', 'No anti-cache or cache setting set, defaults to 1 day')

  // Test anti-cache
  // JSON
  _basicResponse.Key = jsonKey
  result = normalize(_basicResponse)
  t.match(result.headers['cache-control'], /no-cache/, 'JSON responses are anti-cached')

  // HTML
  _basicResponse.Key = htmlKey
  result = normalize(_basicResponse)
  t.match(result.headers['cache-control'], /no-cache/, 'HTML responses are anti-cached')

  // cacheControl param sets cache-control (and overrides anti-cache)
  _basicResponse.config.cacheControl = 'meh'
  result = normalize(_basicResponse)
  t.match(result.headers['cache-control'], /meh/, 'cacheControl setting is respected and wins over anti-cache logic')
})

test('Response encoding', t => {
  t.plan(10)
  function usually (extras) {
    let _basicResponse = basicResponse()
    if (extras) _basicResponse = Object.assign(_basicResponse, extras)
    let result = normalize(_basicResponse)
    let resultBody
    if (result.headers['content-encoding'] === 'gzip') {
      resultBody = gunzipSync(Buffer.from(result.body, 'base64')).toString()
    }
    else {
      resultBody = Buffer.from(result.body, 'base64').toString()
    }
    t.ok(result.headers['content-type'], 'Got content-type header')
    t.ok(result.headers['cache-control'], 'Got cache-control header')
    t.equal(resultBody, fileContents, 'Body matches provided file contents')
    t.ok(result.isBase64Encoded, 'Got isBase64Encoded param')
    t.equal(Object.getOwnPropertyNames(result).length, 3, 'Received correctly formatted response')
  }

  // Arc 6
  usually()

  // Arc 6 + compression
  usually({ contentEncoding: 'gzip' })
})
