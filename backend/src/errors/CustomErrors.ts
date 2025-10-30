/**
 * Custom error classes for consistent error handling across the application
 * All custom errors extend the base AppError class
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(message: string, statusCode: number, isOperational = true, details?: any) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this);
  }
}

/**
 * 400 Bad Request
 * Used for invalid client requests
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, true, details);
    this.name = 'BadRequestError';
  }
}

/**
 * 401 Unauthorized
 * Used for authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', details?: any) {
    super(message, 401, true, details);
    this.name = 'UnauthorizedError';
  }
}

/**
 * 403 Forbidden
 * Used for authorization failures (authenticated but not permitted)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', details?: any) {
    super(message, 403, true, details);
    this.name = 'ForbiddenError';
  }
}

/**
 * 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  public readonly resourceType?: string;
  public readonly resourceId?: string | number;

  constructor(
    message: string = 'Resource not found',
    resourceType?: string,
    resourceId?: string | number
  ) {
    super(message, 404, true, { resourceType, resourceId });
    this.name = 'NotFoundError';
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/**
 * 409 Conflict
 * Used for duplicate resources or constraint violations
 */
export class ConflictError extends AppError {
  public readonly conflictType?: string;

  constructor(message: string = 'Resource conflict', conflictType?: string, details?: any) {
    super(message, 409, true, { conflictType, ...details });
    this.name = 'ConflictError';
    this.conflictType = conflictType;
  }
}

/**
 * 422 Unprocessable Entity
 * Used for validation errors (semantic errors in request data)
 */
export class ValidationError extends AppError {
  public readonly validationErrors: ValidationErrorDetail[];

  constructor(message: string = 'Validation failed', errors: ValidationErrorDetail[] = []) {
    super(message, 422, true, { errors });
    this.name = 'ValidationError';
    this.validationErrors = errors;
  }
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
}

/**
 * 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any) {
    super(message, 500, false, details);
    this.name = 'InternalServerError';
  }
}

/**
 * Database-specific errors
 */
export class DatabaseError extends AppError {
  public readonly operation?: string;
  public readonly table?: string;

  constructor(
    message: string = 'Database operation failed',
    operation?: string,
    table?: string,
    originalError?: Error
  ) {
    super(message, 500, false, {
      operation,
      table,
      originalError: originalError?.message
    });
    this.name = 'DatabaseError';
    this.operation = operation;
    this.table = table;
  }
}

/**
 * Service unavailable error (503)
 * Used when external services are unavailable
 */
export class ServiceUnavailableError extends AppError {
  public readonly service?: string;

  constructor(message: string = 'Service temporarily unavailable', service?: string) {
    super(message, 503, true, { service });
    this.name = 'ServiceUnavailableError';
    this.service = service;
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is operational (expected error that we can handle)
 */
export function isOperationalError(error: any): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * Helper function to create a NotFoundError for a specific entity type
 */
export function createNotFoundError(entityType: string, identifier: string | number): NotFoundError {
  return new NotFoundError(`${entityType} not found`, entityType, identifier);
}

/**
 * Helper function to create a ConflictError for duplicate entities
 */
export function createDuplicateError(entityType: string, field: string, value: any): ConflictError {
  return new ConflictError(
    `${entityType} with ${field} '${value}' already exists`,
    'DUPLICATE',
    { entityType, field, value }
  );
}

/**
 * Helper function to convert database constraint errors to ConflictError
 */
export function handleDatabaseConstraintError(error: any, entityType: string): ConflictError {
  const message = error.message || error.toString();

  // SQLite unique constraint violation
  if (message.includes('UNIQUE constraint failed')) {
    const match = message.match(/UNIQUE constraint failed: \w+\.(\w+)/);
    const field = match ? match[1] : 'unknown field';
    return new ConflictError(
      `${entityType} already exists with this ${field}`,
      'UNIQUE_CONSTRAINT',
      { field, originalError: message }
    );
  }

  // SQLite foreign key constraint
  if (message.includes('FOREIGN KEY constraint failed')) {
    return new ConflictError(
      `Invalid reference: related ${entityType} does not exist`,
      'FOREIGN_KEY_CONSTRAINT',
      { originalError: message }
    );
  }

  // Generic constraint error
  return new ConflictError(
    `Database constraint violation for ${entityType}`,
    'CONSTRAINT_VIOLATION',
    { originalError: message }
  );
}
