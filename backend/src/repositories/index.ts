/**
 * Repository layer for database access
 * Provides clean abstraction over database operations using the Repository pattern
 */

export * from './BaseRepository';
export * from './GenericRepository';
export * from './RoomRepository';
export * from './ZoneRepository';
export * from './PlayerActionRepository';
export * from './RoomExitRepository';
export * from './ItemRepository';

// Re-export repository instances for convenience
import { RoomRepository } from './RoomRepository';
import { ZoneRepository, ZoneAreaRepository, ZoneConnectionRepository } from './ZoneRepository';
import { PlayerActionRepository } from './PlayerActionRepository';
import { RoomExitRepository } from './RoomExitRepository';
import { ItemRepository } from './ItemRepository';

export const repositories = {
  rooms: new RoomRepository(),
  zones: new ZoneRepository(),
  zoneAreas: new ZoneAreaRepository(),
  zoneConnections: new ZoneConnectionRepository(),
  playerActions: new PlayerActionRepository(),
  roomExits: new RoomExitRepository(),
  items: new ItemRepository()
};
