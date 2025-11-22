/**
 * Room Service
 *
 * Encapsulates business logic for room operations including:
 * - Room retrieval and filtering
 * - Room creation with visit tracking
 * - Room updates and visit recording
 * - Room-specific validation
 */

import { BaseService } from './BaseService.js';
import { repositories } from '../repositories/index.js';
import { Room } from '../repositories/RoomRepository.js';
import { createNotFoundError, BadRequestError } from '../errors/CustomErrors.js';

export class RoomService extends BaseService {
  /**
   * Get all rooms with optional filtering by zone or portal key
   */
  async getRooms(filters?: { zone_id?: number; portal_key?: string }): Promise<Room[]> {
    if (filters?.zone_id) {
      this.validatePositiveInteger(filters.zone_id, 'zone_id');
    }
    if (filters?.portal_key) {
      this.validateNonEmptyString(filters.portal_key, 'portal_key');
    }

    const rooms = await repositories.rooms.findAll(filters);
    
    // Populate exits for each room
    for (const room of rooms) {
      const exits = await repositories.roomExits.findAll({ from_room_id: parseInt(room.id) });
      room.roomExits = exits;
      console.log(`Room ${room.id} has ${exits.length} exits`);
    }

    console.log(`Returning ${rooms.length} rooms with exits populated`);
    return rooms;
  }

  /**
   * Get a single room by ID
   */
  async getRoomById(id: string): Promise<Room> {
    this.validateNonEmptyString(id, 'Room ID');
    const room = await repositories.rooms.findByIdOrThrow(id, 'Room');
    
    // Populate exits for the room
    const exits = await repositories.roomExits.findAll({ from_room_id: parseInt(id) });
    room.roomExits = exits;
    
    return room;
  }

  /**
   * Get a room by its name
   */
  async getRoomByName(name: string): Promise<Room> {
    this.validateNonEmptyString(name, 'Room name');
    const room = await repositories.rooms.findByUniqueOrThrow(name, 'Room');
    
    // Populate exits for the room
    const exits = await repositories.roomExits.findAll({ from_room_id: parseInt(room.id) });
    room.roomExits = exits;
    
    return room;
  }

  /**
   * Create a new room or update existing one with visit tracking
   * This method handles the upsert logic for rooms
   */
  async createOrUpdateRoom(roomData: Partial<Room>): Promise<Room> {
    // Validate required fields
    this.validateNonEmptyString(roomData.name, 'Room name');

    // Ensure name is a string (defensive programming)
    const roomName = typeof roomData.name === 'string' ? roomData.name.trim() : '';

    // Check if room already exists
    // ONLY match by portal_key if provided - this is the only reliable unique identifier
    // Do NOT match by name+description as multiple distinct rooms can have identical text
    let existing: Room | null = null;
    
    if (roomData.portal_key && roomData.portal_key.trim() !== '') {
      // Portal keys are unique identifiers - match by portal key only
      const rooms = await repositories.rooms.findAll({ portal_key: roomData.portal_key });
      existing = rooms.length > 0 ? rooms[0] : null;
    }

    if (existing) {
      // Room exists - record visit and return updated room
      return await this.recordVisit(existing.id.toString());
    }

    // Room doesn't exist - create new room with visit tracking
    const newRoom: Partial<Room> = {
      name: roomName,
      description: roomData.description || undefined,
      exits: roomData.exits || undefined,
      npcs: roomData.npcs || undefined,
      items: roomData.items || undefined,
      area: roomData.area && roomData.area.trim() !== '' ? roomData.area : undefined,
      zone_id: roomData.zone_id || undefined,
      zone_exit: roomData.zone_exit || undefined,
      vnum: roomData.vnum || undefined,
      terrain: roomData.terrain || undefined,
      flags: roomData.flags || undefined,
      portal_key: roomData.portal_key && roomData.portal_key.trim() !== '' ? roomData.portal_key : undefined,
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
    await repositories.rooms.findByIdOrThrow(id, 'Room');

    // Validate zone_id if being updated
    if (updates.zone_id) {
      this.validatePositiveInteger(updates.zone_id, 'zone_id');

      // Verify zone exists
      const zone = await repositories.zones.findById(updates.zone_id.toString());
      if (!zone) {
        throw new BadRequestError(`Zone with ID ${updates.zone_id} does not exist`);
      }
    }

    // Handle room exits separately
    const { roomExits, ...roomUpdates } = updates;
    if (roomExits) {
      await this.updateRoomExits(parseInt(id), roomExits);
    }

    const updated = await repositories.rooms.update(id, roomUpdates);
    if (!updated) {
      throw new Error(`Failed to update room ${id}`);
    }

    // Populate exits for the updated room
    const exits = await repositories.roomExits.findAll({ from_room_id: parseInt(id) });
    updated.roomExits = exits;

    return updated;
  }

  /**
   * Update room exits for a room
   */
  async updateRoomExits(roomId: number, exits: any[]): Promise<void> {
    // Delete existing exits for this room
    await repositories.roomExits.deleteByFilter({ from_room_id: roomId });

    // Create new exits
    for (const exit of exits) {
      await repositories.roomExits.create({
        from_room_id: roomId,
        to_room_id: exit.to_room_id,
        direction: exit.direction,
        description: exit.description,
        door_name: exit.door_name,
        door_description: exit.door_description,
        look_description: exit.look_description,
        is_door: exit.is_door,
        is_locked: exit.is_locked,
        is_zone_exit: exit.is_zone_exit
      });
    }
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

    await repositories.rooms.findByIdOrThrow(id, 'Room');

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
    await repositories.zones.findByIdOrThrow(zoneId.toString(), 'Zone');

    const rooms = await repositories.rooms.findAll({ zone_id: zoneId });
    
    // Populate exits for each room
    for (const room of rooms) {
      const exits = await repositories.roomExits.findAll({ from_room_id: parseInt(room.id) });
      room.roomExits = exits;
    }

    return rooms;
  }
}
