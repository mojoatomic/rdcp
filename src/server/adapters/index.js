/**
 * @fileoverview Framework adapters for RDCP server middleware
 * Exports all framework-specific middleware adapters
 */

const express = require('./express.js')
const fastify = require('./fastify.js')
const koa = require('./koa.js')

module.exports = {
  express,
  fastify,
  koa
}