const http = require('http');

function req(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET',
      headers: {'Content-Type': 'application/json'}
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function check() {
  try {
    const rooms = await req('/api/rooms');
    const exits = await req('/api/room_exits');

    console.log('Room exits:');
    exits.forEach(e => {
      const fromRoom = rooms.find(r => r.id === e.from_room_id);
      const toRoom = rooms.find(r => r.id === e.to_room_id);
      console.log(`${fromRoom?.name || 'Unknown'} (${e.from_room_id}) -> ${e.direction} -> ${toRoom?.name || 'Unknown'} (${e.to_room_id})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

check();