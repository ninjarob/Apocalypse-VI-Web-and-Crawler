import { Request, Response, NextFunction } from 'express';

// Export validation middleware
export * from './validation.js';

// Export error handling middleware
export * from './errorHandler.js';

/**
 * Async route handler wrapper
 * Catches errors from async route handlers and passes them to Express error middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Request logger middleware
 * Logs incoming requests with method, path, and query params
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
  const { method, path, query } = req;
  const queryString = Object.keys(query).length > 0 ? JSON.stringify(query) : '';
  console.log(`[API] ${method} ${path} ${queryString}`);
  next();
};

/**
 * Validate entity type middleware
 * Ensures the requested entity type exists in the configuration
 */
export const validateEntityType = (validTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { type } = req.params;

    if (!type) {
      return res.status(400).json({ error: 'Entity type is required' });
    }

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Unknown entity type: ${type}`,
        validTypes
      });
    }

    next();
  };
};

/**
 * Validate required fields middleware
 * Ensures request body contains required fields
 */
export const validateRequiredFields = (fields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const missing = fields.filter(field => !(field in req.body));

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missingFields: missing
      });
    }

    next();
  };
};

/**
 * Response time middleware
 * Adds X-Response-Time header to responses
 */
export const responseTime = (_req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Store original end function
  const originalEnd = res.end.bind(res);

  // Override end to set header before response is sent
  (res.end as any) = function(chunk?: any, encoding?: any, callback?: any) {
    const duration = Date.now() - start;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    return originalEnd(chunk, encoding, callback);
  };

  next();
};

/**
 * Pagination middleware
 * Adds pagination parameters to request
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export const pagination = (req: Request, _res: Response, next: NextFunction) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  // Attach to request for use in handlers
  (req as any).pagination = {
    page,
    limit,
    offset
  } as PaginationParams;

  next();
};

/**
 * CORS helper for specific origins
 */
export const corsForOrigin = (origin: string) => {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
  };
};

/**
 * Cache control middleware
 * Sets cache headers for GET requests
 */
export const cacheControl = (seconds: number = 300) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${seconds}`);
    }
    next();
  };
};
