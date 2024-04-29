let { existsSync, readdirSync, readFileSync, statSync } = require('fs')
let { join, parse } = require('path')
let getS3 = require('../lib/get-s3')
let { httpError } = require('../lib/error')

/**
 * Peek into a dir without a trailing slash to see if it's got an index.html file
 *   If not, look for a custom 404.html
 *   Finally, return the default 404
 */
module.exports = async function pretty (params) {
  let { Bucket, Key, assets, headers, isFolder, prefix, sandboxPath } = params
  let { ARC_ENV, ARC_LOCAL } = process.env
  let local = params.env === 'testing' ||
              ARC_ENV === 'testing' ||
              ARC_LOCAL

  function getKey (Key) {
    let lookup = Key.replace(prefix + '/', '')
    if (assets?.[lookup]) {
      Key = assets[lookup]
      Key = prefix ? `${prefix}/${Key}` : Key
    }
    return Key
  }

  async function getLocal ({ Key: file }) {
    if (!file.startsWith(sandboxPath)) {
      file = join(sandboxPath, file)
    }
    // Node may not be fully case sensitive, so read the files out of the folder
    let { dir, base } = parse(file)
    let found = false
    if (existsSync(dir)) {
      let files = readdirSync(dir)
      found = files.includes(base) && statSync(file).isFile()
    }
    if (!found) {
      let err = ReferenceError(`NoSuchKey: ${Key} not found`)
      err.name = 'NoSuchKey'
      throw err
    }
    else return {
      Body: readFileSync(file),
    }
  }

  async function get (Key) {
    let getter = local ? getLocal : await getS3()
    try {
      return await getter({ Bucket, Key, rawResponsePayload: true })
    }
    catch (err) {
      if (err.name === 'NoSuchKey' || err.code === 'NoSuchKey') {
        err.statusCode = 404
        return err
      }
      else {
        err.statusCode = 500
        return err
      }
    }
  }

  /**
   * Enable pretty urls
   *   Peek into a dir without trailing slash to see if it contains index.html
   */
  if (isFolder && !Key.endsWith('/')) {
    let peek = getKey(`${Key}/index.html`)
    let result = await get(peek)
    if (result.Body) {
      let body = result.Body.toString()
      return { headers, statusCode: 200, body }
    }
  }

  /**
   * Enable custom 404s
   *   Check to see if user defined a custom 404 page
   */
  let notFound = getKey(`404.html`)
  let result = await get(notFound)
  if (result.Body) {
    let body = result.Body.toString()
    return {
      headers: {
        'content-type': 'text/html; charset=utf8;',
        'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      },
      statusCode: 404,
      body,
    }
  }
  else {
    let err = result
    let { statusCode } = err
    let title = err.name
    let message = `
      ${err.message} <pre><b>${Key}</b></pre><br>
      <pre>${err.stack}</pre>
    `
    return httpError({ statusCode, title, message })
  }
}
