import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';
import { RoomProcessor } from '../RoomProcessor';

interface RoomNode {
  id: number;
  name: string;
  description: string;
  zone_id: number;
  portal_key?: string | null; // Unique portal binding key
  connections: Map<string, number>; // direction -> target room id
  exploredConnections: Set<string>; // directions that have been explored
  unexploredConnections: Set<string>; // directions that exist but haven't been explored
  visitCount: number;
  lastVisited: Date;
  flags?: string[]; // Room flags like 'no_magic', 'dark', etc.
}

interface GraphEdge {
  fromRoomId: number;
  toRoomId: number;
  direction: string;
  isBidirectional: boolean;
}

/**
 * RoomGraphNavigationCrawler - Graph-based zone exploration system
 *
 * This crawler:
 * 1. Builds a graph of rooms and their connections from the database
 * 2. Uses graph algorithms to navigate between known rooms
 * 3. Tracks which connections have been explored vs unexplored
 * 4. Systematically explores all unexplored connections
 * 5. Discovers new rooms and connections as it explores
 * 6. No coordinate system - navigation based purely on room connections
 */
export class RoomGraphNavigationCrawler implements CrawlerTask {
  name = 'Room Graph Navigation Crawler';
  description = 'Graph-based zone exploration using room connections and pathfinding';

  private config: TaskConfig;
  private currentZone: string = '';
  private zoneId: number = 0;
  private roomGraph: Map<number, RoomNode> = new Map(); // roomId -> RoomNode
  private currentRoomId: number = 0;
  private currentRoomName: string = '';
  private actionsUsed: number = 0;
  private maxActions: number;
  private roomProcessor: RoomProcessor;
  private navigationPath: number[] = []; // Stack of room IDs for backtracking

  constructor(config: TaskConfig) {
    this.config = config;
    this.maxActions = parseInt(process.env.MAX_ACTIONS_PER_SESSION || '1000');
    this.roomProcessor = new RoomProcessor(config);
  }

  async run(): Promise<void> {
    logger.info('🆕 Starting room graph navigation crawler...');

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

      // Step 2: Build room graph for this zone
      logger.info('Step 2: Building room graph for zone...');
      await this.buildRoomGraph();

      // Step 3: Determine starting position
      logger.info('Step 3: Determining starting position...');
      await this.determineStartingPosition();

      // Step 4: Begin systematic exploration
      logger.info(`Step 4: Beginning systematic exploration (max ${this.maxActions} actions)...`);
      await this.exploreSystematically();

      // Summary
      logger.info('\n📊 Room Graph Navigation Crawler Summary:');
      logger.info(`   Zone: ${this.currentZone}`);
      logger.info(`   Rooms in graph: ${this.roomGraph.size}`);
      logger.info(`   Actions used: ${this.actionsUsed}/${this.maxActions}`);

    } catch (error) {
      logger.error('❌ Error during room graph navigation crawling:', error);
      throw error;
    }
  }

  /**
   * Build the room graph from database data
   */
  private async buildRoomGraph(): Promise<void> {
    try {
      // Load all rooms for this zone
      const allRooms = await this.config.api.getAllEntities('rooms');
      const zoneRooms = allRooms.filter((r: any) => r.zone_id === this.zoneId);

      // Load all exits for this zone
      const allExits = await this.config.api.getAllEntities('room_exits');
      const zoneExits = allExits.filter((exit: any) => {
        const fromRoom = zoneRooms.find((r: any) => r.id === exit.from_room_id);
        return fromRoom !== undefined;
      });

      // Create room nodes
      for (const room of zoneRooms) {
        const roomNode: RoomNode = {
          id: room.id,
          name: room.name,
          description: room.description || '',
          zone_id: room.zone_id,
          portal_key: room.portal_key || null,
          connections: new Map(),
          exploredConnections: new Set(),
          unexploredConnections: new Set(),
          visitCount: room.visitCount || 0,
          lastVisited: room.lastVisited ? new Date(room.lastVisited) : new Date(),
          flags: room.flags || []
        };

        this.roomGraph.set(room.id, roomNode);
      }

      // Add connections from exits
      for (const exit of zoneExits) {
        const fromRoom = this.roomGraph.get(exit.from_room_id);
        if (!fromRoom) continue;

        // Add the connection
        fromRoom.connections.set(exit.direction.toLowerCase(), exit.to_room_id || 0);

        // If we don't have a target room, mark as unexplored
        if (!exit.to_room_id) {
          fromRoom.unexploredConnections.add(exit.direction.toLowerCase());
        } else {
          // Check if we've explored this connection (have we been to the target room?)
          const targetRoom = this.roomGraph.get(exit.to_room_id);
          if (targetRoom && targetRoom.visitCount > 0) {
            fromRoom.exploredConnections.add(exit.direction.toLowerCase());
          } else {
            fromRoom.unexploredConnections.add(exit.direction.toLowerCase());
          }
        }
      }

      logger.info(`✓ Built graph with ${this.roomGraph.size} rooms and ${zoneExits.length} connections`);

    } catch (error) {
      logger.error('❌ Failed to build room graph:', error);
    }
  }

  /**
   * Determine starting position in the graph
   */
  private async determineStartingPosition(): Promise<void> {
    // Get current room information - we can skip the initial "look" since we just connected
    // and the connection response should contain room data, but let's be safe and get it
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
    this.currentRoomName = roomData.name;

    // Try to get portal key for unique identification
    const portalKey = await this.roomProcessor.getPortalKey(roomData);
    if (portalKey) {
      roomData.portal_key = portalKey;
    }

    // Find this room in our graph
    // Priority 1: Match by portal key (most reliable)
    // Priority 2: Match by name + description + zone (for rooms without portal binding)
    let currentRoom = null;
    
    if (portalKey) {
      currentRoom = Array.from(this.roomGraph.values()).find(r => 
        r.portal_key === portalKey
      );
      if (currentRoom) {
        logger.info(`✓ Matched room by portal key: ${currentRoom.name} (ID: ${currentRoom.id})`);
      }
    }
    
    if (!currentRoom) {
      currentRoom = Array.from(this.roomGraph.values()).find(r => 
        r.name.trim() === this.currentRoomName.trim() && 
        r.description.trim() === this.filterOutput(roomData.description).trim() &&
        r.zone_id === this.zoneId
      );
      if (currentRoom) {
        logger.info(`✓ Matched room by name+description: ${currentRoom.name} (ID: ${currentRoom.id})`);
      }
    }

    if (currentRoom) {
      this.currentRoomId = currentRoom.id;
      this.navigationPath = [currentRoom.id];
      logger.info(`✓ Starting from known room: ${currentRoom.name} (ID: ${currentRoom.id})`);
    } else {
      // Room not in database - we need to add it
      logger.info(`✓ Starting from unknown room: ${this.currentRoomName} - will add to graph`);
      await this.addCurrentRoomToGraph(roomData);
    }
  }

  /**
   * Add the current room to the graph if it's not already there
   */
  private async addCurrentRoomToGraph(roomData: any): Promise<void> {
    // Check if room already exists in database
    // Priority 1: Match by portal key (most reliable)
    // Priority 2: Match by name + description + zone (for rooms without portal binding)
    const existingRooms = await this.config.api.getAllEntities('rooms');
    const currentDescription = this.filterOutput(roomData.description).trim();
    
    let existingRoom = null;
    
    // Try matching by portal key first
    if (roomData.portal_key) {
      existingRoom = existingRooms.find((r: any) => 
        r.portal_key === roomData.portal_key
      );
      if (existingRoom) {
        logger.info(`✓ Found existing room by portal key: ${existingRoom.name} (ID: ${existingRoom.id})`);
      }
    }
    
    // Fallback to name + description + zone matching
    if (!existingRoom) {
      existingRoom = existingRooms.find((r: any) => 
        r.name.trim() === roomData.name.trim() && 
        (r.description || '').trim() === currentDescription &&
        r.zone_id === this.zoneId
      );
      if (existingRoom) {
        logger.info(`✓ Found existing room by name+description: ${existingRoom.name} (ID: ${existingRoom.id})`);
      }
    }

    if (existingRoom) {
      // Room exists - update portal key if we have one and it's missing
      const needsPortalKeyUpdate = roomData.portal_key && !existingRoom.portal_key;
      const needsDescriptionUpdate = (existingRoom.description || '').trim() !== currentDescription;
      
      if (needsPortalKeyUpdate || needsDescriptionUpdate) {
        const updateData: any = {
          lastVisited: new Date().toISOString()
        };
        
        if (needsPortalKeyUpdate) {
          updateData.portal_key = roomData.portal_key;
          logger.info(`✓ Adding portal key to existing room: ${existingRoom.name} (${roomData.portal_key})`);
        }
        
        if (needsDescriptionUpdate) {
          updateData.description = currentDescription;
          updateData.rawText = `${roomData.name}\n${currentDescription}`;
          logger.info(`✓ Updating existing room description: ${existingRoom.name}`);
        }
        
        await this.config.api.updateEntity('rooms', existingRoom.id.toString(), updateData);
        existingRoom.description = updateData.description || existingRoom.description;
        existingRoom.portal_key = updateData.portal_key || existingRoom.portal_key;
        existingRoom.rawText = updateData.rawText || existingRoom.rawText;
        existingRoom.lastVisited = updateData.lastVisited;
      }

      // Add to graph
      const roomNode: RoomNode = {
        id: existingRoom.id,
        name: existingRoom.name,
        description: existingRoom.description || '',
        zone_id: existingRoom.zone_id,
        portal_key: existingRoom.portal_key || null,
        connections: new Map(),
        exploredConnections: new Set(),
        unexploredConnections: new Set(),
        visitCount: existingRoom.visitCount || 0,
        lastVisited: existingRoom.lastVisited ? new Date(existingRoom.lastVisited) : new Date(),
        flags: existingRoom.flags || []
      };

      // Load existing exits for this room
      const allExits = await this.config.api.getAllEntities('room_exits');
      const roomExits = allExits.filter((exit: any) => exit.from_room_id === existingRoom.id);

      // If this existing room has no exits saved, process them now
      if (roomExits.length === 0) {
        logger.info(`✓ Existing room ${existingRoom.name} has no exits saved - processing exits now`);
        
        // Get exits for current room
        await this.delay(this.config.delayBetweenActions);
        const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
        this.actionsUsed++;

        const exits = this.parseExitsOutput(exitsResponse);
        const exitDirections = exits.map(e => e.direction.toLowerCase());

        // Save exits for this existing room
        await this.saveExitsForRoom(existingRoom.id, exitDirections);

        // Reload exits after saving
        const updatedAllExits = await this.config.api.getAllEntities('room_exits');
        const updatedRoomExits = updatedAllExits.filter((exit: any) => exit.from_room_id === existingRoom.id);
        
        // Use the updated exits list
        for (const exit of updatedRoomExits) {
          roomNode.connections.set(exit.direction.toLowerCase(), exit.to_room_id || 0);
          if (exit.to_room_id) {
            // Check if target room exists and has been visited
            const targetRoom = existingRooms.find((r: any) => r.id === exit.to_room_id);
            if (targetRoom && targetRoom.visitCount > 0) {
              roomNode.exploredConnections.add(exit.direction.toLowerCase());
            } else {
              roomNode.unexploredConnections.add(exit.direction.toLowerCase());
            }
          } else {
            roomNode.unexploredConnections.add(exit.direction.toLowerCase());
          }
        }

        logger.info(`✓ Processed ${exitDirections.length} exits for existing room: ${existingRoom.name}`);
      } else {
        // Add connections from existing exits
        for (const exit of roomExits) {
          roomNode.connections.set(exit.direction.toLowerCase(), exit.to_room_id || 0);
          if (exit.to_room_id) {
            // Check if target room exists and has been visited
            const targetRoom = existingRooms.find((r: any) => r.id === exit.to_room_id);
            if (targetRoom && targetRoom.visitCount > 0) {
              roomNode.exploredConnections.add(exit.direction.toLowerCase());
            } else {
              roomNode.unexploredConnections.add(exit.direction.toLowerCase());
            }
          } else {
            roomNode.unexploredConnections.add(exit.direction.toLowerCase());
          }
        }
      }

      this.roomGraph.set(existingRoom.id, roomNode);
      this.currentRoomId = existingRoom.id;
      this.currentRoomName = existingRoom.name;
      this.navigationPath = [existingRoom.id];

      logger.info(`✓ Using existing room in graph: ${existingRoom.name} (ID: ${existingRoom.id})`);
      return;
    }

    // Room doesn't exist, create it
    // Get exits for current room
    await this.delay(this.config.delayBetweenActions);
    const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
    this.actionsUsed++;

    const exits = this.parseExitsOutput(exitsResponse);
    const exitDirections = exits.map(e => e.direction.toLowerCase());

    // Save room to database (with portal key if available)
    const roomToSave: any = {
      name: roomData.name,
      description: this.filterOutput(roomData.description),
      rawText: `${roomData.name}\n${this.filterOutput(roomData.description)}`,
      zone_id: this.zoneId,
      visitCount: 1,
      lastVisited: new Date().toISOString()
    };
    
    if (roomData.portal_key) {
      roomToSave.portal_key = roomData.portal_key;
      logger.info(`   💠 Saving room with portal key: ${roomData.portal_key}`);
    }

    const savedRoom = await this.config.api.saveRoom(roomToSave as any);
    if (!savedRoom) {
      throw new Error('Failed to save room to database');
    }

    this.currentRoomId = savedRoom.id;

    // Save exits for the new room
    await this.saveExitsForRoom(savedRoom.id, exitDirections);

    // Create room node
    const roomNode: RoomNode = {
      id: savedRoom.id,
      name: roomData.name,
      description: this.filterOutput(roomData.description),
      zone_id: this.zoneId,
      portal_key: roomData.portal_key || null,
      connections: new Map(),
      exploredConnections: new Set(),
      unexploredConnections: new Set(exitDirections),
      visitCount: 1,
      lastVisited: new Date(),
      flags: roomData.flags || []
    };

    // Add connections (all unexplored initially)
    for (const direction of exitDirections) {
      roomNode.connections.set(direction, 0); // 0 means unknown target
    }

    this.roomGraph.set(savedRoom.id, roomNode);
    this.navigationPath = [savedRoom.id];

    logger.info(`✓ Added new room to graph: ${roomData.name} (ID: ${savedRoom.id})`);
  }

  /**
   * Main systematic exploration loop
   */
  private async exploreSystematically(): Promise<void> {
    while (this.actionsUsed < this.maxActions) {
      // Sync current position to ensure we're tracking correctly
      await this.syncCurrentPosition();

      // If we're lost, try to get back to a known location
      if (this.currentRoomId === -1) {
        logger.warn(`⚠️  Crawler is lost - attempting to find known location`);
        await this.handleLostPosition();
        continue;
      }

      // Find the nearest room with unexplored connections
      const targetRoom = this.findNearestRoomWithUnexploredConnections();

      if (!targetRoom) {
        logger.info('✅ All reachable connections have been explored!');
        break;
      }

      // Navigate to that room if we're not already there
      if (targetRoom.id !== this.currentRoomId) {
        const path = this.findPathToRoom(this.currentRoomId, targetRoom.id);
        if (!path || path.length === 0) {
          logger.warn(`⚠️  Cannot find path to room ${targetRoom.name} (ID: ${targetRoom.id})`);
          continue;
        }

        await this.navigateAlongPath(path);
      }

      // Explore one unexplored connection from this room
      await this.exploreNextUnexploredConnection(targetRoom);

      logger.info(`   Progress: ${this.getExplorationStats().exploredConnections} explored connections, ${this.actionsUsed}/${this.maxActions} actions`);
    }

    if (this.actionsUsed >= this.maxActions) {
      logger.warn(`⚠️  Reached max actions limit (${this.maxActions})`);
    }
  }

  /**
   * Handle when crawler is lost and try to get back to a known location
   */
  private async handleLostPosition(): Promise<void> {
    try {
      logger.info(`🔄 Attempting to recover from lost position...`);

      // First try portal teleport to get back to a known location
      const portalKeys = await this.getAvailablePortalKeys();
      for (const portalKey of portalKeys) {
        try {
          logger.info(`🔄 Trying portal teleport with key: ${portalKey}`);
          await this.delay(this.config.delayBetweenActions);
          const teleportCommand = `enter ${portalKey}`;
          const teleportResponse = await this.config.mudClient.sendAndWait(teleportCommand, this.config.delayBetweenActions);
          this.actionsUsed++;

          if (teleportResponse.includes("You step through the portal") || 
              teleportResponse.includes("shimmering blue portal")) {
            
            // Check if we're back in our zone
            await this.delay(this.config.delayBetweenActions);
            const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
            this.actionsUsed++;
            
            const currentZone = this.extractCurrentZone(zoneCheck);
            if (currentZone === this.currentZone) {
              logger.info(`✅ Successfully teleported back to ${this.currentZone}`);
              
              // Parse current room and sync position
              await this.delay(this.config.delayBetweenActions);
              const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
              this.actionsUsed++;
              
              const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
              const roomMatch = this.findMatchingRoom(roomData, undefined, true);
              
              if (roomMatch) {
                this.currentRoomId = roomMatch.id;
                this.currentRoomName = roomMatch.name;
                this.navigationPath = [roomMatch.id];
                logger.info(`✓ Recovered position to: ${roomMatch.name} (ID: ${roomMatch.id})`);
                return;
              }
            }
          }
        } catch (error) {
          logger.error(`Failed to use portal key ${portalKey}:`, error);
        }
      }

      // Portal teleport failed - try the old method
      logger.info(`🔄 Portal teleport failed - trying exploration-based recovery...`);

      // Get current room data
      await this.delay(this.config.delayBetweenActions);
      const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
      this.actionsUsed++;

      const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);

      // Try to find this room in our graph with description matching allowed
      const foundRoom = this.findMatchingRoom(roomData, undefined, true);

      if (foundRoom) {
        logger.info(`✓ Found current location in graph: ${foundRoom.name} (ID: ${foundRoom.id})`);
        this.currentRoomId = foundRoom.id;
        this.currentRoomName = foundRoom.name;
        this.navigationPath = [foundRoom.id];
        return;
      }

      // If we can't find it, try to navigate to a known room using exploration
      // Look for any room in the graph and try to find a path to it
      const knownRooms = Array.from(this.roomGraph.values());
      if (knownRooms.length === 0) {
        logger.error(`❌ No known rooms in graph - cannot recover from lost position`);
        return;
      }

      // Try the most recently visited room first
      const mostRecentRoom = knownRooms.sort((a, b) =>
        new Date(b.lastVisited).getTime() - new Date(a.lastVisited).getTime()
      )[0];

      logger.info(`🔄 Attempting to navigate to most recent known room: ${mostRecentRoom.name}`);

      // For now, just mark as lost and continue - the sync will keep trying
      // In a more sophisticated implementation, we could try random movements
      // or use zone information to find our way back
      logger.warn(`⚠️  Unable to recover position automatically - will continue with limited functionality`);

    } catch (error) {
      logger.error('❌ Failed to handle lost position:', error);
    }
  }
  private async syncCurrentPosition(): Promise<void> {
    try {
      // Get current room information
      await this.delay(this.config.delayBetweenActions);
      const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
      this.actionsUsed++;

      const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
      const actualRoomName = roomData.name.trim();

      // Check if we're where we think we are
      if (actualRoomName !== this.currentRoomName.trim()) {
        logger.warn(`⚠️  Position desync detected. Expected: "${this.currentRoomName}", Actual: "${actualRoomName}"`);

        // Try to get portal key for better matching
        const portalKey = await this.roomProcessor.getPortalKey(roomData);
        if (portalKey) {
          roomData.portal_key = portalKey;
        }

        // Find the actual room in our graph using improved matching
        const actualRoom = this.findMatchingRoom(roomData, undefined, true);

        if (actualRoom) {
          logger.info(`✓ Resynced position to: ${actualRoom.name} (ID: ${actualRoom.id})`);
          this.currentRoomId = actualRoom.id;
          this.currentRoomName = actualRoom.name;
          this.navigationPath = [actualRoom.id]; // Reset navigation path
        } else {
          // Unknown room - we need to add it to the graph or handle being lost
          logger.warn(`⚠️  Current room "${actualRoomName}" not found in graph - adding it as new room`);

          // Try to add the unknown room to the graph
          try {
            // Get exits for the unknown room
            await this.delay(this.config.delayBetweenActions);
            const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
            this.actionsUsed++;

            const exits = this.parseExitsOutput(exitsResponse);
            const exitDirections = exits.map(e => e.direction.toLowerCase());

            // Try to get portal key
            const portalKey = await this.roomProcessor.getPortalKey(roomData);
            if (portalKey) {
              roomData.portal_key = portalKey;
            }

            // Get current zone - CRITICAL: Check if we're still in our target zone
            await this.delay(this.config.delayBetweenActions);
            const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
            this.actionsUsed++;
            const actualZone = this.extractCurrentZone(zoneCheck);
            
            // If we're in a different zone, try to get back to our zone or save the cross-zone room
            if (actualZone !== this.currentZone) {
              logger.warn(`⚠️  Current room "${actualRoomName}" is in different zone "${actualZone}" - attempting to return to ${this.currentZone}`);
              
              // Try to find a way back to our original zone
              // Look at exits and see if any lead back to our zone
              const exits = this.parseExitsOutput(exitsResponse);
              const exitDirections = exits.map(e => e.direction.toLowerCase());
              
              // Try each exit to see if it leads back to our zone
              let foundReturnPath = false;
              for (const direction of exitDirections) {
                logger.info(`   🔄 Trying ${direction} to return to ${this.currentZone}...`);
                
                await this.delay(this.config.delayBetweenActions);
                const testMove = await this.config.mudClient.sendAndWait(direction, this.config.delayBetweenActions);
                this.actionsUsed++;
                
                if (testMove.includes("Alas, you cannot go that way")) {
                  logger.info(`   ❌ ${direction} blocked`);
                  continue;
                }
                
                // Check if we're back in our zone
                await this.delay(this.config.delayBetweenActions);
                const returnZoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
                this.actionsUsed++;
                
                const returnZone = this.extractCurrentZone(returnZoneCheck);
                if (returnZone === this.currentZone) {
                  logger.info(`   ✅ ${direction} led back to ${this.currentZone} - returning to exploration`);
                  foundReturnPath = true;
                  
                  // Parse the room we ended up in and sync position
                  const returnRoomData = await this.roomProcessor['parseLookOutput'](testMove);
                  const returnRoomMatch = this.findMatchingRoom(returnRoomData, undefined, true);
                  
                  if (returnRoomMatch) {
                    this.currentRoomId = returnRoomMatch.id;
                    this.currentRoomName = returnRoomMatch.name;
                    logger.info(`   ✓ Resynced position to: ${returnRoomMatch.name} (ID: ${returnRoomMatch.id})`);
                  } else {
                    // Save this room as unknown in our zone
                    const zoneId = await this.getZoneId(returnZone);
                    const roomToSave: any = {
                      name: returnRoomData.name,
                      description: this.filterOutput(returnRoomData.description),
                      rawText: `${returnRoomData.name}\n${this.filterOutput(returnRoomData.description)}`,
                      zone_id: zoneId,
                      visitCount: 1,
                      lastVisited: new Date().toISOString()
                    };
                    
                    const savedRoom = await this.config.api.saveRoom(roomToSave);
                    if (savedRoom) {
                      this.currentRoomId = savedRoom.id;
                      this.currentRoomName = returnRoomData.name;
                      logger.info(`   ✓ Saved and synced to unknown room: ${returnRoomData.name} (ID: ${savedRoom.id})`);
                    }
                  }
                  break;
                } else {
                  // Still in wrong zone, go back
                  const backDirection = this.getOppositeDirection(direction);
                  if (backDirection) {
                    await this.delay(this.config.delayBetweenActions);
                    await this.config.mudClient.sendAndWait(backDirection, this.config.delayBetweenActions);
                    this.actionsUsed++;
                  }
                }
              }
              
              if (!foundReturnPath) {
                // Couldn't find a way back - try using portal keys first, then mark as lost
                logger.warn(`   ❌ Could not find path back to ${this.currentZone} - trying portal teleport first`);
                
                // Try to use a portal key to get back to our zone
                const portalKeys = await this.getAvailablePortalKeys();
                let teleportedBack = false;
                
                for (const portalKey of portalKeys) {
                  try {
                    logger.info(`   🔄 Trying to teleport back using portal key: ${portalKey}`);
                    await this.delay(this.config.delayBetweenActions);
                    const teleportCommand = `enter ${portalKey}`;
                    const teleportResponse = await this.config.mudClient.sendAndWait(teleportCommand, this.config.delayBetweenActions);
                    this.actionsUsed++;
                    
                    if (teleportResponse.includes("You step through the portal") || 
                        teleportResponse.includes("shimmering blue portal")) {
                      
                      // Check if we're back in our zone
                      await this.delay(this.config.delayBetweenActions);
                      const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
                      this.actionsUsed++;
                      
                      const currentZone = this.extractCurrentZone(zoneCheck);
                      if (currentZone === this.currentZone) {
                        logger.info(`   ✅ Successfully teleported back to ${this.currentZone} using portal key ${portalKey}`);
                        teleportedBack = true;
                        
                        // Parse current room and sync position
                        await this.delay(this.config.delayBetweenActions);
                        const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
                        this.actionsUsed++;
                        
                        const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
                        const roomMatch = this.findMatchingRoom(roomData, undefined, true);
                        
                        if (roomMatch) {
                          this.currentRoomId = roomMatch.id;
                          this.currentRoomName = roomMatch.name;
                          logger.info(`   ✓ Resynced position to: ${roomMatch.name} (ID: ${roomMatch.id})`);
                        } else {
                          // Save as new room if not found
                          const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
                          this.actionsUsed++;
                          const exits = this.parseExitsOutput(exitsResponse);
                          const exitDirections = exits.map(e => e.direction.toLowerCase());
                          
                          const portalKeyForRoom = await this.roomProcessor.getPortalKey(roomData);
                          if (portalKeyForRoom) {
                            roomData.portal_key = portalKeyForRoom;
                          }
                          
                          const roomToSave: any = {
                            name: roomData.name,
                            description: this.filterOutput(roomData.description),
                            rawText: `${roomData.name}\n${this.filterOutput(roomData.description)}`,
                            zone_id: this.zoneId,
                            visitCount: 1,
                            lastVisited: new Date().toISOString()
                          };
                          
                          if (roomData.portal_key) {
                            roomToSave.portal_key = roomData.portal_key;
                          }
                          
                          const savedRoom = await this.config.api.saveRoom(roomToSave);
                          if (savedRoom) {
                            await this.saveExitsForRoom(savedRoom.id, exitDirections);
                            this.currentRoomId = savedRoom.id;
                            this.currentRoomName = roomData.name;
                            logger.info(`   ✓ Saved and synced to teleported room: ${roomData.name} (ID: ${savedRoom.id})`);
                          }
                        }
                        break;
                      } else {
                        logger.info(`   ❌ Portal key ${portalKey} led to ${currentZone} instead of ${this.currentZone}`);
                      }
                    }
                  } catch (error) {
                    logger.error(`   ❌ Failed to use portal key ${portalKey}:`, error);
                  }
                }
                
                if (!teleportedBack) {
                  // Portal teleport failed - save the cross-zone room and mark as lost
                  logger.warn(`   ❌ Portal teleport failed - saving cross-zone room and marking as lost`);
                  
                  // Try to get portal key
                  const portalKey = await this.roomProcessor.getPortalKey(roomData);
                  if (portalKey) {
                    roomData.portal_key = portalKey;
                  }
                  
                  // Get the correct zone ID for the new zone
                  const newZoneId = await this.getZoneId(actualZone);
                  
                  // Save the room to database (but NOT to exploration graph)
                  const roomToSave: any = {
                    name: actualRoomName,
                    description: this.filterOutput(roomData.description),
                    rawText: `${actualRoomName}\n${this.filterOutput(roomData.description)}`,
                    zone_id: newZoneId,
                    visitCount: 1,
                    lastVisited: new Date().toISOString()
                  };
                  
                  if (roomData.portal_key) {
                    roomToSave.portal_key = roomData.portal_key;
                    logger.info(`   💠 Saving cross-zone room with portal key: ${roomData.portal_key}`);
                  }
                  
                  const savedRoom = await this.config.api.saveRoom(roomToSave);
                  if (savedRoom) {
                    await this.saveExitsForRoom(savedRoom.id, exitDirections);
                    logger.info(`   ✓ Saved cross-zone room: ${actualRoomName} (ID: ${savedRoom.id}) in zone ${actualZone}`);
                  }
                  
                  // Mark as lost but don't keep trying to sync
                  this.currentRoomId = -1;
                  this.currentRoomName = "LOST_IN_DIFFERENT_ZONE";
                }
                return;
              }
              
              return; // Successfully returned to our zone
            }
            
            const zoneId = await this.getZoneId(actualZone);

            // Save new room
            const roomToSave: any = {
              name: actualRoomName,
              description: this.filterOutput(roomData.description),
              rawText: `${actualRoomName}\n${this.filterOutput(roomData.description)}`,
              zone_id: zoneId,
              visitCount: 1,
              lastVisited: new Date().toISOString()
            };

            if (roomData.portal_key) {
              roomToSave.portal_key = roomData.portal_key;
              logger.info(`💠 Saving unknown room with portal key: ${roomData.portal_key}`);
            }

            const savedRoom = await this.config.api.saveRoom(roomToSave);
            if (savedRoom) {
              // Save exits
              await this.saveExitsForRoom(savedRoom.id, exitDirections);

              // Create room node
              const newRoomNode: RoomNode = {
                id: savedRoom.id,
                name: actualRoomName,
                description: this.filterOutput(roomData.description),
                zone_id: zoneId,
                portal_key: roomData.portal_key || null,
                connections: new Map(),
                exploredConnections: new Set(),
                unexploredConnections: new Set(exitDirections),
                visitCount: 1,
                lastVisited: new Date(),
                flags: roomData.flags || []
              };

              // Add connections
              for (const exitDir of exitDirections) {
                newRoomNode.connections.set(exitDir, 0);
              }

              this.roomGraph.set(savedRoom.id, newRoomNode);

              // Update position to the new room
              this.currentRoomId = savedRoom.id;
              this.currentRoomName = actualRoomName;
              this.navigationPath = [savedRoom.id];

              logger.info(`✓ Added unknown room during sync: ${actualRoomName} (ID: ${savedRoom.id})`);
            } else {
              logger.error(`❌ Failed to save unknown room "${actualRoomName}" during position sync`);
              // Mark as lost but continue
              this.currentRoomId = -1; // Special value to indicate lost
              this.currentRoomName = "UNKNOWN";
            }
          } catch (error) {
            logger.error('❌ Failed to add unknown room during position sync:', error);
            // Mark as lost but continue
            this.currentRoomId = -1;
            this.currentRoomName = "UNKNOWN";
          }
        }
      }
    } catch (error) {
      logger.error('❌ Failed to sync current position:', error);
    }
  }
  private findNearestRoomWithUnexploredConnections(): RoomNode | null {
    // If we're lost, we can't navigate properly
    if (this.currentRoomId === -1) {
      return null;
    }

    // First check current room
    const currentRoom = this.roomGraph.get(this.currentRoomId);
    if (currentRoom && currentRoom.unexploredConnections.size > 0) {
      return currentRoom;
    }

    // Use BFS to find nearest room with unexplored connections
    const visited = new Set<number>();
    const queue: number[] = [this.currentRoomId];

    while (queue.length > 0) {
      const roomId = queue.shift()!;
      if (visited.has(roomId)) continue;
      visited.add(roomId);

      const room = this.roomGraph.get(roomId);
      if (!room) continue;

      if (room.unexploredConnections.size > 0) {
        return room;
      }

      // Add connected rooms to queue
      for (const targetId of room.connections.values()) {
        if (targetId > 0 && !visited.has(targetId)) {
          queue.push(targetId);
        }
      }
    }

    return null;
  }

  /**
   * Find a path from current room to target room using BFS
   */
  private findPathToRoom(startId: number, targetId: number): number[] | null {
    if (startId === targetId) return [startId];

    const visited = new Set<number>();
    const queue: Array<{ roomId: number; path: number[] }> = [{ roomId: startId, path: [startId] }];

    while (queue.length > 0) {
      const { roomId, path } = queue.shift()!;
      if (visited.has(roomId)) continue;
      visited.add(roomId);

      const room = this.roomGraph.get(roomId);
      if (!room) continue;

      // Check all connections
      for (const [direction, targetId] of room.connections) {
        if (targetId === 0) continue; // Unknown target

        if (targetId === targetId) {
          return [...path, targetId];
        }

        if (!visited.has(targetId)) {
          queue.push({
            roomId: targetId,
            path: [...path, targetId]
          });
        }
      }
    }

    return null;
  }

  /**
   * Navigate along a path of room IDs
   */
  private async navigateAlongPath(path: number[]): Promise<void> {
    for (let i = 1; i < path.length; i++) {
      const fromRoomId = path[i - 1];
      const toRoomId = path[i];

      const fromRoom = this.roomGraph.get(fromRoomId);
      if (!fromRoom) continue;

      // Find the direction to move
      let moveDirection: string | null = null;
      for (const [direction, targetId] of fromRoom.connections) {
        if (targetId === toRoomId) {
          moveDirection = direction;
          break;
        }
      }

      if (!moveDirection) {
        logger.error(`❌ Cannot find direction from room ${fromRoomId} to ${toRoomId}`);
        return;
      }

      // Move in that direction
      logger.info(`🧭 Moving ${moveDirection} from ${fromRoom.name} to room ${toRoomId}`);
      await this.delay(this.config.delayBetweenActions);
      const response = await this.config.mudClient.sendAndWait(moveDirection, this.config.delayBetweenActions);
      this.actionsUsed++;

      if (response.includes("Alas, you cannot go that way")) {
        logger.error(`❌ Movement blocked: ${moveDirection}`);
        // Update graph - this connection might not exist
        fromRoom.unexploredConnections.delete(moveDirection);
        fromRoom.exploredConnections.add(moveDirection);
        return;
      }

      // Get the expected room from graph
      const toRoom = this.roomGraph.get(toRoomId);
      if (!toRoom) {
        logger.error(`❌ Target room ${toRoomId} not found in graph`);
        return;
      }

      // Parse room data from movement response (no need for separate "look" command)
      const roomData = await this.roomProcessor['parseLookOutput'](response);
      const expectedName = toRoom.name.toLowerCase().trim();
      const expectedDescription = toRoom.description.toLowerCase().trim();
      const actualName = roomData.name.toLowerCase().trim();
      const actualDescription = this.filterOutput(roomData.description).toLowerCase().trim();

      const namesMatch = expectedName === actualName ||
                        expectedName.includes(actualName) ||
                        actualName.includes(expectedName) ||
                        this.calculateRoomSimilarity(expectedName, actualName) > 0.8;
      
      const descriptionsMatch = expectedDescription === actualDescription ||
                               this.calculateRoomSimilarity(expectedDescription, actualDescription) > 0.8;

      if (!namesMatch || !descriptionsMatch) {
        logger.warn(`⚠️  Location verification failed. Expected: "${toRoom.name}", Got: "${roomData.name}"`);
        // Resync position since we ended up somewhere unexpected
        await this.syncCurrentPosition();
        return;
      }

      // Update current position
      this.currentRoomId = toRoomId;
      this.currentRoomName = toRoom.name;
      toRoom.visitCount++;
      toRoom.lastVisited = new Date();

      // Add to navigation path
      this.navigationPath.push(toRoomId);
    }
  }

  /**
   * Explore the next unexplored connection from a room
   */
  private async exploreNextUnexploredConnection(room: RoomNode): Promise<void> {
    // CRITICAL: Ensure we're actually in the expected room before exploring
    // Position desync can occur after return path verification
    if (this.currentRoomId !== room.id) {
      logger.info(`🔄 Position desync detected - navigating to ${room.name} before exploring`);
      const path = this.findPathToRoom(this.currentRoomId, room.id);
      if (path && path.length > 1) {
        await this.navigateAlongPath(path);
      } else {
        logger.error(`❌ Cannot navigate to ${room.name} for exploration`);
        return;
      }
    }

    const direction = Array.from(room.unexploredConnections)[0];
    if (!direction) return;

    logger.info(`🧭 Exploring ${direction} from ${room.name}...`);

    // Try to move - the movement response already contains room description, no need for "look"
    await this.delay(this.config.delayBetweenActions);
    const moveResponse = await this.config.mudClient.sendAndWait(direction, this.config.delayBetweenActions);
    this.actionsUsed++;

    if (moveResponse.includes("Alas, you cannot go that way")) {
      logger.info(`   ❌ Direction ${direction} blocked`);
      room.exploredConnections.add(direction);
      room.unexploredConnections.delete(direction);
      return;
    }

    // Check if we're still in the same zone FIRST
    await this.delay(this.config.delayBetweenActions);
    const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
    this.actionsUsed++;

    const currentZone = this.extractCurrentZone(zoneCheck);
    if (currentZone !== this.currentZone) {
      logger.info(`   🏞️  Moved to different zone: ${currentZone}`);
      
      // Parse the room data from the movement response
      const roomData = await this.roomProcessor['parseLookOutput'](moveResponse);
      const newRoomName = roomData.name;
      const newRoomDescription = this.filterOutput(roomData.description).trim();
      
      logger.info(`   🆕 Discovered room in different zone: ${newRoomName} (${currentZone})`);
      
      // Get exits for the room in the other zone
      await this.delay(this.config.delayBetweenActions);
      const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
      this.actionsUsed++;
      
      const exits = this.parseExitsOutput(exitsResponse);
      const exitDirections = exits.map(e => e.direction.toLowerCase());
      
      // Try to get portal key
      const portalKey = await this.roomProcessor.getPortalKey(roomData);
      if (portalKey) {
        roomData.portal_key = portalKey;
      }
      
      // Get the correct zone ID for the new zone
      const newZoneId = await this.getZoneId(currentZone);
      
      // Save the room to database (but NOT to exploration graph)
      const roomToSave: any = {
        name: newRoomName,
        description: newRoomDescription,
        rawText: `${newRoomName}\n${newRoomDescription}`,
        zone_id: newZoneId, // Use the correct zone ID for the new zone
        zone_exit: true, // Mark as zone exit since it's at a zone boundary
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };
      
      if (roomData.portal_key) {
        roomToSave.portal_key = roomData.portal_key;
        logger.info(`   💠 Saving cross-zone room with portal key: ${roomData.portal_key}`);
      }
      
      const savedRoom = await this.config.api.saveRoom(roomToSave);
      if (savedRoom) {
        // Save exits for the room in the other zone
        await this.saveExitsForRoom(savedRoom.id, exitDirections);
        
        // Update the connection from source room to point to the cross-zone room
        room.connections.set(direction, savedRoom.id);
        
        // Update the exit in database to set the destination
        await this.updateExitDestination(room.id, direction, savedRoom.id);
        
        // Update the reverse exit from cross-zone room back to source room
        const reverseDirection = this.getOppositeDirection(direction);
        if (reverseDirection) {
          await this.updateExitDestination(savedRoom.id, reverseDirection, room.id);
        }
        
        logger.info(`   ✓ Saved cross-zone room: ${newRoomName} (ID: ${savedRoom.id}) in zone ${currentZone}`);
      } else {
        logger.error(`   ❌ Failed to save cross-zone room: ${newRoomName}`);
      }
      
      // Mark the source room as a zone exit as well
      try {
        await this.config.api.updateEntity('rooms', room.id.toString(), {
          zone_exit: true,
          lastVisited: new Date().toISOString()
        });
        logger.info(`   🏞️  Marked source room ${room.name} (ID: ${room.id}) as zone exit`);
      } catch (error) {
        logger.error(`   ❌ Failed to mark source room ${room.name} as zone exit:`, error);
      }
      
      // Mark as explored to prevent infinite loop
      logger.info(`   ✓ Marking ${direction} as explored (zone boundary)`);
      room.exploredConnections.add(direction);
      room.unexploredConnections.delete(direction);
      
      // Go back immediately to original zone
      const oppositeDir = this.getOppositeDirection(direction);
      if (oppositeDir) {
        await this.delay(this.config.delayBetweenActions);
        await this.config.mudClient.sendAndWait(oppositeDir, this.config.delayBetweenActions);
        this.actionsUsed++;
        // Don't sync position - we know we're back in the original zone
      }
      return;
    }

    // We're still in the same zone, parse the room from the movement response
    const roomData = await this.roomProcessor['parseLookOutput'](moveResponse);
    const newRoomName = roomData.name;

    // Check if the move actually changed the room (by comparing name AND description)
    const currentDescription = this.filterOutput(roomData.description).trim();
    const currentRoomNode = this.roomGraph.get(this.currentRoomId);
    const currentRoomDescription = currentRoomNode ? currentRoomNode.description.trim() : '';

    if (newRoomName.trim() === this.currentRoomName.trim() && currentDescription === currentRoomDescription) {
      logger.info(`   ❌ Direction ${direction} didn't change room - marking as explored`);
      room.exploredConnections.add(direction);
      room.unexploredConnections.delete(direction);
      return;
    }

    // Look for existing room in graph
    const newRoomDescription = this.filterOutput(roomData.description).trim();
    let existingRoom = this.findMatchingRoom({
      name: newRoomName,
      description: newRoomDescription,
      portal_key: roomData.portal_key
    }, undefined, false); // Disable description-only matching for new room discovery

    if (existingRoom) {
      logger.info(`   ✓ Already know about room: ${existingRoom.name} (ID: ${existingRoom.id})`);

      // Update the connection
      room.connections.set(direction, existingRoom.id);
      room.exploredConnections.add(direction);
      room.unexploredConnections.delete(direction);

      // Update the exit in database to set the destination
      await this.updateExitDestination(room.id, direction, existingRoom.id);

      // Update current position
      this.currentRoomId = existingRoom.id;
      this.currentRoomName = existingRoom.name;
      existingRoom.visitCount++;
      existingRoom.lastVisited = new Date();
      this.navigationPath.push(existingRoom.id);

      // Verify return connection
      await this.verifyReturnConnection(existingRoom, direction, room);

    } else {
      // New room discovered - use minimal processing to save actions
      logger.info(`   🆕 Discovered new room: ${newRoomName}`);

      // Get exits only (don't do full room processing with object examination)
      await this.delay(this.config.delayBetweenActions);
      const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
      this.actionsUsed++;

      const exits = this.parseExitsOutput(exitsResponse);
      const exitDirections = exits.map(e => e.direction.toLowerCase());

      // Try to get portal key for unique identification
      const portalKey = await this.roomProcessor.getPortalKey(roomData);
      if (portalKey) {
        roomData.portal_key = portalKey;
      }

      // Save new room with minimal data (we already confirmed we're in the correct zone)
      const roomToSave: any = {
        name: newRoomName,
        description: newRoomDescription,
        rawText: `${newRoomName}\n${newRoomDescription}`,
        zone_id: this.zoneId, // Use the current zone ID since we already verified we're in the right zone
        visitCount: 1,
        lastVisited: new Date().toISOString()
      };

      if (roomData.portal_key) {
        roomToSave.portal_key = roomData.portal_key;
        logger.info(`   💠 Saving room with portal key: ${roomData.portal_key}`);
      }

      const savedRoom = await this.config.api.saveRoom(roomToSave);
      if (!savedRoom) {
        throw new Error('Failed to save room to database');
      }

      // Save exits
      await this.saveExitsForRoom(savedRoom.id, exitDirections);

      // Create room node and add to graph
      const newRoomNode: RoomNode = {
        id: savedRoom.id,
        name: newRoomName,
        description: newRoomDescription,
        zone_id: this.zoneId,
        portal_key: roomData.portal_key || null,
        connections: new Map(),
        exploredConnections: new Set(),
        unexploredConnections: new Set(exitDirections),
        visitCount: 1,
        lastVisited: new Date(),
        flags: roomData.flags || []
      };

      // Add connections
      for (const exitDir of exitDirections) {
        newRoomNode.connections.set(exitDir, 0); // Unknown targets initially
      }

      this.roomGraph.set(savedRoom.id, newRoomNode);

      // Update the connection from source room
      room.connections.set(direction, savedRoom.id);
      room.exploredConnections.add(direction);
      room.unexploredConnections.delete(direction);
      
      // Update the exit in database to set the destination
      await this.updateExitDestination(room.id, direction, savedRoom.id);

      // Update current position
      this.currentRoomId = savedRoom.id;
      this.currentRoomName = newRoomName;
      this.navigationPath.push(savedRoom.id);

      logger.info(`✓ Added new room: ${newRoomName} (ID: ${savedRoom.id})`);

      // Verify return connection - CRITICAL: Only keep the connection if return path works
      const returnVerified = await this.verifyReturnConnection(newRoomNode, direction, room);
      if (!returnVerified) {
        // Return path verification failed - this suggests a special connection
        // Remove the connection we just created since it's not a direct bidirectional link
        logger.warn(`   ⚠️  Return path verification failed - removing direct connection and treating as special connection`);
        room.connections.set(direction, 0); // Reset to unknown
        room.exploredConnections.delete(direction);
        room.unexploredConnections.add(direction);
        
        // Reset the exit destination in database
        await this.updateExitDestination(room.id, direction, null);
        
        // Mark as explored but don't create the connection
        room.exploredConnections.add(direction);
        room.unexploredConnections.delete(direction);
      }
    }
  }

  /**
   * Verify that the return connection works
   */
  private async verifyReturnConnection(fromRoom: RoomNode, directionMoved: string, expectedTargetRoom: RoomNode): Promise<boolean> {
    const returnDirection = this.getOppositeDirection(directionMoved);
    if (!returnDirection) {
      logger.info(`   ⚠️  Cannot determine return direction from ${directionMoved} - one-way connection possible`);
      return false;
    }

    logger.info(`   🔄 Verifying return path: ${returnDirection} from ${fromRoom.name} should lead back to ${expectedTargetRoom.name}`);

    // Try to move back
    await this.delay(this.config.delayBetweenActions);
    const returnResponse = await this.config.mudClient.sendAndWait(returnDirection, this.config.delayBetweenActions);
    this.actionsUsed++;

    if (returnResponse.includes("Alas, you cannot go that way")) {
      logger.info(`   ❌ Return path ${returnDirection} blocked - one-way connection confirmed`);
      // This is actually valid - one-way connections exist in MUDs
      return false;
    }

    // Check if we're back in the expected zone first
    await this.delay(this.config.delayBetweenActions);
    const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
    this.actionsUsed++;

    const currentZone = this.extractCurrentZone(zoneCheck);
    if (currentZone !== this.currentZone) {
      logger.info(`   🏞️  Return path led to different zone: ${currentZone} - possible teleporter or zone exit`);
      // Go back to original zone if possible
      const backDirection = this.getOppositeDirection(returnDirection);
      if (backDirection) {
        await this.delay(this.config.delayBetweenActions);
        await this.config.mudClient.sendAndWait(backDirection, this.config.delayBetweenActions);
        this.actionsUsed++;
      }
      return false;
    }

    // Verify we're at the expected room
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = await this.roomProcessor['parseLookOutput'](lookResponse);
    const expectedName = expectedTargetRoom.name.toLowerCase().trim();
    const expectedDescription = expectedTargetRoom.description.toLowerCase().trim();
    const actualName = roomData.name.toLowerCase().trim();
    const actualDescription = this.filterOutput(roomData.description).toLowerCase().trim();

    const namesMatch = expectedName === actualName ||
                      expectedName.includes(actualName) ||
                      actualName.includes(expectedName) ||
                      this.calculateRoomSimilarity(expectedName, actualName) > 0.8;
    
    const descriptionsMatch = expectedDescription === actualDescription ||
                             this.calculateRoomSimilarity(expectedDescription, actualDescription) > 0.8;

    if (namesMatch && descriptionsMatch) {
      // Success! Update connections in both rooms
      fromRoom.connections.set(returnDirection, expectedTargetRoom.id);
      fromRoom.exploredConnections.add(returnDirection);
      fromRoom.unexploredConnections.delete(returnDirection);

      expectedTargetRoom.exploredConnections.add(directionMoved);
      expectedTargetRoom.unexploredConnections.delete(directionMoved);

      // Update exit destinations in database
      await this.updateExitDestination(fromRoom.id, returnDirection, expectedTargetRoom.id);
      await this.updateExitDestination(expectedTargetRoom.id, directionMoved, fromRoom.id);

      // Update current position since we moved back
      this.currentRoomId = expectedTargetRoom.id;
      this.currentRoomName = expectedTargetRoom.name;

      logger.info(`   ✅ Return path verified - bidirectional connection confirmed`);
      return true;
    } else {
      // CRITICAL: If return path doesn't work as expected, this suggests the original
      // movement may have been a special connection (teleporter, one-way, etc.)
      // DO NOT try to connect to whatever room we ended up in - this causes wrong connections
      logger.warn(`   ⚠️  Return path verification failed - ${returnDirection} from ${fromRoom.name} led to ${roomData.name} instead of ${expectedTargetRoom.name}`);
      logger.warn(`   ⚠️  This suggests a special connection (teleporter, one-way passage, etc.) - not updating connections`);

      // Mark the original direction as explored but don't create a return connection
      // The connection might be one-way or have special behavior
      fromRoom.exploredConnections.add(returnDirection);
      fromRoom.unexploredConnections.delete(returnDirection);

      // Don't update the database connection for the return direction
      // Leave it as unknown (to_room_id: null) to indicate it's not a simple bidirectional connection

      // Try to get back to the expected room using navigation instead of assuming direct connection
      const currentRoomMatch = this.findMatchingRoom(roomData, undefined, true); // Allow description matching for position resync
      if (currentRoomMatch && currentRoomMatch.id !== expectedTargetRoom.id) {
        logger.info(`   🔄 Attempting to navigate back to ${expectedTargetRoom.name} from ${currentRoomMatch.name}`);
        // Try to find a path back
        const pathBack = this.findPathToRoom(currentRoomMatch.id, expectedTargetRoom.id);
        if (pathBack && pathBack.length > 1) {
          await this.navigateAlongPath(pathBack);
        } else {
          logger.warn(`   ⚠️  Cannot find path back to ${expectedTargetRoom.name} - staying in ${currentRoomMatch.name}`);
          // Update current position to where we actually are
          this.currentRoomId = currentRoomMatch.id;
          this.currentRoomName = currentRoomMatch.name;
        }
      }
    }
    return false;
  }

  /**
   * Save a new room to the database
   */
  private async saveNewRoomToDatabase(roomData: any, exitDirections: string[]): Promise<any> {
    const roomToSave: any = {
      name: roomData.name,
      description: this.filterOutput(roomData.description),
      rawText: `${roomData.name}\n${this.filterOutput(roomData.description)}`,
      zone_id: this.zoneId,
      visitCount: 1,
      lastVisited: new Date().toISOString()
    };

    // Include portal key if available
    if (roomData.portal_key) {
      roomToSave.portal_key = roomData.portal_key;
      logger.info(`   💠 Saving room with portal key: ${roomData.portal_key}`);
    }

    const savedRoom = await this.config.api.saveRoom(roomToSave);
    if (!savedRoom) {
      throw new Error('Failed to save room to database');
    }

    // Save exits
    await this.saveExitsForRoom(savedRoom.id, exitDirections);

    return savedRoom;
  }

  /**
   * Save exits for a room
   */
  private async saveExitsForRoom(roomId: number, exitDirections: string[]): Promise<void> {
    for (const direction of exitDirections) {
      try {
        // Check if exit already exists
        const existingExit = await this.config.api.getAllEntities('room_exits', {
          from_room_id: roomId,
          direction: direction
        });

        if (existingExit.length > 0) {
          // Exit already exists, skip saving
          continue;
        }

        const exitToSave: any = {
          from_room_id: roomId,
          to_room_id: null, // Will be updated when target is discovered
          direction: direction,
          description: `${direction} exit`,
          is_door: false,
          is_locked: false,
          is_zone_exit: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await this.config.api.saveEntity('room_exits', exitToSave);
      } catch (error: any) {
        // Check if this is a unique constraint violation (exit already exists)
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
          logger.info(`Exit ${direction} for room ${roomId} already exists, skipping`);
          continue;
        }
        // Log other errors but continue with other exits
        logger.error(`Failed to save exit ${direction} for room ${roomId}:`, error);
      }
    }
  }

  /**
   * Update an exit's destination room ID
   */
  private async updateExitDestination(fromRoomId: number, direction: string, toRoomId: number | null): Promise<void> {
    try {
      // Find the exit record
      const existingExits = await this.config.api.getAllEntities('room_exits', {
        from_room_id: fromRoomId,
        direction: direction
      });

      if (existingExits.length === 0) {
        logger.info(`Exit ${direction} from room ${fromRoomId} doesn't exist yet (will be created on next visit)`);
        return;
      }

      const exitToUpdate = existingExits[0];

      // Update the to_room_id
      const updatedExit = {
        to_room_id: toRoomId,
        updatedAt: new Date().toISOString()
      };

      await this.config.api.updateEntity('room_exits', exitToUpdate.id.toString(), updatedExit);
      logger.info(`Updated exit ${direction} from room ${fromRoomId} to point to room ${toRoomId}`);

    } catch (error) {
      logger.error(`Failed to update exit destination for ${direction} from room ${fromRoomId}:`, error);
    }
  }

  /**
   * Get exploration statistics
   */
  private getExplorationStats(): { totalRooms: number, exploredConnections: number, unexploredConnections: number } {
    let totalExplored = 0;
    let totalUnexplored = 0;

    for (const room of this.roomGraph.values()) {
      totalExplored += room.exploredConnections.size;
      totalUnexplored += room.unexploredConnections.size;
    }

    return {
      totalRooms: this.roomGraph.size,
      exploredConnections: totalExplored,
      unexploredConnections: totalUnexplored
    };
  }
  private async getZoneId(zoneName: string): Promise<number> {
    const zones = await this.config.api.getAllEntities('zones');
    
    // First try exact match on name
    const exactMatch = zones.find((z: any) => z.name === zoneName);
    if (exactMatch) {
      return exactMatch.id;
    }
    
    // Try exact match on alias
    const aliasMatch = zones.find((z: any) => z.alias === zoneName);
    if (aliasMatch) {
      logger.info(`✓ Matched zone "${zoneName}" to alias of "${aliasMatch.name}"`);
      return aliasMatch.id;
    }
    
    // Try flexible matching for zone names
    const normalizedZoneName = zoneName.toLowerCase().trim();
    for (const zone of zones) {
      const normalizedDbName = zone.name.toLowerCase().trim();
      const normalizedAlias = zone.alias?.toLowerCase().trim();
      
      // Check for high similarity or substring matches on name
      if (this.calculateSimilarity(normalizedZoneName, normalizedDbName) > 0.8 ||
          normalizedZoneName.includes(normalizedDbName) || 
          normalizedDbName.includes(normalizedZoneName)) {
        logger.info(`✓ Matched zone "${zoneName}" to "${zone.name}"`);
        return zone.id;
      }
      
      // Check for high similarity or substring matches on alias
      if (normalizedAlias && (
          this.calculateSimilarity(normalizedZoneName, normalizedAlias) > 0.8 ||
          normalizedZoneName.includes(normalizedAlias) || 
          normalizedAlias.includes(normalizedZoneName))) {
        logger.info(`✓ Matched zone "${zoneName}" to alias "${zone.alias}" of "${zone.name}"`);
        return zone.id;
      }
    }
    
    logger.error(`❌ Could not find zone "${zoneName}" in database`);
    return this.zoneId; // Fallback to current zone
  }
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
   * Improved room matching that handles dynamic content and portal keys
   */
  private findMatchingRoom(roomData: any, zoneId?: number, allowDescriptionOnlyMatching: boolean = false): RoomNode | null {
    const targetZoneId = zoneId || this.zoneId;
    const roomName = roomData.name?.toLowerCase().trim();
    const roomDescription = this.filterOutput(roomData.description).toLowerCase().trim();
    const portalKey = roomData.portal_key;

    // Priority 1: Match by portal key (most reliable)
    if (portalKey) {
      const portalMatch = Array.from(this.roomGraph.values()).find(r => 
        r.portal_key === portalKey
      );
      if (portalMatch) {
        logger.info(`✓ Matched room by portal key: ${portalMatch.name}`);
        return portalMatch;
      }
    }

    // Priority 2: Match by name + portal key if available
    if (portalKey) {
      const nameAndPortalMatch = Array.from(this.roomGraph.values()).find(r =>
        r.name.toLowerCase().trim() === roomName &&
        r.portal_key === portalKey
      );
      if (nameAndPortalMatch) {
        logger.info(`✓ Matched room by name + portal key: ${nameAndPortalMatch.name}`);
        return nameAndPortalMatch;
      }
    }

    // Priority 3: Flexible name matching with description similarity
    const candidates = Array.from(this.roomGraph.values()).filter(r =>
      r.zone_id === targetZoneId &&
      this.roomNamesMatch(r.name, roomName)
    );

    if (candidates.length === 1) {
      logger.info(`✓ Matched room by name: ${candidates[0].name}`);
      return candidates[0];
    }

    // Priority 4: Find best description match among name candidates
    if (candidates.length > 1) {
      let bestMatch = null;
      let bestSimilarity = 0;

      for (const candidate of candidates) {
        const similarity = this.calculateRoomSimilarity(candidate.description, roomDescription);
        if (similarity > bestSimilarity && similarity > 0.6) { // Lower threshold for better matching
          bestMatch = candidate;
          bestSimilarity = similarity;
        }
      }

      if (bestMatch) {
        logger.info(`✓ Matched room by name + description similarity (${bestSimilarity.toFixed(2)}): ${bestMatch.name}`);
        return bestMatch;
      }
    }

    // Priority 5: Fallback to description-only matching (less reliable) - only for position resync
    if (allowDescriptionOnlyMatching) {
      const descriptionMatch = Array.from(this.roomGraph.values()).find(r =>
        r.zone_id === targetZoneId &&
        this.calculateRoomSimilarity(r.description, roomDescription) > 0.8
      );

      if (descriptionMatch) {
        logger.info(`✓ Matched room by description similarity: ${descriptionMatch.name}`);
        return descriptionMatch;
      }
    }

    return null;
  }

  /**
   * Check if two room names match (flexible matching)
   */
  private roomNamesMatch(name1: string, name2: string): boolean {
    const n1 = name1.toLowerCase().trim();
    const n2 = name2.toLowerCase().trim();

    // Exact match
    if (n1 === n2) return true;

    // For street/area names, be more strict - don't match "Main Street West" to "Main Street East"
    // Only allow substring matching for very specific cases like "The Temple" vs "Temple of Midgaard"
    if (n1.includes('street') || n1.includes('avenue') || n1.includes('road') || n1.includes('way') ||
        n2.includes('street') || n2.includes('avenue') || n2.includes('road') || n2.includes('way')) {
      // For street names, require exact match or very high similarity
      return this.calculateSimilarity(n1, n2) > 0.95;
    }

    // For other names, allow substring matching but require significant overlap
    if (n1.includes(n2) || n2.includes(n1)) {
      // Ensure the common part is substantial (not just "the" or short words)
      const commonLength = Math.min(n1.length, n2.length);
      const overlapRatio = commonLength / Math.max(n1.length, n2.length);
      return overlapRatio > 0.7; // At least 70% overlap
    }

    // High similarity for other cases
    return this.calculateSimilarity(n1, n2) > 0.9; // Increased from 0.85
  }

  /**
   * Calculate similarity between room descriptions, accounting for dynamic content
   */
  private calculateRoomSimilarity(desc1: string, desc2: string): number {
    // Remove common dynamic elements that change
    const normalizeDescription = (desc: string): string => {
      return desc
        .toLowerCase()
        .replace(/\b(the sky is|it is)\s+(bright|dark|cloudy|sunny|night|day|dawn|dusk)\b/g, '')
        .replace(/\b(weather|clouds|stars|moon|sun)\b.*?(?=\.|\n|$)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalized1 = normalizeDescription(desc1);
    const normalized2 = normalizeDescription(desc2);

    // If both are very short after normalization, require higher similarity
    if (normalized1.length < 20 || normalized2.length < 20) {
      return this.calculateSimilarity(normalized1, normalized2);
    }

    // For longer descriptions, be more flexible
    const similarity = this.calculateSimilarity(normalized1, normalized2);
    return similarity > 0.7 ? similarity : 0; // Minimum threshold
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
    logger.info('✓ Room graph navigation crawler cleanup complete');
    const stats = this.getExplorationStats();
    logger.info(`📊 Final stats: ${stats.totalRooms} rooms, ${stats.exploredConnections} explored connections, ${stats.unexploredConnections} unexplored connections`);
  }

  /**
   * Get all available portal keys from rooms in our target zone
   */
  private async getAvailablePortalKeys(): Promise<string[]> {
    try {
      const portalKeys: string[] = [];
      
      // Get all rooms in our target zone that have portal keys
      for (const room of this.roomGraph.values()) {
        if (room.zone_id === this.zoneId && room.portal_key) {
          portalKeys.push(room.portal_key);
        }
      }
      
      // Also check database for any portal keys we might not have in graph yet
      const allRooms = await this.config.api.getAllEntities('rooms');
      const zoneRooms = allRooms.filter((r: any) => r.zone_id === this.zoneId && r.portal_key);
      
      for (const room of zoneRooms) {
        if (!portalKeys.includes(room.portal_key)) {
          portalKeys.push(room.portal_key);
        }
      }
      
      logger.info(`Found ${portalKeys.length} available portal keys: ${portalKeys.join(', ')}`);
      return portalKeys;
    } catch (error) {
      logger.error('Failed to get available portal keys:', error);
      return [];
    }
  }
}