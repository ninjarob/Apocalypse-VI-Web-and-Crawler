import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { CREATE_SCHEMAS, UPDATE_SCHEMAS } from '../validation/schemas.js';

/**
 * Validation error response format
 */
interface ValidationError {
  field: string;
  message: string;
}

/**
 * Format Zod validation errors into user-friendly error messages
 */
function formatZodErrors(error: ZodError): ValidationError[] {
  return error.issues.map((err: z.ZodIssue) => ({
    field: err.path.join('.'),
    message: err.message
  }));
}

/**
 * Middleware to validate request body against a Zod schema
 * Used for POST (create) endpoints
 */
export function validateCreate(entityType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = CREATE_SCHEMAS[entityType];

    if (!schema) {
      console.warn(`⚠️ No validation schema found for entity type: ${entityType}`);
      return next(); // Continue without validation if schema not found
    }

    try {
      // Validate and parse the request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: formatZodErrors(error)
        });
      }
      // Unexpected error
      console.error('Validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Middleware to validate request body against a Zod schema
 * Used for PUT/PATCH (update) endpoints
 */
export function validateUpdate(entityType: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const schema = UPDATE_SCHEMAS[entityType];

    if (!schema) {
      console.warn(`⚠️ No validation schema found for entity type: ${entityType}`);
      return next(); // Continue without validation if schema not found
    }

    try {
      // Validate and parse the request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: formatZodErrors(error)
        });
      }
      // Unexpected error
      console.error('Validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during validation'
      });
    }
  };
}

/**
 * Middleware to validate query parameters against a Zod schema
 * Useful for GET endpoints with complex query params
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse query parameters
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: formatZodErrors(error)
        });
      }
      // Unexpected error
      console.error('Query validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during query validation'
      });
    }
  };
}

/**
 * Common query parameter schemas for reuse
 */
export const commonQuerySchemas = {
  // Pagination parameters
  pagination: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(1000).optional().default(50)
  }),

  // Sorting parameters
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).optional()
  }),

  // Generic ID lookup
  idLookup: z.object({
    id: z.coerce.number().int().positive()
  }),

  // Category filter
  categoryFilter: z.object({
    category: z.string().optional()
  }),

  // Ability ID filter
  abilityFilter: z.object({
    ability_id: z.coerce.number().int().positive().optional()
  }),

  // Zone ID filter
  zoneFilter: z.object({
    zone_id: z.coerce.number().int().positive().optional()
  }),

  // Search by name
  nameSearch: z.object({
    name: z.string().min(1).optional()
  })
};

/**
 * Validate path parameters (like /:id in route)
 */
export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and parse path parameters
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid path parameters',
          details: formatZodErrors(error)
        });
      }
      // Unexpected error
      console.error('Path parameter validation error:', error);
      return res.status(500).json({
        error: 'Internal server error during parameter validation'
      });
    }
  };
}
