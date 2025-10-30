import { BaseRepository, EntityConfig } from './BaseRepository';

/**
 * Generic repository that can work with any entity type
 * Used by the generic routes to provide CRUD operations for all tables
 */
export class GenericRepository<T = any> extends BaseRepository<T> {
  constructor(config: EntityConfig) {
    super(config);
  }

  /**
   * Find entities with custom filters (supports any field)
   */
  async findWithFilters(filters: Record<string, any>): Promise<T[]> {
    let sql = `SELECT * FROM ${this.config.table}`;
    const params: any[] = [];

    if (filters && Object.keys(filters).length > 0) {
      const conditions = Object.keys(filters).map(key => `${key} = ?`);
      sql += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(filters));
    }

    sql += ` ORDER BY ${this.config.sortBy}`;

    return this.all(sql, params);
  }
}

/**
 * Factory for creating generic repositories based on entity config
 */
export class RepositoryFactory {
  private static repositories = new Map<string, GenericRepository>();

  static getRepository(config: EntityConfig): GenericRepository {
    const key = config.table;

    if (!this.repositories.has(key)) {
      this.repositories.set(key, new GenericRepository(config));
    }

    return this.repositories.get(key)!;
  }

  static clearCache(): void {
    this.repositories.clear();
  }
}
