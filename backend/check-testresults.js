const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('c:\\work\\other\\Apocalypse VI MUD\\data\\mud-data.db');

db.all('SELECT name, testResults FROM player_actions WHERE testResults IS NOT NULL LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Actions with testResults:');
    rows.forEach(r => {
      console.log(`${r.name}: ${r.testResults ? r.testResults.substring(0, 100) + '...' : 'null'}`);
    });
  }
  db.close();
});