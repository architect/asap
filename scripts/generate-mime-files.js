let mime = require('mime-types')
let { writeFileSync } = require('fs')
let { join } = require('path')
let commonMimeTypes = require('./common-mime-type-list')
let mimeTypes = require(join(process.cwd(), 'src', 'lib', 'binary-types'))

/**
 * Generate library of common binary file extensions
 */
let binaryExtensions = []
mimeTypes.forEach(type => {
  let exts = mime.extensions[type] || []
  binaryExtensions = binaryExtensions.concat(exts)
})
binaryExtensions = [ ...new Set(binaryExtensions.sort()) ]
let binExtsFile = join(process.cwd(), 'src', 'lib', 'binary-extensions.js')
let binExtsContents = `// This file is auto-generated via npm run vendor
module.exports = [ '${binaryExtensions.join(`', '`)}' ]
`
writeFileSync(binExtsFile, binExtsContents)

/**
 * Generate library of extensions of common mime types for local dev
 */
let commonTypes = {}
commonMimeTypes.forEach(type => {
  let exts = mime.extensions[type]
  if (exts) exts.forEach(ext => {
    commonTypes[ext] = type
  })
})
// This little bit of string replacement shaves off about 10% file weight
let min = mime => '`' + mime
  .replace('application/', '${a}/')
  .replace('audio/', '${b}/')
  .replace('image/', '${c}/')
  .replace('font/', '${d}/')
  .replace('message/', '${e}/')
  .replace('text/', '${f}/')
  .replace('video/', '${g}/') + '`'
let commonMimeFile = join(process.cwd(), 'src', 'lib', 'common-mime-types.js')
let commonMimeContents = `// This file is auto-generated via npm run vendor
let [ a, b, c, d, e, f, g ] = [ 'application', 'audio', 'image', 'font', 'message', 'text', 'video' ]
module.exports = {
  ${Object.entries(commonTypes).map(([ ext, mime ]) => `${ext}: ${min(mime)},`).join('\n  ')}
}
`
writeFileSync(commonMimeFile, commonMimeContents)
