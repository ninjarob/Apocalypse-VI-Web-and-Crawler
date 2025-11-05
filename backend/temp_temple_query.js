const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

console.log('Rooms with Temple in name:');
db.all("SELECT id, name, zone_exit FROM rooms WHERE name LIKE '%Temple%'", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    rows.forEach(row => {
      console.log(`${row.name} (ID: ${row.id}, zone_exit: ${row.zone_exit})`);
    });
  }
  db.close();
});