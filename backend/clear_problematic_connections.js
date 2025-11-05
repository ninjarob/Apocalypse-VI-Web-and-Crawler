const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

console.log('Clearing problematic connections...');

db.run('UPDATE room_exits SET to_room_id = NULL WHERE from_room_id = 3 AND direction = "south"', (err) => {
  if (err) {
    console.error('Error clearing south exit from Temple:', err);
  } else {
    console.log('✓ Cleared self-referencing south exit from The Temple of Midgaard');
  }

  db.run('UPDATE room_exits SET to_room_id = NULL WHERE from_room_id = 5 AND direction = "south"', (err) => {
    if (err) {
      console.error('Error clearing south exit from Grand Gates:', err);
    } else {
      console.log('✓ Cleared incorrect south exit from Grand Gates of the Temple of Midgaard');
    }

    db.close();
  });
});