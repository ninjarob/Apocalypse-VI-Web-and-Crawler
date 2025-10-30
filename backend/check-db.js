const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../mud-data.db');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Tables in database:');
    rows.forEach(row => console.log(`  - ${row.name}`));
    
    // Check abilities table specifically
    db.get("SELECT COUNT(*) as count FROM abilities", (err2, result) => {
      if (err2) {
        console.log('\n❌ abilities table does not exist or error:', err2.message);
      } else {
        console.log(`\n✓ abilities table exists with ${result.count} rows`);
      }
      db.close();
    });
  }
});
