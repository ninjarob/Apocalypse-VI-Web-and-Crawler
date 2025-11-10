const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all("SELECT name, COUNT(*) as count FROM rooms WHERE name LIKE '%Main Street%' GROUP BY name ORDER BY name", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Main Street rooms:');
    rows.forEach(row => {
      console.log(`${row.name}: ${row.count}`);
    });
  }
  db.close();
});