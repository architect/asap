let test = require('tape')
let { join } = require('path')
let sut = join(process.cwd(), 'src', 'read')
let reader = require(sut)

test('Set up env', t => {
  t.plan(1)
  t.ok(reader, 'Loaded read')
})

test('S3 reader', t => {
  t.plan(1)
  let read = reader({})
  t.equal(read.name, 'readS3', 'Got S3 reader (by default)')
})

test('Local reader', t => {
  t.plan(3)
  let read

  read = reader({ env: 'testing' })
  t.equal(read.name, 'readLocal', 'Got local reader (via env config)')

  process.env.ARC_ENV = 'testing'
  read = reader({})
  t.equal(read.name, 'readLocal', 'Got local reader (via ARC_ENV)')
  delete process.env.ARC_ENV

  process.env.ARC_LOCAL = true
  read = reader({})
  t.equal(read.name, 'readLocal', 'Got local reader (via ARC_LOCAL)')
  delete process.env.ARC_LOCAL
})
