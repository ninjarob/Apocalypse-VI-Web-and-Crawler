const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('../data/mud-data.db');

db.all('SELECT id, direction, door_name, door_description, description FROM room_exits WHERE door_description IS NOT NULL AND door_description != ""', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Found', rows.length, 'door descriptions:');
    rows.forEach(row => {
      console.log(`ID: ${row.id}, Direction: ${row.direction}, Door: ${row.door_name || 'N/A'}`);
      console.log(`Door Description: ${row.door_description}`);
      console.log(`Exit Description: ${row.description || 'N/A'}`);
      console.log('---');
    });
  }
  db.close();
});