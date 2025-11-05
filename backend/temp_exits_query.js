const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

console.log('Room exits for temple-related rooms:');
db.all(`
  SELECT re.from_room_id, r1.name as from_room, re.direction, re.to_room_id, r2.name as to_room
  FROM room_exits re
  JOIN rooms r1 ON re.from_room_id = r1.id
  JOIN rooms r2 ON re.to_room_id = r2.id
  WHERE re.from_room_id IN (1, 3, 5, 7) OR re.to_room_id IN (1, 3, 5, 7)
  ORDER BY re.from_room_id, re.direction
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    rows.forEach(row => {
      console.log(`${row.from_room} (${row.from_room_id}) --${row.direction}--> ${row.to_room} (${row.to_room_id})`);
    });
  }
  db.close();
});