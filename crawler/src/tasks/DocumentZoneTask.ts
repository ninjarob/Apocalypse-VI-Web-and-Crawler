import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';
import { RoomProcessor, RoomData, ExitData } from '../RoomProcessor';

interface ZoneExitData {
  direction: string;
  description: string;
  fromRoomName: string;
  door_name?: string;
  door_description?: string;
  is_door?: boolean;
  is_locked?: boolean;
  is_zone_exit?: boolean;
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
  private exitData: ZoneExitData[] = [];
  private roomsToVisit: string[] = [];
  private visitedRooms: Set<string> = new Set();
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

      // Step 2: Get initial room data
      logger.info('Step 2: Getting initial room data...');
      await this.delay(1000);
      
      // Use RoomProcessor to process the initial room
      const { roomData: initialRoomData, exitData: initialExitData } = await this.roomProcessor.processRoom();
      this.actionsUsed += this.roomProcessor.getActionsUsed();
      
      if (!initialRoomData.name) {
        logger.error('❌ Could not determine initial room name');
        return;
      }
      
      this.currentRoomName = initialRoomData.name;
      this.rooms.set(initialRoomData.name, initialRoomData);
      this.visitedRooms.add(initialRoomData.name);
      
      // Convert RoomProcessor ExitData to DocumentZoneTask ExitData format
      for (const exit of initialExitData) {
        this.exitData.push({
          ...exit,
          fromRoomName: initialRoomData.name
        });
      }
      
      // Add initial exits to visit queue
      for (const direction of initialRoomData.exits) {
        if (!this.roomsToVisit.includes(direction)) {
          this.roomsToVisit.push(direction);
        }
      }
      
      // Save initial data
      await this.saveDataIncrementally();
      
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
      // Still try to save any data we collected
      logger.info('🔄 Attempting to save collected data despite error...');
      try {
        await this.saveAllData();
        logger.info('✓ Data saved successfully despite error');
      } catch (saveError) {
        logger.error('❌ Failed to save data:', saveError);
      }
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
    // Check zone periodically to ensure we're still in the target zone (not every time to save actions)
    if (this.rooms.size % 5 === 0) {
      await this.delay(500);
      const zoneCheck = await this.config.mudClient.sendAndWait('who -z', 2000);
      this.actionsUsed++;
      
      const currentZone = this.extractCurrentZone(zoneCheck);
      
      if (currentZone !== this.currentZone) {
        logger.warn(`⚠️  Zone change detected in processCurrentRoom: moved to "${currentZone}" (expected "${this.currentZone}")`);
        // This shouldn't happen if we check before moving, but handle it gracefully
        return;
      }
    }

    // Use RoomProcessor to process the room
    const { roomData, exitData } = await this.roomProcessor.processRoom();
    
    if (!roomData.name) {
      logger.warn('⚠️  Could not parse room name from look output');
      return;
    }

    this.currentRoomName = roomData.name;
    
    // Check if we've already processed this room
    if (this.visitedRooms.has(roomData.name)) {
      logger.info(`⏭️  Skipping already visited room: ${roomData.name}`);
      return;
    }

    // Add to rooms map if not already there
    if (!this.rooms.has(roomData.name)) {
      this.rooms.set(roomData.name, roomData);
      logger.info(`📍 Discovered: ${roomData.name}`);
    }

    // Mark as visited
    this.visitedRooms.add(roomData.name);

    // Convert RoomProcessor ExitData to DocumentZoneTask ExitData format
    for (const exit of exitData) {
      this.exitData.push({
        ...exit,
        fromRoomName: roomData.name
      });
    }

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
      if (line.match(/<\s*\d+H\s+\d+M\s+\d+V.*>/)) {
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
      zone: ''
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
        
        // Document this as a zone boundary exit
        this.exitData.push({
          direction,
          description: `Zone boundary to ${currentZone}`,
          fromRoomName: this.currentRoomName,
          is_door: false,
          is_locked: false,
          is_zone_exit: true
        });
        
        // Try to go back
        const oppositeDir = this.getOppositeDirection(direction);
        if (oppositeDir) {
          await this.delay(1000);
          await this.config.mudClient.sendAndWait(oppositeDir, 2000);
          this.actionsUsed++;
        }
        continue;
      }

      // Process new room using RoomProcessor
      const { roomData: newRoomData, exitData: newExitData } = await this.roomProcessor.processRoom();
      this.actionsUsed += this.roomProcessor.getActionsUsed();
      
      // Check if we've been here before
      if (newRoomData.name && this.visitedRooms.has(newRoomData.name)) {
        logger.info(`⏭️  Room already visited: ${newRoomData.name}, going back...`);
        // Go back immediately
        const oppositeDir = this.getOppositeDirection(direction);
        if (oppositeDir) {
          await this.delay(1000);
          await this.config.mudClient.sendAndWait(oppositeDir, 2000);
          this.actionsUsed++;
        }
        continue;
      }
      
      // Process the new room data
      if (!newRoomData.name) {
        logger.warn('⚠️  Could not parse room name from look output');
        // Go back
        const oppositeDir = this.getOppositeDirection(direction);
        if (oppositeDir) {
          await this.delay(1000);
          await this.config.mudClient.sendAndWait(oppositeDir, 2000);
          this.actionsUsed++;
        }
        continue;
      }

      this.currentRoomName = newRoomData.name;
      
      // Add to rooms map if not already there
      if (!this.rooms.has(newRoomData.name)) {
        this.rooms.set(newRoomData.name, newRoomData);
        logger.info(`📍 Discovered: ${newRoomData.name}`);
      }

      // Mark as visited
      this.visitedRooms.add(newRoomData.name);

      // Convert RoomProcessor ExitData to DocumentZoneTask ExitData format
      for (const exit of newExitData) {
        this.exitData.push({
          ...exit,
          fromRoomName: newRoomData.name
        });
      }

      // Add unvisited exits to queue
      for (const exitDirection of newRoomData.exits) {
        if (!this.roomsToVisit.includes(exitDirection)) {
          this.roomsToVisit.push(exitDirection);
        }
      }

      logger.info(`   Progress: ${this.rooms.size} rooms, ${this.actionsUsed}/${this.maxActions} actions`);
      
      // Save data every 5 rooms to avoid losing progress
      if (this.rooms.size % 5 === 0) {
        await this.saveDataIncrementally();
      }
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
      'southwest': 'northeast',
      'in': 'out',
      'out': 'in',
      'enter': 'exit',
      'exit': 'enter',
      'leave': 'enter',
      'climb': 'climb', // Special case - might need context
      'jump': 'jump',   // Special case - might need context
      'crawl': 'crawl', // Special case - might need context
      'dive': 'surface', // Not perfect but reasonable
      'swim': 'swim',   // Special case
      'fly': 'land',    // Not perfect but reasonable
      'teleport': 'teleport', // Special case
      'portal': 'portal',     // Special case
      'gate': 'gate'          // Special case
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
      if (line.match(/<\s*\d+H\s+\d+M\s+\d+V.*>/)) {
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
   * Save data incrementally to avoid losing progress
   */
  private async saveDataIncrementally(): Promise<void> {
    if (this.rooms.size === 0) return; // Nothing to save yet

    logger.info(`💾 Saving incremental data (${this.rooms.size} rooms, ${this.exitData.length} exits)...`);
    try {
      await this.saveAllData();
      logger.info('✓ Incremental save completed');
    } catch (error) {
      logger.error('❌ Incremental save failed:', error);
    }
  }
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
          is_locked: exitData.is_locked || false,
          is_zone_exit: exitData.is_zone_exit || false
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
