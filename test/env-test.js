let test = require('tape')
let {existsSync} = require('fs')
let {join} = require('path')
let dist = require('../dist')
let package = require('../package.json')

test('Env check', t => {
  t.plan(4)
  t.ok(dist, 'Dist file is present')
  t.ok(dist['handler'], 'Dist file exports handler property')
  t.equal(package.version, package.devDependencies['@architect/functions'], 'Package and @architect/functions versions match')
  t.ok(existsSync(join(__dirname, '..', 'scripts', 'build')), 'Build script is present')
})
