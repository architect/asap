let { existsSync, readFileSync } = require('fs')
let { extname, join } = require('path')

let getS3 = require('../lib/get-s3')
let _isHTMLorJSON = require('../lib/is-html-json')
let binaryTypes = require('../lib/binary-types')
let binaryExts = require('../lib/binary-extensions')
let { httpError } = require('../lib/error')
let templatizeResponse = require('../format/templatize')
let normalizeResponse = require('../format/response')
let pretty = require('./_pretty')
let { decompress } = require('../format/compress')

/**
 * asap.read (production)
 *
 * Reads a file from S3, resolving an HTTP Lambda friendly payload
 *
 * @param {Object} params
 * @param {string} params.Key
 * @param {string} params.Bucket
 * @param {string} params.IfNoneMatch
 * @param {string} params.isFolder
 * @param {string} params.rootPath
 * @param {Object} params.config
 * @returns {Promise<Object>} { statusCode, headers, body }
 */
module.exports = async function readS3 (params) {

  let { Bucket, Key, IfNoneMatch, isFolder, config, rootPath } = params
  let { ARC_STATIC_PREFIX } = process.env
  let prefix = ARC_STATIC_PREFIX || config?.bucket?.folder
  let assets = config.assets || staticAssets
  let headers = {}
  let response = {}

  try {
    // If client sends If-None-Match, use it in S3 getObject params
    let matchedETag = false

    // Try to interpolate HTML/JSON requests to fingerprinted filenames
    let isHTMLorJSON = _isHTMLorJSON(Key)
    if (assets?.[Key] && isHTMLorJSON) {
      // Not necessary to flag response formatter for anti-caching
      // Those headers are already set in S3 file metadata
      Key = assets[Key]
    }

    /**
     * Check for possible fingerprint upgrades and forward valid requests
     */
    if (assets?.[Key] && !isHTMLorJSON) {
      let location = rootPath
        ? `/${rootPath}/_static/${assets[Key]}`
        : `/_static/${assets[Key]}`
      return {
        statusCode: 302,
        headers: {
          location,
          'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
        },
      }
    }

    /**
     * Folder prefix
     *   Enables a bucket folder at root to be specified
     */
    if (prefix) {
      Key = `${prefix}/${Key}`
    }

    let options = { Bucket, Key, rawResponsePayload: true }
    if (IfNoneMatch) {
      options.IfNoneMatch = IfNoneMatch
    }

    let s3 = await getS3()
    let result
    try {
      result = await s3(options)
    }
    catch (err) {
      // ETag matches (getObject error code of NotModified), so don't transit the whole file
      if (err.code === 'NotModified' || err.statusCode === 304) {
        matchedETag = true
        headers.etag = IfNoneMatch
        response = {
          statusCode: 304,
          headers,
        }
      }
      else {
        // Important: do not swallow this error otherwise!
        throw err
      }
    }

    // No ETag found, return the blob
    if (!matchedETag) {
      let contentEncoding = result.ContentEncoding
      if (contentEncoding) {
        result.Body = decompress(contentEncoding, result.Body)
      }
      response.body = result.Body

      let isBinary = binaryTypes.includes(result.ContentType) ||
        binaryExts.includes(extname(Key).substring(1))

      // Handle templating
      response = templatizeResponse({
        isBinary,
        assets,
        response,
      })

      // Normalize response
      response = normalizeResponse({
        response,
        result,
        Key,
        contentEncoding,
        config,
      })
    }

    if (!response.statusCode) {
      response.statusCode = 200
    }

    return response
  }
  catch (err) {
    let notFound = err.name === 'NoSuchKey'
    if (notFound) {
      if (config.passthru) return null
      return pretty({ Bucket, Key, assets, headers, isFolder, prefix })
    }
    else {
      let title = err.name
      let message = `
        ${err.message}<br>
        <pre>${err.stack}</pre>
      `
      return httpError({ statusCode: 500, title, message })
    }
  }
}

/**
 * Fingerprinting manifest
 *   Load the manifest, try to hit the disk as infrequently as possible across invocations
 */
let staticAssets
let staticManifest = join(process.cwd(), 'node_modules', '@architect', 'shared', 'static.json')
if (staticAssets === false) { /* noop */ }
else if (existsSync(staticManifest) && !staticAssets) {
  staticAssets = JSON.parse(readFileSync(staticManifest).toString())
}
else {
  staticAssets = false
}
