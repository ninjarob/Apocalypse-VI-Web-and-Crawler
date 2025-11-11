// Calculate room coordinates based on directional exits
const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '..', 'data', 'mud-data.db'));

// Direction to coordinate mapping (2D flat view)
const DIRECTION_DELTAS = {
  'north': { x: 0, y: 1 },
  'south': { x: 0, y: -1 },
  'east': { x: 1, y: 0 },
  'west': { x: -1, y: 0 },
  'up': { x: 0, y: 0 }, // No Z movement in flat view
  'down': { x: 0, y: 0 }, // No Z movement in flat view
  'northeast': { x: 1, y: 1 },
  'northwest': { x: -1, y: 1 },
  'southeast': { x: 1, y: -1 },
  'southwest': { x: -1, y: -1 }
};

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
  const COMPONENT_SPACING = 50; // Space components far apart

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
          const newCoords = {
            x: current.x + delta.x,
            y: current.y + delta.y
          };

          coordinates.set(neighborId, newCoords);
          queue.push({ id: neighborId, ...newCoords });
        }
      }
    }

    // Move offset for next component
    componentOffset.x += COMPONENT_SPACING;
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