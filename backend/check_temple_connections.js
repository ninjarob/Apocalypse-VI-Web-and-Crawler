const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

console.log('=== ROOMS IN ZONE 2 ===');
db.all("SELECT id, name FROM rooms WHERE zone_id = 2 ORDER BY name", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(rows);
  }

  console.log('\n=== ROOM EXITS IN ZONE 2 ===');
  db.all(`
    SELECT r.name as from_room, re.direction, COALESCE(rt.name, 'unknown') as to_room
    FROM rooms r
    LEFT JOIN room_exits re ON r.id = re.from_room_id
    LEFT JOIN rooms rt ON re.to_room_id = rt.id
    WHERE r.zone_id = 2
    ORDER BY r.name, re.direction
  `, (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(rows);
    }
    db.close();
  });
});