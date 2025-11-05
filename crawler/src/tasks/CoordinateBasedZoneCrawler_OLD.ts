import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';
import { RoomProcessor } from '../RoomProcessor';

interface Coordinates {
  x: number;
  y: number;
  z: number;
}

interface RoomInfo {
  id?: number;
  name: string;
  coordinates: Coordinates;
  exits: string[]; // All known exits from this room
  mappedExits: Set<string>; // Exits that have been explored
  unmappedExits: Set<string>; // Exits that exist but haven't been explored
}

/**
 * CoordinateBasedZoneCrawler - New zone exploration system
 *
 * This crawler:
 * 1. Starts at coordinates 0,0,0 or current room location
 * 2. Determines current zone and loads existing rooms
 * 3. Tracks which exits from each room have been mapped
 * 4. Systematically explores all unmapped exits
 * 5. Creates new rooms and connections as discovered
 * 6. Navigates back to rooms with unmapped exits
 */
export class CoordinateBasedZoneCrawler implements CrawlerTask {
  name = 'Coordinate-Based Zone Crawler';
  description = 'New systematic zone exploration starting from 0,0,0 with exit tracking';

  private config: TaskConfig;
  private currentZone: string = '';
  private zoneId: number = 0;
  private rooms: Map<string, RoomInfo> = new Map(); // Key: coordinate string "x,y,z"
  private currentCoordinates: Coordinates = { x: 0, y: 0, z: 0 };
  private currentRoomName: string = '';
  private actionsUsed: number = 0;
  private maxActions: number;
  private roomProcessor: RoomProcessor;

  constructor(config: TaskConfig) {
    this.config = config;
    this.maxActions = parseInt(process.env.MAX_ACTIONS_PER_SESSION || '1000');
    this.roomProcessor = new RoomProcessor(config);
  }

  async run(): Promise<void> {
    logger.info('🆕 Starting new coordinate-based zone crawler...');

    try {
      // Step 1: Determine current zone
      logger.info('Step 1: Determining current zone...');
      await this.delay(2000);
      const zoneInfo = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
      this.currentZone = this.extractCurrentZone(zoneInfo);

      if (!this.currentZone) {
        logger.error('❌ Could not determine current zone from "who -z" output');
        return;
      }

      logger.info(`✓ Current zone: ${this.currentZone}`);

      // Get zone ID
      const zones = await this.config.api.getAllEntities('zones');
      const zone = zones.find((z: any) => z.name === this.currentZone);
      if (!zone) {
        logger.error(`❌ Could not find zone "${this.currentZone}" in database`);
        return;
      }
      this.zoneId = zone.id;
      logger.info(`✓ Zone ID: ${this.zoneId}`);

      // Step 2: Load existing rooms for this zone
      logger.info('Step 2: Loading existing rooms for zone...');
      await this.loadExistingRooms();

      // Step 3: Determine starting position
      logger.info('Step 3: Determining starting position...');
      await this.determineStartingPosition();

      // Step 4: Begin systematic exploration
      logger.info(`Step 4: Beginning systematic exploration (max ${this.maxActions} actions)...`);
      await this.exploreSystematically();

      // Summary
      logger.info('\n📊 Coordinate-Based Crawler Summary:');
      logger.info(`   Zone: ${this.currentZone}`);
      logger.info(`   Rooms in database: ${this.rooms.size}`);
      logger.info(`   Actions used: ${this.actionsUsed}/${this.maxActions}`);

    } catch (error) {
      logger.error('❌ Error during coordinate-based crawling:', error);
      throw error;
    }
  }

  /**
   * Load existing rooms for the current zone from database
   */
  private async loadExistingRooms(): Promise<void> {
    try {
      const allRooms = await this.config.api.getAllEntities('rooms');
      const zoneRooms = allRooms.filter((r: any) => r.zone_id === this.zoneId);

      for (const room of zoneRooms) {
        if (!room.coordinates) continue;

        let coords: Coordinates;
        try {
          coords = typeof room.coordinates === 'string'
            ? JSON.parse(room.coordinates)
            : room.coordinates;
        } catch (error) {
          logger.warn(`⚠️  Invalid coordinates for room ${room.name}: ${room.coordinates}`);
          continue;
        }

        const coordKey = this.getCoordinateKey(coords);

        // Load existing exits for this room
        const roomExits = await this.config.api.getAllEntities('room_exits', {
          from_room_id: room.id
        });

        const exitDirections = roomExits.map((exit: any) => exit.direction.toLowerCase());

        const roomInfo: RoomInfo = {
          id: room.id,
          name: room.name,
          coordinates: coords,
          exits: exitDirections,
          mappedExits: new Set(), // Will be populated during exploration
          unmappedExits: new Set(exitDirections)
        };

        this.rooms.set(coordKey, roomInfo);
        logger.info(`✓ Loaded room: ${room.name} at ${coordKey}`);
      }

      logger.info(`✓ Loaded ${this.rooms.size} existing rooms for zone ${this.currentZone}`);

    } catch (error) {
      logger.error('❌ Failed to load existing rooms:', error);
    }
  }

  /**
   * Determine starting position - either current room or 0,0,0
   */
  private async determineStartingPosition(): Promise<void> {
    // Get current room information
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
    this.currentRoomName = roomData.name;

    // Check if current room exists in our database
    const currentRoom = Array.from(this.rooms.values()).find(r => r.name === this.currentRoomName);

    if (currentRoom) {
      // Start from current room location
      this.currentCoordinates = { ...currentRoom.coordinates };
      logger.info(`✓ Starting from existing room: ${currentRoom.name} at ${this.getCoordinateKey(currentRoom.coordinates)}`);
    } else {
      // Start from 0,0,0
      this.currentCoordinates = { x: 0, y: 0, z: 0 };
      logger.info(`✓ Starting from origin: 0,0,0 (current room not in database)`);
    }

    // Ensure we have a room entry for current position
    await this.ensureRoomAtCurrentPosition(roomData);
  }

  /**
   * Ensure there's a room entry for the current position
   */
  private async ensureRoomAtCurrentPosition(roomData: any): Promise<void> {
    const coordKey = this.getCoordinateKey(this.currentCoordinates);

    if (!this.rooms.has(coordKey)) {
      // Get exits for current room
      await this.delay(this.config.delayBetweenActions);
      const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
      this.actionsUsed++;

      const exits = this.parseExitsOutput(exitsResponse);
      const exitDirections = exits.map(e => e.direction.toLowerCase());

      // Save room to database
      await this.saveRoomToDatabase(roomData, this.currentCoordinates, exitDirections);

      // Add to our tracking
      const roomInfo: RoomInfo = {
        name: roomData.name,
        coordinates: { ...this.currentCoordinates },
        exits: exitDirections,
        mappedExits: new Set(),
        unmappedExits: new Set(exitDirections)
      };

      this.rooms.set(coordKey, roomInfo);
      logger.info(`✓ Created new room entry: ${roomData.name} at ${coordKey}`);
    }
  }

  /**
   * Main systematic exploration loop
   */
  private async exploreSystematically(): Promise<void> {
    while (this.actionsUsed < this.maxActions) {
      // Find a room with unmapped exits
      const roomWithUnmappedExits = this.findRoomWithUnmappedExits();

      if (!roomWithUnmappedExits) {
        logger.info('✅ All reachable exits have been mapped!');
        break;
      }

      // Navigate to that room
      await this.navigateToRoom(roomWithUnmappedExits);

      // Explore one unmapped exit from this already-mapped room
      await this.exploreNextUnmappedExitFromMappedRoom(roomWithUnmappedExits);

      logger.info(`   Progress: ${this.getExplorationStats().mappedExits} mapped exits, ${this.actionsUsed}/${this.maxActions} actions`);
    }

    if (this.actionsUsed >= this.maxActions) {
      logger.warn(`⚠️  Reached max actions limit (${this.maxActions})`);
    }
  }

  /**
   * Find a room that has unmapped exits
   */
  private findRoomWithUnmappedExits(): RoomInfo | null {
    for (const room of this.rooms.values()) {
      if (room.unmappedExits.size > 0) {
        return room;
      }
    }
    return null;
  }

  /**
   * Navigate to a specific room
   */
  private async navigateToRoom(targetRoom: RoomInfo): Promise<void> {
    const currentCoordKey = this.getCoordinateKey(this.currentCoordinates);
    const targetCoordKey = this.getCoordinateKey(targetRoom.coordinates);

    if (currentCoordKey === targetCoordKey) {
      // Already at target room
      return;
    }

    // For now, assume we need to implement pathfinding
    // This is a simplified version - in practice you'd need A* or similar
    logger.info(`🧭 Navigating from ${currentCoordKey} to ${targetCoordKey}...`);

    // Calculate simple path (this is a placeholder - real implementation would need proper pathfinding)
    const path = this.calculateSimplePath(this.currentCoordinates, targetRoom.coordinates);

    if (path.length === 0) {
      logger.warn(`⚠️  Cannot find path to ${targetCoordKey}`);
      return;
    }

    // Execute the path
    for (const direction of path) {
      await this.delay(this.config.delayBetweenActions);
      const response = await this.config.mudClient.sendAndWait(direction, this.config.delayBetweenActions);
      this.actionsUsed++;

      if (response.includes("Alas, you cannot go that way")) {
        logger.error(`❌ Navigation blocked at ${direction}`);
        // Update our knowledge - this exit might not exist
        const currentRoom = this.rooms.get(currentCoordKey);
        if (currentRoom) {
          currentRoom.unmappedExits.delete(direction.toLowerCase());
          currentRoom.mappedExits.add(direction.toLowerCase());
        }
        return;
      }

      // Update current coordinates
      this.currentCoordinates = this.moveCoordinates(this.currentCoordinates, direction);
    }

    // Verify we're at the target
    await this.verifyCurrentLocation(targetRoom);
  }

  /**
   * Calculate a simple path between two coordinates (placeholder)
   */
  private calculateSimplePath(from: Coordinates, to: Coordinates): string[] {
    const path: string[] = [];

    // Simple greedy path - move in each dimension separately
    // This is not optimal but works for basic navigation
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = to.z - from.z;

    // Add east/west movements
    for (let i = 0; i < Math.abs(dx); i++) {
      path.push(dx > 0 ? 'east' : 'west');
    }

    // Add north/south movements
    for (let i = 0; i < Math.abs(dy); i++) {
      path.push(dy > 0 ? 'north' : 'south');
    }

    // Add up/down movements
    for (let i = 0; i < Math.abs(dz); i++) {
      path.push(dz > 0 ? 'up' : 'down');
    }

    return path;
  }

  /**
   * Verify we're at the expected location
   */
  private async verifyCurrentLocation(expectedRoom: RoomInfo): Promise<void> {
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
    this.currentRoomName = roomData.name;

    // More flexible room name matching - allow for minor variations
    const expectedName = expectedRoom.name.toLowerCase().trim();
    const actualName = roomData.name.toLowerCase().trim();

    // Check if names are similar (allowing for typos, extra spaces, etc.)
    const namesMatch = expectedName === actualName ||
                      expectedName.includes(actualName) ||
                      actualName.includes(expectedName) ||
                      this.calculateSimilarity(expectedName, actualName) > 0.8;

    if (!namesMatch) {
      logger.warn(`⚠️  Location verification failed. Expected: "${expectedRoom.name}", Got: "${roomData.name}"`);
      // Update current coordinates based on actual location if possible
      const actualRoom = Array.from(this.rooms.values()).find(r => {
        const roomName = r.name.toLowerCase().trim();
        const actualNameLower = roomData.name.toLowerCase().trim();
        return roomName === actualNameLower ||
               roomName.includes(actualNameLower) ||
               actualNameLower.includes(roomName) ||
               this.calculateSimilarity(roomName, actualNameLower) > 0.8;
      });
      if (actualRoom) {
        this.currentCoordinates = { ...actualRoom.coordinates };
      }
    }
  }

  /**
   * Explore the next unmapped exit from an already mapped room
   */
  private async exploreNextUnmappedExitFromMappedRoom(room: RoomInfo): Promise<void> {
    const coordKey = this.getCoordinateKey(room.coordinates);
    const direction = Array.from(room.unmappedExits)[0]; // Get first unmapped exit

    if (!direction) return;

    logger.info(`🧭 Exploring ${direction} from ${room.name}...`);

    // Try to move (don't mark as mapped yet - wait for verification)
    await this.delay(this.config.delayBetweenActions);
    const moveResponse = await this.config.mudClient.sendAndWait(direction, this.config.delayBetweenActions);
    this.actionsUsed++;

    if (moveResponse.includes("Alas, you cannot go that way")) {
      logger.info(`   ❌ Direction ${direction} blocked`);
      // Mark as mapped since we know it's blocked
      room.mappedExits.add(direction);
      room.unmappedExits.delete(direction);
      return;
    }

    // Calculate new coordinates
    const newCoordinates = this.moveCoordinates(this.currentCoordinates, direction);

    // Check if we're still in the same zone
    await this.delay(this.config.delayBetweenActions);
    const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
    this.actionsUsed++;

    const currentZone = this.extractCurrentZone(zoneCheck);

    if (currentZone !== this.currentZone) {
      logger.info(`   🏞️  Moved to different zone: ${currentZone}`);
      // Go back
      const oppositeDir = this.getOppositeDirection(direction);
      if (oppositeDir) {
        await this.delay(this.config.delayBetweenActions);
        await this.config.mudClient.sendAndWait(oppositeDir, this.config.delayBetweenActions);
        this.actionsUsed++;
        this.currentCoordinates = { ...room.coordinates }; // Back to original position
      }
      return;
    }

    // Check if we already know about this room
    const newCoordKey = this.getCoordinateKey(newCoordinates);
    if (this.rooms.has(newCoordKey)) {
      const existingRoom = this.rooms.get(newCoordKey)!;
      logger.info(`   ✓ Already know about room at ${newCoordKey}: ${existingRoom.name}`);
      this.currentCoordinates = newCoordinates;
      this.currentRoomName = existingRoom.name;

      // Verify this connection if not already marked as mapped
      const returnDirection = this.getOppositeDirection(direction);
      if (returnDirection && !existingRoom.mappedExits.has(returnDirection)) {
        await this.verifyConnection(existingRoom, returnDirection, room);
      }
      return;
    }

    // Successfully moved to new room - process it
    const { roomData: newRoomData, exitData: newExitData } = await this.roomProcessor.processRoom();
    this.actionsUsed += this.roomProcessor.getActionsUsed();

    if (!newRoomData.name) {
      logger.warn('⚠️  Could not parse new room, going back...');
      const oppositeDir = this.getOppositeDirection(direction);
      if (oppositeDir) {
        await this.delay(this.config.delayBetweenActions);
        await this.config.mudClient.sendAndWait(oppositeDir, this.config.delayBetweenActions);
        this.actionsUsed++;
        this.currentCoordinates = { ...room.coordinates };
      }
      return;
    }

    // Save the new room
    const newExitDirections = newExitData.map(e => e.direction.toLowerCase());
    await this.saveRoomToDatabase(newRoomData, newCoordinates, newExitDirections);

    // Add to our tracking - DON'T assume bidirectional connection yet
    const newRoomInfo: RoomInfo = {
      name: newRoomData.name,
      coordinates: { ...newCoordinates },
      exits: newExitDirections,
      mappedExits: new Set(), // Start with no mapped exits - we'll verify them
      unmappedExits: new Set(newExitDirections) // All exits start as unmapped
    };

    this.rooms.set(newCoordKey, newRoomInfo);

    // Update current position
    this.currentCoordinates = { ...newCoordinates };
    this.currentRoomName = newRoomData.name;

    logger.info(`✓ Discovered new room: ${newRoomData.name} at ${newCoordKey}`);

    // Now verify the return path to confirm bidirectional connection
    await this.verifyReturnPath(room, direction, newRoomInfo);
  }

  /**
   * Verify a connection between two known rooms
   */
  private async verifyConnection(targetRoom: RoomInfo, directionFromTarget: string, expectedSourceRoom: RoomInfo): Promise<void> {
    logger.info(`   🔄 Verifying connection: ${directionFromTarget} from ${targetRoom.name} should lead to ${expectedSourceRoom.name}`);

    // Try to move in the specified direction
    await this.delay(this.config.delayBetweenActions);
    const moveResponse = await this.config.mudClient.sendAndWait(directionFromTarget, this.config.delayBetweenActions);
    this.actionsUsed++;

    if (moveResponse.includes("Alas, you cannot go that way")) {
      logger.info(`   ❌ Connection ${directionFromTarget} blocked`);
      return;
    }

    // Verify we're at the expected room
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
    const expectedName = expectedSourceRoom.name.toLowerCase().trim();
    const actualName = roomData.name.toLowerCase().trim();

    const namesMatch = expectedName === actualName ||
                      expectedName.includes(actualName) ||
                      actualName.includes(expectedName) ||
                      this.calculateSimilarity(expectedName, actualName) > 0.8;

    if (namesMatch) {
      // Success! Mark the connection as verified in both rooms
      targetRoom.mappedExits.add(directionFromTarget);
      targetRoom.unmappedExits.delete(directionFromTarget);

      const oppositeDirection = this.getOppositeDirection(directionFromTarget);
      if (oppositeDirection) {
        expectedSourceRoom.mappedExits.add(oppositeDirection);
        expectedSourceRoom.unmappedExits.delete(oppositeDirection);
      }

      logger.info(`   ✅ Connection verified - bidirectional link confirmed`);
    } else {
      logger.warn(`   ⚠️  Connection led to unexpected room: ${roomData.name} (expected ${expectedSourceRoom.name})`);
      // Go back if possible
      const returnDirection = this.getOppositeDirection(directionFromTarget);
      if (returnDirection) {
        await this.delay(this.config.delayBetweenActions);
        await this.config.mudClient.sendAndWait(returnDirection, this.config.delayBetweenActions);
        this.actionsUsed++;
      }
    }
  }
  private async verifyReturnPath(sourceRoom: RoomInfo, directionMoved: string, newRoom: RoomInfo): Promise<void> {
    const returnDirection = this.getOppositeDirection(directionMoved);
    if (!returnDirection) {
      logger.warn(`   ⚠️  Cannot determine return direction from ${directionMoved}`);
      return;
    }

    logger.info(`   🔄 Verifying return path: ${returnDirection} from ${newRoom.name} to ${sourceRoom.name}`);

    // Try to move back
    await this.delay(this.config.delayBetweenActions);
    const returnResponse = await this.config.mudClient.sendAndWait(returnDirection, this.config.delayBetweenActions);
    this.actionsUsed++;

    if (returnResponse.includes("Alas, you cannot go that way")) {
      logger.info(`   ❌ Return path ${returnDirection} blocked - one-way connection`);
      // Leave the return path as unmapped in both rooms
      return;
    }

    // Verify we're back at the source room
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
    const expectedName = sourceRoom.name.toLowerCase().trim();
    const actualName = roomData.name.toLowerCase().trim();

    const namesMatch = expectedName === actualName ||
                      expectedName.includes(actualName) ||
                      actualName.includes(expectedName) ||
                      this.calculateSimilarity(expectedName, actualName) > 0.8;

    if (namesMatch) {
      // Success! Mark the return path as mapped in both rooms
      sourceRoom.mappedExits.add(directionMoved);
      newRoom.mappedExits.add(returnDirection);
      newRoom.unmappedExits.delete(returnDirection);

      logger.info(`   ✅ Return path verified - bidirectional connection confirmed`);
    } else {
      logger.warn(`   ⚠️  Return path led to unexpected room: ${roomData.name} (expected ${sourceRoom.name})`);
      // Don't mark as mapped - might be a teleporter or special exit
    }
  }
  private async saveRoomToDatabase(roomData: any, coordinates: Coordinates, exitDirections: string[]): Promise<void> {
    try {
      // Check if room already exists at these coordinates
      const existingRooms = await this.config.api.getAllEntities('rooms');
      const existing = existingRooms.find((r: any) => {
        if (!r.coordinates) return false;
        try {
          const existingCoords = typeof r.coordinates === 'string'
            ? JSON.parse(r.coordinates)
            : r.coordinates;
          return existingCoords.x === coordinates.x &&
                 existingCoords.y === coordinates.y &&
                 existingCoords.z === coordinates.z;
        } catch {
          return false;
        }
      });

      const roomToSave = {
        name: roomData.name,
        description: this.filterOutput(roomData.description),
        rawText: `${roomData.name}\n${this.filterOutput(roomData.description)}`,
        zone_id: this.zoneId,
        coordinates: JSON.stringify(coordinates),
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };

      if (existing) {
        logger.info(`   Updating existing room at ${this.getCoordinateKey(coordinates)}`);
        await this.config.api.updateEntity('rooms', existing.id.toString(), {
          ...roomToSave,
          visitCount: (existing.visitCount || 0) + 1
        });
      } else {
        logger.info(`   Creating new room: ${roomData.name}`);
        await this.config.api.saveEntity('rooms', roomToSave as any);
      }

      // Save exits
      await this.saveExitsForRoom(roomData, exitDirections, coordinates);

    } catch (error) {
      logger.error(`❌ Failed to save room ${roomData.name}:`, error);
    }
  }

  /**
   * Save exits for a room
   */
  private async saveExitsForRoom(roomData: any, exitDirections: string[], coordinates: Coordinates): Promise<void> {
    try {
      // Get the room ID
      const allRooms = await this.config.api.getAllEntities('rooms');
      const room = allRooms.find((r: any) => {
        if (!r.coordinates) return false;
        try {
          const coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates;
          return coords.x === coordinates.x && coords.y === coordinates.y && coords.z === coordinates.z;
        } catch {
          return false;
        }
      });

      if (!room) return;

      for (const direction of exitDirections) {
        // Check if exit already exists
        const existingExits = await this.config.api.getAllEntities('room_exits', {
          from_room_id: room.id,
          direction: direction
        });

        if (existingExits.length > 0) continue;

        // Calculate target coordinates
        const toCoordinates = this.moveCoordinates(coordinates, direction);

        // Find target room if it exists
        const toRoom = allRooms.find((r: any) => {
          if (!r.coordinates || r.zone_id !== this.zoneId) return false;
          try {
            const coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates;
            return coords.x === toCoordinates.x && coords.y === toCoordinates.y && coords.z === toCoordinates.z;
          } catch {
            return false;
          }
        });

        const exitToSave: any = {
          from_room_id: room.id,
          to_room_id: toRoom?.id || null,
          direction: direction,
          description: `${direction} exit`,
          exit_description: `${direction} exit`,
          look_description: `You can go ${direction}.`,
          is_door: false,
          is_locked: false,
          is_zone_exit: false
        };

        await this.config.api.saveEntity('room_exits', exitToSave);
      }

    } catch (error) {
      logger.error(`❌ Failed to save exits for room ${roomData.name}:`, error);
    }
  }

  /**
   * Get exploration statistics
   */
  private getExplorationStats(): { totalRooms: number, mappedExits: number, unmappedExits: number } {
    let totalMapped = 0;
    let totalUnmapped = 0;

    for (const room of this.rooms.values()) {
      totalMapped += room.mappedExits.size;
      totalUnmapped += room.unmappedExits.size;
    }

    return {
      totalRooms: this.rooms.size,
      mappedExits: totalMapped,
      unmappedExits: totalUnmapped
    };
  }

  /**
   * Extract current zone from "who -z" output
   */
  private extractCurrentZone(response: string): string {
    const specificMatch = response.match(/\[Current Zone:\s*([^\]]+)\]/i);
    if (specificMatch) {
      return specificMatch[1].trim();
    }

    const patterns = [
      /You are in[:\s]+(.+?)[\r\n]/i,
      /Zone[:\s]+(.+?)[\r\n]/i,
      /\[([^\]]+)\]/,
      /Current zone[:\s]+(.+?)[\r\n]/i
    ];

    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Parse "exits" command output
   */
  private parseExitsOutput(output: string): Array<{ direction: string; description: string }> {
    const exits: Array<{ direction: string; description: string }> = [];
    const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      const match = line.match(/^([a-z]+)\s*-\s*(.+)$/i);
      if (match) {
        exits.push({
          direction: match[1].toLowerCase(),
          description: match[2].trim()
        });
      }
    }

    return exits;
  }

  /**
   * Convert coordinates to string key
   */
  private getCoordinateKey(coords: Coordinates): string {
    return `${coords.x},${coords.y},${coords.z}`;
  }

  /**
   * Calculate new coordinates after moving
   */
  private moveCoordinates(current: Coordinates, direction: string): Coordinates {
    const newCoords = { ...current };

    switch (direction.toLowerCase()) {
      case 'north': newCoords.y++; break;
      case 'south': newCoords.y--; break;
      case 'east': newCoords.x++; break;
      case 'west': newCoords.x--; break;
      case 'up': newCoords.z++; break;
      case 'down': newCoords.z--; break;
    }

    return newCoords;
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
      'in': 'out',
      'out': 'in',
      'enter': 'exit',
      'exit': 'enter'
    };

    return opposites[direction.toLowerCase()] || null;
  }

  /**
   * Filter unwanted MUD artifacts from output
   */
  private filterOutput(output: any): string {
    if (!output || typeof output !== 'string') {return '';}
    let filtered = output;

    filtered = filtered.replace(/\x1B\[[0-9;]*[mGKH]/g, '');
    filtered = filtered.replace(/<\s*\d+H\s+\d+M\s+\d+V[^>]*>/g, '');
    filtered = filtered.replace(/You are (hungry|thirsty)\./g, '');
    filtered = filtered.replace(/The sky (darkens|lightens)[^.]*\./g, '');
    filtered = filtered.replace(/\[.*?Return to continue.*?\]/g, '');
    filtered = filtered.replace(/\r/g, '');
    filtered = filtered.replace(/\n{3,}/g, '\n\n');
    filtered = filtered.trim();

    return filtered;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  async cleanup(): Promise<void> {
    logger.info('✓ Coordinate-based zone crawler cleanup complete');
    const stats = this.getExplorationStats();
    logger.info(`📊 Final stats: ${stats.totalRooms} rooms, ${stats.mappedExits} mapped exits, ${stats.unmappedExits} unmapped exits`);
  }
}