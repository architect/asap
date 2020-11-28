# @architect/asap

>  Architect Static Asset Proxy (ASAP) - a helpful library for Lambda-based static asset delivery

[![GitHub CI status](https://github.com/architect/asap/workflows/Node%20CI/badge.svg)](https://github.com/architect/asap/actions?query=workflow%3A%22Node+CI%22)


### Updating the ASAP build:

- `npm run build`
  - Reinstalls `@architect/functions`
  - If a new version is found:
    - Creates a fresh bundle
    - Updates and writes `package[-lock].json`
    - Creates a git commit + git tag (similar to `npm version...`)

Run `npm run build`; if there's an update, simply `git push`, and CI/CD will publish the updated package.
