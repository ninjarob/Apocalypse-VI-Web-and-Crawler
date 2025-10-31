const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('c:\\work\\other\\Apocalypse VI MUD\\data\\mud-data.db');

db.all('SELECT name, COUNT(*) as count FROM player_actions GROUP BY name HAVING count > 1', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Duplicate names:');
    rows.forEach(r => {
      console.log(`${r.name}: ${r.count}`);
    });
  }
  db.close();
});