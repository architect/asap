#!/usr/bin/env node

let exec = require('child_process').execSync
let fs = require('fs')
let join = require('path').join
let semver = require('semver')
let series = require('run-series')

// package.json
let packageFile = join(__dirname, '..', 'package.json')
let package = require(packageFile)
let currentVersion = package.version
let updatedPackage
let newVersion

series([
  // Init
  callback => {
    console.log(`Bundling HTTP proxy from @architect/functions`)
    console.log(`Previous @architect/functions version: ${currentVersion}`)
    callback()
  },

  // Install @arc/functions
  callback => {
    let release = process.env.RC ? 'RC' : 'latest'
    console.log(`Installing @architect/functions@${release}...`)
    let cmd = `npm i @architect/functions@${release} --save-dev`
    let result = exec(cmd, { shell: true })
    console.log(result.toString())
    callback()
  },

  // Compare versions
  callback => {
    updatedPackage = JSON.parse(fs.readFileSync(packageFile))
    newVersion = updatedPackage.devDependencies['@architect/functions']
    console.log(`Found installed version ${newVersion}`)
    if (semver.gt(newVersion, currentVersion)) {
      callback()
    }
    else callback(Error('cancel'))
  },

  // Run the bundler
  callback => {
    console.log(`Bundling version ${newVersion}`)
    let cmd = 'npm run bundle'
    let result = exec(cmd, { shell: true })
    console.log(result.toString())
    callback()
  },

  // Rewrite packages
  callback => {
    updatedPackage.version = newVersion
    fs.writeFileSync(packageFile, JSON.stringify(updatedPackage, null, 2))
    callback()
  },

  // Tag git
  callback => {
    console.log('Adding commit and git tag')
    let cmd = `git commit -am'${newVersion}' && git tag -a v${newVersion} -m ${newVersion}`
    let result = exec(cmd, { shell: true })
    console.log(result.toString())
    callback()
  }
], err => {
  if (err && err.message === 'cancel') {
    console.log('Nothing to update!')
  }
  else if (err) {
    console.log(err)
    process.exit(1)
  }
  else {
    console.log(`Finished building! Upgraded from ${currentVersion} to ${newVersion}`)
  }
})
