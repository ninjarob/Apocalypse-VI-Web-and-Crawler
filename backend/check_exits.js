const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all(`SELECT r1.name as from_room, re.direction, r2.name as to_room
        FROM room_exits re
        JOIN rooms r1 ON re.from_room_id = r1.id
        LEFT JOIN rooms r2 ON re.to_room_id = r2.id
        WHERE r1.name LIKE '%Temple%'
        ORDER BY r1.name, re.direction`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Temple Room Exits:');
    rows.forEach(exit => {
      console.log(`${exit.from_room} ${exit.direction} -> ${exit.to_room || 'null'}`);
    });
  }
  db.close();
});