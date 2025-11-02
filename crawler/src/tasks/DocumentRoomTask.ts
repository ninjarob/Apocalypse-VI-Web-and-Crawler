import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';
import { RoomProcessor, RoomData, ExitData } from '../RoomProcessor';
import { Room } from '../../../shared/types';

export class DocumentRoomTask implements CrawlerTask {
  name = 'Document Current Room';
  description = 'Thoroughly document the current room and its features';

  private config: TaskConfig;
  private roomProcessor: RoomProcessor;

  constructor(config: TaskConfig) {
    this.config = config;
    this.roomProcessor = new RoomProcessor(config);
  }

  async run(): Promise<void> {
    logger.info('🏠 Starting current room documentation...');

    try {
      // Process the current room using RoomProcessor
      const { roomData, exitData } = await this.roomProcessor.processRoom();
      
      logger.info(`📍 Current room: ${roomData.name}`);

      // Step 7: Save to database
      logger.info('Step 7: Saving to database...');

      try {
        // Get or create zone
        let zoneId = 2; // Default to Midgaard zone
        try {
          const zones = await this.config.api.getAllEntities('zones');
          const zone = zones.find((z: any) => z.name.includes(roomData.zone) || roomData.zone.includes(z.name));
          if (zone) {
            zoneId = zone.id;
          } else {
            // Create new zone
            await this.config.api.saveEntity('zones', {
              name: roomData.zone,
              description: `Zone discovered during room documentation: ${roomData.zone}`,
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

        // Check if room already exists
        const existingRoom = await this.config.api.getRoomByName(roomData.name);

        let savedRoom: Room;
        if (existingRoom) {
          // Update existing room with latest data
          logger.info(`📝 Updating existing room: ${roomData.name}`);

          // Merge existing data with new findings
          const updatedRoomData = {
            description: roomData.description,
            zone_id: zoneId,
            visitCount: (existingRoom.visitCount || 0) + 1,
            lastVisited: new Date(),
            rawText: `${roomData.name}\n${roomData.description}`,
            terrain: await this.inferTerrain(roomData.description)
          };

          // Use generic update method since saveRoom only creates
          await this.config.api.updateEntity('rooms', existingRoom.id.toString(), updatedRoomData);
          savedRoom = { ...existingRoom, ...updatedRoomData };
          logger.info(`✓ Updated room: ${roomData.name} (visit #${savedRoom.visitCount})`);
        } else {
          // Create new room
          const roomDataToSave = {
            name: roomData.name,
            zone_id: zoneId,
            description: roomData.description,
            exits: roomData.exits.map(dir => ({ direction: dir })),
            npcs: [],
            items: [],
            visitCount: 1,
            firstVisited: new Date(),
            lastVisited: new Date(),
            rawText: `${roomData.name}\n${roomData.description}`,
            terrain: await this.inferTerrain(roomData.description)
          };

          const createdRoom = await this.config.api.saveRoom(roomDataToSave);
          if (!createdRoom) {
            logger.error('❌ Failed to save room - no data returned');
            throw new Error('Failed to save room');
          }
          savedRoom = createdRoom;
          logger.info(`✓ Created new room: ${roomData.name}`);
        }

        // Save room objects
        for (const [objectName, description] of roomData.objects) {
          try {
            await this.config.api.saveEntity('room_objects', {
              room_id: savedRoom.id,
              name: objectName,
              description: description,
              is_interactive: false
            });
          } catch (error) {
            logger.warn(`Failed to save object ${objectName}:`, error);
          }
        }

        // Save exits
        for (const exit of exitData) {
          try {
            // Try to find to_room
            const toRoom = await this.config.api.getRoomByName(exit.description);

            // Check if exit already exists
            const existingExits = await this.config.api.getAllEntities('room_exits', {
              from_room_id: savedRoom.id,
              direction: exit.direction
            });
            const existingExit = existingExits[0];

            logger.info(`   Debug: Looking for exit from_room_id=${savedRoom.id}, direction=${exit.direction}`);
            logger.info(`   Debug: Found ${existingExits.length} existing exits`);
            if (existingExit) {
              logger.info(`   Debug: Existing exit id=${existingExit.id}`);
            } else {
              logger.info(`   Debug: No existing exit found`);
            }

            if (existingExit) {
              // Update existing exit with latest data
              logger.info(`   📝 Updating existing exit: ${exit.direction}`);
              await this.config.api.updateEntity('room_exits', existingExit.id.toString(), {
                from_room_id: savedRoom.id,
                to_room_id: toRoom?.id || null,
                direction: exit.direction,
                exit_description: exit.description,
                door_name: exit.door_name || null,
                door_description: exit.door_description || null,
                is_door: exit.is_door || false,
                is_locked: exit.is_locked || false
              });
            } else {
              // Create new exit
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
            }
          } catch (error) {
            logger.warn(`Failed to save exit ${exit.direction}:`, error);
          }
        }

        logger.info(`✓ Saved ${roomData.objects.size} objects and ${exitData.length} exits`);

      } catch (error) {
        logger.error('❌ Failed to save room data:', error);
        throw error;
      }

      // Step 8: Summary
      logger.info('\n📊 Room Documentation Summary:');
      logger.info(`   Room: ${roomData.name}`);
      logger.info(`   Zone: ${roomData.zone}`);
      logger.info(`   Visible Exits: ${exitData.filter(e => !e.is_hidden).length}`);
      logger.info(`   Hidden Exits Found: ${exitData.filter(e => e.is_hidden).length}`);
      logger.info(`   Objects Examined: ${roomData.objects.size}`);
      logger.info(`   Actions Used: ${this.roomProcessor.getActionsUsed()}`);

    } catch (error) {
      logger.error('❌ Error during room documentation:', error);
      throw error;
    }
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
      let zoneName = match[1].trim();
      // Clean up "Current Zone:" prefix if present
      zoneName = zoneName.replace(/^Current Zone:\s*/i, '');
      return zoneName;
    }
  }    return 'Unknown Zone';
  }

  /**
   * Check if movement was completely blocked (cannot go that way)
   */
  private isMovementBlocked(response: string): boolean {
    const blockedPatterns = [
      /cannot go that way/i,
      /can't go that way/i,
      /you can't go that way/i,
      /you cannot go that way/i,
      /there is no way/i,
      /you are already/i
    ];

    return blockedPatterns.some(pattern => response.match(pattern));
  }























  /**
   * Infer terrain type from room description using AI
   */
  private async inferTerrain(description: string): Promise<string> {
    const prompt = `You are analyzing a room description from a MUD (text-based RPG) game. Your task is to determine the most appropriate terrain type for this location.

Room Description:
${description}

Available terrain types:
- city: Urban areas, towns, villages, streets, squares, populated settlements
- inside: Interior of buildings, houses, shops, temples, inns, caves, dungeons
- road: Roads, streets, paths, trails (outdoor travel routes)
- forest: Forests, woods, jungles, wooded areas
- mountain: Mountains, hills, peaks, rocky terrain
- desert: Deserts, sandy areas, arid landscapes
- water: Rivers, lakes, seas, oceans, beaches, waterfront
- field: Open plains, grasslands, meadows, farmlands, wilderness

CRITICAL: Return ONLY ONE WORD from the list above. No explanations, no quotes, no punctuation. Just the single terrain type word.

Example response: forest

Terrain type:`;

    try {
      const analysisText = await this.config.aiAgent.analyzeWithAI(prompt, 50);
      const terrain = analysisText.trim().toLowerCase();

      // Extract just the terrain type from the response (handle verbose responses)
      const validTerrains = ['city', 'inside', 'road', 'forest', 'mountain', 'desert', 'water', 'field'];
      let detectedTerrain = '';

      // First try exact match
      if (validTerrains.includes(terrain)) {
        detectedTerrain = terrain;
      } else {
        // Try to extract from quotes or find the first valid terrain word
        for (const validType of validTerrains) {
          if (terrain.includes(`"${validType}"`) || terrain.includes(`'${validType}'`) || terrain.includes(validType)) {
            detectedTerrain = validType;
            break;
          }
        }
      }

      if (detectedTerrain) {
        logger.info(`   AI determined terrain: ${detectedTerrain}`);
        return detectedTerrain;
      } else {
        logger.warn(`AI returned invalid terrain response: "${terrain}", falling back to keyword matching`);
        return this.inferTerrainWithKeywords(description);
      }
    } catch (error) {
      logger.warn('AI terrain analysis failed, falling back to keyword matching:', error);
      return this.inferTerrainWithKeywords(description);
    }
  }

  /**
   * Fallback method using keyword matching if AI is unavailable
   */
  private inferTerrainWithKeywords(description: string): string {
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