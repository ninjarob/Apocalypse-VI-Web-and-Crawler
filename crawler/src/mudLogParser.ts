import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

interface ParsedRoom {
  name: string;
  description: string;
  exits: string[];
  npcs: string[];
  items: string[];
  terrain?: string;
  flags?: string;
  zone_id?: number;
  portal_key?: string;
  zone_exit?: boolean;
}

interface ParsedExit {
  from_room_name: string;
  from_room_description: string;
  direction: string;
  to_room_name: string;
  look_description?: string;
  is_door?: boolean;
  door_name?: string;
  is_zone_exit?: boolean;
  portal_key?: string; // Portal key of destination room if known
}

interface ParserState {
  rooms: Map<string, ParsedRoom>;
  exits: ParsedExit[];
  currentRoom: ParsedRoom | null;
  currentRoomKey: string | null; // Track the key of the current room
  currentZoneName: string | null;
  defaultZoneName: string | null; // The zone we're exploring (from --zone-id)
  zoneMapping: Map<string, string>; // roomKey -> zoneName
  lastRoomBeforeZoneChange: ParsedRoom | null; // Track the room we left before zone changed
  recentZoneCheck: boolean; // True if we just did a who -z (clear after discovering a room)
  pendingPortalKey: string | null; // Portal key from last successful binding
}

export class MudLogParser {
  private state: ParserState;
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = 'http://localhost:3002/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.state = {
      rooms: new Map(),
      exits: [],
      currentRoom: null,
      currentRoomKey: null,
      currentZoneName: null,
      defaultZoneName: null,
      zoneMapping: new Map(),
      lastRoomBeforeZoneChange: null,
      recentZoneCheck: false,
      pendingPortalKey: null
    };
  }

  /**
   * Parse a MUD session log file
   */
  async parseLogFile(filePath: string): Promise<void> {
    console.log(`📖 Reading log file: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Split into lines for processing
    const lines = content.split('\n');
    
    let i = 0;
    let lastDirection = '';
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim()) {
        i++;
        continue;
      }
      
      // Strip HTML for text-based pattern matching
      const cleanLine = this.stripHtml(line).trim();
      
      // Detect portal binding results
      const portalKeyMatch = cleanLine.match(/'([a-z]{7,})' briefly appears as a portal shimmers into view/);
      if (portalKeyMatch) {
        this.state.pendingPortalKey = portalKeyMatch[1];
        console.log(`  🔑 Portal key: ${this.state.pendingPortalKey}`);
        i++;
        continue;
      }
      
      // Detect failed portal binding
      if (cleanLine.includes("Something prevents you from binding the portal") ||
          cleanLine.includes("Your magic fizzles out and dies")) {
        this.state.pendingPortalKey = null; // Clear any pending key
        i++;
        continue;
      }
      
      // Detect movement commands (single direction on its own line with cyan color or white)
      if (cleanLine.match(/^(n|s|e|w|u|d|north|south|east|west|up|down|northeast|northwest|southeast|southwest|ne|nw|se|sw)$/i)) {
        lastDirection = this.expandDirection(cleanLine);
        i++;
        continue;
      }
      
      // Detect room title - cyan colored text (#00FFFF)
      if (line.includes('color="#00FFFF"')) {
        const roomName = this.stripHtml(line).trim();
        
        // Skip invalid room names (empty, too short, prompts, or status lines)
        if (!roomName || 
            roomName.length < 2 || 
            roomName.match(/^</) ||
            roomName.match(/\d+H/) ||  // Status line with health
            roomName.match(/\d+X/)) {   // Status line with XP
          i++;
          continue;
        }
        
        // Collect description lines (white/gray colored text following the title)
        let description = '';
        let j = i + 1;
        let foundDescription = false;
        
        while (j < lines.length) {
          const descLine = lines[j];
          const cleanDesc = this.stripHtml(descLine).trim();
          
          // Stop at exits line (teal color #008080)
          if (descLine.includes('color="#008080"')) {
            break;
          }
          
          // Stop at prompts
          if (descLine.includes('&lt;') && descLine.includes('&gt;')) {
            break;
          }
          
          // Collect white/gray text that's part of description
          if (descLine.includes('color="#C0C0C0"') && cleanDesc) {
            // Skip commands and system messages
            if (!cleanDesc.match(/^(look|exits|cast|who|The last remnants|Lightning begins|arrives from|leaves|says|orates)/i)) {
              description += cleanDesc + ' ';
              foundDescription = true;
            }
          }
          
          j++;
          
          // Don't go too far
          if (j - i > 50) break;
        }
        
        description = description.trim();
        
        // Only process if we have a valid description
        if (!foundDescription || description.length < 10) {
          i++;
          continue;
        }
        
        // Look for exits line (teal color)
        let exits: string[] = [];
        
        for (let k = j; k < Math.min(j + 30, lines.length); k++) {
          const exitLine = this.stripHtml(lines[k]).trim();
          
          // Parse [EXITS: n e s w]
          const shortExitsMatch = exitLine.match(/^\[EXITS:\s*(.+?)\s*\]/i);
          if (shortExitsMatch) {
            const exitStr = shortExitsMatch[1];
            exits = exitStr.split(/\s+/).map(d => this.expandDirection(d));
            break;
          }
        }
        
        // Parse NPCs and items from colored text
        let npcs: string[] = [];
        let items: string[] = [];
        
        for (let k = i; k < Math.min(j + 20, lines.length); k++) {
          const entityLine = lines[k];
          const cleanEntity = this.stripHtml(entityLine).trim();
          
          // Items are green (#008000)
          if (entityLine.includes('color="#008000"') && cleanEntity) {
            items.push(cleanEntity);
          }
          
          // NPCs are white/gray, look for "is here" pattern
          if (entityLine.includes('color="#C0C0C0"') && cleanEntity.match(/is here|stands here|sitting here|sleeping here/i)) {
            npcs.push(cleanEntity);
          }
          
          // Stop at prompts
          if (entityLine.includes('&lt;') && entityLine.includes('&gt;')) {
            break;
          }
        }
        
        // Create room key - use portal key if available, fall back to name + description
        const roomKey = this.getRoomKey(roomName, description, this.state.pendingPortalKey);
        
        if (!this.state.rooms.has(roomKey)) {
          const room: ParsedRoom = {
            name: roomName,
            description,
            exits,
            npcs,
            items,
            zone_id: undefined,
            portal_key: this.state.pendingPortalKey || undefined
          };
          
          this.state.rooms.set(roomKey, room);
          
          // All newly discovered rooms default to the default zone
          // (they get reassigned by who -z if they're in a different zone)
          const keyType = this.state.pendingPortalKey ? 'portal key' : 'name+desc';
          console.log(`  📦 Room: ${roomName} (${exits.length} exits, ${npcs.length} NPCs, ${items.length} items) [${keyType}]`);
        } else {
          // Room already exists - update portal key if we got one
          const existingRoom = this.state.rooms.get(roomKey)!;
          if (this.state.pendingPortalKey && !existingRoom.portal_key) {
            existingRoom.portal_key = this.state.pendingPortalKey;
            console.log(`  � Updated portal key for existing room: ${roomName}`);
          }
        }
        
        // Clear the pending portal key after processing this room
        this.state.pendingPortalKey = null;
        
        // Record exit if we just moved here
        if (lastDirection && this.state.currentRoom) {
          const exit: ParsedExit = {
            from_room_name: this.state.currentRoom.name,
            from_room_description: this.state.currentRoom.description,
            direction: lastDirection,
            to_room_name: roomName,
            portal_key: this.state.pendingPortalKey || undefined // Associate portal key with exit if we just bound it
          };
          this.state.exits.push(exit);
          console.log(`    🚪 ${this.state.currentRoom.name} --[${lastDirection}]--> ${roomName}`);
        }
        
        this.state.currentRoom = this.state.rooms.get(roomKey)!;
        this.state.currentRoomKey = roomKey; // Track the room key
        lastDirection = '';
        
        i = j;
        continue;
      }
      
      i++;
    }
    
    console.log(`\n✅ Parsing complete!`);
    console.log(`   Rooms found: ${this.state.rooms.size}`);
    console.log(`   Exits found: ${this.state.exits.length}`);
  }
  
  /**
   * Expand short direction names to full names
   */
  private expandDirection(dir: string): string {
    const map: { [key: string]: string } = {
      'n': 'north', 's': 'south', 'e': 'east', 'w': 'west',
      'u': 'up', 'd': 'down',
      'ne': 'northeast', 'nw': 'northwest', 
      'se': 'southeast', 'sw': 'southwest'
    };
    return map[dir.toLowerCase()] || dir.toLowerCase();
  }
  
  /**
   * Strip HTML tags
   */
  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  }

  /**
   * Create a unique room key - prioritize portal key, fall back to name + description
   */
  private getRoomKey(name: string, description: string, portalKey?: string | null): string {
    if (portalKey) {
      return `portal:${portalKey}`;
    }
    return `namedesc:${name}|||${description}`;
  }

  /**
   * Resolve zone IDs from zone names and mark zone exits
   */
  async resolveZones(): Promise<void> {
    console.log('\n🔍 Resolving zone IDs...');
    
    try {
      const response = await axios.get(`${this.apiBaseUrl}/zones`);
      const zones = response.data;
      
      // Build zone name -> zone object mapping (case-insensitive, check both name and alias)
      const zoneNameMap = new Map<string, any>();
      for (const zone of zones) {
        zoneNameMap.set(zone.name.toLowerCase(), zone);
        if (zone.alias) {
          zoneNameMap.set(zone.alias.toLowerCase(), zone);
        }
      }
      
      console.log(`   Found ${zones.length} zones in database`);
      
      // First, find the default zone (the zone we're exploring)
      let defaultZoneId: number | undefined;
      if (this.state.defaultZoneName) {
        const defaultZone = zoneNameMap.get(this.state.defaultZoneName.toLowerCase());
        if (defaultZone) {
          defaultZoneId = defaultZone.id;
          console.log(`   Default zone: ${this.state.defaultZoneName} (ID: ${defaultZoneId})`);
        }
      }
      
      // Assign zone IDs to rooms:
      // - Rooms in zoneMapping are in a DIFFERENT zone (explicit who -z showed different zone)
      // - All other rooms are in the default zone
      for (const [roomKey, room] of this.state.rooms) {
        const assignedZoneName = this.state.zoneMapping.get(roomKey);
        
        if (assignedZoneName) {
          // This room is in a different zone
          const zone = zoneNameMap.get(assignedZoneName.toLowerCase());
          if (zone) {
            room.zone_id = zone.id;
            console.log(`   Assigned ${room.name} to zone ${assignedZoneName} (ID: ${zone.id})`);
          } else {
            console.log(`   ⚠️  Warning: Zone "${assignedZoneName}" not found in database for room "${room.name}"`);
            room.zone_id = defaultZoneId; // Fall back to default zone
          }
        } else {
          // This room is in the default zone
          room.zone_id = defaultZoneId;
        }
      }
      
      // Now mark zone exits: exits that lead to rooms in different zones
      console.log('\n🚪 Marking zone exits...');
      let zoneExitCount = 0;
      const zoneExitRoomKeys = new Set<string>(); // Track which rooms should be marked as zone exits
      
      for (const exit of this.state.exits) {
        const fromRoomKey = this.getRoomKey(exit.from_room_name, exit.from_room_description);
        const fromRoom = this.state.rooms.get(fromRoomKey);
        
        // Find the destination room by portal key first, then by name
        let toRoom: ParsedRoom | undefined;
        
        // First try portal key matching
        if (exit.portal_key) {
          for (const [key, room] of this.state.rooms) {
            if (room.portal_key === exit.portal_key) {
              toRoom = room;
              break;
            }
          }
        }
        
        // Fall back to name matching
        if (!toRoom) {
          for (const [key, room] of this.state.rooms) {
            if (room.name === exit.to_room_name) {
              toRoom = room;
              break;
            }
          }
        }
        
        // If both rooms have zone IDs and they're different, mark as zone exit
        if (fromRoom && toRoom && fromRoom.zone_id && toRoom.zone_id && fromRoom.zone_id !== toRoom.zone_id) {
          exit.is_zone_exit = true;
          zoneExitCount++;
          
          // Mark BOTH rooms as zone exits (the boundary rooms on both sides)
          zoneExitRoomKeys.add(fromRoomKey);
          const toRoomKey = toRoom.portal_key ? `portal:${toRoom.portal_key}` : `namedesc:${toRoom.name}|||${toRoom.description}`;
          zoneExitRoomKeys.add(toRoomKey);
          
          console.log(`   🔀 Zone exit: ${exit.from_room_name} [${exit.direction}]-> ${exit.to_room_name} (Zone ${fromRoom.zone_id} -> ${toRoom.zone_id})`);
        }
      }
      
      // Mark rooms as zone exits
      for (const roomKey of zoneExitRoomKeys) {
        const room = this.state.rooms.get(roomKey);
        if (room) {
          room.zone_exit = true;
        }
      }
      
      console.log(`   Found ${zoneExitCount} zone exits`);
      console.log(`   Marked ${zoneExitRoomKeys.size} rooms as zone exits`);
      
    } catch (error) {
      console.error('Failed to fetch zones:', error);
    }
  }

  /**
   * Save all parsed rooms to the database
   */
  async saveToDatabase(defaultZoneId?: number): Promise<void> {
    console.log('\n💾 Saving rooms to database...');
    
    let saved = 0;
    let failed = 0;
    const roomIdMap = new Map<string, number>(); // roomKey -> database ID
    
    // Save all rooms first
    for (const [key, room] of this.state.rooms) {
      try {
        const roomData = {
          name: room.name,
          description: room.description,
          zone_id: room.zone_id || defaultZoneId,
          zone_exit: room.zone_exit ? 1 : 0,
          terrain: room.terrain || 'inside',
          flags: room.flags || '',
          portal_key: room.portal_key || null
        };
        
        const response = await axios.post(`${this.apiBaseUrl}/rooms`, roomData);
        roomIdMap.set(key, response.data.id);
        saved++;
        
        if (saved % 10 === 0) {
          console.log(`   Saved ${saved}/${this.state.rooms.size} rooms...`);
        }
      } catch (error: any) {
        failed++;
        console.error(`   ❌ Failed to save room: ${room.name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Rooms saved! ${saved} saved, ${failed} failed`);
    
    // Now save exits
    console.log('\n💾 Saving exits...');
    let exitsSaved = 0;
    let exitsFailed = 0;
    
    for (const exit of this.state.exits) {
      try {
        const fromRoomKey = this.getRoomKey(exit.from_room_name, exit.from_room_description);
        const fromRoomId = roomIdMap.get(fromRoomKey);
        
        if (!fromRoomId) {
          console.log(`   ⚠️  Skipping exit: from room "${exit.from_room_name}" not found`);
          continue;
        }
        
        // Find destination room by portal key first, then by name
        let toRoomId: number | undefined;
        
        // First try to find by portal key if we have one
        if (exit.portal_key) {
          for (const [key, room] of this.state.rooms) {
            if (room.portal_key === exit.portal_key) {
              toRoomId = roomIdMap.get(key);
              break;
            }
          }
        }
        
        // Fall back to name matching
        if (!toRoomId) {
          for (const [key, room] of this.state.rooms) {
            if (room.name === exit.to_room_name) {
              toRoomId = roomIdMap.get(key);
              break;
            }
          }
        }
        
        if (!toRoomId) {
          console.log(`   ⚠️  Skipping exit: to room "${exit.to_room_name}" not found`);
          continue;
        }
        
        const exitData = {
          from_room_id: fromRoomId,
          direction: exit.direction,
          to_room_id: toRoomId,
          is_zone_exit: exit.is_zone_exit ? 1 : 0,
          look_description: exit.look_description || null,
          is_door: exit.is_door ? 1 : 0,
          door_name: exit.door_name || null
        };
        
        await axios.post(`${this.apiBaseUrl}/room_exits`, exitData);
        exitsSaved++;
        
        if (exitsSaved % 20 === 0) {
          console.log(`   Saved ${exitsSaved}/${this.state.exits.length} exits...`);
        }
      } catch (error: any) {
        exitsFailed++;
        console.error(`   ❌ Failed to save exit: ${exit.from_room_name} -> ${exit.to_room_name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Exits saved! ${exitsSaved} saved, ${exitsFailed} failed`);
  }

  /**
   * Export parsed data to JSON file
   */
  exportToJson(outputPath: string): void {
    const data = {
      rooms: Array.from(this.state.rooms.values()),
      exits: this.state.exits,
      stats: {
        totalRooms: this.state.rooms.size,
        totalExits: this.state.exits.length
      }
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\n📄 Exported to ${outputPath}`);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: ts-node mudLogParser.ts <log-file> [options]

Options:
  --zone-id <id>      Default zone ID for rooms
  --export <file>     Export parsed data to JSON file
  --no-save          Don't save to database, only parse

Example:
  ts-node mudLogParser.ts midgaard-exploration.txt --zone-id 1 --export midgaard.json
    `);
    process.exit(1);
  }
  
  const logFile = args[0];
  const zoneId = args.includes('--zone-id') ? parseInt(args[args.indexOf('--zone-id') + 1]) : undefined;
  const exportFile = args.includes('--export') ? args[args.indexOf('--export') + 1] : null;
  const noSave = args.includes('--no-save');
  
  (async () => {
    const parser = new MudLogParser();
    
    await parser.parseLogFile(logFile);
    
    if (exportFile) {
      parser.exportToJson(exportFile);
    }
    
    if (!noSave) {
      await parser.resolveZones();
      await parser.saveToDatabase(zoneId);
    }
  })();
}
