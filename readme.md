# @architect/asap

>  Architect Static Asset Proxy (ASAP) - a helpful library for Lambda-based static asset delivery

[![GitHub CI status](https://github.com/architect/asap/workflows/Node%20CI/badge.svg)](https://github.com/architect/asap/actions?query=workflow%3A%22Node+CI%22)

# Usage

## Module

Call ASAP within your handler function manually like so:

```javascript
let asap = require('@architect/asap')

// All config is optional!
module.exports = asap({
  // Alias assets to different filenames
  alias: {
    '/an-asset.jpg': '/a-different-filename.jpg',
    '/a-path': '/a-different-path',
  },
  // Pass your own fingerprinted static asset manifest (defaults to Arc-generated static.json)
  assets: { 'some-file.gif': 'some-file-a1b2c3.gif' },
  // Set a custom bucket configuration (defaults to Arc-generated buckets)
  bucket: {
    staging: 'staging-bucket-name',
    production: 'production-bucket-name',
    folder: 'some-bucket-subfolder',
  },
  // Override the content-aware cache-control header
  cacheControl: 'max-age=0',
  // Manually set response headers
  headers: { 'some-header': 'ok=true' },
  // Return null if asset is not found (defaults to `false`)
  passthru: true,
  // Engage SPA mode (defaults to `false`)
  spa: false,
})
```


## Lambda handler

Use ASAP as the handler for your Lambda! If you're using Architect, this is done automatically for you when you don't define a root handler for your `@http` pragma.

If using ASAP with non-Architect projects, just point your Lambda's source directory to `src/`, and make sure you set the following two env vars:
- `ARC_ENV`: `staging` or `production`
- `ARC_STATIC_BUCKET`: the S3 bucket name where your assets are stored
