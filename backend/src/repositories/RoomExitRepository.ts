import { BaseRepository, EntityConfig } from './BaseRepository.js';

export interface RoomExit {
  id: number;
  from_room_id: number;
  to_room_id: number;
  direction: string;
  description?: string;
  exit_description?: string;
  look_description?: string;
  door_name?: string;
  door_description?: string;
  is_door?: boolean;
  is_locked?: boolean;
  is_zone_exit?: boolean;
  key_vnum?: number;
  createdAt?: string;
  updatedAt?: string;
}

const config: EntityConfig = {
  table: 'room_exits',
  idField: 'id',
  autoIncrement: true,
  booleanFields: ['is_door', 'is_locked', 'is_zone_exit'],
  sortBy: 'from_room_id, direction'
};

export class RoomExitRepository extends BaseRepository<RoomExit> {
  constructor() {
    super(config);
  }

  /**
   * Get exit in a specific direction from a room
   */
  async findByDirection(roomId: number, direction: string): Promise<RoomExit | null> {
    const sql = `
      SELECT * FROM ${this.config.table} 
      WHERE from_room_id = ? AND direction = ?
    `;
    return this.get(sql, [roomId, direction]);
  }

  /**
   * Check if a bidirectional connection exists
   */
  async isBidirectional(roomId1: number, roomId2: number): Promise<boolean> {
    const sql = `
      SELECT COUNT(*) as count FROM ${this.config.table} 
      WHERE (from_room_id = ? AND to_room_id = ?) 
         OR (from_room_id = ? AND to_room_id = ?)
    `;
    return new Promise((resolve, reject) => {
      this.getDb().get(sql, [roomId1, roomId2, roomId2, roomId1], (err, row: any) => {
        if (err) {reject(err);}
        else {resolve(row?.count === 2);}
      });
    });
  }

  /**
   * Get opposite direction
   */
  // @ts-ignore - Method kept for future bidirectional exit functionality
  private getOppositeDirection(direction: string): string | null {
    const opposites: Record<string, string> = {
      'north': 'south',
      'south': 'north',
      'east': 'west',
      'west': 'east',
      'up': 'down',
      'down': 'up',
      'northeast': 'southwest',
      'northwest': 'southeast',
      'southeast': 'northwest',
      'southwest': 'northeast'
    };
    return opposites[direction.toLowerCase()] || null;
  }

  /**
   * Delete entities by filter
   */
  async deleteByFilter(filters: Record<string, any>): Promise<number> {
    const entities = await this.findAll(filters);
    let deletedCount = 0;
    
    for (const entity of entities) {
      const success = await this.delete(entity.id);
      if (success) {
        deletedCount++;
      }
    }
    
    return deletedCount;
  }
}
