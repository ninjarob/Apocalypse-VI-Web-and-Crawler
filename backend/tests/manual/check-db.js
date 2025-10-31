const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = 'c:\\work\\other\\Apocalypse VI MUD\\data\\mud-data.db';
console.log('Database path:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  console.log('✓ Connected to database');
  
  // List all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('Error listing tables:', err);
      db.close();
      return;
    }
    
    console.log('\n📊 Database Tables:');
    tables.forEach(t => {
      console.log(`  ${t.name}`);
    });
    
    // Check player_actions
    if (tables.some(t => t.name === 'player_actions')) {
      db.all("SELECT id, name FROM player_actions LIMIT 10", (err, actions) => {
        if (err) {
          console.error('Error querying player_actions:', err);
        } else {
          console.log('\n📋 Player Actions (first 10):');
          actions.forEach(a => {
            console.log(`  ${a.id}: ${a.name}`);
          });
        }
        db.close();
      });
    } else {
      console.log('\n❌ player_actions table not found');
      db.close();
    }
  });
});
