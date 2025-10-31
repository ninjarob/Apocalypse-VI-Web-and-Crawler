const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');
db.all("SELECT id, name FROM player_actions WHERE name = 'affected'", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Query result:', rows);
  }
  db.close();
});