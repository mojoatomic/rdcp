/**
 * @fileoverview RDCP request validation middleware
 * Essential validation functions for RDCP requests
 */

const { controlRequestSchema } = require('./index')
const { createValidationError, createRDCPError, RDCP_ERROR_CODES } = require('./errors')

/**
 * Validates RDCP control requests
 */
function validateControlRequest(req, res, next) {
  try {
    if (req.method === 'POST' && req.body) {
      controlRequestSchema.parse(req.body)
    }
    next()
  } catch (error) {
    res.status(400).json(createValidationError(error.message))
  }
}

/**
 * Creates validation middleware for any schema
 */
function validateRequest(schema) {
  return (req, res, next) => {
    try {
      if (req.method === 'POST' && req.body) {
        schema.parse(req.body)
      }
      next()
    } catch (error) {
      res.status(400).json(createValidationError(error.message))
    }
  }
}

/**
 * Express error handler for validation errors
 */
function handleValidationError(err, req, res, next) {
  if (err.name === 'ZodError') {
    return res.status(400).json(createValidationError(err.message))
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(createRDCPError(RDCP_ERROR_CODES.RDCP_MALFORMED_REQUEST, 'Invalid JSON'))
  }
  next(err)
}

module.exports = {
  validateControlRequest,
  validateRequest,
  handleValidationError
}
