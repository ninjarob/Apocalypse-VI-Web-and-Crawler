import { BaseRepository, EntityConfig } from './BaseRepository.js';

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
  portal_key?: string;
  greater_binding_key?: string;
  zone_exit?: boolean;
  visitCount?: number;
  firstVisited?: string;
  lastVisited?: string;
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
  roomExits?: any[];
}

const config: EntityConfig = {
  table: 'rooms',
  idField: 'id',
  nameField: 'name',
  autoIncrement: true,
  uniqueField: 'name',
  jsonFields: ['exits', 'npcs', 'items', 'coordinates'],
  sortBy: 'lastVisited DESC'
};

export class RoomRepository extends BaseRepository<Room> {
  constructor() {
    super(config);
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
}
