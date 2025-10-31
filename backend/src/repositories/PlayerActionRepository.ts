import { BaseRepository, EntityConfig } from './BaseRepository.js';

export interface PlayerAction {
  id: number;
  name: string;
  type: string;
  category?: string;
  description?: string;
  syntax?: string;
  examples?: any;
  requirements?: any;
  levelRequired?: number;
  relatedActions?: any;
  timesUsed?: number;
  successCount?: number;
  failCount?: number;
  documented?: boolean;
  discovered?: string;
  lastTested?: string;
  createdAt?: string;
  updatedAt?: string;
}

const config: EntityConfig = {
  table: 'player_actions',
  idField: 'id',
  nameField: 'name',
  autoIncrement: true,
  uniqueField: 'name',
  jsonFields: ['examples', 'requirements', 'relatedActions'],
  booleanFields: ['documented'],
  sortBy: 'type, category, name'
};

export class PlayerActionRepository extends BaseRepository<PlayerAction> {
  constructor() {
    super(config);
  }

  /**
   * Record action usage
   */
  async recordUsage(id: number, success: boolean): Promise<PlayerAction | null> {
    const sql = `
      UPDATE ${this.config.table} 
      SET timesUsed = timesUsed + 1,
          ${success ? 'successCount = successCount + 1' : 'failCount = failCount + 1'},
          lastTested = ?,
          updatedAt = ?
      WHERE id = ?
    `;
    const now = new Date().toISOString();
    await this.run(sql, [now, now, id]);
    return this.findById(id);
  }

  /**
   * Get most used actions
   */
  async getMostUsed(limit: number = 10): Promise<PlayerAction[]> {
    const sql = `
      SELECT * FROM ${this.config.table} 
      ORDER BY timesUsed DESC 
      LIMIT ?
    `;
    return this.all(sql, [limit]);
  }

  /**
   * Get actions by success rate
   */
  async getBySuccessRate(minRate: number = 0.5, limit: number = 10): Promise<PlayerAction[]> {
    const sql = `
      SELECT * FROM ${this.config.table} 
      WHERE timesUsed > 0 
        AND (CAST(successCount AS FLOAT) / timesUsed) >= ?
      ORDER BY successCount DESC 
      LIMIT ?
    `;
    return this.all(sql, [minRate, limit]);
  }
}
