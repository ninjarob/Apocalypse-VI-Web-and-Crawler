const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all('SELECT * FROM room_exits WHERE from_room_id IN (2, 12) ORDER BY from_room_id, direction', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Exits for rooms 2 and 12:');
    rows.forEach(r => {
      console.log(`Room ${r.from_room_id} -> ${r.direction} -> Room ${r.to_room_id}`);
    });
  }
  db.close();
});