let test = require('tape')
let { join } = require('path')
let sut = join(process.cwd(), 'src', 'format', 'compress')
let _compress = require(sut)

let {
  gzipSync,
  gunzipSync,
  brotliCompressSync,
  brotliDecompressSync,
  deflateSync,
  inflateSync,
} = require('zlib')

let data = 'this is fine'

test('Set up env', t => {
  t.plan(3)
  t.ok(_compress, 'Loaded compression util')
  t.ok(_compress.compress, 'Compression util has compress method')
  t.ok(_compress.decompress, 'Compression util has decompress method')
})

test('Fails with wrong type', t => {
  t.plan(1)
  let { compress } = _compress
  t.throws(() => {
    compress('zip', data)
  }, 'Errors on incorrect compression type')
})

test('Compression', t => {
  t.plan(3)
  let { compress } = _compress
  let gzip = compress('gzip', data)
  let br = compress('br', data)
  let deflate = compress('deflate', data)
  t.equal(gunzipSync(gzip).toString(), data, 'gzip returned correct data')
  t.equal(brotliDecompressSync(br).toString(), data, 'br returned correct data')
  t.equal(inflateSync(deflate).toString(), data, 'deflate returned correct data')
})

test('Decompression', t => {
  t.plan(3)
  let { decompress } = _compress
  let gzip = decompress('gzip', gzipSync(data))
  let br = decompress('br', brotliCompressSync(data))
  let deflate = decompress('deflate', deflateSync(data))
  t.equal(gzip.toString(), data, 'gzip returned correct data')
  t.equal(br.toString(), data, 'br returned correct data')
  t.equal(deflate.toString(), data, 'deflate returned correct data')
})
