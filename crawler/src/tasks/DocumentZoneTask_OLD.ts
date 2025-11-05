import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';
import { RoomProcessor, RoomData, ExitData } from '../RoomProcessor';

interface Coordinates {
  x: number;
  y: number;
  z: number;
}

interface RoomLocation {
  name: string;
  coordinates: Coordinates;
  roomData: RoomData;
  roomId?: number; // Database ID after saving
  roomKey: string; // Unique identifier based on content
  explorationState: 'unvisited' | 'partially_explored' | 'fully_explored';
  knownExits: Set<string>; // All exits discovered from this room
  exploredExits: Set<string>; // Exits that have been traversed
  unexploredExits: Set<string>; // Exits that exist but haven't been explored
}

interface ZoneExitData extends ExitData {
  fromRoomName: string;
  fromCoordinates: Coordinates;
  toCoordinates?: Coordinates;
  is_zone_exit?: boolean;
}

/**
 * DocumentZoneTask - Map all rooms in a zone with coordinate-based identification
 * 
 * This task:
 * 1. Verifies character is in the target zone with "who -z"
 * 2. Explores all rooms in the zone systematically
 * 3. Uses room content (name + description) to uniquely identify rooms
 * 4. Saves each room immediately after processing
 * 5. Links rooms together properly with exits
 */
export class DocumentZoneTask implements CrawlerTask {
  name = 'Document Zone Rooms';
  description = 'Explore and document all rooms in a zone with coordinate tracking';

  private config: TaskConfig;
  private currentZone: string = '';
  private zoneId: number = 0;
  private rooms: Map<string, RoomLocation> = new Map(); // Key: room content hash
  private exitData: ZoneExitData[] = [];
  private visitedRooms: Set<string> = new Set(); // Set of room content hashes
  private exploredDirections: Map<string, Set<string>> = new Map(); // roomKey -> set of tried directions
  private explorationStack: Array<{ roomKey: string, directionTaken: string }> = []; // Path for backtracking
  private currentRoomName: string = '';
  private currentRoomDescription: string = '';
  private currentCoordinates: Coordinates = { x: 0, y: 0, z: 0 };
  private currentRoomKey: string = '';
  private actionsUsed: number = 0;
  private maxActions: number;
  private roomProcessor: RoomProcessor;
  private roomGraph: Map<string, Map<string, string>> = new Map(); // roomKey -> direction -> targetRoomKey

  constructor(config: TaskConfig) {
    this.config = config;
    this.maxActions = parseInt(process.env.MAX_ACTIONS_PER_SESSION || '1000');
    this.roomProcessor = new RoomProcessor(config);
  }

  async run(): Promise<void> {
    logger.info('🗺️  Starting zone documentation with coordinate tracking...');
    
    try {
      // Step 1: Determine current zone
      logger.info('Step 1: Determining current zone...');
      await this.delay(2000);
      const zoneInfo = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
      this.currentZone = this.extractCurrentZone(zoneInfo);
      
      if (!this.currentZone) {
        logger.error('❌ Could not determine current zone from "who -z" output');
        logger.info('Response was:', zoneInfo);
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

      // Step 2: Process and save initial room
      logger.info('Step 2: Processing initial room...');
      await this.delay(1000);
      
      const { roomData: initialRoomData, exitData: initialExitData } = await this.roomProcessor.processRoom();
      this.actionsUsed += this.roomProcessor.getActionsUsed();
      
      if (!initialRoomData.name) {
        logger.error('❌ Could not determine initial room name');
        return;
      }
      
      // Save initial room immediately with coordinates (0, 0, 0)
      await this.processAndSaveRoom(initialRoomData, initialExitData, this.currentCoordinates);
      
      // Step 3: Explore all reachable rooms
      logger.info(`Step 3: Beginning zone exploration (max ${this.maxActions} actions)...`);
      await this.exploreZone();

      // Summary
      logger.info('\n📊 Zone Documentation Summary:');
      logger.info(`   Zone: ${this.currentZone}`);
      logger.info(`   Rooms discovered: ${this.rooms.size}`);
      logger.info(`   Exits documented: ${this.exitData.length}`);
      logger.info(`   Actions used: ${this.actionsUsed}/${this.maxActions}`);
      
    } catch (error) {
      logger.error('❌ Error during zone documentation:', error);
      throw error;
    }
  }

  /**
   * Generate a unique key for a room based on its content
   */
  private getRoomKey(roomData: RoomData): string {
    const content = `${roomData.name}\n${roomData.description}`.toLowerCase().trim();
    // Simple hash function for content-based uniqueness
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Create a minimal RoomData object for key generation
   */
  private createMinimalRoomData(name: string, description: string): RoomData {
    return {
      name,
      description,
      exits: [],
      objects: new Map(),
      zone: this.currentZone || ''
    };
  }

  /**
   * Navigate to a specific room by its key (for backtracking)
   */
  private async navigateToRoom(targetRoomKey: string): Promise<void> {
    // For now, assume we're already at the right location due to backtracking
    // In a more sophisticated implementation, we could calculate a path back
    // This is a placeholder - the current backtracking logic should keep us in the right place
    logger.info(`   Navigation to room ${targetRoomKey} assumed to be handled by backtracking`);
  }

  /**
   * Update current room information after movement
   */
  private async updateCurrentRoomInfo(): Promise<void> {
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = this.roomProcessor['parseLookOutput'](lookResponse);
    this.currentRoomName = roomData.name;
    this.currentRoomDescription = roomData.description;
    this.currentRoomKey = this.getRoomKey(roomData);
  }

  /**
   * Find an unexplored direction from the current room
   */
  private findUnexploredDirection(exits: Array<{ direction: string; description: string }>, fromRoomKey: string): string | null {
    const triedDirections = this.exploredDirections.get(fromRoomKey) || new Set();

    // Try directions in preferred order
    const preferredOrder = ['north', 'east', 'south', 'west', 'up', 'down'];

    for (const direction of preferredOrder) {
      const exit = exits.find(e => e.direction.toLowerCase() === direction);
      if (exit && !triedDirections.has(direction)) {
        // Check if target room has been visited
        const targetRoomKey = this.getTargetRoomKey(fromRoomKey, direction);
        if (!targetRoomKey || !this.visitedRooms.has(targetRoomKey)) {
          return direction;
        }
      }
    }

    // If no preferred direction, try any unexplored direction
    for (const exit of exits) {
      if (!triedDirections.has(exit.direction.toLowerCase())) {
        const targetRoomKey = this.getTargetRoomKey(fromRoomKey, exit.direction);
        if (!targetRoomKey || !this.visitedRooms.has(targetRoomKey)) {
          return exit.direction;
        }
      }
    }

    return null; // No unexplored directions
  }

  /**
   * Get the room key for a target direction from a source room
   */
  private getTargetRoomKey(fromRoomKey: string, direction: string): string | null {
    const neighbors = this.roomGraph.get(fromRoomKey);
    if (neighbors) {
      for (const [dir, targetKey] of neighbors) {
        if (dir === direction) {
          return targetKey;
        }
      }
    }
    return null;
  }

  /**
   * Update exploration state for a room after trying a direction
   */
  private updateRoomExplorationState(roomKey: string, direction: string, success: boolean): void {
    const roomLocation = this.rooms.get(roomKey);
    if (!roomLocation) return;

    const dir = direction.toLowerCase();

    if (success) {
      // Successfully moved in this direction
      roomLocation.exploredExits.add(dir);
      roomLocation.unexploredExits.delete(dir);
    } else {
      // Direction was blocked or led to zone boundary
      roomLocation.exploredExits.add(dir);
      roomLocation.unexploredExits.delete(dir);
    }

    // Update exploration state
    if (roomLocation.unexploredExits.size === 0 && roomLocation.knownExits.size > 0) {
      roomLocation.explorationState = 'fully_explored';
    } else if (roomLocation.exploredExits.size > 0) {
      roomLocation.explorationState = 'partially_explored';
    }
  }

  /**
   * Find rooms with unexplored exits (prioritize these for efficient exploration)
   */
  private findRoomsWithUnexploredExits(): RoomLocation[] {
    const unexploredRooms: RoomLocation[] = [];

    for (const roomLocation of this.rooms.values()) {
      if (roomLocation.explorationState !== 'fully_explored' && roomLocation.unexploredExits.size > 0) {
        unexploredRooms.push(roomLocation);
      }
    }

    return unexploredRooms;
  }

  /**
   * Get exploration statistics for logging
   */
  private getExplorationStats(): { total: number, fullyExplored: number, partiallyExplored: number, unvisited: number, unexploredEndpoints: number } {
    let fullyExplored = 0;
    let partiallyExplored = 0;
    let unvisited = 0;
    let unexploredEndpoints = 0;

    for (const roomLocation of this.rooms.values()) {
      switch (roomLocation.explorationState) {
        case 'fully_explored':
          fullyExplored++;
          break;
        case 'partially_explored':
          partiallyExplored++;
          break;
        case 'unvisited':
          unvisited++;
          break;
      }

      if (roomLocation.unexploredExits.size > 0) {
        unexploredEndpoints++;
      }
    }

    return {
      total: this.rooms.size,
      fullyExplored,
      partiallyExplored,
      unvisited,
      unexploredEndpoints
    };
  }

  /**
   * Find the best room to explore next (prioritize rooms with unexplored exits)
   */
  private findBestRoomToExplore(): RoomLocation | null {
    const unexploredRooms = this.findRoomsWithUnexploredExits();

    if (unexploredRooms.length === 0) {
      // No rooms with unexplored exits, find any unvisited room
      for (const roomLocation of this.rooms.values()) {
        if (roomLocation.explorationState === 'unvisited') {
          return roomLocation;
        }
      }
      return null; // All rooms explored
    }

    // Prioritize rooms with unexplored exits, prefer closer ones
    // For now, return the first one (could be enhanced with distance calculation)
    return unexploredRooms[0];
  }

  /**
   * Compute path from one room to another using BFS
   */
  private computePath(fromRoomKey: string, toRoomKey: string): string[] | null {
    if (fromRoomKey === toRoomKey) return [];

    const queue: Array<{ roomKey: string, path: string[] }> = [{ roomKey: fromRoomKey, path: [] }];
    const visited = new Set<string>();
    visited.add(fromRoomKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.roomGraph.get(current.roomKey);
      if (neighbors) {
        for (const [dir, neighborKey] of neighbors) {
          if (!visited.has(neighborKey)) {
            visited.add(neighborKey);
            const newPath = [...current.path, dir];
            if (neighborKey === toRoomKey) {
              return newPath;
            }
            queue.push({ roomKey: neighborKey, path: newPath });
          }
        }
      }
    }
    return null;
  }

  /**
   * Process a room and save it immediately to the database
   */
  private async processAndSaveRoom(
    roomData: RoomData, 
    exitData: ExitData[], 
    coordinates: Coordinates
  ): Promise<void> {
    const roomKey = this.getRoomKey(roomData);
    
    // Check if we've already been to this room (same content)
    if (this.visitedRooms.has(roomKey)) {
      logger.info(`⏭️  Already visited room: ${roomData.name}`);
      return;
    }
    
    logger.info(`📍 Processing: ${roomData.name} at (${coordinates.x}, ${coordinates.y}, ${coordinates.z})`);
    
    // Cast 'bind portal minor' spell to get portal key
    const portalKey = await this.castBindPortalMinor();
    
    // Store room location
    const roomLocation: RoomLocation = {
      name: roomData.name,
      coordinates: { ...coordinates },
      roomData,
      roomKey,
      explorationState: 'partially_explored', // New rooms start as partially explored
      knownExits: new Set(exitData.map(e => e.direction.toLowerCase())),
      exploredExits: new Set(), // No exits explored yet from this room
      unexploredExits: new Set(exitData.map(e => e.direction.toLowerCase()))
    };
    this.rooms.set(roomKey, roomLocation);
    this.visitedRooms.add(roomKey);
    this.currentRoomName = roomData.name;
    this.currentCoordinates = { ...coordinates };
    this.currentRoomKey = roomKey;
    
    // Convert and store exit data with coordinates
    for (const exit of exitData) {
      const toCoordinates = this.moveCoordinates(coordinates, exit.direction);
      this.exitData.push({
        ...exit,
        fromRoomName: roomData.name,
        fromCoordinates: { ...coordinates },
        toCoordinates
      });

      // Build room graph for pathfinding (using room keys)
      if (!this.roomGraph.has(roomKey)) {
        this.roomGraph.set(roomKey, new Map());
      }
      // Note: We can't build the graph yet since we don't know target room keys
      // This will be updated when we actually move to connected rooms
    }
    
    // Save room and exits to database immediately
    await this.saveRoomToDatabase(roomData, coordinates, portalKey);
    await this.saveExitsForRoom(roomData, exitData, coordinates);
    
    // Update any exits from previously visited rooms that point to this room
    await this.updateIncomingExits(coordinates);
  }

  /**
   * Cast 'bind portal minor' spell to get portal key for current room
   */
  private async castBindPortalMinor(): Promise<string | null> {
    try {
      logger.info(`🔮 Casting 'bind portal minor' spell...`);
      
      // Use the long action delay for spell casting
      await this.delay(parseInt(process.env.DELAY_FOR_LONG_ACTIONS_MS || '1000'));
      
      const spellResponse = await this.config.mudClient.sendAndWait('cast \'bind portal minor\'', 
        parseInt(process.env.DELAY_FOR_LONG_ACTIONS_MS || '1000'));
      this.actionsUsed++;
      
      // Debug: Log the raw response to see what we're getting
      logger.info(`🔍 Spell response: ${JSON.stringify(spellResponse)}`);
      
      // Extract portal key from response (format: "'dehimpqr' briefly appears as a portal shimmers into view and then disappears.")
      // Make regex more flexible to handle newlines and extra characters
      const keyMatch = spellResponse.match(/'([a-z]{7})'\s+briefly appears as a portal shimmers into view and then disappears[\s\S]*/);
      if (keyMatch) {
        const portalKey = keyMatch[1];
        logger.info(`✅ Portal key obtained: ${portalKey}`);
        return portalKey;
      } else {
        logger.info(`⚠️  No portal key found in spell response (room may not allow portals)`);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Failed to cast bind portal minor:`, error);
      return null;
    }
  }

  /**
   * Save a single room to the database
   */
  private async saveRoomToDatabase(roomData: RoomData, coordinates: Coordinates, portalKey: string | null = null): Promise<void> {
    try {
      logger.info(`💾 Saving room: ${roomData.name} at (${coordinates.x}, ${coordinates.y}, ${coordinates.z})`);
      
      // Check if room exists at these coordinates
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
        rawText: `${roomData.name}\n${roomData.description}`,
        zone_id: this.zoneId,
        coordinates: JSON.stringify(coordinates),
        portal_key: portalKey,
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };
      
      if (existing) {
        logger.info(`   Updating existing room at (${coordinates.x}, ${coordinates.y}, ${coordinates.z})`);
        await this.config.api.updateEntity('rooms', existing.id.toString(), {
          ...roomToSave,
          visitCount: (existing.visitCount || 0) + 1
        });
        
        // Store the room ID
        const coordKey = this.getCoordinateKey(coordinates);
        const roomLocation = this.rooms.get(coordKey);
        if (roomLocation) {
          roomLocation.roomId = existing.id;
        }
      } else {
        logger.info(`   Creating new room: ${roomData.name}`);
        await this.config.api.saveEntity('rooms', {
          ...roomToSave,
          firstVisited: new Date().toISOString()
        } as any);
      }
      
      logger.info(`✓ Room saved: ${roomData.name}`);
    } catch (error) {
      logger.error(`❌ Failed to save room ${roomData.name}:`, error);
    }
  }

  /**
   * Save exits for a room to the database
   */
  private async saveExitsForRoom(roomData: RoomData, exitData: ExitData[], coordinates: Coordinates): Promise<void> {
    try {
      // Get the room ID by coordinates
      const allRooms = await this.config.api.getAllEntities('rooms');
      const fromRoom = allRooms.find((r: any) => {
        if (!r.coordinates) return false;
        try {
          const coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates;
          return coords.x === coordinates.x && coords.y === coordinates.y && coords.z === coordinates.z;
        } catch {
          return false;
        }
      });

      if (!fromRoom) {
        logger.warn(`⚠️  Could not find room to save exits for: ${roomData.name}`);
        return;
      }

      // Save each exit
      for (const exit of exitData) {
        try {
          // Calculate target coordinates
          const toCoordinates = this.moveCoordinates(coordinates, exit.direction);
          
          // Try to find destination room by coordinates
          const toRoom = allRooms.find((r: any) => {
            if (!r.coordinates) return false;
            try {
              const coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates;
              return coords.x === toCoordinates.x && coords.y === toCoordinates.y && coords.z === toCoordinates.z;
            } catch {
              return false;
            }
          });

          // Check if exit already exists
          const existingExits = await this.config.api.getAllEntities('room_exits', {
            from_room_id: fromRoom.id,
            direction: exit.direction
          });

          if (existingExits.length > 0) {
            logger.info(`   Exit ${exit.direction} from ${roomData.name} already exists, skipping`);
            continue;
          }

          // Prepare exit data
          const exitToSave: any = {
            from_room_id: fromRoom.id,
            to_room_id: toRoom?.id || null,
            direction: exit.direction,
            description: exit.description || null,
            exit_description: exit.description || null,
            look_description: exit.look_description || null,
            door_name: exit.door_name || null,
            door_description: exit.door_description || null,
            is_door: exit.is_door || false,
            is_locked: exit.is_locked || false,
            is_zone_exit: false // Will be set when we detect zone boundaries
          };

          // Truncate door_name if needed
          if (exitToSave.door_name && exitToSave.door_name.length > 100) {
            exitToSave.door_name = exitToSave.door_name.substring(0, 100);
          }

          await this.config.api.saveEntity('room_exits', exitToSave);
          logger.info(`   ✓ Saved exit: ${exit.direction} -> ${toRoom ? toRoom.name : 'unknown'}`);
        } catch (error) {
          logger.error(`   ❌ Failed to save exit ${exit.direction}:`, error);
        }
      }
    } catch (error) {
      logger.error(`❌ Failed to save exits for room ${roomData.name}:`, error);
    }
  }

  /**
   * Update exits from other rooms that point to this room
   */
  private async updateIncomingExits(targetCoordinates: Coordinates): Promise<void> {
    try {
      logger.info(`🔍 Checking for incoming exits to (${targetCoordinates.x}, ${targetCoordinates.y}, ${targetCoordinates.z})...`);
      
      // Get all rooms
      const allRooms = await this.config.api.getAllEntities('rooms');
      
      // Find the target room (the room we just saved)
      const targetRoom = allRooms.find((r: any) => {
        if (!r.coordinates) return false;
        try {
          const coords = typeof r.coordinates === 'string' ? JSON.parse(r.coordinates) : r.coordinates;
          return coords.x === targetCoordinates.x && 
                 coords.y === targetCoordinates.y && 
                 coords.z === targetCoordinates.z;
        } catch {
          return false;
        }
      });

      if (!targetRoom) {
        logger.warn(`   ⚠️  Target room not found at coordinates`);
        return; // Target room not found, nothing to update
      }

      // Get all room exits
      const allExits = await this.config.api.getAllEntities('room_exits');
      const unlinkedExits = allExits.filter((e: any) => !e.to_room_id);
      logger.info(`   Found ${unlinkedExits.length} unlinked exits to check`);

      let updatedCount = 0;

      // Find exits that should point to this room based on coordinate calculation
      for (const exit of unlinkedExits) {
        // Find the source room
        const fromRoom = allRooms.find((r: any) => r.id === exit.from_room_id);
        if (!fromRoom || !fromRoom.coordinates) continue;

        try {
          const fromCoords = typeof fromRoom.coordinates === 'string' 
            ? JSON.parse(fromRoom.coordinates) 
            : fromRoom.coordinates;

          // Calculate where this exit should lead based on direction
          const expectedToCoords = this.moveCoordinates(fromCoords, exit.direction);

          // Check if it matches our target coordinates
          if (expectedToCoords.x === targetCoordinates.x && 
              expectedToCoords.y === targetCoordinates.y && 
              expectedToCoords.z === targetCoordinates.z) {
            
            // Update this exit to point to the target room
            await this.config.api.updateEntity('room_exits', exit.id.toString(), {
              to_room_id: targetRoom.id
            });
            
            updatedCount++;
            logger.info(`   🔗 Linked: ${fromRoom.name} --${exit.direction}--> ${targetRoom.name}`);
          }
        } catch (error) {
          // Skip this exit if coordinate parsing fails
          continue;
        }
      }
      
      if (updatedCount === 0) {
        logger.info(`   No incoming exits needed updating`);
      }
    } catch (error) {
      logger.error(`❌ Failed to update incoming exits:`, error);
    }
  }

  /**
   * Explore the zone using depth-first search with proper backtracking
   */
  private async exploreZone(): Promise<void> {
    // Initialize exploration stack with starting position
    const startRoomData = this.createMinimalRoomData(this.currentRoomName, this.currentRoomDescription);
    const startRoomKey = this.getRoomKey(startRoomData);
    this.explorationStack = [{ roomKey: startRoomKey, directionTaken: 'start' }];

    while (this.actionsUsed < this.maxActions && this.explorationStack.length > 0) {
      const currentStackItem = this.explorationStack[this.explorationStack.length - 1];
      const currentRoomKey = currentStackItem.roomKey;

      // Ensure we're at the correct location (in case of backtracking)
      const currentRoomData = this.createMinimalRoomData(this.currentRoomName, this.currentRoomDescription);
      const currentRoomKeyActual = this.getRoomKey(currentRoomData);
      if (currentRoomKeyActual !== currentRoomKey) {
        await this.navigateToRoom(currentRoomKey);
      }

      // Get current room's available exits
      await this.delay(this.config.delayBetweenActions);
      const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
      this.actionsUsed++;

      const currentExits = this.parseExitsOutput(exitsResponse);

      // Find an unexplored direction from this room
      const directionToTry = this.findUnexploredDirection(currentExits, currentRoomKey);

      if (!directionToTry) {
        // No unexplored directions from this room - try to jump to best unexplored room
        const bestRoom = this.findBestRoomToExplore();
        if (bestRoom) {
          logger.info(`   No local unexplored directions, jumping to room with unexplored exits: ${bestRoom.name}`);
          const path = this.computePath(currentRoomKey, bestRoom.roomKey);
          if (path && path.length > 0) {
            await this.navigatePath(path);
            // Now at target room, process it
            const { roomData: jumpedRoomData, exitData: jumpedExitData } = await this.roomProcessor.processRoom();
            this.actionsUsed += this.roomProcessor.getActionsUsed();
            if (!jumpedRoomData.name) {
              logger.warn('⚠️  Could not parse room after jump, backtracking...');
              // Go back along the path
              const reversePath = path.map(dir => this.getOppositeDirection(dir)!).reverse();
              await this.navigatePath(reversePath);
              // Reset current room info
              await this.updateCurrentRoomInfo();
            } else {
              const jumpedRoomKey = this.getRoomKey(jumpedRoomData);
              await this.processAndSaveRoom(jumpedRoomData, jumpedExitData, this.currentCoordinates);
              // Reset exploration stack to continue from here
              this.explorationStack = [{ roomKey: jumpedRoomKey, directionTaken: 'jump' }];
              continue;
            }
          } else {
            logger.info(`   No path to target room, backtracking...`);
          }
        } else {
          logger.info(`   No unexplored rooms found, backtracking...`);
        }

        // Backtrack
        this.explorationStack.pop();

        // If we have a previous room to backtrack to
        if (this.explorationStack.length > 0) {
          const previousItem = this.explorationStack[this.explorationStack.length - 1];
          const backDirection = this.getOppositeDirection(previousItem.directionTaken);

          if (backDirection) {
            logger.info(`   Backtracking ${backDirection}`);
            await this.delay(this.config.delayBetweenActions);
            await this.config.mudClient.sendAndWait(backDirection, this.config.delayBetweenActions);
            this.actionsUsed++;
            await this.updateCurrentRoomInfo();
          }
        }
        continue;
      }

      // Try the unexplored direction
      const exit = currentExits.find(e => e.direction.toLowerCase() === directionToTry.toLowerCase());
      if (!exit) continue;

      logger.info(`🧭 Moving ${directionToTry} to: ${exit.description}...`);
      await this.delay(this.config.delayBetweenActions);

      const moveResponse = await this.config.mudClient.sendAndWait(directionToTry, this.config.delayBetweenActions);
      this.actionsUsed++;

      // Mark this direction as explored from current room
      if (!this.exploredDirections.has(currentRoomKey)) {
        this.exploredDirections.set(currentRoomKey, new Set());
      }
      this.exploredDirections.get(currentRoomKey)!.add(directionToTry.toLowerCase());

      // Update room exploration state
      this.updateRoomExplorationState(currentRoomKey, directionToTry, false); // Initially mark as explored (will be updated if successful)

      // Check if move was blocked
      if (moveResponse.includes("Alas, you cannot go that way")) {
        logger.info(`   ❌ Direction ${directionToTry} blocked`);
        continue;
      }

      // Calculate new coordinates (keep for spatial reference)
      const newCoordinates = this.moveCoordinates(this.currentCoordinates, directionToTry);

      // Verify we're still in the same zone
      await this.delay(this.config.delayBetweenActions);
      const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
      this.actionsUsed++;

      const currentZone = this.extractCurrentZone(zoneCheck);

      if (currentZone !== this.currentZone) {
        logger.warn(`⚠️  Moved to different zone (${currentZone}), marking as zone exit and backtracking...`);

        // Mark as zone boundary
        this.exitData.push({
          direction: directionToTry,
          description: `Zone boundary to ${currentZone}`,
          fromRoomName: this.currentRoomName,
          fromCoordinates: { ...this.currentCoordinates },
          toCoordinates: newCoordinates,
          is_hidden: false,
          is_door: false,
          is_zone_exit: true
        });

        // Update exploration state for zone boundary
        this.updateRoomExplorationState(currentRoomKey, directionToTry, false);

        // Go back
        const oppositeDir = this.getOppositeDirection(directionToTry);
        if (oppositeDir) {
          await this.delay(this.config.delayBetweenActions);
          await this.config.mudClient.sendAndWait(oppositeDir, this.config.delayBetweenActions);
          this.actionsUsed++;
        }

        // Don't mark as visited since we didn't explore the other zone
        continue;
      }

      // Successfully moved to new room - process it
      const { roomData: newRoomData, exitData: newExitData } = await this.roomProcessor.processRoom();
      this.actionsUsed += this.roomProcessor.getActionsUsed();

      if (!newRoomData.name) {
        logger.warn('⚠️  Could not parse room name, going back...');
        const oppositeDir = this.getOppositeDirection(directionToTry);
        if (oppositeDir) {
          await this.delay(this.config.delayBetweenActions);
          await this.config.mudClient.sendAndWait(oppositeDir, this.config.delayBetweenActions);
          this.actionsUsed++;
        }
        continue;
      }

      // Process and save the new room
      const newRoomKey = this.getRoomKey(newRoomData);
      await this.processAndSaveRoom(newRoomData, newExitData, newCoordinates);

      // Update exploration state for successful move
      this.updateRoomExplorationState(currentRoomKey, directionToTry, true);

      // Add to exploration stack
      this.explorationStack.push({
        roomKey: newRoomKey,
        directionTaken: directionToTry
      });

      logger.info(`   Progress: ${this.rooms.size} rooms, ${this.actionsUsed}/${this.maxActions} actions`);
      
      // Log exploration statistics periodically
      if (this.actionsUsed % 50 === 0) {
        const stats = this.getExplorationStats();
        logger.info(`   📊 Exploration: ${stats.fullyExplored} fully explored, ${stats.partiallyExplored} partial, ${stats.unvisited} unvisited, ${stats.unexploredEndpoints} unexplored endpoints`);
      }
    }

    if (this.actionsUsed >= this.maxActions) {
      logger.warn(`⚠️  Reached max actions limit (${this.maxActions})`);
    }

    if (this.explorationStack.length === 0) {
      logger.info(`✅ Zone exploration complete - all reachable rooms visited`);
    }
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
   * Convert coordinates to a unique string key
   */
  private getCoordinateKey(coords: Coordinates): string {
    return `${coords.x},${coords.y},${coords.z}`;
  }

  /**
   * Calculate new coordinates after moving in a direction
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
      case 'northeast': newCoords.x++; newCoords.y++; break;
      case 'northwest': newCoords.x--; newCoords.y++; break;
      case 'southeast': newCoords.x++; newCoords.y--; break;
      case 'southwest': newCoords.x--; newCoords.y--; break;
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
      'northeast': 'southwest',
      'northwest': 'southeast',
      'southeast': 'northwest',
      'southwest': 'northeast',
      'in': 'out',
      'out': 'in',
      'enter': 'exit',
      'exit': 'enter'
    };
    
    return opposites[direction.toLowerCase()] || null;
  }

  /**
   * Navigate back to specific coordinates (used during backtracking)
   */
  private async navigateToCoordinates(targetCoords: Coordinates): Promise<void> {
    // For now, assume we're already at the right location due to backtracking
    // In a more sophisticated implementation, we could calculate a path back
    this.currentCoordinates = { ...targetCoords };
  }

  /**
   * Navigate along a path of directions
   */
  private async navigatePath(path: string[]): Promise<void> {
    for (const dir of path) {
      logger.info(`🧭 Navigating ${dir}...`);
      await this.delay(this.config.delayBetweenActions);
      const response = await this.config.mudClient.sendAndWait(dir, this.config.delayBetweenActions);
      this.actionsUsed++;
      if (response.includes("Alas, you cannot go that way")) {
        logger.error(`❌ Navigation blocked at ${dir}`);
        throw new Error(`Cannot navigate ${dir}`);
      }
      // Update current coordinates
      this.currentCoordinates = this.moveCoordinates(this.currentCoordinates, dir);
    }
  }

  /**
   * Filter out unwanted MUD artifacts from output
   */
  private filterOutput(output: string): string {
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

  async cleanup(): Promise<void> {
    logger.info('✓ Zone documentation task cleanup complete');
    logger.info(`📊 Final stats: ${this.rooms.size} rooms mapped with coordinates`);
  }
}
