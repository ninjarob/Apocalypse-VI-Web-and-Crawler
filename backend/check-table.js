const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='player_actions'", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('player_actions table exists:', rows.length > 0);
    if (rows.length === 0) {
      console.log('Table does not exist, creating it...');
      db.run(`CREATE TABLE IF NOT EXISTS player_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        category TEXT,
        description TEXT,
        syntax TEXT,
        examples TEXT,
        requirements TEXT,
        levelRequired INTEGER,
        relatedActions TEXT,
        documented INTEGER DEFAULT 0,
        discovered TEXT,
        lastTested TEXT,
        timesUsed INTEGER DEFAULT 0,
        successCount INTEGER DEFAULT 0,
        failCount INTEGER DEFAULT 0,
        testResults TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          console.error('Error creating table:', err);
        } else {
          console.log('Table created successfully');
        }
        db.close();
      });
    } else {
      db.close();
    }
  }
});