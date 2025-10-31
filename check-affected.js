const sqlite3 = require('sqlite3').verbose();

const dbPath = 'c:\\work\\other\\Apocalypse VI MUD\\data\\mud-data.db';
const db = new sqlite3.Database(dbPath);

console.log('Checking if affected exists...');

db.get('SELECT COUNT(*) as count FROM player_actions WHERE name = "affected"', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Affected exists:', row.count > 0);
    console.log('Count:', row.count);
  }
  db.close();
});