const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/mud-data.db');

db.get('SELECT name, testResults FROM player_actions WHERE name = "affected"', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Raw testResults for affected:', row?.testResults);
    if (row?.testResults) {
      try {
        const parsed = JSON.parse(row.testResults);
        console.log('Parsed testResults:', parsed);
      } catch (e) {
        console.log('Failed to parse:', e.message);
      }
    } else {
      console.log('No testResults found for affected command');
    }
  }
  db.close();
});