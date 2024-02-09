let reader = require('./read')
let errors = require('./lib/error')

/**
 * Architect Static Asset Proxy
 *
 * @param {Object} config - for configuration
 * @param {Object} config.alias - map of root URLs to alias to other URLs (all should be root-rel)
 * @param {Object} config.assets - map of unfingerprinted filenames to fingerprinted filenames
 * @param {string} config.env - arc environment; `testing` forces local reads
 * @param {Object} config.bucket - { staging, production } override S3 bucket names
 * @param {string} config.bucket.staging - override the staging S3 bucket name
 * @param {string} config.bucket.production - override the production S3 bucket name
 * @param {string} config.bucket.folder - set an optional bucket folder to work within
 * @param {string} config.cacheControl - set a custom cache-control header value
 * @param {boolean} config.passthru - return null if no file is found
 * @param {Object} config.headers - map of custom response headers
 * @param {string} config.sandboxPath - local filesystem path for Sandbox static assets
 * @param {boolean} config.spa - forces index.html no matter the folder depth
 *
 * @returns {function} HTTPLambda - an HTTP Lambda function that proxies calls to S3
 */
function asap (config = {}) {
  return async function handler (req) {
    let { ARC_ENV, ARC_STATIC_BUCKET, ARC_STATIC_SPA } = process.env
    let deprecated = req.version === undefined || req.version === '1.0'

    let isProduction = ARC_ENV === 'production'
    let path = deprecated ? req.path : req.rawPath
    let isFolder = path.split('/').pop().indexOf('.') === -1
    let Key // Assigned below

    /**
     * Bucket config
     */
    let configBucket = config.bucket
    let bucketSetting = isProduction
      ? configBucket?.['production']
      : configBucket?.['staging']
    // Ok, all that out of the way, let's set the actual bucket, eh?
    let needBucket = config.env !== 'testing'
    let Bucket = bucketSetting || ARC_STATIC_BUCKET
    if (!Bucket && needBucket) {
      return errors.proxyConfig
    }

    /**
     * Configure SPA + set up the file to be requested
     */
    config.spa = config.spa || false
    if (ARC_STATIC_SPA === 'true') config.spa = true
    if (ARC_STATIC_SPA === 'false') config.spa = false
    if (config.spa) {
      // If SPA: force index.html
      Key = isFolder ? 'index.html' : path.substring(1)
    }
    else {
      // Return index.html for root, otherwise pass the path
      let last = path.split('/').filter(Boolean).pop()
      let isFile = last ? last.includes('.') : false
      let isRoot = path === '/'

      Key = isRoot ? 'index.html' : path.substring(1) // Always remove leading slash

      // Append default index.html to requests to folder paths
      if (isRoot === false && isFile === false) {
        Key = `${Key.replace(/\/$/, '')}/index.html`
      }
    }

    /**
     * Alias - enable Keys to be manually overridden
     */
    let aliasing = config?.alias?.[path]
    if (aliasing) {
      Key = config.alias[path].substring(1) // Always remove leading slash
    }

    /**
     * REST API [deprecated]: flag `staging/`, `production/` requests
     */
    let rootPath
    let reqPath = req?.requestContext?.path
    if (deprecated && reqPath) {
      if (reqPath?.startsWith('/staging/')) rootPath = 'staging'
      if (reqPath?.startsWith('/production/')) rootPath = 'production'
    }

    // Normalize if-none-match header to lower case; it may differ between environments
    let findHeader = k => k.toLowerCase() === 'if-none-match'
    let IfNoneMatch = req.headers?.[Object.keys(req.headers).find(findHeader)]

    let read = reader({ env: config.env, sandboxPath: config.sandboxPath })
    return read({ Key, Bucket, IfNoneMatch, isFolder, config, rootPath })
  }
}

module.exports = asap
