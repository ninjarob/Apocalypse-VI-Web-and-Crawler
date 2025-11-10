const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all("SELECT id, name, description FROM rooms WHERE name LIKE '%Main Street%' ORDER BY name, id", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Main Street rooms in database:');
    rows.forEach(row => {
      console.log(`\nID: ${row.id}`);
      console.log(`Name: ${row.name}`);
      console.log(`Description: ${row.description.substring(0, 200)}...`);
      console.log('---');
    });
  }
  db.close();
});