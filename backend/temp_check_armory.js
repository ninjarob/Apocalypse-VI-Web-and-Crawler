const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');
db.all("SELECT id, name, portal_key, zone_id FROM rooms WHERE name LIKE '%Armory%' ORDER BY id", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Query result:', rows);
  }
  db.close();
});