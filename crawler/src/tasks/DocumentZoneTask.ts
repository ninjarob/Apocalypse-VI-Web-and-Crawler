import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';

interface RoomData {
  name: string;
  description: string;
  exits: string[];
  objects: Map<string, string>; // object name -> description
  visited: boolean;
}

interface ExitData {
  direction: string;
  description: string;
  fromRoomName: string;
  door_name?: string;
  door_description?: string;
  is_door?: boolean;
  is_locked?: boolean;
}

/**
 * DocumentZoneTask - Map all rooms in a zone
 * 
 * This task:
 * 1. Verifies character is in the target zone with "who -z"
 * 2. Explores all rooms in the zone systematically
 * 3. Documents room name, description, objects, and exits
 * 4. Links rooms together properly
 * 5. Stores all data in the database
 */
export class DocumentZoneTask implements CrawlerTask {
  name = 'Document Zone Rooms';
  description = 'Explore and document all rooms in a zone';

  private config: TaskConfig;
  private currentZone: string = '';
  private rooms: Map<string, RoomData> = new Map();
  private exitData: ExitData[] = [];
  private roomsToVisit: string[] = [];
  private currentRoomName: string = '';
  private actionsUsed: number = 0;
  private maxActions: number;

  constructor(config: TaskConfig) {
    this.config = config;
    this.maxActions = parseInt(process.env.MAX_ACTIONS_PER_SESSION || '1000');
  }

  async run(): Promise<void> {
    logger.info('🗺️  Starting zone documentation...');
    
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

      // Step 2: Get initial room
      logger.info('Step 2: Getting initial room data...');
      await this.delay(1000);
      const lookResponse = await this.config.mudClient.sendAndWait('look', 2000);
      await this.processCurrentRoom(lookResponse);
      
      // Step 3: Explore all reachable rooms
      logger.info(`Step 3: Beginning zone exploration (max ${this.maxActions} actions)...`);
      await this.exploreZone();

      // Step 4: Save all data to database
      logger.info('Step 4: Saving room data to database...');
      await this.saveAllData();

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
   * Extract current zone from "who -z" output
   */
  private extractCurrentZone(response: string): string {
    // Look for patterns like:
    // "You are in: City of Midgaard"
    // "Zone: Temple of Midgaard"
    // "[City of Midgaard]"
    
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
   * Process current room from "look" output
   */
  private async processCurrentRoom(lookResponse: string): Promise<void> {
    const roomData = this.parseLookOutput(lookResponse);
    
    if (!roomData.name) {
      logger.warn('⚠️  Could not parse room name from look output');
      return;
    }

    this.currentRoomName = roomData.name;
    
    // Add to rooms map if not already there
    if (!this.rooms.has(roomData.name)) {
      this.rooms.set(roomData.name, {
        ...roomData,
        visited: true
      });
      logger.info(`📍 Discovered: ${roomData.name}`);
    } else {
      // Update visited status
      const existing = this.rooms.get(roomData.name)!;
      existing.visited = true;
    }

    // Get detailed exit info
    await this.delay(500);
    const exitsResponse = await this.config.mudClient.sendAndWait('exits', 2000);
    this.actionsUsed++;
    
    const exitDetails = this.parseExitsOutput(exitsResponse);
    for (const exit of exitDetails) {
      this.exitData.push({
        ...exit,
        fromRoomName: roomData.name
      });
    }

    // Examine room objects
    await this.examineRoomObjects(roomData);

    // Detect hidden doors
    await this.detectHiddenDoors(roomData, exitDetails);

    // Add unvisited exits to queue
    for (const direction of roomData.exits) {
      if (!this.roomsToVisit.includes(direction)) {
        this.roomsToVisit.push(direction);
      }
    }
  }

  /**
   * Parse "look" command output
   */
  private parseLookOutput(output: string): RoomData {
    const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let name = '';
    let description = '';
    let exits: string[] = [];
    let objects = new Map<string, string>();

    // First non-empty line is usually the room name
    if (lines.length > 0) {
      name = lines[0];
    }

    // Find description and exits
    let inDescription = false;
    let descriptionLines: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for exits line
      if (line.match(/\[EXITS?:/i)) {
        const exitMatch = line.match(/\[EXITS?:\s*([^\]]+)\]/i);
        if (exitMatch) {
          exits = exitMatch[1].split(/\s+/).filter(e => e && e.length > 0);
        }
        continue;
      }

      // Check for status line (skip)
      if (line.match(/^<\s*\d+H\s+\d+M\s+\d+V/)) {
        continue;
      }

      // Check for NPC/mob (skip for room objects)
      if (line.match(/^(A |An |The ).+(is here|stands here|sits here)/i)) {
        continue;
      }

      // Check for room objects (not mobs, not items on ground)
      if (line.length > 10 && !line.match(/^You see|^There is|^Someone has dropped/i)) {
        const objectName = this.extractObjectName(line);
        if (objectName) {
          objects.set(objectName, line);
        }
      }

      // Build description
      if (i > 0 && !line.match(/\[EXITS?:/i) && !line.match(/^<\s*\d+H/)) {
        descriptionLines.push(line);
      }
    }

    description = descriptionLines.join(' ').trim();

    return {
      name,
      description,
      exits,
      objects,
      visited: false
    };
  }

  /**
   * Extract object name from a room description line
   */
  private extractObjectName(line: string): string {
    // Look for patterns like:
    // "A large fountain sits in the center."
    // "An ancient altar rests here."
    // "A marble statue stands tall."
    
    const patterns = [
      /^(A|An|The)\s+([^.]+)/i,
      /^([A-Z][a-z]+\s+[a-z]+)/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[match.length - 1].trim();
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
      // Look for patterns like:
      // "north     - Grand Gates of the Temple"
      // "south     - Market Square"
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
   * Examine room objects to get their descriptions
   */
  private async examineRoomObjects(roomData: RoomData): Promise<void> {
    for (const [objectName, shortDesc] of roomData.objects) {
      // Try to look at the object
      await this.delay(500);
      const examineResponse = await this.config.mudClient.sendAndWait(`look ${objectName}`, 2000);
      this.actionsUsed++;

      // Update description if we got more detail
      if (examineResponse && examineResponse.length > 50 && !examineResponse.match(/You don't see/i)) {
        const cleanDesc = this.filterOutput(examineResponse);
        roomData.objects.set(objectName, cleanDesc);
      }

      if (this.actionsUsed >= this.maxActions) {
        logger.warn(`⚠️  Reached max actions (${this.maxActions}), stopping object examination`);
        break;
      }
    }
  }

  /**
   * Detect hidden doors by trying unlisted directions
   */
  private async detectHiddenDoors(roomData: RoomData, knownExits: Array<{ direction: string; description: string }>): Promise<void> {
    // Get list of known directions
    const knownDirections = new Set(knownExits.map(exit => exit.direction.toLowerCase()));
    
    // All possible directions to try
    const allDirections = [
      'north', 'south', 'east', 'west', 'up', 'down',
      'northeast', 'northwest', 'southeast', 'southwest'
    ];

    // Try directions not in known exits
    for (const direction of allDirections) {
      if (knownDirections.has(direction)) {
        continue; // Already known
      }

      if (this.actionsUsed >= this.maxActions) {
        logger.warn(`⚠️  Reached max actions (${this.maxActions}), stopping hidden door detection`);
        break;
      }

      logger.info(`🔍 Checking for hidden door: ${direction}`);
      await this.delay(500);
      
      const moveResponse = await this.config.mudClient.sendAndWait(direction, 2000);
      this.actionsUsed++;

      // Check if response indicates a door
      const doorInfo = this.parseDoorResponse(moveResponse);
      
      if (doorInfo.isDoor) {
        logger.info(`🚪 Found hidden door: ${doorInfo.doorName} (${direction})`);
        
        // Get door description
        let doorDescription = '';
        if (doorInfo.doorName) {
          await this.delay(500);
          const lookResponse = await this.config.mudClient.sendAndWait(`look ${doorInfo.doorName}`, 2000);
          this.actionsUsed++;
          
          doorDescription = this.extractDoorDescription(lookResponse);
          logger.info(`   Door description: ${doorDescription}`);
        }

        // Add to exit data
        this.exitData.push({
          direction,
          description: doorInfo.doorName || `Hidden door to the ${direction}`,
          fromRoomName: roomData.name,
          door_name: doorInfo.doorName,
          door_description: doorDescription,
          is_door: true,
          is_locked: doorInfo.isLocked
        });
      } else {
        // Not a door, but might be a valid exit we missed
        const roomChange = this.detectRoomChange(moveResponse);
        if (roomChange && roomChange.roomName) {
          logger.info(`🗺️  Found unlisted exit: ${direction} -> ${roomChange.roomName}`);
          
          this.exitData.push({
            direction,
            description: roomChange.roomName,
            fromRoomName: roomData.name,
            is_door: false,
            is_locked: false
          });
        }
      }

      // Go back if we moved
      if (doorInfo.isDoor || this.detectRoomChange(moveResponse)) {
        const oppositeDir = this.getOppositeDirection(direction);
        if (oppositeDir) {
          await this.delay(500);
          await this.config.mudClient.sendAndWait(oppositeDir, 2000);
          this.actionsUsed++;
        }
      }
    }
  }

  /**
   * Explore the zone by visiting all rooms
   */
  private async exploreZone(): Promise<void> {
    while (this.roomsToVisit.length > 0 && this.actionsUsed < this.maxActions) {
      const direction = this.roomsToVisit.shift()!;
      
      logger.info(`🧭 Moving ${direction}...`);
      await this.delay(1000);
      
      const moveResponse = await this.config.mudClient.sendAndWait(direction, 2000);
      this.actionsUsed++;

      // Verify we're still in the same zone
      await this.delay(500);
      const zoneCheck = await this.config.mudClient.sendAndWait('who -z', 2000);
      this.actionsUsed++;
      
      const currentZone = this.extractCurrentZone(zoneCheck);
      
      if (currentZone !== this.currentZone) {
        logger.warn(`⚠️  Moved to different zone (${currentZone}), going back...`);
        // Try to go back
        const oppositeDir = this.getOppositeDirection(direction);
        if (oppositeDir) {
          await this.delay(1000);
          await this.config.mudClient.sendAndWait(oppositeDir, 2000);
          this.actionsUsed++;
        }
        continue;
      }

      // Process new room
      await this.delay(500);
      const lookResponse = await this.config.mudClient.sendAndWait('look', 2000);
      this.actionsUsed++;
      
      await this.processCurrentRoom(lookResponse);

      logger.info(`   Progress: ${this.rooms.size} rooms, ${this.actionsUsed}/${this.maxActions} actions`);
    }

    if (this.actionsUsed >= this.maxActions) {
      logger.warn(`⚠️  Reached max actions limit (${this.maxActions})`);
    }
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
   * Parse response to detect if a door was encountered
   */
  private parseDoorResponse(response: string): { isDoor: boolean; doorName?: string; isLocked?: boolean } {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Look for door-related messages
    for (const line of lines) {
      // Common door patterns
      const doorPatterns = [
        /(?:You see|There is)\s+(?:a|an)\s+(.+?)\s+(?:door|gate|portal|entrance)/i,
        /(?:The|This)\s+(.+?)\s+(?:is|blocks|bars)\s+(?:the way|your path)/i,
        /(?:A|An|The)\s+(.+?)\s+(?:door|gate|portal)\s+(?:stands|is)/i
      ];

      for (const pattern of doorPatterns) {
        const match = line.match(pattern);
        if (match) {
          const doorName = match[1].trim();
          const isLocked = line.match(/(?:locked|closed|barred)/i) !== null;
          return { isDoor: true, doorName, isLocked };
        }
      }
    }

    return { isDoor: false };
  }

  /**
   * Extract door description from look response
   */
  private extractDoorDescription(response: string): string {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Skip the first line (usually the door name) and status lines
    let descriptionLines: string[] = [];
    let inDescription = false;
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip status lines
      if (line.match(/^<\s*\d+H\s+\d+M\s+\d+V/)) {
        continue;
      }
      
      // Skip common game messages
      if (line.match(/You (?:see|don't see|can't|cannot)/i)) {
        continue;
      }
      
      // Start collecting description
      if (line.length > 10 && !line.match(/^\[/) && !line.match(/^You/)) {
        descriptionLines.push(line);
        inDescription = true;
      } else if (inDescription && line.length < 5) {
        // Short line might be end of description
        break;
      }
    }
    
    return descriptionLines.join(' ').trim();
  }

  /**
   * Detect if response indicates a room change (successful move)
   */
  private detectRoomChange(response: string): { roomName?: string } | null {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Look for room name pattern (usually first line after movement)
    for (const line of lines) {
      // Skip movement messages
      if (line.match(/You (?:walk|move|go|travel|head)/i)) {
        continue;
      }
      
      // Skip door messages
      if (line.match(/(?:door|gate|portal)/i)) {
        continue;
      }
      
      // If line looks like a room name (capitalized, descriptive)
      if (line.length > 10 && line.match(/^[A-Z]/) && !line.match(/^<\s*\d+H/)) {
        return { roomName: line };
      }
    }
    
    return null;
  }

  /**
   * Filter out unwanted MUD artifacts from output
   */
  private filterOutput(output: string): string {
    let filtered = output;
    
    // Remove ANSI color codes
    filtered = filtered.replace(/\x1B\[[0-9;]*[mGKH]/g, '');
    
    // Remove status lines
    filtered = filtered.replace(/<\s*\d+H\s+\d+M\s+\d+V[^>]*>/g, '');
    
    // Remove common game messages
    filtered = filtered.replace(/You are (hungry|thirsty)\./g, '');
    filtered = filtered.replace(/The sky (darkens|lightens)[^.]*\./g, '');
    filtered = filtered.replace(/\[.*?Return to continue.*?\]/g, '');
    
    // Clean up whitespace
    filtered = filtered.replace(/\r/g, '');
    filtered = filtered.replace(/\n{3,}/g, '\n\n');
    filtered = filtered.trim();
    
    return filtered;
  }

  /**
   * Save all data to database
   */
  private async saveAllData(): Promise<void> {
    let roomsSaved = 0;
    let objectsSaved = 0;
    let exitsSaved = 0;

    // First pass: Save all rooms
    for (const [roomName, roomData] of this.rooms) {
      try {
        // Check if room exists
        const existing = await this.config.api.getRoomByName(roomName);
        
        if (existing) {
          logger.info(`   Updating existing room: ${roomName}`);
          // Room exists, we'll update it
        } else {
          // Create new room
          await this.config.api.saveRoom({
            name: roomData.name,
            description: this.filterOutput(roomData.description),
            exits: roomData.exits.map(dir => ({ direction: dir })),
            npcs: [],
            items: [],
            visitCount: 1,
            firstVisited: new Date(),
            lastVisited: new Date(),
            rawText: `${roomData.name}\n${roomData.description}`
          });
          roomsSaved++;
        }
      } catch (error) {
        logger.error(`   Failed to save room ${roomName}:`, error);
      }
    }

    // Second pass: Save room objects
    for (const [roomName, roomData] of this.rooms) {
      if (roomData.objects.size === 0) continue;

      try {
        // Get room ID
        const room = await this.config.api.getRoomByName(roomName);
        if (!room) continue;

        for (const [objectName, description] of roomData.objects) {
          await this.config.api.saveEntity('room_objects', {
            room_id: room.id,
            name: objectName,
            description: this.filterOutput(description),
            is_interactive: false
          });
          objectsSaved++;
        }
      } catch (error) {
        logger.error(`   Failed to save objects for room ${roomName}:`, error);
      }
    }

    // Third pass: Save exits
    for (const exitData of this.exitData) {
      try {
        // Get from_room
        const fromRoom = await this.config.api.getRoomByName(exitData.fromRoomName);
        if (!fromRoom) continue;

        // Try to find to_room (might not exist yet)
        const toRoomName = exitData.description;
        const toRoom = await this.config.api.getRoomByName(toRoomName);

        await this.config.api.saveEntity('room_exits', {
          from_room_id: fromRoom.id,
          to_room_id: toRoom?.id || null,
          direction: exitData.direction,
          exit_description: exitData.description,
          door_name: exitData.door_name || null,
          door_description: exitData.door_description || null,
          is_door: exitData.is_door || false,
          is_locked: exitData.is_locked || false
        });
        exitsSaved++;
      } catch (error) {
        logger.error(`   Failed to save exit ${exitData.direction} from ${exitData.fromRoomName}:`, error);
      }
    }

    logger.info(`✓ Saved ${roomsSaved} rooms, ${objectsSaved} objects, ${exitsSaved} exits`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('✓ Zone documentation task cleanup complete');
  }
}
