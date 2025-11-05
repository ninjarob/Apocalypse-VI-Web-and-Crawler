const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

db.all(`SELECT name, alias FROM zones WHERE name LIKE '%Midgaard%' OR name LIKE '%Asty%' OR alias LIKE '%Midgaard%' OR alias LIKE '%Asty%'`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Zone Names and Aliases:');
    rows.forEach(zone => {
      console.log(`Name: ${zone.name}, Alias: ${zone.alias || 'null'}`);
    });
  }
  db.close();
});