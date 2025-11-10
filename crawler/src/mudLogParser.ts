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
  from_room_key: string;
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
  noMagicRooms: Set<string>; // Track rooms where portal binding permanently fails
  portalRetryCount: number; // Track consecutive portal binding failures for retry logic
  bindingAttemptRoomKey: string | null; // Track which room the binding attempt was made in
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
      pendingPortalKey: null,
      noMagicRooms: new Set(),
      portalRetryCount: 0,
      bindingAttemptRoomKey: null
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
      
      // Debug: log every 500th line
      if (i % 500 === 0) {
        console.log(`   DEBUG: Processing line ${i}/${lines.length}`);
      }
      
      // Skip empty lines
      if (!line.trim()) {
        i++;
        continue;
      }
      
      // Strip HTML for text-based pattern matching
      const cleanLine = this.stripHtml(line).trim();
      
      // Detect portal binding results
      const portalKeyMatch = cleanLine.match(/'([a-z]{6,})' briefly appears as a portal shimmers into view/);
      if (portalKeyMatch) {
        this.state.pendingPortalKey = portalKeyMatch[1];
        this.state.portalRetryCount = 0; // Reset retry count on success
        console.log(`  🔑 Portal key: ${this.state.pendingPortalKey}`);
        
        // Check if this portal key is already associated with ANY room
        let alreadyAssociated = false;
        console.log(`DEBUG: Checking if portal key ${this.state.pendingPortalKey} is already associated...`);
        console.log(`DEBUG: Current rooms in map: ${this.state.rooms.size}`);
        console.log(`DEBUG: Binding attempt room key: ${this.state.bindingAttemptRoomKey}`);
        for (const [key, room] of this.state.rooms) {
          console.log(`DEBUG: Checking room ${key.substring(0, 100)}...: portal_key = ${room.portal_key}`);
          if (room.portal_key === this.state.pendingPortalKey) {
            console.log(`  ⚠️  Portal key ${this.state.pendingPortalKey} already associated with room: ${room.name} (key: ${key})`);
            alreadyAssociated = true;
            break;
          }
        }
        console.log(`DEBUG: alreadyAssociated = ${alreadyAssociated}`);
        
        if (!alreadyAssociated) {
          // Associate the portal key with the room where the binding attempt was made
          if (this.state.bindingAttemptRoomKey) {
            console.log(`DEBUG: Associating portal key ${this.state.pendingPortalKey} with binding attempt room key: ${this.state.bindingAttemptRoomKey}`);
            const bindingRoom = this.state.rooms.get(this.state.bindingAttemptRoomKey);
            if (bindingRoom && !bindingRoom.portal_key) { // Only associate if room doesn't already have a portal key
              bindingRoom.portal_key = this.state.pendingPortalKey;
              
              // If the room key is namedesc:, change it to portal: key for better deduplication
              if (this.state.bindingAttemptRoomKey.startsWith('namedesc:')) {
                const portalKey = `portal:${this.state.pendingPortalKey}`;
                this.state.rooms.delete(this.state.bindingAttemptRoomKey);
                this.state.rooms.set(portalKey, bindingRoom);
                this.state.currentRoomKey = portalKey;
                this.state.bindingAttemptRoomKey = portalKey;
              }
              
              console.log(`  🔗 Associated portal key ${this.state.pendingPortalKey} with binding attempt room: ${bindingRoom.name}`);
              
              // Debug: Log all rooms with portal keys
              console.log(`DEBUG: Current portal key associations:`);
              for (const [key, room] of this.state.rooms) {
                if (room.portal_key) {
                  console.log(`  ${room.portal_key} -> ${room.name} (${key})`);
                }
              }
            } else if (bindingRoom && bindingRoom.portal_key) {
              console.log(`  ⚠️  Binding attempt room already has portal key: ${bindingRoom.name} has ${bindingRoom.portal_key}`);
            } else {
              console.log(`  ⚠️  No binding attempt room found for portal key ${this.state.pendingPortalKey}`);
            }
          } else {
            console.log(`  ⚠️  No binding attempt room recorded for portal key ${this.state.pendingPortalKey}`);
          }
        }
        
        // Clear the binding attempt room and pending portal key after processing
        this.state.bindingAttemptRoomKey = null;
        this.state.pendingPortalKey = null;
        
        i++;
        continue;
      }
      
      // Detect failed portal binding - permanent failures (no-magic zones)
      if (cleanLine.includes("Something prevents you from binding the portal") ||
          cleanLine.includes("Your magic fizzles out and dies")) {
        this.state.pendingPortalKey = null; // Clear any pending key
        
        // Mark current room as no-magic zone if we have one
        if (this.state.currentRoomKey) {
          this.state.noMagicRooms.add(this.state.currentRoomKey);
          console.log(`  🚫 Marked room as no-magic zone: ${this.state.rooms.get(this.state.currentRoomKey)?.name}`);
        }
        
        this.state.portalRetryCount = 0; // Reset for permanent failure
        this.state.bindingAttemptRoomKey = null; // Clear binding attempt room
        i++;
        continue;
      }
      
      // Detect temporary portal binding failure (concentration loss)
      if (cleanLine.includes("You lost your concentration!")) {
        this.state.pendingPortalKey = null; // Clear any pending key
        this.state.portalRetryCount++;
        
        // If we've failed multiple times in a row, mark as no-magic
        if (this.state.portalRetryCount >= 3 && this.state.currentRoomKey) {
          this.state.noMagicRooms.add(this.state.currentRoomKey);
          console.log(`  🚫 Marked room as no-magic zone after ${this.state.portalRetryCount} concentration failures: ${this.state.rooms.get(this.state.currentRoomKey)?.name}`);
          this.state.portalRetryCount = 0;
        } else {
          console.log(`  💫 Portal binding failed due to concentration loss (${this.state.portalRetryCount}/3 attempts)`);
        }
        
        this.state.bindingAttemptRoomKey = null; // Clear binding attempt room
        i++;
        continue;
      }
      
      // Detect portal binding attempts
      if (cleanLine.includes("cast 'bind portal minor'") || cleanLine.includes("cast 'bind portal major'")) {
        // Check if current room is known to be a no-magic zone
        if (this.state.currentRoomKey && this.state.noMagicRooms.has(this.state.currentRoomKey)) {
          console.log(`  🚫 Skipping portal binding in known no-magic room: ${this.state.rooms.get(this.state.currentRoomKey)?.name}`);
        } else {
          console.log(`  🔮 Attempting portal binding in room: ${this.state.currentRoom?.name || 'unknown'}`);
          // Record which room the binding attempt was made in
          this.state.bindingAttemptRoomKey = this.state.currentRoomKey;
        }
        i++;
        continue;
      }
      
      // Detect "look <direction>" commands and capture exit descriptions
      const lookDirectionMatch = cleanLine.match(/^look\s+(n|s|e|w|u|d|north|south|east|west|up|down|northeast|northwest|southeast|southwest|ne|nw|se|sw)$/i);
      if (lookDirectionMatch) {
        const lookDirection = this.expandDirection(lookDirectionMatch[1]);

        // Look for the exit description in the following lines
        let exitDescription = '';
        let k = i + 1;
        let foundExitDesc = false;
        let descriptionLines = 0;

        while (k < lines.length) {
          const descLine = lines[k];
          const cleanDesc = this.stripHtml(descLine).trim();

          // Stop at room titles, exits, prompts, or other commands
          if (descLine.includes('color="#00FFFF"') || // Room title
              descLine.includes('color="#008080"') || // Exits line
              (descLine.includes('&lt;') && descLine.includes('&gt;')) || // Prompt
              cleanDesc.match(/^(look|exits|cast|who|The last remnants|Lightning begins|arrives from|leaves|says|orates)/i) ||
              cleanDesc.match(/^\[EXITS:/i) || // Exit list
              cleanDesc.match(/^\[Current Zone:/i)) { // Zone info
            break;
          }

          // Collect description text (usually white/gray, but also handle other colors for items/NPCs)
          if (descLine.includes('color="#C0C0C0"') || // Gray/white text
              descLine.includes('color="#008000"') || // Green items
              descLine.includes('color="#808000"')) { // Gold/yellow NPCs

            // Skip obvious system messages and commands
            if (!cleanDesc.match(/^(Room scan complete|Found exits|You see|You look|Stairs lead|The prostitute|The bartender|A receptionist|A Guard)/i) &&
                !cleanDesc.match(/^\d+H \d+M \d+V/i) && // Health/mana prompts
                cleanDesc.length > 0) {

              exitDescription += cleanDesc + ' ';
              foundExitDesc = true;
              descriptionLines++;
            }
          }

          k++;

          // Don't go too far - limit to reasonable description length
          if (descriptionLines > 10 || k - i > 25) break;
        }

        exitDescription = exitDescription.trim();

        // If we found an exit description, associate it with the last exit we created
        if (foundExitDesc && exitDescription && this.state.exits.length > 0) {
          const lastExit = this.state.exits[this.state.exits.length - 1];
          if (lastExit.direction === lookDirection && !lastExit.look_description) {
            lastExit.look_description = exitDescription;

            // Check for door information in the description
            const doorMatch = exitDescription.match(/(?:a|an|the)\s+([^.!]+?)\s+(?:door|gate|portal|entrance|exit|hatch|archway|opening)/i);
            if (doorMatch) {
              lastExit.is_door = true;
              lastExit.door_name = doorMatch[1].trim();
              console.log(`  🚪 Door detected [${lookDirection}]: ${lastExit.door_name}`);
            }

            // Check for locked doors or barriers
            if (exitDescription.match(/locked|closed|barred|sealed|blocked|guarded/i)) {
              lastExit.is_door = true;
              console.log(`  🔒 Barrier detected [${lookDirection}]: ${exitDescription.substring(0, 50)}...`);
            }

            console.log(`  👁️  Exit description [${lookDirection}]: ${exitDescription.substring(0, 60)}...`);
          }
        }

        i = k;
        continue;
      }
      
      // Detect zone change from "who -z" command output
      const zoneChangeMatch = cleanLine.match(/\[Current Zone:\s*([^\]]+)\]/i);
      if (zoneChangeMatch) {
        const newZoneName = zoneChangeMatch[1].trim();
        console.log(`   🗺️  Zone detected: "${newZoneName}" (current: "${this.state.currentZoneName}", roomKey: "${this.state.currentRoomKey}")`);
        
        // If this is a different zone than the current one, record the zone change
        if (this.state.currentZoneName && this.state.currentZoneName !== newZoneName && this.state.currentRoomKey) {
          // The room we just discovered is in a different zone
          this.state.zoneMapping.set(this.state.currentRoomKey, newZoneName);
          console.log(`   🗺️  Zone change detected: ${this.state.currentZoneName} → ${newZoneName} (room: ${this.state.rooms.get(this.state.currentRoomKey)?.name})`);
        }
        
        this.state.currentZoneName = newZoneName;
        this.state.recentZoneCheck = true;
        i++;
        continue;
      }
      
      // Detect zone change from "who -z" command output (alternative format)
      const altZoneChangeMatch = cleanLine.match(/Current zone[:\s]+(.+?)[\r\n]/i);
      if (altZoneChangeMatch) {
        const newZoneName = altZoneChangeMatch[1].trim();
        
        // If this is a different zone than the current one, record the zone change
        if (this.state.currentZoneName && this.state.currentZoneName !== newZoneName && this.state.currentRoomKey) {
          // The room we just discovered is in a different zone
          this.state.zoneMapping.set(this.state.currentRoomKey, newZoneName);
          console.log(`   🗺️  Zone change detected: ${this.state.currentZoneName} → ${newZoneName} (room: ${this.state.rooms.get(this.state.currentRoomKey)?.name})`);
        }
        
        this.state.currentZoneName = newZoneName;
        this.state.recentZoneCheck = true;
        i++;
        continue;
      }
      
      // Detect movement commands (single letters or full directions)
      const movementMatch = cleanLine.match(/^(n|s|e|w|u|d|north|south|east|west|up|down|northeast|northwest|southeast|southwest|ne|nw|se|sw)$/i);
      if (movementMatch) {
        lastDirection = this.expandDirection(movementMatch[1]);
        console.log(`   ➡️  Moving ${lastDirection}`);
        i++;
        continue;
      }
      
      // Detect room title - cyan colored text (#00FFFF)
      if (line.includes('color="#00FFFF"')) {
        console.log(`DEBUG: Found potential room title line: ${line.substring(0, 100)}...`);
        // Extract room name from cyan colored text using regex
        const roomTitleMatch = line.match(/color="#00FFFF"[^>]*>([^<]*)/);
        const roomName = roomTitleMatch ? roomTitleMatch[1].trim() : this.stripHtml(line).trim();
        console.log(`DEBUG: Extracted room name: "${roomName}"`);
        
        if (!roomName || 
            roomName.length < 2 || 
            roomName.match(/^</) ||
            roomName.match(/\d+H/) ||  // Status line with health
            roomName.match(/\d+X/)) {   // Status line with XP
          console.log(`DEBUG: Skipping room name "${roomName}" - validation failed`);
          i++;
          continue;
        }
        
        // Collect description lines (white/gray colored text following the title)
        let description = '';
        let j = i + 1;
        let foundDescription = false;
        let inDescription = false;
        
        while (j < lines.length) {
          const descLine = lines[j];
          const cleanDesc = this.stripHtml(descLine).trim();
          
          // Stop at exits line (teal color #008080)
          if (descLine.includes('color="#008080"')) {
            console.log(`DEBUG: Found exits line at j=${j}: ${descLine.substring(0, 50)}...`);
            break;
          }
          
          // Stop at prompts
          if (descLine.includes('&lt;') && descLine.includes('&gt;')) {
            console.log(`DEBUG: Found prompt line at j=${j}: ${descLine.substring(0, 50)}...`);
            break;
          }
          
          // Stop at other colored text (commands, etc) unless we haven't started description yet
          if (inDescription && descLine.includes('color=') && !descLine.includes('color="#C0C0C0"')) {
            console.log(`DEBUG: Found non-gray colored text at j=${j}, stopping description collection`);
            break;
          }
          
          // Start collecting when we see gray text
          if (descLine.includes('color="#C0C0C0"')) {
            inDescription = true;
          }
          
          // Stop if we hit a portal key line (this should be processed by main parser, not included in description)
          if (cleanDesc.match(/'[a-z]{6,}' briefly appears as a portal shimmers/)) {
            console.log(`DEBUG: Found portal key line at j=${j}, stopping description collection`);
            break;
          }
          
          // Collect text if we're in description mode and line has content
          if (inDescription && cleanDesc) {
            console.log(`DEBUG: Processing description line j=${j}: "${cleanDesc.substring(0, 50)}..."`);
            // Skip commands, system messages, and dynamic content that shouldn't be part of room description
            if (!cleanDesc.match(/^(look|exits|cast|who|The last remnants|Lightning begins|arrives from|leaves|says|orates)/i) &&
                !cleanDesc.match(/^(Room scan complete|Found exits|You see|You look|Stairs lead)/i) &&
                !cleanDesc.match(/^\d+H \d+M \d+V/i) && // Health/mana prompts
                !cleanDesc.match(/^(The prostitute|The bartender|A receptionist|A Guard|A guard|The guard)/i) && // Common NPCs that appear dynamically
                !cleanDesc.match(/^(A|An|The)\s+\w+\s+(is|are|stands|sits|sleeps)\s+here/i) && // NPC presence indicators
                !cleanDesc.match(/^(A|An|The)\s+\w+\s+(lies|floats|hangs)\s+here/i)) { // Item presence indicators
              description += cleanDesc + ' ';
              foundDescription = true;
              console.log(`DEBUG: Added to description, length now: ${description.length}`);
            } else {
              console.log(`DEBUG: Skipped description line (filtered): "${cleanDesc.substring(0, 50)}..."`);
            }
          }
          
          j++;
          
          // Don't go too far
          if (j - i > 50) {
            console.log(`DEBUG: Stopped collecting description at j=${j} (too far)`);
            break;
          }
        }
        
        description = description.trim();
        console.log(`DEBUG: Final description for "${roomName}": found=${foundDescription}, length=${description.length}, preview="${description.substring(0, 100)}..."`);
        
        // Only process if we have a valid description
        if (!foundDescription || description.length < 10) {
          console.log(`DEBUG: Skipping room "${roomName}" - no valid description`);
          i++;
          continue;
        }
        
        // Look for exits line (teal color)
        let exits: string[] = [];
        
        for (let k = j; k < Math.min(j + 30, lines.length); k++) {
          const exitLine = this.stripHtml(lines[k]).trim();
          console.log(`DEBUG: Checking for exits at k=${k}: "${exitLine.substring(0, 50)}..."`);
          
          // Parse [EXITS: n e s w]
          const shortExitsMatch = exitLine.match(/^\[EXITS:\s*(.+?)\s*\]/i);
          if (shortExitsMatch) {
            const exitStr = shortExitsMatch[1];
            exits = exitStr.split(/\s+/).map(d => this.expandDirection(d));
            console.log(`DEBUG: Found exits for "${roomName}": ${exits.join(', ')}`);
            break;
          }
        }
        
        console.log(`DEBUG: Room "${roomName}" processing complete - exits: ${exits.length}, description length: ${description.length}`);
        
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
        console.log(`DEBUG: Room key for "${roomName}": ${roomKey}`);
        
        // Check if we already have this room (by portal key or name+desc)
        let existingRoomKey = this.findExistingRoomKey(roomName, description, this.state.pendingPortalKey);
        console.log(`DEBUG: Existing room key check for "${roomName}": ${existingRoomKey}`);
        console.log(`DEBUG: Current description hash: ${this.hashString(description.substring(0, 100))}...`);
        
        if (existingRoomKey) {
          console.log(`DEBUG: Updating existing room: ${roomName}`);
          console.log(`DEBUG: Existing room description hash: ${this.hashString(this.state.rooms.get(existingRoomKey)!.description.substring(0, 100))}...`);
          // Update existing room with any new information
          const existingRoom = this.state.rooms.get(existingRoomKey)!;
          
          // Update portal key if we got one and it doesn't have one
          if (this.state.pendingPortalKey && !existingRoom.portal_key) {
            existingRoom.portal_key = this.state.pendingPortalKey;
            console.log(`  � Updated portal key for existing room: ${roomName} (${this.state.pendingPortalKey})`);
          }
          
          // Update exits if we have more/different exits
          if (exits.length > existingRoom.exits.length) {
            existingRoom.exits = exits;
          }
          
          // Update NPCs/items if we found more
          if (npcs.length > existingRoom.npcs.length) {
            existingRoom.npcs = npcs;
          }
          if (items.length > existingRoom.items.length) {
            existingRoom.items = items;
          }
          
          this.state.currentRoom = existingRoom;
          this.state.currentRoomKey = existingRoomKey;
          
        } else {
          console.log(`DEBUG: Creating new room: ${roomName}`);
          // Create new room
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
          
          const keyType = this.state.pendingPortalKey ? 'portal key' : 'name+desc';
          console.log(`  📦 Room: ${roomName} (${exits.length} exits, ${npcs.length} NPCs, ${items.length} items) [${keyType}]`);
          
          this.state.currentRoom = room;
          this.state.currentRoomKey = roomKey;
        }
        
        // Record exit if we just moved here - but only if we actually moved to a different room
        if (lastDirection && this.state.currentRoom && this.state.currentRoomKey && existingRoomKey !== this.state.currentRoomKey) {
          // Only create exit if we moved from a different room
          const fromRoomKey = this.state.currentRoomKey;
          const exit: ParsedExit = {
            from_room_key: fromRoomKey,
            direction: lastDirection,
            to_room_name: roomName,
            portal_key: this.state.pendingPortalKey || undefined, // Associate portal key with exit if we just bound it
            from_room_name: this.state.currentRoom.name, // Keep for debugging/logging
            from_room_description: this.state.currentRoom.description // Keep for debugging/logging
          };
          this.state.exits.push(exit);
          console.log(`    🚪 ${this.state.currentRoom.name} --[${lastDirection}]--> ${roomName}`);
        }
        
        this.state.currentRoom = this.state.rooms.get(roomKey)!;
        this.state.currentRoomKey = roomKey; // Track the room key
        lastDirection = '';
        
        // Clear recent zone check flag after discovering a room
        this.state.recentZoneCheck = false;
        
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
   * Find existing room key by checking portal key first, then fuzzy name+description matching
   */
  private findExistingRoomKey(name: string, description: string, portalKey?: string | null): string | null {
    console.log(`DEBUG: findExistingRoomKey called for "${name}" with portalKey: ${portalKey}`);
    
    // HIGHEST PRIORITY: If we have a portal key, ONLY match rooms with THE SAME portal key
    // Different portal keys = definitely different rooms, even if name/description similar
    if (portalKey) {
      for (const [key, room] of this.state.rooms) {
        if (room.portal_key === portalKey) {
          console.log(`DEBUG: Found existing room with SAME portal key ${portalKey}: ${key} (${room.name})`);
          return key;
        }
      }
      // If we have a portal key but found no match, this is a NEW room
      // Don't check name+description similarity - different portal key means different room
      console.log(`DEBUG: New portal key ${portalKey} - treating as new room even if name/desc similar`);
      return null;
    }
    
    // Only if NO portal key is available, fall back to name+description matching
    // Check if any existing room with the same name has a portal key
    for (const [key, room] of this.state.rooms) {
      if (room.portal_key && room.name === name) {
        const similarity = this.calculateDescriptionSimilarity(room.description, description);
        console.log(`DEBUG: Checking existing room with portal key ${room.portal_key}, similarity: ${similarity}`);
        if (similarity > 0.8) {
          console.log(`DEBUG: Found existing room with portal key for same name and similar description: ${key}`);
          return key;
        }
      }
    }
    
    // Fuzzy matching for rooms without portal keys
    // Use description similarity but ignore dynamic content like NPCs
    for (const [key, room] of this.state.rooms) {
      if (room.name === name && !room.portal_key) {
        console.log(`DEBUG: Checking fuzzy match for room: ${key} (${room.name})`);
        
        // Calculate description similarity
        const similarity = this.calculateDescriptionSimilarity(room.description, description);
        console.log(`DEBUG: Description similarity: ${similarity}`);
        
        // Use moderate similarity threshold (80%+) to allow for some variation
        if (similarity > 0.80) {
          console.log(`DEBUG: Moderate similarity match found: ${key}`);
          return key;
        }
      }
    }
    
    console.log(`DEBUG: No existing room found for "${name}"`);
    return null; // No existing room found
  }

  /**
   * Calculate similarity between two descriptions (simple word overlap)
   */
  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    const words1 = new Set(desc1.toLowerCase().split(/\s+/));
    const words2 = new Set(desc2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Simple string hash for debugging
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Resolve zone IDs from zone names and mark zone exits
   */
  async resolveZones(defaultZoneId?: number): Promise<void> {
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
      let resolvedDefaultZoneId: number | undefined = defaultZoneId;
      if (resolvedDefaultZoneId) {
        // Find the zone name for logging
        const defaultZone = zones.find((z: any) => z.id === resolvedDefaultZoneId);
        if (defaultZone) {
          console.log(`   Default zone: ${defaultZone.name} (ID: ${resolvedDefaultZoneId})`);
        }
      } else if (this.state.defaultZoneName) {
        // Fallback to name-based lookup if no ID provided
        const defaultZone = zoneNameMap.get(this.state.defaultZoneName.toLowerCase());
        if (defaultZone) {
          resolvedDefaultZoneId = defaultZone.id;
          console.log(`   Default zone: ${this.state.defaultZoneName} (ID: ${resolvedDefaultZoneId})`);
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
            room.zone_id = resolvedDefaultZoneId; // Fall back to default zone
          }
        } else {
          // This room is in the default zone
          room.zone_id = resolvedDefaultZoneId;
        }
      }
      
      // Now mark zone exits: exits that lead to rooms in different zones
      console.log('\n🚪 Marking zone exits...');
      let zoneExitCount = 0;
      const zoneExitRoomKeys = new Set<string>(); // Track which rooms should be marked as zone exits
      
      for (const exit of this.state.exits) {
        // Use the stored room key directly
        const fromRoom = this.state.rooms.get(exit.from_room_key);
        
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
          zoneExitRoomKeys.add(exit.from_room_key);
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
        // Use the stored room key directly
        const fromRoomId = roomIdMap.get(exit.from_room_key);
        
        if (!fromRoomId) {
          console.log(`   ⚠️  Skipping exit: from room key "${exit.from_room_key}" not found (available keys: ${Array.from(roomIdMap.keys()).slice(0, 5).join(', ')}...)`);
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
        
        const exitData: any = {
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
