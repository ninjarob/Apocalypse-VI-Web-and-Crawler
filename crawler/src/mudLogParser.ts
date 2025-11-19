import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { getOppositeDirection, normalizeDirection } from './directionHelper.js';

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
  to_room_key?: string; // Key of destination room (for linking)
  to_room_name: string;
  look_description?: string;
  is_door?: boolean;
  door_name?: string;
  is_blocked?: boolean; // Exit exists but cannot be traversed
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
  usedNamedescKeys: Set<string>; // Track all namedesc: keys ever used, even after moving to portal:
  inDeathRoom: boolean; // Track if we're in a death room - skip creating exits from it
  pendingRespawn: boolean; // Track if we just respawned - next room parse should update currentRoomKey
  pendingLook: boolean; // Track if next room title is from a "look" command
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
      bindingAttemptRoomKey: null,
      usedNamedescKeys: new Set(),
      inDeathRoom: false,
      pendingRespawn: false,
      pendingLook: false
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
    let pendingFlee = false; // FIX #17: Track if next room is a flee destination
    // let pendingLook = false; // Track if next room title is from a "look" command - now using this.state.pendingLook
    
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
      const portalKeyMatch = cleanLine.match(/'([a-z]{4,})' briefly appears as a portal shimmers into view/);
      if (portalKeyMatch) {
        this.state.pendingPortalKey = portalKeyMatch[1];
        this.state.portalRetryCount = 0; // Reset retry count on success
        console.log(`  🔑 Portal key: ${this.state.pendingPortalKey}`);
        
        // Check if this portal key is already associated with ANY room
        let alreadyAssociated = false;
        let existingRoomWithSameKey: ParsedRoom | null = null;
        let existingRoomKey: string | null = null;
        
        console.log(`DEBUG: Checking if portal key ${this.state.pendingPortalKey} is already associated...`);
        console.log(`DEBUG: Current rooms in map: ${this.state.rooms.size}`);
        console.log(`DEBUG: Binding attempt room key: ${this.state.bindingAttemptRoomKey}`);
        for (const [key, room] of this.state.rooms) {
          console.log(`DEBUG: Checking room ${key.substring(0, 100)}...: portal_key = ${room.portal_key}`);
          if (room.portal_key === this.state.pendingPortalKey) {
            console.log(`  ⚠️  Portal key ${this.state.pendingPortalKey} already associated with room: ${room.name} (key: ${key})`);
            alreadyAssociated = true;
            existingRoomWithSameKey = room;
            existingRoomKey = key;
            break;
          }
        }
        console.log(`DEBUG: alreadyAssociated = ${alreadyAssociated}`);
        
        if (alreadyAssociated && existingRoomWithSameKey && existingRoomKey && this.state.bindingAttemptRoomKey) {
          // CRITICAL: Don't merge a room with itself!
          if (this.state.bindingAttemptRoomKey === existingRoomKey) {
            console.log(`  ✅ Portal key ${this.state.pendingPortalKey} already associated with this room (revisit)`);
            // Just update current room tracking, no merge needed
            this.state.currentRoomKey = existingRoomKey;
            this.state.currentRoom = existingRoomWithSameKey;
          } else {
            // We bound a room and got a portal key that ALREADY EXISTS
            // This means we created a namedesc: entry for a room we'd already bound
            // Solution: Merge the duplicate namedesc: entry into the existing portal: room
            const bindingRoom = this.state.rooms.get(this.state.bindingAttemptRoomKey);
            
            if (bindingRoom && bindingRoom.name === existingRoomWithSameKey.name && 
                bindingRoom.description === existingRoomWithSameKey.description) {
              console.log(`  🔄 Merging duplicate room entry: ${this.state.bindingAttemptRoomKey.substring(0, 50)}... -> ${existingRoomKey}`);
              
              // Update all exits that reference the duplicate key to point to the existing key
              for (const exit of this.state.exits) {
                if (exit.from_room_key === this.state.bindingAttemptRoomKey) {
                  exit.from_room_key = existingRoomKey;
                  console.log(`    🔄 Updated exit from_room_key: ${this.state.bindingAttemptRoomKey.substring(0, 30)}... -> ${existingRoomKey}`);
                }
                if (exit.to_room_key === this.state.bindingAttemptRoomKey) {
                  exit.to_room_key = existingRoomKey;
                  console.log(`    🔄 Updated exit to_room_key: ${this.state.bindingAttemptRoomKey.substring(0, 30)}... -> ${existingRoomKey}`);
                }
              }
              
              // Remove the duplicate room entry
              this.state.rooms.delete(this.state.bindingAttemptRoomKey);
              
              // Update current room tracking
              this.state.currentRoomKey = existingRoomKey;
              this.state.currentRoom = existingRoomWithSameKey;
              
              console.log(`  ✅ Merged duplicate into existing room: ${existingRoomWithSameKey.name}`);
            }
          }
        } else if (!alreadyAssociated) {
          // Associate the portal key with the room where the binding attempt was made
          if (this.state.bindingAttemptRoomKey) {
            console.log(`DEBUG: Associating portal key ${this.state.pendingPortalKey} with binding attempt room key: ${this.state.bindingAttemptRoomKey}`);
            const bindingRoom = this.state.rooms.get(this.state.bindingAttemptRoomKey);
            if (bindingRoom && !bindingRoom.portal_key) { // Only associate if room doesn't already have a portal key
              
              // FIX #11: Validate portal binding against existing room portal key
              // If bindingAttemptRoomKey is a portal: key, check if we're trying to bind a DIFFERENT portal key
              // This means exit signature matching incorrectly identified this as an existing room
              const existingPortalKey = bindingRoom.portal_key || 
                (this.state.bindingAttemptRoomKey.startsWith('portal:') ? 
                  this.state.bindingAttemptRoomKey.replace('portal:', '') : null);
              
              if (existingPortalKey && existingPortalKey !== this.state.pendingPortalKey) {
                console.log(`\n  ⚠️⚠️⚠️ PORTAL KEY CONFLICT DETECTED ⚠️⚠️⚠️`);
                console.log(`     Trying to bind: ${this.state.pendingPortalKey}`);
                console.log(`     But room already has: ${existingPortalKey}`);
                console.log(`     bindingAttemptRoomKey: ${this.state.bindingAttemptRoomKey}`);
                console.log(`     currentRoomKey: ${this.state.currentRoomKey}`);
                console.log(`     This means exit signature matching incorrectly identified this room!`);
                
                const wronglyMatchedRoom = this.state.rooms.get(this.state.bindingAttemptRoomKey);
                console.log(`     Room: ${wronglyMatchedRoom?.name}`);
                console.log(`     Room exits: [${wronglyMatchedRoom?.exits.join(', ')}]`);
                
                // Find and remove exits involving the wrongly matched room that were created recently
                const exitsToCheck: ParsedExit[] = [];
                for (const exit of this.state.exits) {
                  // Find exits from the wrongly matched room to any namedesc: room (unbound rooms)
                  // These are likely the most recent incorrect exits
                  if ((exit.from_room_key === this.state.bindingAttemptRoomKey && exit.to_room_key && exit.to_room_key.startsWith('namedesc:')) ||
                      (exit.to_room_key === this.state.bindingAttemptRoomKey && exit.from_room_key.startsWith('namedesc:'))) {
                    exitsToCheck.push(exit);
                  }
                  // Also check exits between two portal: rooms that might be wrong
                  if (exit.from_room_key === this.state.bindingAttemptRoomKey && exit.to_room_key && exit.to_room_key.startsWith('portal:')) {
                    // This could be a legitimately created exit OR a wrong one
                    // Only flag it if it was created recently (hard to determine)
                    // For now, log it but don't remove
                    console.log(`     ⚠️  Suspicious exit: ${exit.from_room_name} --[${exit.direction}]--> ${exit.to_room_name}`);
                  }
                }
                
                if (exitsToCheck.length > 0) {
                  console.log(`     🗑️  Removing ${exitsToCheck.length} likely invalid exit(s)...`);
                  for (const invalidExit of exitsToCheck) {
                    const index = this.state.exits.indexOf(invalidExit);
                    if (index > -1) {
                      console.log(`        ❌ Removed: ${invalidExit.from_room_name} --[${invalidExit.direction}]--> ${invalidExit.to_room_name}`);
                      this.state.exits.splice(index, 1);
                    }
                  }
                }
                
                // Create a new room for this portal key since we're in a different place
                const newRoomKey = `portal:${this.state.pendingPortalKey}`;
                const newRoom: ParsedRoom = {
                  name: wronglyMatchedRoom?.name || 'Unknown',
                  description: wronglyMatchedRoom?.description || 'Unknown',
                  exits: wronglyMatchedRoom?.exits || [],
                  npcs: wronglyMatchedRoom?.npcs || [],
                  items: wronglyMatchedRoom?.items || [],
                  portal_key: this.state.pendingPortalKey
                };
                this.state.rooms.set(newRoomKey, newRoom);
                this.state.currentRoomKey = newRoomKey;
                this.state.currentRoom = newRoom;
                
                console.log(`     ✅ Created new room with portal key: ${this.state.pendingPortalKey}`);
                console.log(`     Updated currentRoomKey to: ${newRoomKey}\n`);
                
                this.state.pendingPortalKey = null;
                return; // Exit early
              }
              
              bindingRoom.portal_key = this.state.pendingPortalKey;
              
              // FIX #10: Track when bug rooms get portal keys
              if (this.state.pendingPortalKey === 'cfhilnoq' || this.state.pendingPortalKey === 'lnoq') {
                console.log(`\n  🐛🐛🐛 BUG ROOM PORTAL BINDING 🐛🐛🐛`);
                console.log(`     Portal key: ${this.state.pendingPortalKey}`);
                console.log(`     Room name: ${bindingRoom.name}`);
                console.log(`     Room exits: [${bindingRoom.exits.join(', ')}]`);
                console.log(`     Room key: ${this.state.bindingAttemptRoomKey}`);
                console.log(`     currentRoomKey before: ${this.state.currentRoomKey}`);
              }
              
              // If the room key is namedesc:, change it to portal: key for better deduplication
              if (this.state.bindingAttemptRoomKey.startsWith('namedesc:')) {
                const oldKey = this.state.bindingAttemptRoomKey;
                const portalKey = `portal:${this.state.pendingPortalKey}`;
                this.state.rooms.delete(oldKey);
                this.state.rooms.set(portalKey, bindingRoom);
                
                // CRITICAL: Only update currentRoomKey if we're binding the current room
                // If the player has moved to a different room since the bind attempt, don't overwrite currentRoomKey
                if (this.state.currentRoomKey === oldKey) {
                  this.state.currentRoomKey = portalKey;
                  console.log(`  🔑 CURRENT ROOM KEY UPDATED (binding): ${oldKey.substring(0, 30)}... -> ${portalKey}`);
                  
                  // FIX #10: Track currentRoomKey updates for bug rooms
                  if (this.state.pendingPortalKey === 'cfhilnoq' || this.state.pendingPortalKey === 'lnoq') {
                    console.log(`     🐛 BUG ROOM currentRoomKey updated to: ${portalKey}`);
                  }
                }
                
                this.state.bindingAttemptRoomKey = portalKey;
                
                // IMPORTANT: Update all exits that reference the EXACT old key ONLY
                // DO NOT update exits to OTHER rooms with the same name/description!
                // Multiple different rooms can have identical names and descriptions but different portal keys.
                // Only update exits that point to THIS specific room (using exact oldKey match).
                
                // DEBUG: Log all muddy corridor room updates
                if (bindingRoom.name === 'A muddy corridor') {
                  console.log(`    🐛 BINDING MUDDY CORRIDOR: ${this.state.pendingPortalKey}`);
                  console.log(`    🐛 Old key: ${oldKey.substring(0, 50)}...`);
                  console.log(`    🐛 New key: ${portalKey}`);
                  console.log(`    🐛 Checking ${this.state.exits.length} exits for updates...`);
                }
                
                for (const exit of this.state.exits) {
                  // Update exits with exact old key match
                  if (exit.from_room_key === oldKey) {
                    exit.from_room_key = portalKey;
                    console.log(`    🔄 Updated exit from_room_key: ${oldKey.substring(0, 30)}... -> ${portalKey}`);
                    
                    // DEBUG: Extra logging for muddy corridors
                    if (bindingRoom.name === 'A muddy corridor') {
                      console.log(`    🐛 MUDDY EXIT UPDATE: ${exit.direction} to ${exit.to_room_name} (to_key: ${exit.to_room_key?.substring(0, 30) || 'undefined'}...)`);
                    }
                  }
                  if (exit.to_room_key === oldKey) {
                    // CRITICAL: Don't update to_room_key if from_room_key was also updated (would create self-reference)
                    const wouldCreateSelfReference = exit.from_room_key === portalKey;
                    if (!wouldCreateSelfReference) {
                      exit.to_room_key = portalKey;
                      console.log(`    🔄 Updated exit to_room_key: ${oldKey.substring(0, 30)}... -> ${portalKey}`);
                      
                      // DEBUG: Extra logging for muddy corridors
                      if (bindingRoom.name === 'A muddy corridor') {
                        console.log(`    🐛 MUDDY EXIT TO UPDATE: from ${exit.from_room_name} [${exit.direction}] (from_key: ${exit.from_room_key.substring(0, 30)}...)`);
                      }
                    } else {
                      console.log(`    ⚠️  Skipped updating to_room_key to prevent self-reference: ${exit.from_room_key} -> ${exit.to_room_key}`);
                    }
                  }
                }
                
                // CRITICAL: Update zoneMapping if this room is in it
                if (this.state.zoneMapping.has(oldKey)) {
                  const zoneName = this.state.zoneMapping.get(oldKey)!;
                  this.state.zoneMapping.delete(oldKey);
                  this.state.zoneMapping.set(portalKey, zoneName);
                  console.log(`  🗺️  Updated zone mapping: ${oldKey.substring(0, 50)}... -> ${portalKey} (zone: ${zoneName})`);
                }
                
                console.log(`  🔄 Updated room key: ${oldKey.substring(0, 50)}... -> ${portalKey}`);
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
            // No binding attempt room - this might be the initial room in the log
            console.log(`  ⚠️  No binding attempt room recorded for portal key ${this.state.pendingPortalKey}`);
            
            // Check if this portal key exists in the database (for initial room)
            try {
              const response = await axios.get(`${this.apiBaseUrl}/rooms?portal_key=${this.state.pendingPortalKey}`);
              if (response.data && response.data.length > 0) {
                const dbRoom = response.data[0];
                console.log(`  🔍 Found existing room in database with portal key ${this.state.pendingPortalKey}: ${dbRoom.name}`);
                
                // Load this room into our state as the current room
                const roomKey = `portal:${this.state.pendingPortalKey}`;
                const parsedRoom: ParsedRoom = {
                  name: dbRoom.name,
                  description: dbRoom.description,
                  exits: [], // We'll get these from the database if needed
                  npcs: [],
                  items: [],
                  portal_key: this.state.pendingPortalKey,
                  zone_id: dbRoom.zone_id
                };
                
                this.state.rooms.set(roomKey, parsedRoom);
                this.state.currentRoomKey = roomKey;
                this.state.currentRoom = parsedRoom;
                
                console.log(`  ✅ Loaded initial room from database: ${dbRoom.name} (key: ${roomKey})`);
              } else {
                console.log(`  ⚠️  Portal key ${this.state.pendingPortalKey} not found in database - initial room not loaded`);
              }
            } catch (error) {
              console.log(`  ⚠️  Failed to query database for portal key ${this.state.pendingPortalKey}: ${error}`);
            }
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
        const lookDirection = normalizeDirection(this.expandDirection(lookDirectionMatch[1]));
        console.log(`  👁️  Looking ${lookDirection} from ${this.state.currentRoom?.name || 'unknown'}`);

        // Look for the exit description in the following lines
        let exitDescription = '';
        let k = i + 1;
        let foundExitDesc = false;
        let hasNothingSpecial = false;
        let descriptionLines = 0;

        while (k < lines.length) {
          const descLine = lines[k];
          const cleanDesc = this.stripHtml(descLine).trim();

          // Check for "You see nothing special" - this is a valid response meaning no description
          if (cleanDesc.match(/^You see nothing special/i)) {
            hasNothingSpecial = true;
            k++;
            break;
          }

          // Skip the "Looking x..." response line (in blue) but continue collecting
          if (cleanDesc.match(/^Looking [nesw]/i) || descLine.includes('color="#0080FF"')) {
            k++;
            continue; // Skip this line but keep collecting
          }

          // Stop at room titles, exits, prompts, or other commands
          if (descLine.includes('color="#00FFFF"') || // Room title
              descLine.includes('color="#008080"') || // Exits line
              (descLine.includes('&lt;') && descLine.includes('&gt;')) || // Prompt
              cleanDesc.match(/^(look|exits|cast|who|The last remnants|Lightning begins|arrives from|leaves|says|orates)/i) ||
              cleanDesc.match(/^\[EXITS:/i) || // Exit list
              cleanDesc.match(/^\[Current Zone:/i) || // Zone info
              cleanDesc.match(/^Room scan complete/i)) { // Room scan message
            break;
          }

          // Collect description text (usually white/gray, but also handle other colors for items/NPCs)
          if (descLine.includes('color="#C0C0C0"') || // Gray/white text
              descLine.includes('color="#008000"') || // Green items
              descLine.includes('color="#808000"')) { // Gold/yellow NPCs

            // Skip obvious system messages but allow meaningful descriptions
            if (!cleanDesc.match(/^(Room scan complete|Found exits|Stairs lead|The prostitute|The bartender|A receptionist|A Guard)/i) &&
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

        // Find the exit from current room in this direction and update its description
        if (this.state.currentRoomKey) {
          const matchingExits = this.state.exits.filter(
            exit => exit.from_room_key === this.state.currentRoomKey && exit.direction === lookDirection
          );

          if (matchingExits.length > 0) {
            for (const exit of matchingExits) {
              if (hasNothingSpecial) {
                // Explicitly mark as having no special description
                exit.look_description = undefined;
                console.log(`  ℹ️  No special description [${lookDirection}]`);
              } else if (foundExitDesc && exitDescription) {
                exit.look_description = exitDescription;

                // Check for door information in the description
                const doorMatch = exitDescription.match(/(?:a|an|the)\s+([^.!]+?)\s+(?:door|gate|portal|entrance|exit|hatch|archway|opening)/i);
                if (doorMatch) {
                  exit.is_door = true;
                  exit.door_name = doorMatch[1].trim();
                  console.log(`  🚪 Door detected [${lookDirection}]: ${exit.door_name}`);
                }

                // Check for locked doors or barriers
                if (exitDescription.match(/locked|closed|barred|sealed|blocked|guarded/i)) {
                  exit.is_door = true;
                  console.log(`  🔒 Barrier detected [${lookDirection}]: ${exitDescription.substring(0, 50)}...`);
                }

                console.log(`  👁️  Exit description [${lookDirection}]: ${exitDescription.substring(0, 60)}...`);
              }
            }
          } else {
            console.log(`  ⚠️  No exit found in direction ${lookDirection} from current room`);
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
        
        // Set default zone name if this is the first zone we've detected
        if (!this.state.defaultZoneName) {
          this.state.defaultZoneName = newZoneName;
          console.log(`   🏠 Set default zone to: ${newZoneName}`);
        }
        
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
        
        // Set default zone name if this is the first zone we've detected
        if (!this.state.defaultZoneName) {
          this.state.defaultZoneName = newZoneName;
          console.log(`   🏠 Set default zone to: ${newZoneName}`);
        }
        
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
      
      // Detect death - mark that we're in a death room
      if (cleanLine.match(/\[Info\].*entered a death room/i)) {
        console.log(`   💀 Death room detected - will skip exit creation`);
        this.state.inDeathRoom = true;
        i++;
        continue;
      }
      
      // Detect respawn - we're out of death state
      if (cleanLine.match(/spun out of the darkness/i)) {
        console.log(`   ✨ Respawn detected - clearing death state, next room parse will update position`);
        this.state.inDeathRoom = false;
        this.state.pendingRespawn = true;
        // Clear currentRoomKey so respawn room becomes new starting point
        this.state.currentRoomKey = null;
        this.state.currentRoom = null;
        // Don't clear lastDirection - we want to track movement FROM respawn room
        pendingFlee = false;
        i++;
        continue;
      }
      
      // Detect plain "look" command (without direction)
      if (cleanLine === 'look') {
        this.state.pendingLook = true;
        console.log(`  👁️  Plain "look" command detected - next room title will be current room`);
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
      
      // FIX #16: Detect flee commands with direction
      // Example: "In a total panic, you flee west, head over heels."
      const fleeMatch = cleanLine.match(/you flee\s+(north|south|east|west|up|down|northeast|northwest|southeast|southwest)/i);
      if (fleeMatch) {
        lastDirection = this.expandDirection(fleeMatch[1]);
        console.log(`   🏃 Fled ${lastDirection}`);
        
        // FIX #17: Clear the pending flee flag since we now have the direction
        pendingFlee = false;
        
        i++;
        continue;
      }
      
      // Detect blocked movement (tried to move but couldn't)
      // Distinguish between:
      // 1. Invalid direction (no exit exists) - don't save these
      // 2. Real blocked exits (doors, barriers) - save these
      const invalidDirectionPatterns = [
        /You can't go that way/i,
        /There is no exit in that direction/i,
        /You cannot go that way/i,
        /Alas, you cannot go that way/i,
        /You walk into a wall/i
      ];
      
      const realBlockedPatterns = [
        /The .+ (is closed|blocks your way|bars your passage)/i,
        /The door is locked/i,
        /It's locked/i,
        /The door is closed/i,
        /The gate is closed/i
      ];
      
      const isInvalidDirection = invalidDirectionPatterns.some(pattern => pattern.test(cleanLine));
      const isRealBlocked = realBlockedPatterns.some(pattern => pattern.test(cleanLine));
      
      if (isInvalidDirection && lastDirection) {
        // Invalid direction - just clear lastDirection and continue, don't save
        console.log(`   ⚠️  Invalid direction: ${lastDirection} from ${this.state.currentRoom?.name || 'unknown'} - ignoring`);
        lastDirection = '';
        i++;
        continue;
      }
      
      if (isRealBlocked && lastDirection && this.state.currentRoomKey && this.state.currentRoom) {
        // Real blocked exit (door, gate, etc.) - record it
        console.log(`   🚫 Blocked: ${lastDirection} from ${this.state.currentRoom.name} - ${cleanLine.substring(0, 50)}...`);
        
        const blockedExit: ParsedExit = {
          from_room_key: this.state.currentRoomKey,
          from_room_name: this.state.currentRoom.name,
          from_room_description: this.state.currentRoom.description,
          direction: normalizeDirection(lastDirection),
          to_room_name: 'Unknown (blocked)',
          is_blocked: true,
          is_door: cleanLine.match(/(door|gate|portal|locked|closed)/i) !== null
        };
        this.state.exits.push(blockedExit);
        lastDirection = ''; // Clear after recording
        i++;
        continue;
      }
      
      // Detect room title - cyan colored text (#00FFFF)
      if (line.includes('color="#00FFFF"')) {
        console.log(`DEBUG: Found potential room title line: ${line.substring(0, 100)}...`);
        // Extract room name from cyan colored text using regex
        // FIX #12: Handle both standalone and inline formats
        // Inline: <prompt></font><font color="#00FFFF">Room Name
        // Standalone: <font color="#00FFFF">Room Name
        const roomTitleMatch = line.match(/color="#00FFFF"[^>]*>([^<]*)/);
        let roomName = roomTitleMatch ? roomTitleMatch[1].trim() : this.stripHtml(line).trim();
        
        // FIX #12: If room name is empty or looks like XP/stats, try extracting after the last >
        // This handles: <prompt> Room Name where Room Name has no color tags
        if (!roomName || roomName.match(/^\d+[HMV]/) || roomName.match(/\d+X/)) {
          const afterPrompt = line.split('&gt;</font>').pop();
          if (afterPrompt) {
            const cleanAfterPrompt = this.stripHtml(afterPrompt).trim();
            // Check if this looks more like a room name (has letters, not just stats)
            if (cleanAfterPrompt && cleanAfterPrompt.length > 2 && cleanAfterPrompt.match(/[a-zA-Z]/)) {
              roomName = cleanAfterPrompt;
              console.log(`DEBUG: Extracted room name from after-prompt: "${roomName}"`);
            }
          }
        }
        
        console.log(`DEBUG: Extracted room name: "${roomName}"`);
        
        if (!roomName || 
            roomName.length < 2 || 
            roomName.match(/^</) ||
            roomName.match(/^\d+H/) ||  // Status line with health
            roomName.match(/\d+X/) ||   // Status line with XP
            roomName.match(/^Obvious Exits:/i) ||   // FIX #13: Don't treat "Obvious Exits:" as a room name
            roomName.match(/^(north|south|east|west|up|down|northeast|northwest|southeast|southwest)\s*-\s*/i)) {   // FIX #15: Skip "Obvious Exits:" format lines like "south - A muddy corridor"
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
          if (cleanDesc.match(/'[a-z]{4,}' briefly appears as a portal shimmers/)) {
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
        console.log(`🎯 PARSING ROOM: "${roomName}" with exits [${exits.join(',')}]`);
        const roomKey = this.getRoomKey(roomName, description, this.state.pendingPortalKey);
        console.log(`DEBUG: Room key for "${roomName}": ${roomKey}`);
        
        // Store previous room info BEFORE any updates
        // This ensures we capture the correct keys for exit creation
        console.log(`📍 PREVIOUS ROOM CAPTURE: previousRoomKey will be set to currentRoomKey = ${this.state.currentRoomKey?.substring(0, 50) || 'null'}...`);
        const previousRoomKey = this.state.currentRoomKey;
        const previousRoom = this.state.currentRoom;
        
        // CRITICAL: When encountering a room, we DON'T know its portal key yet
        // The portal key comes AFTER visiting (when bind portal is cast)
        // So we ONLY search by exact description match, never by pendingPortalKey here
        // Pass the exits array so we can match by exit signature
        console.log(`🔍 CALLING findExistingRoomKey with exits: [${exits.join(',')}]`);
        let existingRoomKey = this.findExistingRoomKey(roomName, description, null, exits);
        console.log(`DEBUG: Existing room key check for "${roomName}": ${existingRoomKey}`);
        console.log(`🔍 FIND RESULT: findExistingRoomKey returned ${existingRoomKey ? existingRoomKey.substring(0, 50) + '...' : 'null'} for "${roomName}" with exits [${exits.join(',')}]`);
        console.log(`DEBUG: Current description hash: ${this.hashString(description.substring(0, 100))}...`);
        
        let isNewRoom = false;
        
        if (existingRoomKey) {
          console.log(`DEBUG: Updating existing room: ${roomName}`);
          console.log(`DEBUG: Existing room description hash: ${this.hashString(this.state.rooms.get(existingRoomKey)!.description.substring(0, 100))}...`);
          // Update existing room with any new information
          const existingRoom = this.state.rooms.get(existingRoomKey)!;
          
          // Update exits if we have more/different exits
          // BUT: Never update exits for rooms that already have portal keys!
          // Portal-bound rooms are "complete" and their exits should not change
          if (exits.length > existingRoom.exits.length && !existingRoom.portal_key) {
            console.log(`  📊 Updating exits: [${existingRoom.exits.join(',')}] -> [${exits.join(',')}]`);
            existingRoom.exits = exits;
          } else if (existingRoom.portal_key) {
            console.log(`  🔒 Not updating exits - room has portal key ${existingRoom.portal_key}`);
          }
          
          // Update NPCs/items if we found more
          if (npcs.length > existingRoom.npcs.length) {
            existingRoom.npcs = npcs;
          }
          if (items.length > existingRoom.items.length) {
            existingRoom.items = items;
          }
          
          // CRITICAL FIX #6: Only update currentRoomKey if player actually moved AND the room is valid!
          // If no lastDirection, this room parse is from something other than player movement
          // (e.g., NPC movement notifications, look commands, etc.)
          // Even with lastDirection, we must validate the room has the reverse exit
          // FIX #17: Also treat pendingFlee as movement (flee displays room before showing direction)
          // FIX: Also treat pendingRespawn as movement (respawn shows room without direction)
          // FIX: Also treat pendingLook as setting current room (look shows current room)
          if (lastDirection || pendingFlee || this.state.pendingRespawn || this.state.pendingLook) {
            // FIX #17: For pending flee, we don't know the direction yet, so skip exit validation
            // FIX: For pending respawn, there is no direction (teleported), so skip exit validation
            // FIX: For pending look, there is no movement, so skip exit validation
            if (pendingFlee) {
              console.log(`  🏃 Pending flee - updating current room without direction validation`);
              
              // FIX #10: Track bug room updates
              if (existingRoomKey.includes('cfhilnoq') || existingRoomKey.includes('lnoq') ||
                  previousRoomKey?.includes('cfhilnoq') || previousRoomKey?.includes('lnoq')) {
                console.log(`\n  🐛🐛🐛 BUG ROOM IN EXISTING ROOM UPDATE (FLEE) 🐛🐛🐛`);
                console.log(`     previousRoomKey: ${previousRoomKey}`);
                console.log(`     previousRoom.name: ${previousRoom?.name}`);
                console.log(`     existingRoomKey: ${existingRoomKey}`);
                console.log(`     existingRoom.name: ${existingRoom.name}`);
                console.log(`     pendingFlee: true`);
                console.log(`     Will update currentRoomKey from ${this.state.currentRoomKey} to ${existingRoomKey}`);
              }
              
              this.state.currentRoom = existingRoom;
              this.state.currentRoomKey = existingRoomKey;
              console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${existingRoomKey.substring(0, 60)}...`);
            } else if (this.state.pendingRespawn) {
              console.log(`  ✨ Respawned at existing room - updating current room tracking`);
              this.state.currentRoom = existingRoom;
              this.state.currentRoomKey = existingRoomKey;
              this.state.pendingRespawn = false;
              console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${existingRoomKey.substring(0, 60)}...`);
            } else if (this.state.pendingLook) {
              console.log(`  👁️  Look command - updating current room without direction validation`);
              this.state.currentRoom = existingRoom;
              this.state.currentRoomKey = existingRoomKey;
              console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${existingRoomKey.substring(0, 60)}...`);
            } else {
              // Normal movement with direction
              // Get the direction we came from (reverse of lastDirection)
              const expectedExit = getOppositeDirection(lastDirection);
              
              // Validate: the room we found should have an exit in the direction we came from
              // Example: if we moved "south" to get here, this room should have a "north" exit back
              // EXCEPTION: For portal-bound rooms, skip validation since portal keys make them unique
              const shouldValidateExits = !existingRoom.portal_key;
              
              if (!shouldValidateExits || (existingRoom.exits && existingRoom.exits.includes(expectedExit))) {
                console.log(`  ✅ Exit validation PASSED - ${shouldValidateExits ? `room has ${expectedExit} exit (reverse of ${lastDirection})` : `skipped for portal-bound room ${existingRoom.portal_key}`}`);
                console.log(`  🚶 Player moved ${lastDirection} to existing room - updating current room tracking`);
                
                // FIX #10: Track bug room updates
                if ((previousRoomKey && (previousRoomKey.includes('cfhilnoq') || previousRoomKey.includes('lnoq'))) ||
                    (this.state.currentRoomKey && (this.state.currentRoomKey.includes('cfhilnoq') || this.state.currentRoomKey.includes('lnoq')))) {
                  console.log(`\n  🐛🐛🐛 BUG ROOM IN EXISTING ROOM UPDATE 🐛🐛🐛`);
                  console.log(`     previousRoomKey: ${previousRoomKey}`);
                  console.log(`     previousRoom.name: ${previousRoom?.name}`);
                  console.log(`     existingRoomKey: ${existingRoomKey}`);
                  console.log(`     existingRoom.name: ${existingRoom.name}`);
                  console.log(`     lastDirection: ${lastDirection}`);
                  console.log(`     Will update currentRoomKey from ${this.state.currentRoomKey} to ${existingRoomKey}`);
                }
                
                this.state.currentRoom = existingRoom;
                this.state.currentRoomKey = existingRoomKey;
                console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${existingRoomKey.substring(0, 60)}...`);
              } else {
                console.log(`  ❌ Exit validation FAILED - room missing ${expectedExit} exit (reverse of ${lastDirection})`);
                console.log(`     Expected: [${expectedExit}] to be in [${existingRoom.exits?.join(', ') || 'no exits'}]`);
                console.log(`     This is likely a FALSE MATCH - keeping currentRoomKey=${this.state.currentRoomKey?.substring(0, 50) || 'null'}...`);
                // Don't update currentRoomKey - this room match is wrong
                // Player is still in the room they were in before this parse
              }
            }
          } else {
            console.log(`  ⏸️  No movement - room parse is incidental, keeping currentRoomKey=${this.state.currentRoomKey?.substring(0, 50) || 'null'}...`);
            // Don't update currentRoom or currentRoomKey - player hasn't moved
          }
          
        } else {
          console.log(`DEBUG: Creating new room: ${roomName}`);
          // Create new room WITHOUT portal key (it will be added when bind portal succeeds)
          const room: ParsedRoom = {
            name: roomName,
            description,
            exits,
            npcs,
            items,
            zone_id: undefined,
            portal_key: undefined // Never set portal key here - it comes from bind portal later
          };
          
          this.state.rooms.set(roomKey, room);
          isNewRoom = true;
          
          console.log(`  📦 Room: ${roomName} (${exits.length} exits, ${npcs.length} NPCs, ${items.length} items) [awaiting portal key]`);
          
          // FIX #9: Apply same validation as existing rooms when updating currentRoomKey
          // Only update if player actually moved here (not incidental parsing)
          // FIX #17: Also treat pendingFlee as movement
          // FIX: Also treat pendingRespawn as movement
          // FIX: Also treat pendingLook as movement (observed rooms)
          if (lastDirection || pendingFlee || this.state.pendingRespawn || this.state.pendingLook) {
            // FIX #17: For pending flee, skip exit validation
            // FIX: For pending respawn, skip exit validation (teleported)
            // FIX: For pending look, skip exit validation (observed, not entered)
            if (pendingFlee) {
              console.log(`  🏃 Pending flee to new room - updating current room without direction validation`);
              
              // FIX #10: Track bug room updates
              if (roomKey.includes('cfhilnoq') || roomKey.includes('lnoq') ||
                  previousRoomKey?.includes('cfhilnoq') || previousRoomKey?.includes('lnoq')) {
                console.log(`\n  🐛🐛🐛 BUG ROOM IN NEW ROOM CREATION (FLEE) 🐛🐛🐛`);
                console.log(`     previousRoomKey: ${previousRoomKey}`);
                console.log(`     previousRoom.name: ${previousRoom?.name}`);
                console.log(`     new roomKey: ${roomKey}`);
                console.log(`     new room.name: ${roomName}`);
                console.log(`     pendingFlee: true`);
                console.log(`     Will update currentRoomKey from ${this.state.currentRoomKey} to ${roomKey}`);
              }
              
              this.state.currentRoom = room;
              this.state.currentRoomKey = roomKey;
              console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${roomKey.substring(0, 60)}...`);
            } else if (this.state.pendingRespawn) {
              console.log(`  ✨ Respawned at new room - updating current room tracking`);
              this.state.currentRoom = room;
              this.state.currentRoomKey = roomKey;
              this.state.pendingRespawn = false;
              console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${roomKey.substring(0, 60)}...`);
            } else if (this.state.pendingLook) {
              console.log(`  👁️  Observed room via look command - updating current room tracking`);
              this.state.currentRoom = room;
              this.state.currentRoomKey = roomKey;
              this.state.pendingLook = false;
              console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${roomKey.substring(0, 60)}...`);
            } else {
              // Normal movement with direction
              // Verify this new room has an exit back in the direction we came from
              const expectedExit = getOppositeDirection(lastDirection);
              if (exits.includes(expectedExit)) {
                console.log(`  ✅ Exit validation PASSED - new room has ${expectedExit} exit (reverse of ${lastDirection})`);
                console.log(`  🚶 Player moved ${lastDirection} to new room - updating current room tracking`);
                
                // FIX #10: Track bug room updates
                if (roomKey.includes('cfhilnoq') || roomKey.includes('lnoq') ||
                    previousRoomKey?.includes('cfhilnoq') || previousRoomKey?.includes('lnoq')) {
                  console.log(`\n  🐛🐛🐛 BUG ROOM IN NEW ROOM CREATION 🐛🐛🐛`);
                  console.log(`     previousRoomKey: ${previousRoomKey}`);
                  console.log(`     previousRoom.name: ${previousRoom?.name}`);
                  console.log(`     new roomKey: ${roomKey}`);
                  console.log(`     new room.name: ${roomName}`);
                  console.log(`     lastDirection: ${lastDirection}`);
                  console.log(`     Will update currentRoomKey from ${this.state.currentRoomKey} to ${roomKey}`);
                }
                
                this.state.currentRoom = room;
                this.state.currentRoomKey = roomKey;
                console.log(`  🔑 CURRENT ROOM KEY UPDATED TO: ${roomKey.substring(0, 60)}...`);
              } else {
                console.log(`  ❌ Exit validation FAILED - new room missing ${expectedExit} exit (reverse of ${lastDirection})`);
                console.log(`     Expected: [${expectedExit}] to be in [${exits.join(', ')}]`);
                console.log(`     This new room parse is incidental (not player's destination) - keeping currentRoomKey=${this.state.currentRoomKey?.substring(0, 50) || 'null'}...`);
                // Don't update currentRoomKey - player hasn't actually moved to this room
              }
            }
          } else {
            console.log(`  ⏸️  No movement command - new room parse is incidental, keeping currentRoomKey=${this.state.currentRoomKey?.substring(0, 50) || 'null'}...`);
            // Don't update - this room appeared without player movement
          }
        }
        
        // Record exit if we just moved here AND it's a different room
        // previousRoomKey and previousRoom were captured BEFORE any room updates
        // Skip exit creation if previous room was a death room
        if (lastDirection && previousRoomKey && previousRoom && this.state.currentRoomKey !== previousRoomKey) {
          // Check if we should skip this exit (death room)
          if (this.state.inDeathRoom) {
            console.log(`   ⚠️  Skipping exit creation - previous room was a death room`);
            lastDirection = '';
            i = j;
            continue;
          }
          
          // FIX #10: Enhanced logging to trace spurious exit creation
          console.log(`\n  🔍 EXIT CREATION CHECK:`);
          console.log(`     lastDirection: ${lastDirection}`);
          console.log(`     previousRoomKey: ${previousRoomKey}`);
          console.log(`     previousRoom.name: ${previousRoom.name}`);
          console.log(`     previousRoom.exits: [${previousRoom.exits.join(', ')}]`);
          console.log(`     this.state.currentRoomKey: ${this.state.currentRoomKey}`);
          console.log(`     currentRoom.name: ${roomName}`);
          console.log(`     currentRoom.exits: [${exits.join(', ')}]`);
          
          // Special tracking for the bug rooms
          if (previousRoomKey.includes('cfhilnoq') || (this.state.currentRoomKey && this.state.currentRoomKey.includes('cfhilnoq')) ||
              previousRoomKey.includes('lnoq') || (this.state.currentRoomKey && this.state.currentRoomKey.includes('lnoq'))) {
            console.log(`\n  🐛🐛🐛 BUG ROOM DETECTED IN EXIT CREATION 🐛🐛🐛`);
            console.log(`     previousRoomKey: ${previousRoomKey}`);
            console.log(`     this.state.currentRoomKey: ${this.state.currentRoomKey}`);
            console.log(`     About to create: ${previousRoom.name} --[${lastDirection}]--> ${roomName}`);
          }
          
          console.log(`  🚶 EXIT CREATION: ${lastDirection.toUpperCase()} from ${previousRoomKey.substring(0, 30)}... to ${this.state.currentRoomKey?.substring(0, 30) || 'null'}...`);
          const exit: ParsedExit = {
            from_room_key: previousRoomKey,
            from_room_name: previousRoom.name,
            from_room_description: previousRoom.description,
            direction: normalizeDirection(lastDirection),
            to_room_key: this.state.currentRoomKey || undefined, // Use the UPDATED current room key
            to_room_name: roomName,
            portal_key: this.state.pendingPortalKey || undefined,
            is_blocked: false // Successfully moved, not blocked
          };
          this.state.exits.push(exit);
          console.log(`    🚪 ${previousRoom.name} --[${exit.direction}]--> ${roomName}`);
          
            // DEBUG: Track muddy corridor exits
            if (previousRoom.name === 'A muddy corridor' || roomName === 'A muddy corridor') {
              console.log(`    🐛 MUDDY EXIT CREATED: from_key=${exit.from_room_key.substring(0, 30)}... to_key=${exit.to_room_key?.substring(0, 30) || 'undefined'}...`);
            }          // AUTOMATIC REVERSE EXIT: Create the opposite direction exit
          // This works 99% of the time - if you go north to a room, south takes you back
          const oppositeDirection = getOppositeDirection(lastDirection);
          
          // FIX #14: Check for existing exit before creating auto-reverse
          // If there's already an exit from this room in this direction, don't overwrite it
          const existingReverseExit = this.state.exits.find(e => 
            e.from_room_key === this.state.currentRoomKey && 
            e.direction === oppositeDirection
          );
          
          if (existingReverseExit) {
            console.log(`    ⚠️  Auto-reverse SKIPPED: ${roomName} already has ${oppositeDirection} exit to ${existingReverseExit.to_room_name}`);
            console.log(`       Would have created: ${roomName} --[${oppositeDirection}]--> ${previousRoom.name}`);
            console.log(`       Keeping existing:   ${roomName} --[${oppositeDirection}]--> ${existingReverseExit.to_room_name}`);
          } else {
            const reverseExit: ParsedExit = {
              from_room_key: this.state.currentRoomKey || '', // Use the UPDATED current room key
              from_room_name: roomName,
              from_room_description: description,
              direction: oppositeDirection,
              to_room_key: previousRoomKey,
              to_room_name: previousRoom.name,
              is_blocked: false // Assume reverse is also traversable
            };
            this.state.exits.push(reverseExit);
            console.log(`    🔄 Auto-reverse: ${roomName} --[${oppositeDirection}]--> ${previousRoom.name}`);
            
            // DEBUG: Track muddy corridor reverse exits
            if (previousRoom.name === 'A muddy corridor' || roomName === 'A muddy corridor') {
              console.log(`    🐛 MUDDY REVERSE EXIT CREATED: from_key=${reverseExit.from_room_key.substring(0, 30)}... to_key=${reverseExit.to_room_key?.substring(0, 30) || 'undefined'}...`);
            }
          }
        }
        
        lastDirection = ''; // Clear after processing
        
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
    
    // DEBUG: Summary of all muddy corridor exits
    console.log(`\n🐛 MUDDY CORRIDOR EXIT SUMMARY:`);
    const muddyExits = this.state.exits.filter(e => 
      e.from_room_name === 'A muddy corridor' || e.to_room_name === 'A muddy corridor'
    );
    for (const exit of muddyExits) {
      const fromKey = exit.from_room_key.startsWith('portal:') ? exit.from_room_key : exit.from_room_key.substring(0, 40) + '...';
      const toKey = exit.to_room_key?.startsWith('portal:') ? exit.to_room_key : (exit.to_room_key?.substring(0, 40) + '...' || 'undefined');
      console.log(`   ${exit.from_room_name} (${fromKey}) --[${exit.direction}]--> ${exit.to_room_name} (${toKey})`);
    }
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
    // Check if a room with this name+description already has a portal key
    // If so, we need to create a unique namedesc: key because this might be a different room
    const baseKey = `namedesc:${name}|||${description}`;
    
    // CRITICAL: Count ALL namedesc: keys ever used for this name+description,
    // even if the room has since been moved to a portal: key.
    // This prevents key reuse when rooms have identical names/descriptions.
    let counter = 1;
    let candidateKey = baseKey;
    while (this.state.usedNamedescKeys.has(candidateKey)) {
      counter++;
      candidateKey = `${baseKey}|||${counter}`;
    }
    
    // Mark this key as used
    this.state.usedNamedescKeys.add(candidateKey);
    return candidateKey;
  }

  /**
   * Find existing room key by checking portal key first, then fuzzy name+description matching
   * @param currentExits - The exits of the room we're trying to match (used for exit signature matching)
   */
  private findExistingRoomKey(name: string, description: string, portalKey?: string | null, currentExits?: string[]): string | null {
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
    
    // NO PORTAL KEY YET - Check if a portal: version exists first
    // CRITICAL: Don't reuse rooms with portal keys yet! We won't know if it's the same room
    // until we try to bind. Multiple distinct rooms can have identical names/descriptions
    // but DIFFERENT portal keys (e.g., 3 different "Bridge Road" rooms).
    // The portal binding attempt will tell us if this is the same room or a new one.
    // HOWEVER: If we're revisiting and the exits match, we can identify the correct room!
    const portalMatches: Array<{key: string, room: any}> = [];
    for (const [key, room] of this.state.rooms) {
      if (room.portal_key && room.name === name && room.description === description) {
        console.log(`DEBUG: Found existing portal: room "${room.name}" with key ${room.portal_key}, exits: [${room.exits.join(' ')}]`);
        portalMatches.push({key, room});
      }
    }
    
    // If we found portal-bound rooms with matching name+desc, check if exits match
    // This allows us to identify which specific room we're in without needing portal binding
    // BUT ONLY if we're pretty certain - require exact match and valid movement context
    if (portalMatches.length > 0 && currentExits && currentExits.length > 0) {
      console.log(`DEBUG: Found ${portalMatches.length} portal-bound room(s) with same name+desc, checking exit signature [${currentExits.join(' ')}]`);
      console.log(`🐛 EXIT SIGNATURE CHECK: Looking for room "${name}" with exits [${currentExits.join(',')}]`);
      
      if (portalMatches.length >= 2) {
        console.log(`🔍 Multiple portal-bound rooms found - using exit signature to distinguish`);
        
        // Sort exits for consistent comparison
        const sortedCurrentExits = [...currentExits].sort().join(',');
        
        for (const {key, room} of portalMatches) {
          const sortedRoomExits = [...room.exits].sort().join(',');
          if (sortedRoomExits === sortedCurrentExits) {
            console.log(`✅ EXIT SIGNATURE MATCH: Room "${name}" (${room.portal_key}) has matching exits [${room.exits.join(',')}]`);
            return key;
          }
        }
        
        console.log(`❌ No exit signature match found among ${portalMatches.length} portal-bound rooms`);
        return null;
      } else {
        // Only one portal-bound room - assume it's the same room even if exits don't match
        // This handles cases where exits were not fully captured on first visit due to && isNewRoom
        const {key, room} = portalMatches[0];
        console.log(`✅ SINGLE PORTAL MATCH: Room "${name}" (${room.portal_key}) - assuming same room despite exit differences`);
        console.log(`   Existing exits: [${room.exits.join(',')}] vs Current exits: [${currentExits.join(',')}]`);
        return key;
      }
    }
    
    // Check for EXACT name+description match (using keys)
    // This catches rooms we've seen before in the current session
    const checkKey = `namedesc:${name}|||${description}`;
    console.log(`DEBUG: Searching for exact match with key: ${checkKey.substring(0, 80)}...`);
    console.log(`DEBUG: this.state.rooms.has(checkKey) = ${this.state.rooms.has(checkKey)}`);
    
    if (this.state.rooms.has(checkKey)) {
      const matchedRoom = this.state.rooms.get(checkKey)!;
      console.log(`DEBUG: Found room at checkKey with portal_key: ${matchedRoom.portal_key}`);
      // If the room already has a portal key, DON'T reuse it yet!
      // Wait for the portal binding attempt to see if we get the SAME portal key.
      // If we get the same key = revisiting the same room (should reuse)
      // If we get a different key = different room with same name/desc (Bridge Road case)
      if (matchedRoom.portal_key) {
        console.log(`DEBUG: Found exact namedesc match but it has portal key ${matchedRoom.portal_key} - treating as new room until binding confirms`);
        return null; // Let binding attempt determine if same room
      }
      console.log(`DEBUG: Found exact namedesc match without portal key: ${checkKey.substring(0, 100)}...`);
      return checkKey;
    }
    
    console.log(`DEBUG: No exact namedesc match found, checking portal: keys...`);
    // ALSO check if there's a portal: key version of this room
    // This handles the case where we encounter a room AFTER it's already been bound
    for (const [key, room] of this.state.rooms) {
      if (key.startsWith('portal:') && room.name === name && room.description === description) {
        console.log(`DEBUG: Found portal: room with matching name+desc: ${key} (portal_key: ${room.portal_key})`);
        // Don't reuse it - rooms with portal keys are distinct
        return null;
      }
    }
    
    // ONLY do similarity matching for rooms that truly appear to be the same
    // This is for cases where minor description changes occur (NPCs, time of day, etc.)
    // We use a VERY HIGH threshold to avoid false matches
    for (const [key, room] of this.state.rooms) {
      if (room.name === name && !room.portal_key && key !== checkKey) {
        console.log(`DEBUG: Checking fuzzy match for room without portal: ${key.substring(0, 100)}... (${room.name})`);
        
        // Calculate description similarity (uses normalized descriptions)
        const similarity = this.calculateDescriptionSimilarity(room.description, description);
        console.log(`DEBUG: Description similarity (normalized): ${similarity.toFixed(3)}`);
        
        // Use VERY high similarity threshold (98%+) for rooms without portal keys
        // This prevents merging different "Wall Road" segments that happen to have similar descriptions
        if (similarity >= 0.98) {
          console.log(`DEBUG: Very high similarity match found: ${key.substring(0, 100)}... (${similarity.toFixed(3)})`);
          return key;
        }
      }
    }
    
    console.log(`DEBUG: No existing room found for "${name}"`);
    return null; // No existing room found
  }

  /**
   * Normalize a room description by removing dynamic content
   */
  private normalizeDescription(description: string): string {
    let normalized = description.toLowerCase();
    
    // Remove common NPC patterns (people/creatures that might be present)
    normalized = normalized.replace(/\b(a|an|the)\s+\w+\s+(is|are|stands|sits|sleeps|lies|floats)\s+(here|sleeping|sitting|standing)\b/gi, '');
    
    // Remove item presence indicators
    normalized = normalized.replace(/\b(a|an|the)\s+\w+\s+lies?\s+here\b/gi, '');
    
    // Normalize whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    return normalized;
  }

  /**
   * Calculate similarity between two descriptions (simple word overlap)
   * Uses normalized descriptions to account for dynamic content
   */
  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    // Normalize both descriptions first
    const norm1 = this.normalizeDescription(desc1);
    const norm2 = this.normalizeDescription(desc2);
    
    // If normalized descriptions are very short, require exact match
    if (norm1.length < 50 || norm2.length < 50) {
      return norm1 === norm2 ? 1.0 : 0.0;
    }
    
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 2)); // Ignore short words
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    // Avoid division by zero
    if (union.size === 0) return 0;
    
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
   * Get the first zone name detected in the parsed rooms
   */
  getFirstDetectedZone(): string | null {
    // Check if we have a default zone name that was detected
    if (this.state.defaultZoneName) {
      return this.state.defaultZoneName;
    }
    
    // Otherwise, look through rooms in order and find the first one with a zone
    for (const [_, room] of this.state.rooms) {
      // Skip rooms that are in zoneMapping (those are different zones)
      const mappedZone = this.state.zoneMapping.get(room.portal_key || `namedesc:${room.name}|||${room.description}`);
      if (!mappedZone && this.state.currentZoneName) {
        return this.state.currentZoneName;
      }
    }
    
    // If still nothing, check zoneMapping for the most common zone
    const zoneCounts = new Map<string, number>();
    for (const zoneName of this.state.zoneMapping.values()) {
      zoneCounts.set(zoneName, (zoneCounts.get(zoneName) || 0) + 1);
    }
    
    if (zoneCounts.size > 0) {
      // Return the most frequently occurring zone
      let maxCount = 0;
      let maxZone: string | null = null;
      for (const [zone, count] of zoneCounts) {
        if (count > maxCount) {
          maxCount = count;
          maxZone = zone;
        }
      }
      return maxZone;
    }
    
    return null;
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
      
      // Auto-detect zone if not provided
      if (!resolvedDefaultZoneId) {
        const detectedZoneName = this.getFirstDetectedZone();
        if (detectedZoneName) {
          const detectedZone = zoneNameMap.get(detectedZoneName.toLowerCase());
          if (detectedZone) {
            resolvedDefaultZoneId = detectedZone.id;
            console.log(`   🔍 Auto-detected zone from log: ${detectedZoneName} (ID: ${resolvedDefaultZoneId})`);
          } else {
            console.log(`   ⚠️  Warning: Detected zone "${detectedZoneName}" not found in database`);
          }
        }
      }
      
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
      const defaultZoneName = zones.find((z: any) => z.id === resolvedDefaultZoneId)?.name || 'default zone';
      
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
            console.log(`      Reverting to ${defaultZoneName} (ID: ${resolvedDefaultZoneId})`);
            room.zone_id = resolvedDefaultZoneId; // Fall back to default zone
          }
        } else {
          // This room is in the default zone
          room.zone_id = resolvedDefaultZoneId;
        }
      }
      
      // Now mark zone exits: rooms that have exits leading to other zones
      console.log('\n🚪 Marking zone exits...');
      let zoneExitCount = 0;
      const zoneExitRoomKeys = new Set<string>(); // Track which rooms should be marked as zone exits
      
      // First, mark rooms that are explicitly in zoneMapping (rooms where zone change was detected)
      for (const [roomKey, zoneName] of this.state.zoneMapping) {
        const room = this.state.rooms.get(roomKey);
        if (room && room.zone_id && room.zone_id !== resolvedDefaultZoneId) {
          // This room is in a different zone than the default - it's a zone exit
          zoneExitRoomKeys.add(roomKey);
          console.log(`   🔀 Zone exit (different zone): ${room.name} (Zone ${room.zone_id}: ${zoneName})`);
        }
      }
      
      // Second, mark rooms that have exits leading to rooms in different zones
      for (const exit of this.state.exits) {
        // Use the stored room keys directly for more reliable matching
        const fromRoom = this.state.rooms.get(exit.from_room_key);
        if (!fromRoom || !fromRoom.zone_id || !exit.to_room_key) {
          // Debug: log why we're skipping this exit
          if (!fromRoom) {
            console.log(`   ⚠️  DEBUG: Skipping exit - fromRoom not found for key: ${exit.from_room_key.substring(0, 50)}...`);
          } else if (!fromRoom.zone_id) {
            console.log(`   ⚠️  DEBUG: Skipping exit - fromRoom has no zone_id: ${fromRoom.name} (${exit.from_room_key.substring(0, 50)}...)`);
          } else if (!exit.to_room_key) {
            console.log(`   ⚠️  DEBUG: Skipping exit - no to_room_key: ${exit.from_room_name} -> ${exit.to_room_name}`);
          }
          continue;
        }
        
        const toRoom = this.state.rooms.get(exit.to_room_key);
        
        if (!toRoom) {
          console.log(`   ⚠️  DEBUG: Skipping exit - toRoom not found for key: ${exit.to_room_key?.substring(0, 50)}...`);
        } else if (!toRoom.zone_id) {
          console.log(`   ⚠️  DEBUG: Skipping exit - toRoom has no zone_id: ${toRoom.name} (${exit.to_room_key?.substring(0, 50)}...)`);
        }
        
        // If both rooms exist, have zone IDs, and they're different, mark as zone exit
        if (toRoom && toRoom.zone_id && fromRoom.zone_id !== toRoom.zone_id) {
          exit.is_zone_exit = true;
          zoneExitCount++;
          
          // Mark BOTH rooms as zone exits (the boundary rooms on both sides)
          zoneExitRoomKeys.add(exit.from_room_key);
          zoneExitRoomKeys.add(exit.to_room_key);
          
          console.log(`   🔀 Zone exit (exit to different zone): ${exit.from_room_name} (${exit.from_room_key.substring(0, 30)}...) [${exit.direction}]-> ${exit.to_room_name} (Zone ${fromRoom.zone_id} -> ${toRoom.zone_id})`);
        }
      }
      
      // Mark rooms as zone exits
      console.log(`\n🏷️  Marking ${zoneExitRoomKeys.size} rooms as zone exits...`);
      for (const roomKey of zoneExitRoomKeys) {
        const room = this.state.rooms.get(roomKey);
        if (room) {
          room.zone_exit = true;
          console.log(`     ✓ Marked ${room.name} (${roomKey.substring(0, 20)}...)`);
        } else {
          console.log(`     ⚠️  Room key not found: ${roomKey.substring(0, 50)}...`);
        }
      }
      
      console.log(`   Found ${zoneExitCount} cross-zone exits`);
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
    
    // CRITICAL: Only save rooms that have portal keys OR are no-magic zones!
    // Every room visited should have been bound, except for ~15-20 no-magic rooms
    // Rooms without portal keys AND not in noMagicRooms are just duplicate visits
    const roomsToSave = Array.from(this.state.rooms.entries()).filter(([key, room]) => 
      room.portal_key || this.state.noMagicRooms.has(key)
    );
    const skippedRooms = this.state.rooms.size - roomsToSave.length;
    
    console.log(`   Found ${this.state.rooms.size} total room entries`);
    console.log(`   ${roomsToSave.length} rooms to save:`);
    console.log(`     - ${Array.from(this.state.rooms.values()).filter(r => r.portal_key).length} with portal keys`);
    console.log(`     - ${this.state.noMagicRooms.size} no-magic zones`);
    console.log(`   ${skippedRooms} duplicate visits (will skip)\n`);
    
    let saved = 0;
    let failed = 0;
    const roomIdMap = new Map<string, number>(); // roomKey -> database ID
    
    // Save rooms with portal keys or in no-magic zones
    for (const [key, room] of roomsToSave) {
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
          console.log(`   Saved ${saved}/${roomsToSave.length} rooms...`);
        }
      } catch (error: any) {
        failed++;
        console.error(`   ❌ Failed to save room: ${room.name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ Rooms saved! ${saved} saved, ${failed} failed`);
    
    // Build enhanced roomIdMap with multiple lookup methods
    // After saving, fetch all rooms from database to ensure we have complete mapping
    console.log('\n🔄 Building room ID map from database...');
    try {
      const dbRoomsResponse = await axios.get(`${this.apiBaseUrl}/rooms`);
      const dbRooms = dbRoomsResponse.data;
      
      // Clear and rebuild roomIdMap with ALL possible lookups
      roomIdMap.clear();
      
      for (const dbRoom of dbRooms) {
        // Add by portal key (most reliable)
        if (dbRoom.portal_key) {
          const portalKey = `portal:${dbRoom.portal_key}`;
          roomIdMap.set(portalKey, dbRoom.id);
        }
        
        // Add by namedesc key
        const namedescKey = `namedesc:${dbRoom.name}|||${dbRoom.description}`;
        roomIdMap.set(namedescKey, dbRoom.id);
        
        // Add by name only as fallback
        if (!roomIdMap.has(`name:${dbRoom.name}`)) {
          roomIdMap.set(`name:${dbRoom.name}`, dbRoom.id);
        }
      }
      
      console.log(`   Mapped ${dbRooms.length} rooms with ${roomIdMap.size} lookup keys`);
    } catch (error: any) {
      console.error(`   ❌ Failed to fetch rooms from database: ${error.message}`);
      console.log(`   Continuing with original roomIdMap...`);
    }
    
    // Now save exits
    console.log('\n💾 Saving exits...');
    let exitsSaved = 0;
    let exitsFailed = 0;
    
    for (const exit of this.state.exits) {
      try {
        // Try to find from_room_id using multiple methods
        let fromRoomId = roomIdMap.get(exit.from_room_key);
        
        // Fallback: try by name
        if (!fromRoomId) {
          fromRoomId = roomIdMap.get(`name:${exit.from_room_name}`);
        }
        
        if (!fromRoomId) {
          console.log(`   ⚠️  Skipping exit: from room "${exit.from_room_name}" (key: "${exit.from_room_key.substring(0, 50)}...") not found`);
          continue;
        }
        
        // Try to find to_room_id using multiple methods
        let toRoomId: number | undefined;
        
        // Method 1: Direct key lookup
        if (exit.to_room_key) {
          toRoomId = roomIdMap.get(exit.to_room_key);
        }
        
        // Method 2: Portal key lookup
        if (!toRoomId && exit.portal_key) {
          toRoomId = roomIdMap.get(`portal:${exit.portal_key}`);
        }
        
        // Method 3: Name lookup - DISABLED to prevent incorrect room matching
        // DO NOT lookup by name alone when multiple rooms share the same name
        // The to_room_key should be the definitive identifier
        // If the to_room_key doesn't match any saved room, the exit shouldn't be saved
        // This prevents connecting "A muddy corridor" rooms that are actually different locations
        
        // Skip exits that don't have a destination room
        // We only save exits if:
        // 1. We found the destination room ID, OR
        // 2. The exit is explicitly marked as blocked (door, spell, etc)
        // Failed movement attempts (Alas, you cannot go that way) should NOT be saved
        if (!toRoomId) {
          if (exit.is_blocked) {
            console.log(`   ℹ️  Saving blocked exit: ${exit.from_room_name} [${exit.direction}] (no destination)`);
          } else {
            console.log(`   ⚠️  Skipping exit: to room "${exit.to_room_name || 'unknown'}" not found and not marked as blocked`);
            continue;
          }
        }
        
        const exitData: any = {
          from_room_id: fromRoomId,
          direction: exit.direction,
          to_room_id: toRoomId || null, // null only if blocked
          is_zone_exit: exit.is_zone_exit ? 1 : 0,
          description: exit.look_description || 'No description', // Use look_description as the main description
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
        console.warn(`   ⚠️  Skipped exit: ${exit.from_room_name} -> ${exit.to_room_name} (likely deduplicated room)`);
      }
    }
    
    console.log(`\n✅ Exits saved! ${exitsSaved} saved, ${exitsFailed} skipped`);
    if (exitsFailed > 0) {
      console.log(`   💡 Skipped exits reference deduplicated rooms (this is expected)`);
    }
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
