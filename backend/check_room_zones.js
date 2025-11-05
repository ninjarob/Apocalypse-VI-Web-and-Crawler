const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all(`SELECT r.id, r.name, z.name as zone_name, r.zone_exit
        FROM rooms r
        JOIN zones z ON r.zone_id = z.id
        WHERE r.name LIKE '%Rear exit%' OR r.name LIKE '%Outside the City%'`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Room Zone Assignments:');
    rows.forEach(room => {
      console.log(`ID ${room.id}: ${room.name} - Zone: ${room.zone_name} - zone_exit: ${room.zone_exit}`);
    });
  }
  db.close();
});