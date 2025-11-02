// Check rooms in database via API
const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkRooms() {
  try {
    console.log('🔍 Checking rooms in database...\n');
    
    // Get all rooms
    const rooms = await makeRequest('/api/rooms');
    
    if (!rooms || rooms.length === 0) {
      console.log('❌ No rooms found in database!');
      return;
    }
    
    console.log(`✓ Found ${rooms.length} rooms\n`);
    
    // Show rooms sorted by creation date (most recent first)
    const sortedRooms = rooms
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 15);
    
    console.log('📍 Most recent rooms:');
    console.log('─'.repeat(80));
    
    sortedRooms.forEach((room, i) => {
      console.log(`${i + 1}. ${room.name}`);
      console.log(`   ID: ${room.id} | Zone ID: ${room.zone_id || 'none'} | Visits: ${room.visitCount || 0}`);
      console.log(`   Created: ${new Date(room.createdAt).toLocaleString()}`);
      console.log('');
    });
    
    // Check for zone assignments
    const roomsWithZone = rooms.filter(r => r.zone_id);
    const roomsWithoutZone = rooms.filter(r => !r.zone_id);
    
    console.log('\n📊 Zone Assignment Summary:');
    console.log(`   Rooms with zone: ${roomsWithZone.length}`);
    console.log(`   Rooms without zone: ${roomsWithoutZone.length}`);
    
    // Get zones to see which ones have rooms
    const zones = await makeRequest('/api/zones');
    console.log(`\n🗺️  Zones in database: ${zones.length}`);
    
    if (zones.length > 0) {
      zones.forEach(zone => {
        const zoneRooms = rooms.filter(r => r.zone_id === zone.id);
        console.log(`   ${zone.name} (ID: ${zone.id}): ${zoneRooms.length} rooms`);
      });
    }
    
    // Check for duplicate room names
    const nameCount = {};
    rooms.forEach(room => {
      nameCount[room.name] = (nameCount[room.name] || 0) + 1;
    });
    
    const duplicates = Object.entries(nameCount).filter(([name, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  Duplicate room names found:');
      duplicates.forEach(([name, count]) => {
        console.log(`   "${name}" appears ${count} times`);
        const dupeRooms = rooms.filter(r => r.name === name);
        dupeRooms.forEach(r => {
          console.log(`      - ID: ${r.id}, Zone: ${r.zone_id || 'none'}, Created: ${new Date(r.createdAt).toLocaleString()}`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure the backend server is running on port 3002');
  }
}

checkRooms();
