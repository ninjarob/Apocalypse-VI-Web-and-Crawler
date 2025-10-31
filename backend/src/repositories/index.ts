/**
 * Repository layer for database access
 * Provides clean abstraction over database operations using the Repository pattern
 */

export * from './BaseRepository.js';
export * from './GenericRepository.js';
export * from './RoomRepository.js';
export * from './ZoneRepository.js';
export * from './PlayerActionRepository.js';
export * from './RoomExitRepository.js';
export * from './ItemRepository.js';

// Re-export repository instances for convenience
import { RoomRepository } from './RoomRepository.js';
import { ZoneRepository, ZoneAreaRepository, ZoneConnectionRepository } from './ZoneRepository.js';
import { PlayerActionRepository } from './PlayerActionRepository.js';
import { RoomExitRepository } from './RoomExitRepository.js';
import { ItemRepository } from './ItemRepository.js';

export const repositories = {
  rooms: new RoomRepository(),
  zones: new ZoneRepository(),
  zoneAreas: new ZoneAreaRepository(),
  zoneConnections: new ZoneConnectionRepository(),
  playerActions: new PlayerActionRepository(),
  roomExits: new RoomExitRepository(),
  items: new ItemRepository()
};
