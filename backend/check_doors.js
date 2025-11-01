const sqlite3 = require('sqlite3');
const path = require('path');

// Database location: data/mud-data.db (at project root level)
const dbPath = path.join(__dirname, '..', 'data', 'mud-data.db');

console.log(`Connecting to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  }
  console.log('✓ Connected to database');
});

// Query for door descriptions
db.all(`
  SELECT
    re.id,
    re.from_room_id,
    re.direction,
    re.door_name,
    re.door_description,
    re.is_door,
    r.name as room_name
  FROM room_exits re
  LEFT JOIN rooms r ON re.from_room_id = r.id
  WHERE re.is_door = 1
  ORDER BY re.from_room_id, re.direction
`, (err, rows) => {
  if (err) {
    console.error('Query error:', err);
    db.close();
    return;
  }

  console.log(`\nFound ${rows.length} door exits:`);

  if (rows.length === 0) {
    console.log('No doors found in database.');
  } else {
    rows.forEach((row, index) => {
      console.log(`\n${index + 1}. Room: ${row.room_name || 'Unknown'}`);
      console.log(`   Direction: ${row.direction}`);
      console.log(`   Door Name: ${row.door_name || 'None'}`);
      console.log(`   Door Description: ${row.door_description || 'NULL'}`);
      console.log(`   Is Door: ${row.is_door}`);
    });

    // Count null descriptions
    const nullDescriptions = rows.filter(row => !row.door_description).length;
    console.log(`\nSummary: ${nullDescriptions} doors have null descriptions out of ${rows.length} total doors`);
  }

  db.close();
});