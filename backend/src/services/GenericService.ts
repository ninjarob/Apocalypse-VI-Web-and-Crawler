/**
 * Generic Service
 *
 * Provides generic CRUD operations for all entity types that don't require
 * specialized business logic. Works with the GenericRepository to provide
 * a consistent service layer interface.
 */

import { BaseService } from './BaseService.js';
import { EntityConfig } from '../repositories/BaseRepository.js';
import { RepositoryFactory } from '../repositories/GenericRepository.js';
import { createNotFoundError, BadRequestError, ConflictError } from '../errors/CustomErrors.js';

export class GenericService extends BaseService {
  private config: EntityConfig;

  constructor(config: EntityConfig) {
    super();
    this.config = config;
  }

  /**
   * Get all entities with optional filtering
   */
  async getAll(filters?: Record<string, any>): Promise<any[]> {
    const repository = RepositoryFactory.getRepository(this.config);
    return await repository.findAll(filters);
  }

  /**
   * Get a single entity by ID
   */
  async getById(id: string | number): Promise<any> {
    const repository = RepositoryFactory.getRepository(this.config);
    const entity = await repository.findById(id);

    if (!entity) {
      throw createNotFoundError(this.config.table, id.toString());
    }

    return entity;
  }

  /**
   * Get entity by unique field (e.g., name)
   */
  async getByUnique(value: string): Promise<any> {
    if (!this.config.uniqueField) {
      throw new BadRequestError(`${this.config.table} does not have a unique field configured`);
    }

    const repository = RepositoryFactory.getRepository(this.config);
    const entity = await repository.findByUnique(value);

    if (!entity) {
      throw createNotFoundError(this.config.table, value);
    }

    return entity;
  }

  /**
   * Create a new entity
   */
  async create(entityData: any): Promise<any> {
    const repository = RepositoryFactory.getRepository(this.config);

    // For entities with unique fields, check for duplicates
    if (this.config.uniqueField) {
      const uniqueValue = entityData[this.config.uniqueField];
      if (uniqueValue) {
        const existing = await repository.findByUnique(uniqueValue);
        if (existing) {
          throw new ConflictError(
            `${this.config.table} with ${this.config.uniqueField} "${uniqueValue}" already exists`,
            'DUPLICATE',
            { field: this.config.uniqueField, value: uniqueValue }
          );
        }
      }
    }

    return await repository.create(entityData);
  }

  /**
   * Update an existing entity
   */
  async update(id: string | number, updates: any): Promise<any> {
    const repository = RepositoryFactory.getRepository(this.config);

    // Verify entity exists
    const existing = await repository.findById(id);
    if (!existing) {
      throw createNotFoundError(this.config.table, id.toString());
    }

    // If updating unique field, check for duplicates
    if (this.config.uniqueField && updates[this.config.uniqueField]) {
      const uniqueValue = updates[this.config.uniqueField];
      const existingValue = (existing as any)[this.config.uniqueField];

      if (uniqueValue !== existingValue) {
        const duplicate = await repository.findByUnique(uniqueValue);
        if (duplicate) {
          throw new ConflictError(
            `${this.config.table} with ${this.config.uniqueField} "${uniqueValue}" already exists`,
            'DUPLICATE',
            { field: this.config.uniqueField, value: uniqueValue }
          );
        }
      }
    }

    const updated = await repository.update(id, updates);
    if (!updated) {
      throw new Error(`Failed to update ${this.config.table} with id ${id}`);
    }
    return updated;
  }

  /**
   * Delete an entity
   */
  async delete(id: string | number): Promise<boolean> {
    const repository = RepositoryFactory.getRepository(this.config);

    const deleted = await repository.delete(id);

    if (!deleted) {
      throw createNotFoundError(this.config.table, id.toString());
    }

    return deleted;
  }

  /**
   * Create or update entity (upsert for non-auto-increment tables)
   */
  async createOrUpdate(entityData: any): Promise<any> {
    const repository = RepositoryFactory.getRepository(this.config);

    // For tables with unique constraints, try to find existing first (upsert behavior)
    const uniqueField = this.config.uniqueField || this.config.idField;
    const uniqueValue = entityData[uniqueField];

    if (!uniqueValue) {
      throw new BadRequestError(`${uniqueField} is required`);
    }

    const existing = await repository.findByUnique(uniqueValue);

    if (existing) {
      // Update existing entity
      const id = (existing as any)[this.config.idField];
      return await this.update(id, entityData);
    } else {
      // Create new entity
      return await this.create(entityData);
    }
  }

  /**
   * Get count of all entities
   */
  async count(filters?: Record<string, any>): Promise<number> {
    const repository = RepositoryFactory.getRepository(this.config);
    return await repository.count(filters);
  }
}
