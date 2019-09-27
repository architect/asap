# @architect/http-proxy

## Architect HTTP proxy distribution, extracted from @architect/functions (arc.http.proxy)

### Updating the HTTP proxy:

- `npm run build`
  - Reinstalls `@architect/functions`
  - If a new version is found:
    - Creates a fresh bundle
    - Updates and writes `package[-lock].json`
    - Creates a git commit + git tag (similar to `npm version...`)

Once `npm run build`, if there's an update, simply `git push` and `npm publish`. (It's already tagged, no need to run `npm version`.)
