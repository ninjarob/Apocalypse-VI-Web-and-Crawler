const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all(`SELECT id, name, zone_exit FROM rooms WHERE name LIKE '%Rear exit%' OR name LIKE '%Outside the City%'`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Current Zone Exit Status:');
    rows.forEach(room => {
      console.log(`ID ${room.id}: ${room.name} - zone_exit: ${room.zone_exit}`);
    });
  }
  db.close();
});