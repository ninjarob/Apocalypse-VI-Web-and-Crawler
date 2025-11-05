import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';
import { RoomProcessor } from '../RoomProcessor';

interface RoomNode {
  id: number;
  name: string;
  zone_id: number;
  connections: Map<string, number>; // direction -> target room id
  exploredConnections: Set<string>; // directions that have been explored
  unexploredConnections: Set<string>; // directions that exist but haven't been explored
  visitCount: number;
  lastVisited: Date;
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
          zone_id: room.zone_id,
          connections: new Map(),
          exploredConnections: new Set(),
          unexploredConnections: new Set(),
          visitCount: room.visitCount || 0,
          lastVisited: room.lastVisited ? new Date(room.lastVisited) : new Date()
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
    // Get current room information
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = this.roomProcessor['parseLookOutput'](lookResponse);
    this.currentRoomName = roomData.name;

    // Find this room in our graph
    const currentRoom = Array.from(this.roomGraph.values()).find(r => r.name === this.currentRoomName);

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
    // Get exits for current room
    await this.delay(this.config.delayBetweenActions);
    const exitsResponse = await this.config.mudClient.sendAndWait('exits', this.config.delayBetweenActions);
    this.actionsUsed++;

    const exits = this.parseExitsOutput(exitsResponse);
    const exitDirections = exits.map(e => e.direction.toLowerCase());

    // Save room to database
    const roomToSave = {
      name: roomData.name,
      description: this.filterOutput(roomData.description),
      rawText: `${roomData.name}\n${roomData.description}`,
      zone_id: this.zoneId,
      visitCount: 1,
      lastVisited: new Date().toISOString()
    };

    const savedRoom = await this.config.api.saveRoom(roomToSave as any);
    if (!savedRoom) {
      throw new Error('Failed to save room to database');
    }

    this.currentRoomId = savedRoom.id;

    // Create room node
    const roomNode: RoomNode = {
      id: savedRoom.id,
      name: roomData.name,
      zone_id: this.zoneId,
      connections: new Map(),
      exploredConnections: new Set(),
      unexploredConnections: new Set(exitDirections),
      visitCount: 1,
      lastVisited: new Date()
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
   * Find the nearest room with unexplored connections
   */
  private findNearestRoomWithUnexploredConnections(): RoomNode | null {
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

      // Update current position
      this.currentRoomId = toRoomId;
      const toRoom = this.roomGraph.get(toRoomId);
      if (toRoom) {
        this.currentRoomName = toRoom.name;
        toRoom.visitCount++;
        toRoom.lastVisited = new Date();
      }

      // Add to navigation path
      this.navigationPath.push(toRoomId);
    }
  }

  /**
   * Explore the next unexplored connection from a room
   */
  private async exploreNextUnexploredConnection(room: RoomNode): Promise<void> {
    const direction = Array.from(room.unexploredConnections)[0];
    if (!direction) return;

    logger.info(`🧭 Exploring ${direction} from ${room.name}...`);

    // Try to move
    await this.delay(this.config.delayBetweenActions);
    const moveResponse = await this.config.mudClient.sendAndWait(direction, this.config.delayBetweenActions);
    this.actionsUsed++;

    if (moveResponse.includes("Alas, you cannot go that way")) {
      logger.info(`   ❌ Direction ${direction} blocked`);
      room.exploredConnections.add(direction);
      room.unexploredConnections.delete(direction);
      return;
    }

    // Check if we're still in the same zone
    await this.delay(this.config.delayBetweenActions);
    const zoneCheck = await this.config.mudClient.sendAndWait('who -z', this.config.delayBetweenActions);
    this.actionsUsed++;

    const currentZone = this.extractCurrentZone(zoneCheck);
    if (currentZone !== this.currentZone) {
      logger.info(`   🏞️  Moved to different zone: ${currentZone}`);
      // Go back
      const oppositeDir = this.getOppositeDirection(direction);
      if (oppositeDir) {
        await this.delay(this.config.delayBetweenActions);
        await this.config.mudClient.sendAndWait(oppositeDir, this.config.delayBetweenActions);
        this.actionsUsed++;
      }
      return;
    }

    // Check if we know about this room
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = this.roomProcessor['parseLookOutput'](lookResponse);
    const newRoomName = roomData.name;

    // Look for existing room in graph
    let existingRoom = Array.from(this.roomGraph.values()).find(r => r.name === newRoomName);

    if (existingRoom) {
      logger.info(`   ✓ Already know about room: ${existingRoom.name} (ID: ${existingRoom.id})`);

      // Update the connection
      room.connections.set(direction, existingRoom.id);
      room.exploredConnections.add(direction);
      room.unexploredConnections.delete(direction);

      // Update current position
      this.currentRoomId = existingRoom.id;
      this.currentRoomName = existingRoom.name;
      existingRoom.visitCount++;
      existingRoom.lastVisited = new Date();
      this.navigationPath.push(existingRoom.id);

      // Verify return connection
      await this.verifyReturnConnection(existingRoom, direction, room);

    } else {
      // New room discovered
      const { roomData: newRoomData, exitData: newExitData } = await this.roomProcessor.processRoom();
      this.actionsUsed += this.roomProcessor.getActionsUsed();

      if (!newRoomData.name) {
        logger.warn('⚠️  Could not parse new room, going back...');
        const oppositeDir = this.getOppositeDirection(direction);
        if (oppositeDir) {
          await this.delay(this.config.delayBetweenActions);
          await this.config.mudClient.sendAndWait(oppositeDir, this.config.delayBetweenActions);
          this.actionsUsed++;
        }
        return;
      }

      // Save new room
      const exitDirections = newExitData.map(e => e.direction.toLowerCase());
      const savedRoom = await this.saveNewRoomToDatabase(newRoomData, exitDirections);

      // Create room node and add to graph
      const newRoomNode: RoomNode = {
        id: savedRoom.id,
        name: newRoomData.name,
        zone_id: this.zoneId,
        connections: new Map(),
        exploredConnections: new Set(),
        unexploredConnections: new Set(exitDirections),
        visitCount: 1,
        lastVisited: new Date()
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

      // Update current position
      this.currentRoomId = savedRoom.id;
      this.currentRoomName = newRoomData.name;
      this.navigationPath.push(savedRoom.id);

      logger.info(`✓ Discovered new room: ${newRoomData.name} (ID: ${savedRoom.id})`);

      // Verify return connection
      await this.verifyReturnConnection(newRoomNode, direction, room);
    }
  }

  /**
   * Verify that the return connection works
   */
  private async verifyReturnConnection(fromRoom: RoomNode, directionMoved: string, expectedTargetRoom: RoomNode): Promise<void> {
    const returnDirection = this.getOppositeDirection(directionMoved);
    if (!returnDirection) {
      logger.warn(`   ⚠️  Cannot determine return direction from ${directionMoved}`);
      return;
    }

    logger.info(`   🔄 Verifying return path: ${returnDirection} from ${fromRoom.name} to ${expectedTargetRoom.name}`);

    // Try to move back
    await this.delay(this.config.delayBetweenActions);
    const returnResponse = await this.config.mudClient.sendAndWait(returnDirection, this.config.delayBetweenActions);
    this.actionsUsed++;

    if (returnResponse.includes("Alas, you cannot go that way")) {
      logger.info(`   ❌ Return path ${returnDirection} blocked - one-way connection`);
      return;
    }

    // Verify we're at the expected room
    await this.delay(this.config.delayBetweenActions);
    const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
    this.actionsUsed++;

    const roomData = this.roomProcessor['parseLookOutput'](lookResponse);
    const expectedName = expectedTargetRoom.name.toLowerCase().trim();
    const actualName = roomData.name.toLowerCase().trim();

    const namesMatch = expectedName === actualName ||
                      expectedName.includes(actualName) ||
                      actualName.includes(expectedName) ||
                      this.calculateSimilarity(expectedName, actualName) > 0.8;

    if (namesMatch) {
      // Success! Update connections in both rooms
      fromRoom.connections.set(returnDirection, expectedTargetRoom.id);
      fromRoom.exploredConnections.add(returnDirection);
      fromRoom.unexploredConnections.delete(returnDirection);

      expectedTargetRoom.exploredConnections.add(directionMoved);
      expectedTargetRoom.unexploredConnections.delete(directionMoved);

      logger.info(`   ✅ Return path verified - bidirectional connection confirmed`);
    } else {
      logger.warn(`   ⚠️  Return path led to unexpected room: ${roomData.name} (expected ${expectedTargetRoom.name})`);
      // Don't mark as explored - might be a teleporter
    }
  }

  /**
   * Save a new room to the database
   */
  private async saveNewRoomToDatabase(roomData: any, exitDirections: string[]): Promise<any> {
    const roomToSave = {
      name: roomData.name,
      description: this.filterOutput(roomData.description),
      rawText: `${roomData.name}\n${roomData.description}`,
      zone_id: this.zoneId,
      visitCount: 1,
      lastVisited: new Date().toISOString()
    };

    const savedRoom = await this.config.api.saveRoom(roomToSave as any);
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
      const exitToSave: any = {
        from_room_id: roomId,
        to_room_id: null, // Will be updated when target is discovered
        direction: direction,
        description: `${direction} exit`,
        is_door: false,
        is_locked: false,
        is_zone_exit: false
      };

      await this.config.api.saveEntity('room_exits', exitToSave);
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

  /**
   * Calculate Levenshtein distance between two strings
   */
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
}