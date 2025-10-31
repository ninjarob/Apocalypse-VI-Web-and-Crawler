const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/mud-data.db');

db.all('SELECT name, testResults FROM player_actions WHERE testResults IS NOT NULL AND testResults != "" LIMIT 5', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Player actions with testResults:');
    rows.forEach(row => {
      const testResults = row.testResults ? JSON.parse(row.testResults) : null;
      console.log(`${row.name}:`, testResults);
    });
  }
  db.close();
});