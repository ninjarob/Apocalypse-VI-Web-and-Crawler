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
 * 3. Uses coordinates to identify rooms uniquely (handles duplicate names)
 * 4. Saves each room immediately after processing
 * 5. Links rooms together properly with exits
 */
export class DocumentZoneTask implements CrawlerTask {
  name = 'Document Zone Rooms';
  description = 'Explore and document all rooms in a zone with coordinate tracking';

  private config: TaskConfig;
  private currentZone: string = '';
  private zoneId: number = 0;
  private rooms: Map<string, RoomLocation> = new Map(); // Key: "x,y,z" coordinate string
  private exitData: ZoneExitData[] = [];
  private visitedCoordinates: Set<string> = new Set(); // Set of "x,y,z" strings
  private currentRoomName: string = '';
  private currentCoordinates: Coordinates = { x: 0, y: 0, z: 0 };
  private actionsUsed: number = 0;
  private maxActions: number;
  private roomProcessor: RoomProcessor;

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
      await this.delay(1000);
      const zoneInfo = await this.config.mudClient.sendAndWait('who -z', 2000);
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
   * Process a room and save it immediately to the database
   */
  private async processAndSaveRoom(
    roomData: RoomData, 
    exitData: ExitData[], 
    coordinates: Coordinates
  ): Promise<void> {
    const coordKey = this.getCoordinateKey(coordinates);
    
    // Check if we've already been here
    if (this.visitedCoordinates.has(coordKey)) {
      logger.info(`⏭️  Already visited room at (${coordinates.x}, ${coordinates.y}, ${coordinates.z})`);
      return;
    }
    
    logger.info(`📍 Processing: ${roomData.name} at (${coordinates.x}, ${coordinates.y}, ${coordinates.z})`);
    
    // Store room location
    const roomLocation: RoomLocation = {
      name: roomData.name,
      coordinates: { ...coordinates },
      roomData
    };
    this.rooms.set(coordKey, roomLocation);
    this.visitedCoordinates.add(coordKey);
    this.currentRoomName = roomData.name;
    this.currentCoordinates = { ...coordinates };
    
    // Convert and store exit data with coordinates
    for (const exit of exitData) {
      const toCoordinates = this.moveCoordinates(coordinates, exit.direction);
      this.exitData.push({
        ...exit,
        fromRoomName: roomData.name,
        fromCoordinates: { ...coordinates },
        toCoordinates
      });
    }
    
    // Save room and exits to database immediately
    await this.saveRoomToDatabase(roomData, coordinates);
    await this.saveExitsForRoom(roomData, exitData, coordinates);
    
    // Update any exits from previously visited rooms that point to this room
    await this.updateIncomingExits(coordinates);
  }

  /**
   * Save a single room to the database
   */
  private async saveRoomToDatabase(roomData: RoomData, coordinates: Coordinates): Promise<void> {
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
   * Explore the zone by visiting all rooms
   */
  private async exploreZone(): Promise<void> {
    const directionOrder = ['north', 'east', 'south', 'west', 'up', 'down'];

    while (this.actionsUsed < this.maxActions) {
      // Get current room's available exits
      await this.delay(250);
      const exitsResponse = await this.config.mudClient.sendAndWait('exits', 1000);
      this.actionsUsed++;

      const currentExits = this.parseExitsOutput(exitsResponse);
      
      // Find an unvisited direction (based on coordinates, not room names)
      let directionToTry: string | null = null;
      let targetDescription = '';

      // Try directions in our preferred order
      for (const preferredDir of directionOrder) {
        const exit = currentExits.find(e => e.direction.toLowerCase() === preferredDir);
        if (exit) {
          const targetCoords = this.moveCoordinates(this.currentCoordinates, exit.direction);
          const targetCoordKey = this.getCoordinateKey(targetCoords);
          
          if (!this.visitedCoordinates.has(targetCoordKey)) {
            directionToTry = exit.direction;
            targetDescription = exit.description;
            break;
          }
        }
      }

      // If no preferred direction leads to unvisited coordinates, try any unvisited direction
      if (!directionToTry) {
        for (const exit of currentExits) {
          const targetCoords = this.moveCoordinates(this.currentCoordinates, exit.direction);
          const targetCoordKey = this.getCoordinateKey(targetCoords);
          
          if (!this.visitedCoordinates.has(targetCoordKey)) {
            directionToTry = exit.direction;
            targetDescription = exit.description;
            break;
          }
        }
      }

      // If no unvisited directions available, we're done
      if (!directionToTry) {
        logger.info(`   All directions from (${this.currentCoordinates.x}, ${this.currentCoordinates.y}, ${this.currentCoordinates.z}) explored`);
        break;
      }

      logger.info(`🧭 Moving ${directionToTry} to: ${targetDescription}...`);
      await this.delay(1000);

      const moveResponse = await this.config.mudClient.sendAndWait(directionToTry, 2000);
      this.actionsUsed++;

      // Check if move was successful
      if (moveResponse.includes("Alas, you cannot go that way")) {
        logger.info(`   ❌ Direction ${directionToTry} blocked, marking as visited`);
        // Mark the target coordinates as visited even though we can't go there
        const targetCoords = this.moveCoordinates(this.currentCoordinates, directionToTry);
        this.visitedCoordinates.add(this.getCoordinateKey(targetCoords));
        continue;
      }

      // Calculate new coordinates
      const newCoordinates = this.moveCoordinates(this.currentCoordinates, directionToTry);

      // Verify we're still in the same zone
      await this.delay(250);
      const zoneCheck = await this.config.mudClient.sendAndWait('who -z', 2000);
      this.actionsUsed++;

      const currentZone = this.extractCurrentZone(zoneCheck);

      if (currentZone !== this.currentZone) {
        logger.warn(`⚠️  Moved to different zone (${currentZone}), going back...`);

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

        // Go back
        const oppositeDir = this.getOppositeDirection(directionToTry);
        if (oppositeDir) {
          await this.delay(1000);
          await this.config.mudClient.sendAndWait(oppositeDir, 2000);
          this.actionsUsed++;
        }
        
        // Mark the zone boundary coordinates as visited so we don't try again
        this.visitedCoordinates.add(this.getCoordinateKey(newCoordinates));
        continue;
      }

      // Process new room
      const { roomData: newRoomData, exitData: newExitData } = await this.roomProcessor.processRoom();
      this.actionsUsed += this.roomProcessor.getActionsUsed();

      if (!newRoomData.name) {
        logger.warn('⚠️  Could not parse room name, going back...');
        const oppositeDir = this.getOppositeDirection(directionToTry);
        if (oppositeDir) {
          await this.delay(1000);
          await this.config.mudClient.sendAndWait(oppositeDir, 2000);
          this.actionsUsed++;
        }
        continue;
      }

      // Process and save the new room
      await this.processAndSaveRoom(newRoomData, newExitData, newCoordinates);

      logger.info(`   Progress: ${this.rooms.size} rooms, ${this.actionsUsed}/${this.maxActions} actions`);
    }

    if (this.actionsUsed >= this.maxActions) {
      logger.warn(`⚠️  Reached max actions limit (${this.maxActions})`);
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
