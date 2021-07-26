let { join } = require('path')
let test = require('tape')
let mod = process.cwd()
let asap

function setup () {
  delete require.cache[require.resolve(mod)]
  delete require.cache[require.resolve(join(mod, 'src', 'read'))]
  // eslint-disable-next-line
  asap = require(mod)
}

test('[Module] Primary ASAP method', t => {
  t.plan(2)
  setup()
  // Current
  t.equal(typeof asap, 'function', 'asap is a function')
  t.equal(asap.name, 'asap', 'asap is the proxy function')
})

test('[Handler] ASAP can run as a standalone Lambd handler', t => {
  t.plan(3)
  setup()

  // eslint-disable-next-line
  let {handler} = require(join(mod, 'src', 'index'))
  t.ok(handler, 'Exported handler method')
  t.equal(typeof handler, 'function', 'Handler is a function')
  t.equal(handler.name, 'handler', 'handler is the, uh, handler')
})

test('Teardown', t => {
  t.plan(1)
  setup()
  t.pass('Done')
})
