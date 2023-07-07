# Architect Static Asset Proxy (ASAP) changelog

---

## [6.0.1] 2023-07-07

### Fixed

- Fixed 304 (not modified) returns in `nodejs18.x` with AWS SDK v3

---

## [6.0.0] 2023-06-15

### Changed

- AWS has deprecated Lambda `nodejs12.x`; `@architect/asap` 6.0 now assumes `nodejs14.x` or higher
- Updated AWS SDK versions to sync up with the rest of Architect following v10.12
- Added some additional binary media types

---

## [5.1.1] 2023-01-06

### Fixed

- Fixed invalid S3 data returns in `nodejs18.x` with AWS SDK v3

---

## [5.1.0] 2022-11-24

### Added

- Added support for Lambda's new `nodejs18.x` runtime, and AWS SDK v3 (`@aws-sdk/*`)
  - To opt in, simply upgrade `@architect/architect` to 10.8 and change your `@aws runtime` setting to `nodejs18.x` (learn more at http://arc.codes/docs/en/reference/project-manifest/aws#runtime)
- Added Node.js 18.x to test coverage


### Changed

- Updated dependencies

---

## [5.0.2] 2022-10-18

### Fixed

- Fix semi-obscure case where ASAP is expected to work locally without `aws-sdk` installed

---

## [5.0.1] 2022-03-03

### Changed

- Deep require `aws-sdk` S3 client for a potentially large cold start perf boost
  - In small-scale testing, we found this reduces cold start performance by 2-3x, averaging ~150ms on Lambda

---

## [5.0.0] 2022-01-22

### Changed

- Breaking change: Architect no longer automatically populates, relies on, or makes direct use of `NODE_ENV`, `ARC_CLOUDFORMATION`, `ARC_HTTP`, or `ARC_SANDBOX_PATH_TO_STATIC` env vars. `@architect/asap` v5+ now requires Architect v10 / Sandbox v5 or later.
- Stop publishing to the GitHub Package registry
- Updated dependencies

---

## [4.1.0] 2021-09-15

### Added

- Added `env` option for manually specifying `testing` environment use;
  - Leaving undocumented for now as it's likely only practical use is as an internal option for Sandbox
- Added `sandboxPath` option for manually specifying the `testing` environment's Sandbox static asset folder
  - This helps us deprecate a very old Sandbox-only internal env var that was used in place of properly passing parameters to ASAP
  - Also leaving this undocumented for now, for the same reasons as above
- Added support for `ARC_ENV` (in favor of `NODE_ENV`)


### Changed

- Updated dependencies
- Removed support for `ARC_STATIC_FOLDER` (deprecated 2020-06-07; should not have made it to ASAP v4)

---

## [4.0.0] 2021-07-25

ASAP comes into its own! 🎉
- ASAP is now fully independent of `@architect/functions` as of version `4.0.0` of both packages
- Except as noted below, ASAP is a drop-in replacement for `arc.http.proxy` calls and usage - no fuss, no muss!
- For posterity, all related legacy changelog entries can be found below


### Changed

- ASAP is leaner, meaner (and when necessary, more easy to debug in production)
  - ASAP 3.x: 233KB
  - ASAP 4.x: 70KB (-70%!)
- Potentially breaking change: when used in projects without a defined root handler, ASAP now defaults to non-SPA mode
  - To re-enable SPA, set the `ARC_STATIC_SPA` env var in your project environment to `true`
- Potentially breaking change: static assets not managed by Architect, but delivered via an Architect + ASAP app must have S3 `ContentType` property set
  - S3 `ContentType` is normally automatically set if your static assets are managed by Architect
  - However, if you publish / deliver static assets outside your Architect deploy workflow and deliver them via ASAP, ensure you are setting the `ContentType` (i.e. MIME type) property on your S3 asset
  - If you do not, your assets will be defaulted to `content-type: application/octet-stream`
  - This is a super obscure case, but just a heads up!
- Breaking change: removed support for Node.js 10.x (now EOL, and no longer available to created in AWS Lambda)
- Breaking change: removed support for Architect 5 (and lower)
- Breaking change: removed undocumented `asap.read` method
- Breaking change: removed undocumented proxy plugin interface
- Normalized headers to lowercase for full HTTP 2 compatibility
- Updated dependencies

---

## [3.13.1] 2020-09-16

### Fixed

- Fixed bad call in `http.proxy` alias config

---

## [3.12.3] 2020-07-29

### Added

- Enable proxy to use HTTP APIs running in Lambda v1.0 payload format mode

---

## [3.12.2] 2020-07-20

### Added

- Adds support for loading compressed files out of proxy

---

## [3.12.1] 2020-06-16

### Fixed

- Fixed proxy lookup to custom 404 page working locally
- Fixed incorrect filename in proxy 404 error message

---

## [3.12.0] 2020-06-15

### Added

- Adds automatic fingerprint upgrading from non-fingerprinted requests; example:
  - If `@static fingerprint true` is enabled, `<img src=this-is-fine.gif>` will now automatically load `/_static/this-is-fine-abc123.gif`

---

## [3.11.0] 2020-06-07

### Added

- Adds fingerprinting support for pretty URLs and custom 404s in proxy
- Adds support for `ARC_STATIC_PREFIX` env var to provide symmetry with the new `@static prefix` setting
  - The `ARC_STATIC_FOLDER` env var is now considered deprecated, and will be removed in a future (breaking) release
- Added support for leading slashes in build-free templating (e.g. `${arc.static('/this-is-fine.gif')}`)


### Fixed

- Ensures the build-free templating engine always runs, not just when fingerprint is enabled

---

## [3.10.0 - 3.10.1] 2020-05-17

### Added

- Improved default caching behavior for static assets; fixes #273
  - Any assets that don't have `cache-control` explicitly set will now default to using `ETag` in order to improve the reliability of cache invalidation
  - HTML & JSON responses still default to anti-caching headers
- Added path peeking (aka pretty URLs); fixes #269
  - URLs delivered via `proxy` no longer require a trailing slash!
  - Example: to load `/foo/index.html`, you used to have to request `/foo/`
  - Now, if `/foo` is requested, `proxy` will automatically try peeking into `/foo` to see if it contains `/foo/index.html` – if not, it'll 404 as expected
- Added ETag support to Sandbox static asset serving
- Added support for arbitrary static asset config mapping
  - Pass proxy `config.assets` a `static.json`-like static asset object


### Changed

- Internal refactoring: cleaned up old `proxy` code paths


### Fixed

- We now ensure CDNs cannot cache `404` responses

---

## [3.9.0] 2020-04-27

### Added

- Adds S3 `ContentEncoding` for `arc.http.proxy` / `arc.http.proxy.read`
  - This means you can now publish and read larger files out of S3 in the compressed format of your choosing!

---

## [3.7.7 - 3.8.0] 2020-03-12

### Fixed

- `arc.http.proxy` now supports API Gateway HTTP APIs request/response payload V2

---

## [3.5.7] 2019-11-01

### Added

- `arc.http.proxy` looks for default `index.html` when `ARC_STATIC_SPA=false`

---

## [3.4.4] 2019-10-15

### Fixed

- Fixes broken response when bucket is not configured as root proxy

---

## [3.4.0 - 3.4.2] 2019-10-10

### Added

- Added support for `@static fingerprint true` in root spa / proxy requests
  - This enables Architect projects to deliver fully fingerprinted static assets while also ensuring that each file is appropriately cached by clients and network infra
  - Also includes support for build-free calls between your fingerprinted static assets
    - Example: in `public/index.html`, use the following syntax to automatically replace the local / human-friendly filename reference to the deployed fingerprinted filename:
    - `${arc.static('image.png')}` will be automatically replaced by `image-a1c3e5.png`
    - Or `${STATIC('image.png')}` (which is the same thing, but shoutier)
    - Note: although those look like JS template literal placeholders, they're intended to live inside non-executed, static files within `public/` (or `@static folder foo`)

---

## [3.3.15] 2019-09-26

### Added

- Added more consistent and regular entry for proxy: `http.proxy`
  - This is non-breaking: `http.proxy.public`, `http.proxy.read`, and even the older `proxy.public` methods are still available, although are deprecated. We suggest moving to them.
  - `http.proxy` does the same as what `http.proxy.public` used to do; since the vast majority of use was around `http.proxy.public` and not `http.proxy.read`, it didn't make sense to have such a verbose method signature
- `http.proxy`'s SPA setting can now be disabled with an env var – `ARC_STATIC_SPA = 'false'` (where `false` is a string, not a bool)
  - You can still disable it via configuration as well (`{spa:false}`)
- Lots and lots of tests around `http.proxy`

### Fixed

- Better 404 / file missing handling in `sandbox` when using `http.proxy` (or loading static assets without `@http get /` specified)

---

## [3.3.14] 2019-09-25

### Fixed

- Restored `http.proxy.public` settings that were erroneously removed in a previous update
  - `bucket.staging`, `bucket.production`, `bucket.folder`, and `cacheControl` are now restored
- Fixes a proxy issue in Architect 5 / LTS projects where SPA requests for pages would not have loaded correctly

---

## [3.3.13] 2019-09-24

### Fixed

- Improved detection of `proxy` and `ws` when running locally with NODE_ENV not set to `testing`, and `ARC_LOCAL` set

---

## [3.3.12] 2019-09-13

### Fixed

- `http.proxy` now correctly responds to requests if your environment includes an `ARC_STATIC_FOLDER` env var

---

## [3.3.11] 2019-09-09

### Changed

- Internal change to normalize response shapes from `http.proxy.public` + `http.proxy.read`


### Fixed

- Fixes issue where binary assets delivered via `sandbox` / root may not be properly encoded
- Fixes issue where `http.proxy.public` + `http.proxy.read` may not have delivered correctly formatted responses in Architect 5
- Fixed minor issue in `ARC_HTTP` env var check

---


## [3.3.8] 2019-09-03

### Fixed

- Fixes `arc.http` / `arc.http.async` responses to `/{proxy+}` requests

---


## [3.3.5 - 3.3.6] 2019-08-27

### Added

- Added ability to set custom headers on any `arc.http.proxy` request

### Fixed

- Fixed bug preventing emitting binary assets via `arc.http.proxy`
- Fixed munged headers and content-type in proxy plugins, fixes @architect/architect#432

---

## [3.0.8] 2019-05-20

### Fixed

- `proxy.read()` calls without `config.bucket` specified work correctly again, fixes #38

---

## [3.0.1] - 2019-04-04

### Added

- This is NOT a breaking update if you aren't using `proxy.public()`
  - However, if you use `proxy.public()`, this is a breaking update!
  - In order to enable binary assets support, Arc Functions now encodes files being emitted via `proxy.public()` for use in Architect 5.6+ apps
  - If you'd like your existing app that uses `proxy.public()` to serve binary assets, you'll need to re-create your API (or hang tight until we release our forthcoming API migration tool)

### Fixed

- `get /` encoding is now properly set when using `config.bucket.folder`

---

## [2.0.17 - 2.0.19] - 2019-04-02

### Fixed

- Added checks to ensure bucket exists in `proxy.public()`
- Requests to unknown files via `proxy.public()` now return a proper 404 response, and not 200 / `undefined`
- Fixes proxy path prefix check in testing environment

---

## [2.0.16] - 2019-03-27

### Added

- Adds `ARC_STATIC_BUCKET` + `ARC_STATIC_FOLDER` env vars for config-reduced `proxy.public()` reads

### Fixed

- In `proxy.public()` config, the bucket folder prefix is now respected when working locally

---

## [2.0.15] - 2019-03-13

### Added

- Cache-control header support for `proxy.public`; if not specified, defaults to:
  - HTML + JSON: `no-cache, no-store, must-revalidate, max-age=0, s-maxage=0`
  - Everything else: `max-age=86400`

---


## [2.0.1-2.0.11] - 2019-02-26

### Added

- proxy allows for configurable s3 bucket and folder
- proxied files now return `etag`
- `arc.proxy.public` configuration:
  - `spa` - boolean, load `index.html` at any folder depth
  - `ssr` - path string of module to load or function for overriding `/index.html`
  - `alias` - alias paths path (eg. `{'/css':'/styles/index.scss'}`)
  - `plugins` - per filetype transform plugin pipelines

The companion transform plugins aim to help developers make the transition to browser native esmodules:

- `@architect/proxy-plugin-jsx` transpiles jsx to preact/react
- `@architect/proxy-plugin-tsx` strips types and transpiles jsx to preact/react
- `@architect/proxy-plugin-mjs-urls` adds `/staging` or `/production` to imports urls
- `@architect/proxy-plugin-bare-imports` enable bare imports with browser esm

And for fun:

- `@architect/proxy-plugin-md` markdown to html
- `@architect/proxy-plugin-sass` sass/scss

> If you think we're missing a plugin please don't hesitate to ask in the issue tracker!

[Complete example project code here.](https://github.com/arc-repos/arc-example-proxy-plugins)

---

## [1.13.0] - 2019-01-31

### Added

- New `arc.proxy` wip proxy get-index to /public when running locally and s3 when running on aws

```javascript
// exmaple usage in a ws-connected lambda
let arc = require('@architect/functions')

exports.handler = arc.proxy.public()
```

---
