import { BaseRepository, EntityConfig } from './BaseRepository';

export interface Room {
  id: string;
  name: string;
  description: string;
  exits?: any;
  npcs?: any;
  items?: any;
  coordinates?: any;
  area?: string;
  zone_id?: number;
  vnum?: number;
  terrain?: string;
  flags?: string;
  visitCount?: number;
  firstVisited?: string;
  lastVisited?: string;
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
}

const config: EntityConfig = {
  table: 'rooms',
  idField: 'id',
  nameField: 'name',
  autoIncrement: false,
  jsonFields: ['exits', 'npcs', 'items', 'coordinates'],
  sortBy: 'lastVisited DESC'
};

export class RoomRepository extends BaseRepository<Room> {
  constructor() {
    super(config);
  }

  /**
   * Find room by name
   */
  async findByName(name: string): Promise<Room | null> {
    const sql = `SELECT * FROM ${this.config.table} WHERE name = ?`;
    return this.get(sql, [name]);
  }

  /**
   * Find rooms by zone ID
   */
  async findByZone(zoneId: number): Promise<Room[]> {
    return this.findAll({ zone_id: zoneId });
  }

  /**
   * Increment visit count and update last visited timestamp
   */
  async recordVisit(id: string): Promise<Room | null> {
    const now = new Date().toISOString();
    const sql = `
      UPDATE ${this.config.table} 
      SET visitCount = visitCount + 1, 
          lastVisited = ?,
          updatedAt = ?
      WHERE id = ?
    `;
    await this.run(sql, [now, now, id]);
    return this.findById(id);
  }

  /**
   * Get most recently visited rooms
   */
  async getRecentlyVisited(limit: number = 10): Promise<Room[]> {
    const sql = `
      SELECT * FROM ${this.config.table} 
      WHERE lastVisited IS NOT NULL 
      ORDER BY lastVisited DESC 
      LIMIT ?
    `;
    return this.all(sql, [limit]);
  }

  /**
   * Get rooms by terrain type
   */
  async findByTerrain(terrain: string): Promise<Room[]> {
    return this.findAll({ terrain });
  }
}
