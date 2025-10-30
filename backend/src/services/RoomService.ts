/**
 * Room Service
 *
 * Encapsulates business logic for room operations including:
 * - Room retrieval and filtering
 * - Room creation with visit tracking
 * - Room updates and visit recording
 * - Room-specific validation
 */

import { BaseService } from './BaseService';
import { repositories } from '../repositories';
import { Room } from '../repositories/RoomRepository';
import { createNotFoundError, BadRequestError } from '../errors/CustomErrors';

export class RoomService extends BaseService {
  /**
   * Get all rooms with optional filtering by zone
   */
  async getRooms(filters?: { zone_id?: number }): Promise<Room[]> {
    if (filters?.zone_id) {
      this.validatePositiveInteger(filters.zone_id, 'zone_id');
    }

    return await repositories.rooms.findAll(filters);
  }

  /**
   * Get a single room by ID
   */
  async getRoomById(id: string): Promise<Room> {
    this.validateNonEmptyString(id, 'Room ID');

    const room = await repositories.rooms.findById(id);

    if (!room) {
      throw createNotFoundError('Room', id);
    }

    return room;
  }

  /**
   * Get a room by its name
   */
  async getRoomByName(name: string): Promise<Room> {
    this.validateNonEmptyString(name, 'Room name');

    const room = await repositories.rooms.findByName(name);

    if (!room) {
      throw createNotFoundError('Room', name);
    }

    return room;
  }

  /**
   * Create a new room or update existing one with visit tracking
   * This method handles the upsert logic for rooms
   */
  async createOrUpdateRoom(roomData: Partial<Room>): Promise<Room> {
    // Validate required fields
    this.validateNonEmptyString(roomData.id, 'Room ID');
    this.validateNonEmptyString(roomData.name, 'Room name');

    // After validation, we know these are defined
    const id = roomData.id!;
    const name = roomData.name!;

    // Check if room already exists
    const existing = await repositories.rooms.findById(id);

    if (existing) {
      // Room exists - record visit and return updated room
      return await this.recordVisit(id);
    }

    // Room doesn't exist - create new room with visit tracking
    const newRoom: Partial<Room> = {
      id,
      name,
      description: roomData.description || undefined,
      exits: roomData.exits || undefined,
      npcs: roomData.npcs || undefined,
      items: roomData.items || undefined,
      coordinates: roomData.coordinates || undefined,
      area: roomData.area || undefined,
      zone_id: roomData.zone_id || undefined,
      vnum: roomData.vnum || undefined,
      terrain: roomData.terrain || undefined,
      flags: roomData.flags || undefined,
      visitCount: 1,
      firstVisited: new Date().toISOString(),
      lastVisited: new Date().toISOString(),
      rawText: roomData.rawText || undefined
    };

    // Validate zone_id if provided
    if (newRoom.zone_id) {
      this.validatePositiveInteger(newRoom.zone_id, 'zone_id');

      // Verify zone exists
      const zone = await repositories.zones.findById(newRoom.zone_id.toString());
      if (!zone) {
        throw new BadRequestError(`Zone with ID ${newRoom.zone_id} does not exist`);
      }
    }

    return await repositories.rooms.create(newRoom);
  }

  /**
   * Update an existing room
   */
  async updateRoom(id: string, updates: Partial<Room>): Promise<Room> {
    this.validateNonEmptyString(id, 'Room ID');

    // Verify room exists
    const existing = await repositories.rooms.findById(id);
    if (!existing) {
      throw createNotFoundError('Room', id);
    }

    // Validate zone_id if being updated
    if (updates.zone_id) {
      this.validatePositiveInteger(updates.zone_id, 'zone_id');

      // Verify zone exists
      const zone = await repositories.zones.findById(updates.zone_id.toString());
      if (!zone) {
        throw new BadRequestError(`Zone with ID ${updates.zone_id} does not exist`);
      }
    }

    const updated = await repositories.rooms.update(id, updates);
    if (!updated) {
      throw new Error(`Failed to update room ${id}`);
    }
    return updated;
  }

  /**
   * Delete a room
   */
  async deleteRoom(id: string): Promise<boolean> {
    this.validateNonEmptyString(id, 'Room ID');

    const deleted = await repositories.rooms.delete(id);

    if (!deleted) {
      throw createNotFoundError('Room', id);
    }

    return deleted;
  }

  /**
   * Record a visit to a room (increments visit count and updates timestamp)
   */
  async recordVisit(id: string): Promise<Room> {
    this.validateNonEmptyString(id, 'Room ID');

    const existing = await repositories.rooms.findById(id);
    if (!existing) {
      throw createNotFoundError('Room', id);
    }

    const updated = await repositories.rooms.recordVisit(id);
    if (!updated) {
      throw new Error(`Failed to record visit for room ${id}`);
    }
    return updated;
  }

  /**
   * Get count of all rooms
   */
  async getRoomCount(): Promise<number> {
    return await repositories.rooms.count();
  }

  /**
   * Get rooms by zone with additional zone information
   */
  async getRoomsByZone(zoneId: number): Promise<Room[]> {
    this.validatePositiveInteger(zoneId, 'zone_id');

    // Verify zone exists
    const zone = await repositories.zones.findById(zoneId.toString());
    if (!zone) {
      throw createNotFoundError('Zone', zoneId.toString());
    }

    return await repositories.rooms.findAll({ zone_id: zoneId });
  }
}
