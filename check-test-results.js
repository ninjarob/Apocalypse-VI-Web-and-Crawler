const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('c:\\work\\other\\Apocalypse VI MUD\\data\\mud-data.db');

db.all('SELECT name, testResults FROM player_actions WHERE testResults IS NOT NULL AND json_array_length(testResults) > 0 LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(`Found ${rows.length} records with testResults:`);
    rows.forEach((row, index) => {
      try {
        const testResults = JSON.parse(row.testResults);
        console.log(`${index + 1}. ${row.name}: ${testResults.length} test(s)`);
        if (testResults.length > 0) {
          console.log(`   Latest: ${new Date(testResults[0].tested_at).toLocaleString()}`);
        }
      } catch (e) {
        console.log(`${index + 1}. ${row.name}: Parse error - ${e.message}`);
      }
    });
    if (rows.length === 0) {
      console.log('No records with testResults found.');
    }
  }
  db.close();
});