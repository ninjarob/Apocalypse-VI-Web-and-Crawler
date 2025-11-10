const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');
db.all("SELECT COUNT(*) as count FROM rooms", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Total rooms in database:', rows[0].count);
  }
  db.close();
});