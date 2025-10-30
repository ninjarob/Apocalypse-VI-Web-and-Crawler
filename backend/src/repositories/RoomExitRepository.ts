import { BaseRepository, EntityConfig } from './BaseRepository';

export interface RoomExit {
  id: number;
  from_room_id: number;
  to_room_id: number;
  direction: string;
  description?: string;
  is_door?: boolean;
  is_locked?: boolean;
  key_vnum?: number;
  door_name?: string;
  createdAt?: string;
  updatedAt?: string;
}

const config: EntityConfig = {
  table: 'room_exits',
  idField: 'id',
  autoIncrement: true,
  booleanFields: ['is_door', 'is_locked'],
  sortBy: 'from_room_id, direction'
};

export class RoomExitRepository extends BaseRepository<RoomExit> {
  constructor() {
    super(config);
  }

  /**
   * Get all exits from a specific room
   */
  async findByRoom(roomId: number): Promise<RoomExit[]> {
    return this.findAll({ from_room_id: roomId });
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
   * Get all exits leading to a specific room
   */
  async findExitsTo(roomId: number): Promise<RoomExit[]> {
    return this.findAll({ to_room_id: roomId });
  }

  /**
   * Get locked exits
   */
  async findLocked(): Promise<RoomExit[]> {
    return this.findAll({ is_locked: 1 });
  }

  /**
   * Get doors (exits that are doors)
   */
  async findDoors(): Promise<RoomExit[]> {
    return this.findAll({ is_door: 1 });
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
   * Create bidirectional exit
   */
  async createBidirectional(
    roomId1: number,
    roomId2: number,
    direction: string,
    properties?: Partial<RoomExit>
  ): Promise<{ forward: RoomExit; backward: RoomExit }> {
    const oppositeDir = this.getOppositeDirection(direction);
    if (!oppositeDir) {
      throw new Error(`Invalid direction: ${direction}`);
    }

    const forward = await this.create({
      from_room_id: roomId1,
      to_room_id: roomId2,
      direction,
      ...properties
    });

    const backward = await this.create({
      from_room_id: roomId2,
      to_room_id: roomId1,
      direction: oppositeDir,
      ...properties
    });

    return { forward, backward };
  }
}
