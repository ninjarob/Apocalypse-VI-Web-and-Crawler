import { Database } from 'sqlite3';
import { getDatabase } from '../database.js';
import { createNotFoundError } from '../errors/CustomErrors.js';

/**
 * Base configuration for entity repositories
 */
export interface EntityConfig {
  table: string;
  idField: string;
  nameField?: string;
  autoIncrement: boolean;
  uniqueField?: string;
  jsonFields?: string[];
  booleanFields?: string[];
  sortBy: string;
}

/**
 * Generic result type for database operations
 */
export interface QueryResult {
  changes: number;
  lastID?: number;
}

/**
 * Base Repository class providing common database operations
 * Uses promise-based async/await pattern for cleaner code
 */
export abstract class BaseRepository<T = any> {
  protected config: EntityConfig;

  constructor(config: EntityConfig) {
    this.config = config;
  }

  /**
   * Get database instance
   */
  protected getDb(): Database {
    return getDatabase();
  }

  /**
   * Execute a SELECT query that returns a single row
   */
  protected async get(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.getDb().get(sql, params, (err, row) => {
        if (err) {reject(err);}
        else {resolve(row ? this.deserializeEntity(row) : null);}
      });
    });
  }

  /**
   * Execute a SELECT query that returns multiple rows
   */
  protected async all(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.getDb().all(sql, params, (err, rows) => {
        if (err) {reject(err);}
        else {resolve(rows.map(row => this.deserializeEntity(row)));}
      });
    });
  }

  /**
   * Execute an INSERT, UPDATE, or DELETE query
   */
  protected async run(sql: string, params: any[] = []): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.getDb().run(sql, params, function(err) {
        if (err) {reject(err);}
        else {resolve({ changes: this.changes, lastID: this.lastID });}
      });
    });
  }

  /**
   * Serialize JSON fields for storage
   */
  protected serialize(value: any): string | null {
    if (!value) {return null;}
    if (typeof value === 'string') {return value;}
    return JSON.stringify(value);
  }

  /**
   * Deserialize JSON fields from storage
   */
  protected deserialize(value: string | null): any {
    if (!value) {return null;}
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * Deserialize an entity based on its configuration
   */
  protected deserializeEntity(row: any): T {
    if (!row) {return row;}

    const entity = { ...row };

    // Deserialize JSON fields
    if (this.config.jsonFields) {
      this.config.jsonFields.forEach(field => {
        if (entity[field]) {
          entity[field] = this.deserialize(entity[field]) || (Array.isArray(entity[field]) ? [] : null);
        }
      });
    }

    // Convert boolean fields
    if (this.config.booleanFields) {
      this.config.booleanFields.forEach(field => {
        if (field in entity) {
          entity[field] = Boolean(entity[field]);
        }
      });
    }

    return entity as T;
  }

  /**
   * Serialize entity for storage
   */
  protected serializeEntity(entity: Partial<T>): any {
    const serialized = { ...entity };

    // Serialize JSON fields
    if (this.config.jsonFields) {
      this.config.jsonFields.forEach(field => {
        if (field in serialized) {
          (serialized as any)[field] = this.serialize((serialized as any)[field]);
        }
      });
    }

    // Convert boolean fields - be more robust about the input type
    if (this.config.booleanFields) {
      this.config.booleanFields.forEach(field => {
        if (field in serialized) {
          const value = (serialized as any)[field];
          // Handle various input types safely
          if (typeof value === 'boolean') {
            (serialized as any)[field] = value ? 1 : 0;
          } else if (typeof value === 'number') {
            (serialized as any)[field] = value ? 1 : 0;
          } else if (typeof value === 'string') {
            // Handle string representations of booleans
            const lowerValue = value.toLowerCase().trim();
            (serialized as any)[field] = (lowerValue === 'true' || lowerValue === '1') ? 1 : 0;
          } else {
            // For any other type (object, array, null, undefined), treat as false
            (serialized as any)[field] = 0;
          }
        }
      });
    }

    return serialized;
  }

  /**
   * Find all entities with optional filtering
   */
  async findAll(filters?: Record<string, any>): Promise<T[]> {
    let sql = `SELECT * FROM ${this.config.table}`;
    const params: any[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const conditions: string[] = [];
      
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'room_ids' && Array.isArray(value)) {
          // Special handling for IN clause with room IDs
          const placeholders = value.map(() => '?').join(', ');
          conditions.push(`(from_room_id IN (${placeholders}) OR to_room_id IN (${placeholders}))`);
          params.push(...value, ...value); // Add IDs twice for both from_room_id and to_room_id
        } else {
          conditions.push(`${key} = ?`);
          params.push(value);
        }
      }
      
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY ${this.config.sortBy}`;

    return this.all(sql, params);
  }

  /**
   * Find entity by ID
   */
  async findById(id: string | number): Promise<T | null> {
    const sql = `SELECT * FROM ${this.config.table} WHERE ${this.config.idField} = ?`;
    return this.get(sql, [id]);
  }

  /**
   * Find entity by ID or throw NotFoundError
   */
  async findByIdOrThrow(id: string | number, entityName?: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) {
      const name = entityName || this.config.table;
      throw createNotFoundError(name, id.toString());
    }
    return entity;
  }

  /**
   * Find entity by unique field (e.g., name)
   */
  async findByUnique(value: string): Promise<T | null> {
    if (!this.config.uniqueField) {
      throw new Error('No unique field configured for this repository');
    }

    const sql = `SELECT * FROM ${this.config.table} WHERE ${this.config.uniqueField} = ?`;
    return this.get(sql, [value]);
  }

  /**
   * Find entity by unique field or throw NotFoundError
   */
  async findByUniqueOrThrow(value: string, entityName?: string): Promise<T> {
    const entity = await this.findByUnique(value);
    if (!entity) {
      const name = entityName || this.config.table;
      throw createNotFoundError(name, value);
    }
    return entity;
  }

  /**
   * Create a new entity
   */
  async create(entity: Partial<T>): Promise<T> {
    const serialized = this.serializeEntity(entity);
    const columns = Object.keys(serialized).filter(key => {
      if (serialized[key] === undefined) {return false;}
      if (this.config.autoIncrement && key === this.config.idField) {return false;}
      return true;
    });

    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => serialized[col]);

    const sql = `INSERT INTO ${this.config.table} (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await this.run(sql, values);

    // If auto-increment, fetch the created entity
    if (this.config.autoIncrement && result.lastID) {
      const created = await this.findById(result.lastID);
      if (!created) {throw new Error('Failed to fetch created entity');}
      return created;
    }

    // Otherwise, return the entity with the provided ID
    const id = (entity as any)[this.config.idField];
    const created = await this.findById(id);
    if (!created) {throw new Error('Failed to fetch created entity');}
    return created;
  }

  /**
   * Update an entity by ID
   */
  async update(id: string | number, updates: Partial<T>): Promise<T | null> {
    const serialized = this.serializeEntity(updates);
    const fields: string[] = [];
    const params: any[] = [];

    Object.keys(serialized).forEach(key => {
      if (key !== this.config.idField && serialized[key] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(serialized[key]);
      }
    });

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(id);

    const sql = `UPDATE ${this.config.table} SET ${fields.join(', ')} WHERE ${this.config.idField} = ?`;
    await this.run(sql, params);

    return this.findById(id);
  }

  /**
   * Delete an entity by ID
   */
  async delete(id: string | number): Promise<boolean> {
    const sql = `DELETE FROM ${this.config.table} WHERE ${this.config.idField} = ?`;
    const result = await this.run(sql, [id]);
    return result.changes > 0;
  }

  /**
   * Check if an entity exists by ID
   */
  async exists(id: string | number): Promise<boolean> {
    const entity = await this.findById(id);
    return entity !== null;
  }

  /**
   * Count total entities with optional filtering
   */
  async count(filters?: Record<string, any>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.config.table}`;
    const params: any[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const conditions = Object.keys(filters).map(key => `${key} = ?`);
      sql += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(filters));
    }

    return new Promise((resolve, reject) => {
      this.getDb().get(sql, params, (err, row: any) => {
        if (err) {reject(err);}
        else {resolve(row?.count || 0);}
      });
    });
  }

  /**
   * Upsert (create or update) an entity based on unique field
   */
  async upsert(entity: Partial<T>): Promise<T> {
    const uniqueField = this.config.uniqueField || this.config.idField;
    const uniqueValue = (entity as any)[uniqueField];

    if (!uniqueValue) {
      throw new Error(`Unique field ${uniqueField} is required for upsert`);
    }

    const existing = await this.findByUnique(uniqueValue);

    if (existing) {
      const id = (existing as any)[this.config.idField];
      const updated = await this.update(id, entity);
      if (!updated) {throw new Error('Failed to update entity');}
      return updated;
    } else {
      return this.create(entity);
    }
  }

  /**
   * Search entities by name or description fields
   * Searches the nameField and 'description' field if they exist in the entity
   */
  async search(query: string): Promise<T[]> {
    if (!query || query.trim() === '') {
      return this.findAll();
    }

    const searchPattern = `%${query}%`;
    const conditions: string[] = [];
    const params: any[] = [];

    // Search in name field if configured
    if (this.config.nameField) {
      conditions.push(`${this.config.nameField} LIKE ?`);
      params.push(searchPattern);
    }

    // Always try to search in description field (most entities have it)
    conditions.push(`description LIKE ?`);
    params.push(searchPattern);

    if (conditions.length === 0) {
      // No searchable fields, return all
      return this.findAll();
    }

    const sql = `
      SELECT * FROM ${this.config.table} 
      WHERE ${conditions.join(' OR ')}
      ORDER BY ${this.config.sortBy}
    `;

    return this.all(sql, params);
  }
}
