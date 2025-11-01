import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';

interface RoomData {
  name: string;
  description: string;
  exits: string[];
  objects: Map<string, string>; // object name -> description
  zone: string;
}

interface ExitData {
  direction: string;
  description: string;
  is_hidden: boolean;
  is_door: boolean;
  door_name?: string;
  door_description?: string;
  is_locked?: boolean;
}

/**
 * DocumentRoomTask - Thoroughly document the current room
 *
 * This task:
 * 1. Looks at the current room
 * 2. Checks visible exits with "exits" command
 * 3. Extracts interesting words from description for "look" commands
 * 4. Checks non-visible exits by trying directions not in exits list
 * 5. Examines obvious room objects
 * 6. Associates room with zone via "who -z"
 * 7. Persists everything to database
 * 8. Disconnects
 */
export class DocumentRoomTask implements CrawlerTask {
  name = 'Document Current Room';
  description = 'Thoroughly document the current room and its features';

  private config: TaskConfig;
  private roomData: RoomData | null = null;
  private exitData: ExitData[] = [];
  private actionsUsed: number = 0;

  constructor(config: TaskConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    logger.info('🏠 Starting current room documentation...');

    try {
      // Step 1: Look at current room
      logger.info('Step 1: Examining current room...');
      await this.delay(1000);
      const lookResponse = await this.config.mudClient.sendAndWait('look', 2000);
      this.actionsUsed++;

      this.roomData = this.parseLookOutput(lookResponse);
      logger.info(`📍 Current room: ${this.roomData.name}`);

      // Step 2: Check visible exits
      logger.info('Step 2: Checking visible exits...');
      await this.delay(500);
      const exitsResponse = await this.config.mudClient.sendAndWait('exits', 2000);
      this.actionsUsed++;

      const visibleExits = this.parseExitsOutput(exitsResponse);
      for (const exit of visibleExits) {
        this.exitData.push({
          ...exit,
          is_hidden: false,
          is_door: false
        });
      }
      logger.info(`   Found ${visibleExits.length} visible exits`);

      // Step 3: Extract and examine interesting words from description
      logger.info('Step 3: Examining description keywords...');
      await this.examineDescriptionKeywords();

      // Step 4: Check non-visible exits
      logger.info('Step 4: Checking for hidden exits...');
      await this.checkHiddenExits(visibleExits);

      // Step 5: Examine room objects
      logger.info('Step 5: Examining room objects...');
      await this.examineRoomObjects();

      // Step 6: Associate with zone
      logger.info('Step 6: Associating with zone...');
      await this.delay(500);
      const zoneResponse = await this.config.mudClient.sendAndWait('who -z', 2000);
      this.actionsUsed++;

      this.roomData.zone = this.extractCurrentZone(zoneResponse);
      logger.info(`   Zone: ${this.roomData.zone}`);

      // Step 7: Save to database
      logger.info('Step 7: Saving to database...');
      await this.saveRoomData();

      // Step 8: Summary
      logger.info('\n📊 Room Documentation Summary:');
      logger.info(`   Room: ${this.roomData.name}`);
      logger.info(`   Zone: ${this.roomData.zone}`);
      logger.info(`   Visible Exits: ${visibleExits.length}`);
      logger.info(`   Hidden Exits Found: ${this.exitData.filter(e => e.is_hidden).length}`);
      logger.info(`   Objects Examined: ${this.roomData.objects.size}`);
      logger.info(`   Actions Used: ${this.actionsUsed}`);

    } catch (error) {
      logger.error('❌ Error during room documentation:', error);
      throw error;
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
   * Extract interesting keywords from room description for examination using AI
   */
  private async examineDescriptionKeywords(): Promise<void> {
    if (!this.roomData) return;

    // Use AI to identify significant objects worth examining
    const aiKeywords = await this.extractKeywordsWithAI(this.roomData.description);

    for (const keyword of aiKeywords) {
      logger.info(`   Examining AI-suggested object: ${keyword}`);
      await this.delay(500);

      const examineResponse = await this.config.mudClient.sendAndWait(`look ${keyword}`, 2000);
      this.actionsUsed++;

      // If we get a useful response, store it
      if (examineResponse && examineResponse.length > 50 && !examineResponse.match(/You don't see/i)) {
        const cleanDesc = this.filterOutput(examineResponse);
        this.roomData.objects.set(keyword, cleanDesc);
        logger.info(`   ✓ Found description for: ${keyword}`);
      }
    }
  }

  /**
   * Use AI to identify significant objects in room description worth examining
   */
  private async extractKeywordsWithAI(description: string): Promise<string[]> {
    const prompt = `You are analyzing a room description from a MUD (text-based RPG) game. Your task is to identify 2-3 objects or features in this room that would be most interesting or useful to examine with a "look" command.

Room Description:
${description}

Instructions:
- Focus on tangible objects, architectural features, or interactive elements
- Prioritize items that might contain information, be valuable, or have special properties
- Avoid generic words like "room", "area", "place", "ground", "wall", "floor", "ceiling"
- Return only single words or short phrases (1-3 words max)
- If there are no interesting objects, return an empty list
- Be selective - only the most significant items

Return your answer as a simple comma-separated list of 2-3 items maximum. Example: "fountain, altar, sign"

Items:`;

    try {
      const response = await this.config.aiAgent.extractKeywords(description, 3);

      logger.info(`   AI identified ${response.length} objects to examine: ${response.join(', ')}`);
      return response;

    } catch (error) {
      logger.warn('AI keyword extraction failed, falling back to basic patterns:', error);
      // Fallback to basic pattern matching if AI fails
      return this.extractKeywordsWithPatterns(description);
    }
  }

  /**
   * Fallback method using pattern matching if AI is unavailable
   */
  private extractKeywordsWithPatterns(description: string): string[] {
    const keywords: string[] = [];

    // Basic patterns for common interesting objects
    const patterns = [
      /\b(fountain|altar|statue|sign|board|door|gate|portal|well|chest|throne|pedestal|pillar|column|arch|bridge)\b/gi
    ];

    for (const pattern of patterns) {
      const matches = description.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanMatch = match.toLowerCase();
          if (!keywords.includes(cleanMatch)) {
            keywords.push(cleanMatch);
          }
        }
      }
    }

    // Limit to first 3 keywords
    return keywords.slice(0, 3);
  }

  /**
   * Check for exits not listed in the "exits" command
   */
  private async checkHiddenExits(visibleExits: Array<{ direction: string; description: string }>): Promise<void> {
    if (!this.roomData) return;

    // Get list of known directions
    const knownDirections = new Set(visibleExits.map(exit => exit.direction.toLowerCase()));

    // Common directions to check (only basic directions, no diagonals)
    const directionsToCheck = [
      'north', 'south', 'east', 'west', 'up', 'down',
      'out', 'enter'
    ];

    for (const direction of directionsToCheck) {
      if (knownDirections.has(direction)) {
        continue; // Already known
      }

      logger.info(`   Checking hidden exit: ${direction}`);
      await this.delay(500);

      const moveResponse = await this.config.mudClient.sendAndWait(direction, 2000);
      this.actionsUsed++;

      // Check if response indicates a door or valid exit
      const doorInfo = this.parseDoorResponse(moveResponse);
      const roomChange = this.detectRoomChange(moveResponse);

      if (doorInfo.isDoor) {
        logger.info(`   🚪 Found hidden door: ${doorInfo.doorName} (${direction})`);

        // Try to open the door first to determine if it's locked
        let isLocked = false;
        await this.delay(500);
        const openResponse = await this.config.mudClient.sendAndWait(`open ${doorInfo.doorName}`, 2000);
        this.actionsUsed++;

        if (openResponse.match(/(?:opens?|unlocks?|clicks?)/i) && !openResponse.match(/(?:can't|cannot|won't|doesn't)/i)) {
          logger.info(`   🔓 Successfully opened door: ${doorInfo.doorName}`);
          isLocked = false;
        } else if (openResponse.match(/(?:locked|key|permission)/i)) {
          logger.info(`   🔒 Door is locked: ${doorInfo.doorName}`);
          isLocked = true;
        } else {
          // Could be already open or some other state
          logger.info(`   ❓ Door state unclear: ${doorInfo.doorName}`);
          isLocked = doorInfo.isLocked || false; // Fall back to initial detection
        }

        // Get door description
        let doorDescription = '';
        if (doorInfo.doorName) {
          await this.delay(500);
          const lookResponse = await this.config.mudClient.sendAndWait(`look ${doorInfo.doorName}`, 2000);
          this.actionsUsed++;

          doorDescription = this.extractDoorDescription(lookResponse);
        }

        this.exitData.push({
          direction,
          description: doorInfo.doorName || `Hidden door to the ${direction}`,
          is_hidden: true,
          is_door: true,
          door_name: doorInfo.doorName,
          door_description: doorDescription,
          is_locked: isLocked
        });

      } else if (roomChange && roomChange.roomName) {
        logger.info(`   🗺️  Found hidden exit: ${direction} -> ${roomChange.roomName}`);

        this.exitData.push({
          direction,
          description: roomChange.roomName,
          is_hidden: true,
          is_door: false
        });
      }

      // Go back if we moved
      if (doorInfo.isDoor || roomChange) {
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
   * Examine obvious room objects
   */
  private async examineRoomObjects(): Promise<void> {
    if (!this.roomData) return;

    for (const [objectName, shortDesc] of this.roomData.objects) {
      // Skip if we already examined this during keyword extraction
      if (shortDesc.length > 100) continue; // Already have detailed description

      logger.info(`   Examining object: ${objectName}`);
      await this.delay(500);

      const examineResponse = await this.config.mudClient.sendAndWait(`look ${objectName}`, 2000);
      this.actionsUsed++;

      // Update description if we got more detail
      if (examineResponse && examineResponse.length > 50 && !examineResponse.match(/You don't see/i)) {
        const cleanDesc = this.filterOutput(examineResponse);
        this.roomData.objects.set(objectName, cleanDesc);
        logger.info(`   ✓ Detailed description for: ${objectName}`);
      }
    }
  }

  /**
   * Extract current zone from "who -z" output
   */
  private extractCurrentZone(response: string): string {
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

    return 'Unknown Zone';
  }

  /**
   * Parse response to detect if a door was encountered
   */
  private parseDoorResponse(response: string): { isDoor: boolean; doorName?: string; isLocked?: boolean } {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
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

    let descriptionLines: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/^<\s*\d+H\s+\d+M\s+\d+V/)) continue;
      if (line.match(/You (?:see|don't see|can't|cannot)/i)) continue;

      if (line.length > 10 && !line.match(/^\[/)) {
        descriptionLines.push(line);
      }
    }

    return descriptionLines.join(' ').trim();
  }

  /**
   * Detect if response indicates a room change
   */
  private detectRoomChange(response: string): { roomName?: string } | null {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // If the response contains common movement failure messages, it's not a room change
    const failurePatterns = [
      /cannot go that way/i,
      /can't go that way/i,
      /you can't go that way/i,
      /you cannot go that way/i,
      /seems to be closed/i,
      /you are already/i,
      /there is no way/i
    ];

    for (const p of failurePatterns) {
      if (response.match(p)) return null;
    }

    // Ignore lines that are clearly NPC/action messages (arrivals, departures, combat, etc.)
    const noisePatterns = [/arriv(es|ed)? from/i, /arriv(es|ed)?/i, /leav(es|ed)?/i, /enters? from/i, /comes? from/i, /is here/i, /You (?:are|feel)/i];

    for (const line of lines) {
      // skip status bar lines
      if (line.match(/^<\s*\d+H/)) continue;

      // skip lines that are clearly noise
      if (noisePatterns.some(p => line.match(p))) continue;

      // skip lines that look like door/gate descriptions or other non-room text
      if (line.match(/(?:door|gate|portal|hatch|closed|locked)/i)) continue;

      // Room names are usually Title Case and reasonably short. Be conservative.
      if (line.length >= 3 && line.length <= 120 && line.match(/^[A-Z0-9][A-Za-z0-9 \-:\'\.]+$/)) {
        // Also avoid lines that start with common pronouns/verbs
        if (line.match(/^(You|There|Someone|Nothing)\b/i)) continue;

        return { roomName: line };
      }
    }

    return null;
  }

  /**
   * Get opposite direction
   */
  private getOppositeDirection(direction: string): string | null {
    const opposites: Record<string, string> = {
      'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east',
      'up': 'down', 'down': 'up', 'in': 'out', 'out': 'in',
      'enter': 'exit', 'exit': 'enter'
    };
    return opposites[direction.toLowerCase()] || null;
  }

  /**
   * Filter unwanted MUD artifacts
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
    return filtered.trim();
  }

  /**
   * Save room data to database
   */
  private async saveRoomData(): Promise<void> {
    if (!this.roomData) return;

    try {
      // Get or create zone
      let zoneId = 2; // Default to Midgaard zone
      try {
        const zones = await this.config.api.getAllEntities('zones');
        const zone = zones.find((z: any) => z.name.includes(this.roomData!.zone) || this.roomData!.zone.includes(z.name));
        if (zone) {
          zoneId = zone.id;
        } else {
          // Create new zone
          await this.config.api.saveEntity('zones', {
            name: this.roomData.zone,
            description: `Zone discovered during room documentation: ${this.roomData.zone}`,
            author: 'Crawler',
            difficulty: 'Unknown',
            min_level: 1,
            max_level: 50,
            vnum_range_start: 0,
            vnum_range_end: 0,
            reset_time_minutes: 0
          });
          // For new zones, we'll use the default ID since saveEntity returns void
        }
      } catch (error) {
        logger.warn('Could not get/create zone, using default');
      }

      // Save room
      const roomData = {
        name: this.roomData.name,
        zone_id: zoneId,
        description: this.filterOutput(this.roomData.description),
        exits: this.roomData.exits.map(dir => ({ direction: dir })),
        npcs: [],
        items: [],
        visitCount: 1,
        firstVisited: new Date(),
        lastVisited: new Date(),
        rawText: `${this.roomData.name}\n${this.roomData.description}`,
        terrain: this.inferTerrain(this.roomData.description)
      };

      const savedRoom = await this.config.api.saveRoom(roomData);
      if (!savedRoom) {
        logger.error('❌ Failed to save room - no data returned');
        throw new Error('Failed to save room');
      }

      logger.info(`✓ Saved room: ${this.roomData.name}`);

      // Save room objects
      for (const [objectName, description] of this.roomData.objects) {
        try {
          await this.config.api.saveEntity('room_objects', {
            room_id: savedRoom.id,
            name: objectName,
            description: this.filterOutput(description),
            is_interactive: false
          });
        } catch (error) {
          logger.warn(`Failed to save object ${objectName}:`, error);
        }
      }

      // Save exits
      for (const exit of this.exitData) {
        try {
          // Try to find to_room
          const toRoom = await this.config.api.getRoomByName(exit.description);

          await this.config.api.saveEntity('room_exits', {
            from_room_id: savedRoom.id,
            to_room_id: toRoom?.id || null,
            direction: exit.direction,
            exit_description: exit.description,
            door_name: exit.door_name || null,
            door_description: exit.door_description || null,
            is_door: exit.is_door || false,
            is_locked: exit.is_locked || false
          });
        } catch (error) {
          logger.warn(`Failed to save exit ${exit.direction}:`, error);
        }
      }

      logger.info(`✓ Saved ${this.roomData.objects.size} objects and ${this.exitData.length} exits`);

    } catch (error) {
      logger.error('❌ Failed to save room data:', error);
      throw error;
    }
  }

  /**
   * Infer terrain type from room description
   */
  private inferTerrain(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('forest') || desc.includes('woods') || desc.includes('trees')) return 'forest';
    if (desc.includes('mountain') || desc.includes('mountains') || desc.includes('peak')) return 'mountain';
    if (desc.includes('desert') || desc.includes('sand') || desc.includes('dune')) return 'desert';
    if (desc.includes('water') || desc.includes('river') || desc.includes('lake') || desc.includes('sea')) return 'water';
    if (desc.includes('road') || desc.includes('street') || desc.includes('path')) return 'road';
    if (desc.includes('building') || desc.includes('house') || desc.includes('shop') || desc.includes('temple')) return 'inside';
    if (desc.includes('city') || desc.includes('town') || desc.includes('village')) return 'city';

    return 'field'; // Default
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('✓ Room documentation task cleanup complete');
  }
}