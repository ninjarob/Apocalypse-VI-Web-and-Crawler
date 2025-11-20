// Calculate room coordinates based on directional exits
const sqlite3 = require('sqlite3');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let zoneId = null;

if (args.length === 0) {
  console.error('❌ Usage: node calculate-coordinates.js <zone-id>');
  console.error('   Example: node calculate-coordinates.js 9');
  process.exit(1);
}

zoneId = parseInt(args[0]);
if (isNaN(zoneId)) {
  console.error('❌ Invalid zone ID. Must be a number.');
  process.exit(1);
}

console.log(`🎯 Calculating coordinates for zone ID: ${zoneId}`);

const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'mud-data.db'));

// Card dimensions (adjusted for better spacing)
// Spacing should be larger than the visual node size (60x40)
const NODE_WIDTH = 150;  // Comfortable horizontal spacing (node is 60px) - increased 1.5x
const NODE_HEIGHT = 105;  // Comfortable vertical spacing (node is 40px) - increased 1.5x

// Direction to coordinate mapping with proper spacing
// Each move should shift by at least one full card dimension
// NOTE: Y-axis is inverted for screen coordinates (north = negative Y to go UP on screen)
const DIRECTION_DELTAS = {
  'north': { x: 0, y: -NODE_HEIGHT },      // North goes UP (negative Y)
  'south': { x: 0, y: NODE_HEIGHT },       // South goes DOWN (positive Y)
  'east': { x: NODE_WIDTH, y: 0 },
  'west': { x: -NODE_WIDTH, y: 0 },
  'up': { x: Math.round(NODE_WIDTH * 0.7), y: -Math.round(NODE_HEIGHT * 0.7) },    // Upper-right diagonal (negative Y)
  'down': { x: -Math.round(NODE_WIDTH * 0.7), y: Math.round(NODE_HEIGHT * 0.7) }, // Lower-left diagonal (positive Y)
  'northeast': { x: NODE_WIDTH, y: -NODE_HEIGHT },
  'northwest': { x: -NODE_WIDTH, y: -NODE_HEIGHT },
  'southeast': { x: NODE_WIDTH, y: NODE_HEIGHT },
  'southwest': { x: -NODE_WIDTH, y: NODE_HEIGHT }
};

/**
 * Check if a position would cause a collision with existing rooms
 * and return an adjusted position if needed
 */
function resolveCollision(coordinates, idealX, idealY, roomId, originX, originY) {
  // Use collision threshold based on actual node size (60px), not spacing (100px)
  // We want to prevent actual visual overlap, not just proximity
  // Node is 60px wide, so minimum distance should be ~40px for a small gap
  const COLLISION_THRESHOLD_X = 40;  // Minimum 40px gap between nodes
  const COLLISION_THRESHOLD_Y = 30;  // Minimum 30px gap between nodes
  
  let testX = idealX;
  let testY = idealY;
  let attempts = 0;
  const MAX_ATTEMPTS = 10;
  
  while (attempts < MAX_ATTEMPTS) {
    // Check if current test position is occupied
    const conflictingRoom = Array.from(coordinates.entries()).find(
      ([id, coord]) => id !== roomId && 
      Math.abs(coord.x - testX) < COLLISION_THRESHOLD_X && 
      Math.abs(coord.y - testY) < COLLISION_THRESHOLD_Y
    );
    
    if (!conflictingRoom) {
      if (attempts > 0) {
        console.log(`   🔧 Collision avoided: room ${roomId} placed at (${Math.round(testX)}, ${Math.round(testY)}) after ${attempts} attempt(s)`);
      }
      return { x: testX, y: testY };
    }
    
    // Collision detected - halve the distance between origin and current test position
    testX = Math.round((originX + testX) / 2);
    testY = Math.round((originY + testY) / 2);
    attempts++;
  }
  
  // Fallback: accept collision after max attempts
  console.log(`   ⚠️  Warning: Could not avoid collision for room ${roomId} at (${idealX}, ${idealY}) after ${MAX_ATTEMPTS} attempts`);
  return { x: idealX, y: idealY };
}

/**
 * Identify vertical sub-levels (accessed via up/down) and calculate offsets
 * Returns a map of room IDs to their level offsets
 */
function identifySubLevels(rooms, exits, graph, originRoomId) {
  const SUB_LEVEL_THRESHOLD = 5; // Min rooms to trigger offset
  const DEEP_LEVEL_THRESHOLD = 15; // Min rooms for recursive sub-level offsetting
  const OFFSET_MULTIPLIER = 4; // Rooms distance multiplier for offset

  const levelOffsets = new Map(); // roomId -> {x, y, level}
  const processed = new Set();

  // Find all down transitions (only down creates sub-levels, up typically returns to main level)
  const verticalTransitions = exits.filter(e =>
    e.direction === 'down'
  );

  console.log(`🔍 Found ${verticalTransitions.length} down transitions\n`);

  // First pass: identify and offset top-level sub-levels
  for (const transition of verticalTransitions) {
    const entryRoomId = transition.to_room_id;

    if (!entryRoomId || processed.has(entryRoomId)) continue;

    // BFS to explore all rooms reachable via down/compass from the entry point
    // Don't traverse back up - only explore downward and horizontally
    const subLevelRooms = new Set();
    const queue = [entryRoomId];
    const visited = new Set();

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      subLevelRooms.add(currentId);

      const connections = graph.get(currentId) || [];

      for (const conn of connections) {
        // Don't traverse back up
        if (conn.direction === 'up') continue;

        if (!visited.has(conn.to)) {
          queue.push(conn.to);
        }
      }
    }

    // Skip this sub-level if it contains the origin room (it's the main level, not a sub-level)
    if (originRoomId && subLevelRooms.has(originRoomId)) {
      console.log(`⏭️  Skipping ${transition.direction} transition - contains origin room ${originRoomId} (main level)`);
      console.log(`   Sub-level rooms: ${Array.from(subLevelRooms).slice(0, 5).join(', ')}...`);
      continue;
    }

    // Don't apply offset if the entry room is reachable from the origin via non-vertical paths
    // (This means it's part of the main level, just accessed via a down exit for convenience)
    if (originRoomId) {
      const mainLevelRooms = new Set();
      const queue = [originRoomId];
      const visited = new Set();

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        mainLevelRooms.add(currentId);

        const connections = graph.get(currentId) || [];
        for (const conn of connections) {
          // Only follow non-vertical connections
          if (conn.direction !== 'up' && conn.direction !== 'down' && !visited.has(conn.to)) {
            queue.push(conn.to);
          }
        }
      }

      // If the entry room is reachable from main level via compass directions, skip this sub-level
      if (mainLevelRooms.has(entryRoomId)) {
        console.log(`⏭️  Skipping ${transition.direction} transition - entry room ${entryRoomId} reachable via non-vertical paths (part of main level)`);
        continue;
      }
    }

    // If sub-level is significant, apply offset
    if (subLevelRooms.size >= SUB_LEVEL_THRESHOLD) {
      // Move cave system down-left (negative X, positive Y) to balance with surface entry
      const offsetX = transition.direction === 'down'
        ? -OFFSET_MULTIPLIER * NODE_WIDTH  // Left for down transitions
        : OFFSET_MULTIPLIER * NODE_WIDTH;  // Right for up transitions
      const offsetY = transition.direction === 'down'
        ? OFFSET_MULTIPLIER * NODE_HEIGHT  // Down for down transitions
        : -OFFSET_MULTIPLIER * NODE_HEIGHT; // Up for up transitions

      console.log(`📍 Sub-level detected via ${transition.direction} (${subLevelRooms.size} rooms)`);
      console.log(`   Entry: Room ${entryRoomId}`);
      console.log(`   Offset: (${offsetX}, ${offsetY})\n`);

      // Mark all rooms in this sub-level
      for (const roomId of subLevelRooms) {
        levelOffsets.set(roomId, { x: offsetX, y: offsetY, level: 0 });
        processed.add(roomId);
      }

      // Calculate rooms reachable from entry via horizontal paths
      const parentReachableRooms = new Set();
      const reachQueue = [entryRoomId];
      const reachVisited = new Set();

      while (reachQueue.length > 0) {
        const currentId = reachQueue.shift();
        if (reachVisited.has(currentId)) continue;
        reachVisited.add(currentId);
        parentReachableRooms.add(currentId);

        const connections = graph.get(currentId) || [];
        for (const conn of connections) {
          if (conn.direction !== 'up' && conn.direction !== 'down' && !reachVisited.has(conn.to) && subLevelRooms.has(conn.to)) {
            reachQueue.push(conn.to);
          }
        }
      }

      // Apply additional offset to rooms not reachable from entry via horizontal
      const additionalLevel = 1;
      const diff = (4/3) * OFFSET_MULTIPLIER * NODE_WIDTH;
      const additionalOffsetX = offsetX + (additionalLevel % 2 === 0 ? -1 : 1) * diff;
      const additionalOffsetY = offsetY + diff;

      for (const roomId of subLevelRooms) {
        if (!parentReachableRooms.has(roomId)) {
          levelOffsets.set(roomId, { x: additionalOffsetX, y: additionalOffsetY, level: additionalLevel });
        }
      }
    }
  }

  return levelOffsets;
}

async function calculateCoordinates() {
  console.log(`🗺️  Calculating room coordinates for zone ${zoneId} based on exits...\n`);

  // First, reset all coordinates for rooms in this zone
  console.log(`🔄 Resetting coordinates for all rooms in zone ${zoneId}...`);
  await resetZoneCoordinates(zoneId);
  console.log(`✓ Coordinates reset to null for zone ${zoneId}\n`);

  // Get all rooms and exits for this zone
  const rooms = await getZoneRooms(zoneId);
  const exits = await getZoneExits(zoneId);

  if (rooms.length === 0) {
    console.log(`❌ No rooms found in zone ${zoneId}!`);
    return;
  }

  console.log(`📍 Processing ${rooms.length} rooms and ${exits.length} exits in zone ${zoneId}\n`);

  // Create room lookup map
  const roomMap = new Map();
  rooms.forEach(room => roomMap.set(room.id, room));

  // Create exit graph (adjacency list)
  const graph = new Map();
  exits.forEach(exit => {
    if (!graph.has(exit.from_room_id)) {
      graph.set(exit.from_room_id, []);
    }
    if (exit.to_room_id) {
      graph.get(exit.from_room_id).push({
        to: exit.to_room_id,
        direction: exit.direction
      });
    }
  });

  // Identify sub-levels and calculate offsets
  // Use the first room with connections as origin (typically the zone entrance)
  const originRoomId = rooms.find(room => graph.has(room.id))?.id;
  const levelOffsets = identifySubLevels(rooms, exits, graph, originRoomId);

  // Find all connected components and assign coordinates to each
  const visited = new Set();
  const coordinates = new Map();
  let componentOffset = { x: 0, y: 0 }; // 2D coordinates only
  const COMPONENT_SPACING = 10; // Spacing in "room units" (will be multiplied by NODE_WIDTH)

  // Get all unvisited rooms with connections
  const unvisitedRooms = rooms.filter(room => graph.has(room.id) && !visited.has(room.id));

  for (const startRoom of unvisitedRooms) {
    if (visited.has(startRoom.id)) continue;

    console.log(`🎯 Processing component starting from room ${startRoom.id} (${startRoom.name})`);

    // BFS for this component
    // Apply level offset if this room is in a sub-level
    const startOffset = levelOffsets.get(startRoom.id) || { x: 0, y: 0, level: 0 };
    const startX = componentOffset.x + startOffset.x;
    const startY = componentOffset.y + startOffset.y;
    
    const queue = [{ id: startRoom.id, x: startX, y: startY }];
    coordinates.set(startRoom.id, { x: startX, y: startY });

    while (queue.length > 0) {
      const current = queue.shift();
      const currentId = current.id;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const connections = graph.get(currentId) || [];

      for (const connection of connections) {
        const neighborId = connection.to;
        const direction = connection.direction.toLowerCase();

        if (!DIRECTION_DELTAS[direction]) {
          console.log(`⚠️  Unknown direction: ${direction} from room ${currentId} to ${neighborId}`);
          continue;
        }

        // Always calculate position, even if room already has coordinates
        // This handles cases where a room is reached via multiple paths
        const delta = DIRECTION_DELTAS[direction];
        
        // Check if crossing into a different level
        const currentLevelOffset = levelOffsets.get(currentId) || { x: 0, y: 0, level: 0 };
        const neighborLevelOffset = levelOffsets.get(neighborId) || { x: 0, y: 0, level: 0 };
        
        // Calculate ideal position with level offset
        let idealX = current.x + delta.x;
        let idealY = current.y + delta.y;
        
        // If transitioning between levels, apply the offset difference
        if (currentLevelOffset.x !== neighborLevelOffset.x || currentLevelOffset.y !== neighborLevelOffset.y) {
          const offsetDiff = {
            x: neighborLevelOffset.x - currentLevelOffset.x,
            y: neighborLevelOffset.y - currentLevelOffset.y
          };
          idealX += offsetDiff.x;
          idealY += offsetDiff.y;
        }

        let newCoords;
        if (coordinates.has(neighborId)) {
          // Room already has coordinates - try to find a compromise position
          const existing = coordinates.get(neighborId);
          newCoords = resolveCollision(coordinates, idealX, idealY, neighborId, existing.x, existing.y);
          coordinates.set(neighborId, newCoords);
          // Don't re-queue if already processed
        } else {
          // First time placing this room
          newCoords = resolveCollision(coordinates, idealX, idealY, neighborId, current.x, current.y);
          coordinates.set(neighborId, newCoords);
          queue.push({ id: neighborId, ...newCoords });
        }
      }
    }

    // Move offset for next component (with larger spacing to account for new node sizes)
    componentOffset.x += COMPONENT_SPACING * NODE_WIDTH;
  }

  console.log(`✅ Assigned coordinates to ${coordinates.size} rooms in zone ${zoneId}\n`);

  // Update database with coordinates
  let updated = 0;
  for (const [roomId, coords] of coordinates) {
    await updateRoomCoordinates(roomId, coords.x, coords.y, 0); // Z always 0 for flat view
    updated++;
  }

  console.log(`💾 Updated ${updated} rooms with coordinates in zone ${zoneId}\n`);

  // Show coordinate range
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const coords of coordinates.values()) {
    minX = Math.min(minX, coords.x);
    maxX = Math.max(maxX, coords.x);
    minY = Math.min(minY, coords.y);
    maxY = Math.max(maxY, coords.y);
  }

  console.log('📊 Coordinate ranges:');
  console.log(`   X: ${minX} to ${maxX} (width: ${maxX - minX + 1})`);
  console.log(`   Y: ${minY} to ${maxY} (height: ${maxY - minY + 1})`);

  // Check for rooms without coordinates
  const roomsWithoutCoords = rooms.filter(room => !coordinates.has(room.id));
  if (roomsWithoutCoords.length > 0) {
    console.log(`\n⚠️  ${roomsWithoutCoords.length} rooms in zone ${zoneId} have no coordinates (not connected to main graph):`);
    roomsWithoutCoords.slice(0, 10).forEach(room => {
      console.log(`   - ${room.name} (ID: ${room.id})`);
    });
    if (roomsWithoutCoords.length > 10) {
      console.log(`   ... and ${roomsWithoutCoords.length - 10} more`);
    }
  }

  console.log(`\n✨ Coordinate calculation complete for zone ${zoneId}!`);
}

function getAllRooms() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM rooms ORDER BY id', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getZoneRooms(zoneId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM rooms WHERE zone_id = ? ORDER BY id', [zoneId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAllExits() {
  return new Promise((resolve, reject) => {
    db.all('SELECT from_room_id, to_room_id, direction FROM room_exits WHERE to_room_id IS NOT NULL', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getZoneExits(zoneId) {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT re.from_room_id, re.to_room_id, re.direction 
      FROM room_exits re
      JOIN rooms r ON re.from_room_id = r.id
      WHERE r.zone_id = ? AND re.to_room_id IS NOT NULL
    `, [zoneId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function resetZoneCoordinates(zoneId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE rooms SET x = NULL, y = NULL WHERE zone_id = ?', [zoneId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function updateRoomCoordinates(roomId, x, y, z) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE rooms SET x = ?, y = ? WHERE id = ?', [x, y, roomId], function(err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

// Run the calculation
calculateCoordinates().then(() => {
  db.close();
}).catch(err => {
  console.error('❌ Error:', err);
  db.close();
});