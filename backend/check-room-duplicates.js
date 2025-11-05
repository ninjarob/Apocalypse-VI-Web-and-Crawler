const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all(`SELECT TRIM(name) as trimmed_name, COUNT(*) as count, GROUP_CONCAT(id || ':' || name) as ids_names
        FROM rooms
        GROUP BY TRIM(name)
        HAVING COUNT(*) > 1
        ORDER BY count DESC`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Duplicate room names (by trimmed name):');
    rows.forEach(row => {
      console.log(`"${row.trimmed_name}": ${row.count} duplicates`);
      console.log(`  IDs and names: ${row.ids_names}`);
      console.log('');
    });
  }
  db.close();
});