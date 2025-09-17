/**
 * @fileoverview RDCP SDK main exports
 * Public API for the RDCP JavaScript/TypeScript SDK
 */

// Framework adapters
const express = require('./server/adapters/express.js')
const fastify = require('./server/adapters/fastify.js')  
const koa = require('./server/adapters/koa.js')

// Authentication
const auth = require('./auth/index.js')

// Utilities
const utils = require('./utils/index.js')

// Validation
const { createRDCPError } = require('./validation/errors.js')

module.exports = {
  // Framework adapters
  adapters: {
    express,
    fastify,
    koa
  },
  
  // Authentication
  auth,
  
  // Utilities  
  utils,
  
  // Validation
  createRDCPError
}
