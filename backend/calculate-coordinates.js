// Calculate room coordinates based on directional exits
const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'mud-data.db'));

// Card dimensions (adjusted for better spacing)
// Spacing should be larger than the visual node size (60x40)
const NODE_WIDTH = 100;  // Comfortable horizontal spacing (node is 60px)
const NODE_HEIGHT = 70;  // Comfortable vertical spacing (node is 40px)

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

async function calculateCoordinates() {
  console.log('🗺️  Calculating room coordinates based on exits...\n');

  // Get all rooms and exits
  const rooms = await getAllRooms();
  const exits = await getAllExits();

  if (rooms.length === 0) {
    console.log('❌ No rooms found!');
    return;
  }

  console.log(`📍 Processing ${rooms.length} rooms and ${exits.length} exits\n`);

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
    const queue = [{ id: startRoom.id, x: componentOffset.x, y: componentOffset.y }];
    coordinates.set(startRoom.id, { x: componentOffset.x, y: componentOffset.y });

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

        if (!coordinates.has(neighborId)) {
          const delta = DIRECTION_DELTAS[direction];
          const idealX = current.x + delta.x;
          const idealY = current.y + delta.y;

          // Use collision detection to find the best position
          // Pass the current (origin) position so we can halve the distance if needed
          const newCoords = resolveCollision(coordinates, idealX, idealY, neighborId, current.x, current.y);

          coordinates.set(neighborId, newCoords);
          queue.push({ id: neighborId, ...newCoords });
        }
      }
    }

    // Move offset for next component (with larger spacing to account for new node sizes)
    componentOffset.x += COMPONENT_SPACING * NODE_WIDTH;
  }

  console.log(`✅ Assigned coordinates to ${coordinates.size} rooms\n`);

  // Update database with coordinates
  let updated = 0;
  for (const [roomId, coords] of coordinates) {
    await updateRoomCoordinates(roomId, coords.x, coords.y, 0); // Z always 0 for flat view
    updated++;
  }

  console.log(`💾 Updated ${updated} rooms with coordinates\n`);

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
    console.log(`\n⚠️  ${roomsWithoutCoords.length} rooms have no coordinates (not connected to main graph):`);
    roomsWithoutCoords.slice(0, 10).forEach(room => {
      console.log(`   - ${room.name} (ID: ${room.id})`);
    });
    if (roomsWithoutCoords.length > 10) {
      console.log(`   ... and ${roomsWithoutCoords.length - 10} more`);
    }
  }

  console.log('\n✨ Coordinate calculation complete!');
}

function getAllRooms() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM rooms ORDER BY id', (err, rows) => {
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