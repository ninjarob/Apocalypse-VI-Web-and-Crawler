/**
 * Base Service Class
 *
 * Provides common service layer functionality and patterns.
 * Services encapsulate business logic and coordinate between repositories and external services.
 */

import { BadRequestError } from '../errors/CustomErrors.js';

export abstract class BaseService {
  /**
   * Sanitizes user input by trimming whitespace and removing null bytes
   */
  protected sanitizeString(value: string | null | undefined): string | null {
    if (!value || typeof value !== 'string') {return null;}
    return value.trim().replace(/\0/g, '');
  }

  /**
   * Validates that a string is not empty after trimming
   * Throws BadRequestError if validation fails
   */
  protected validateNonEmptyString(value: string | undefined | null, fieldName: string): void {
    if (typeof value !== 'string' || !value || value.trim() === '') {
      throw new BadRequestError(`${fieldName} is required`);
    }
  }

  /**
   * Validates that a value is a positive integer
   */
  protected validatePositiveInteger(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${fieldName} must be a positive integer`);
    }
  }

  /**
   * Validates that a date string is valid ISO 8601 format
   */
  protected validateDateString(dateStr: string, fieldName: string): void {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`${fieldName} must be a valid ISO 8601 date string`);
    }
  }

  /**
   * Safely parses JSON field, returns null if invalid
   */
  protected parseJsonField<T>(value: string | null | undefined): T | null {
    if (!value) {return null;}
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Converts boolean-like values to actual boolean
   */
  protected normalizeBoolean(value: any): boolean {
    if (typeof value === 'boolean') {return value;}
    if (typeof value === 'number') {return value !== 0;}
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return Boolean(value);
  }

  /**
   * Builds a WHERE clause fragment for SQL queries
   */
  protected buildWhereClause(filters: Record<string, any>): { where: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    return {
      where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params
    };
  }
}
