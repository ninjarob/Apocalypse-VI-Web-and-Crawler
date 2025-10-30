import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  AppError,
  isAppError,
  isOperationalError,
  ValidationError,
  DatabaseError
} from '../errors/CustomErrors';

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
  stack?: string;
}

/**
 * Global error handler middleware
 * Catches all errors thrown in the application and formats them consistently
 * Should be registered as the last middleware in the Express app
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Log error for debugging
  logError(error, req);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return handleZodError(error, res);
  }

  // Handle custom application errors
  if (isAppError(error)) {
    return handleAppError(error, res);
  }

  // Handle unknown/unexpected errors
  return handleUnknownError(error, res);
}

/**
 * Handle Zod validation errors
 */
function handleZodError(error: ZodError, res: Response) {
  const validationErrors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    value: issue.code
  }));

  const response: ErrorResponse = {
    error: 'ValidationError',
    message: 'Request validation failed',
    statusCode: 400,
    details: { errors: validationErrors }
  };

  res.status(400).json(response);
}

/**
 * Handle custom AppError instances
 */
function handleAppError(error: AppError, res: Response) {
  const response: ErrorResponse = {
    error: error.name,
    message: error.message,
    statusCode: error.statusCode,
    details: error.details
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(error.statusCode).json(response);
}

/**
 * Handle unknown/unexpected errors
 */
function handleUnknownError(error: Error, res: Response) {
  // Log the full error for debugging
  console.error('❌ Unexpected error:', error);

  const response: ErrorResponse = {
    error: 'InternalServerError',
    message: process.env.NODE_ENV === 'development'
      ? error.message
      : 'An unexpected error occurred',
    statusCode: 500
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
    response.details = {
      name: error.name,
      message: error.message
    };
  }

  res.status(500).json(response);
}

/**
 * Log error with context information
 */
function logError(error: Error | AppError, req: Request) {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  // Determine log level based on error type
  if (isAppError(error)) {
    if (isOperationalError(error)) {
      // Expected errors - log as warning
      console.warn('⚠️ Operational error:', {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        ...errorInfo
      });
    } else {
      // Unexpected operational errors - log as error
      console.error('❌ Non-operational error:', {
        name: error.name,
        message: error.message,
        statusCode: error.statusCode,
        stack: error.stack,
        ...errorInfo
      });
    }
  } else {
    // Unknown errors - log as error with full details
    console.error('❌ Unknown error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...errorInfo
    });
  }
}

/**
 * Async error wrapper - catches errors from async route handlers
 * This is an alternative to the asyncHandler in middleware/index.ts
 * Use this when you want explicit error handling in routes
 */
export function catchAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unmatched routes
 * Should be registered before the error handler
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    true,
    {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl
    }
  );
  next(error);
}

/**
 * Database error handler
 * Converts database errors to appropriate AppError types
 */
export function handleDatabaseError(error: any, operation: string, table?: string): never {
  const message = error.message || error.toString();

  // SQLite-specific errors
  if (message.includes('SQLITE_CONSTRAINT') || message.includes('constraint failed')) {
    throw new DatabaseError(
      `Database constraint violation during ${operation}`,
      operation,
      table,
      error
    );
  }

  if (message.includes('SQLITE_BUSY')) {
    throw new DatabaseError(
      'Database is busy, please try again',
      operation,
      table,
      error
    );
  }

  if (message.includes('SQLITE_LOCKED')) {
    throw new DatabaseError(
      'Database is locked, please try again',
      operation,
      table,
      error
    );
  }

  // Generic database error
  throw new DatabaseError(
    `Database operation failed: ${operation}`,
    operation,
    table,
    error
  );
}

/**
 * Validation error formatter
 * Creates a ValidationError from field validation issues
 */
export function createValidationError(
  fields: Array<{ field: string; message: string; value?: any }>
): ValidationError {
  return new ValidationError('Request validation failed', fields);
}
