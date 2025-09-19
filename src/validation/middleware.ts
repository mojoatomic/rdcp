/**
 * @fileoverview RDCP request validation middleware
 * Essential validation functions for RDCP requests
 */

import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'
import { controlRequestSchema } from './schemas.js'
import {
  createValidationError,
  createRDCPError,
  RDCP_ERROR_CODES,
} from './errors.js'

/**
 * Enhanced request interface for validated requests
 */
export interface ValidatedRequest<T = unknown> extends Request {
  validatedBody: T
}

/**
 * Error with type property for better error handling
 */
interface ParseError extends Error {
  type?: string
}

/**
 * Validates RDCP control requests using Zod schema
 */
export function validateControlRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    if (req.method === 'POST' && req.body) {
      const validatedData = controlRequestSchema.parse(req.body)
      ;(req as ValidatedRequest).validatedBody = validatedData
    }
    next()
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(createValidationError(error.message))
    } else {
      res.status(400).json(createValidationError('Unknown validation error'))
    }
  }
}

/**
 * Creates validation middleware for any Zod schema
 */
export function validateRequest<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (req.method === 'POST' && req.body) {
        const validatedData = schema.parse(req.body)
        ;(req as ValidatedRequest<T>).validatedBody = validatedData
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json(createValidationError(error.message))
      } else {
        res.status(400).json(createValidationError('Unknown validation error'))
      }
    }
  }
}

/**
 * Express error handler for validation errors
 * Handles Zod errors and JSON parse errors
 */
export function handleValidationError(
  err: ParseError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof ZodError || err.name === 'ZodError') {
    res.status(400).json(createValidationError(err.message))
    return
  }

  if (err.type === 'entity.parse.failed') {
    res
      .status(400)
      .json(
        createRDCPError(RDCP_ERROR_CODES.RDCP_MALFORMED_REQUEST, 'Invalid JSON')
      )
    return
  }

  next(err)
}
