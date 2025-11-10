const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./apocalypse.db');

console.log('Checking zone_exit flags in rooms...\n');

db.all(`
  SELECT id, name, zone_id, zone_exit 
  FROM rooms 
  WHERE name IN ('The Dump', 'Outside the City Walls', 'Quester''s', 'Outside the Western Gate', 'The edge of the forest', 'Entrance to the Midgaard Sewers', 'On the River', 'A long tunnel', 'Rear exit of the Temple')
  ORDER BY name
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Rooms that should be zone exits:');
    console.table(rows);
    
    const markedCount = rows.filter(r => r.zone_exit === 1).length;
    console.log(`\n${markedCount} out of ${rows.length} rooms marked as zone exits`);
  }
  db.close();
});
