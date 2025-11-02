const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all(`SELECT r.name as room_name, re.direction, re.exit_description, re.door_name, re.door_description
        FROM rooms r
        JOIN room_exits re ON r.id = re.from_room_id
        WHERE r.name = 'The Dump'`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Exit data for The Dump:');
    console.log(JSON.stringify(rows, null, 2));
  }
  db.close();
});