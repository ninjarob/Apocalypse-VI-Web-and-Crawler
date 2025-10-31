import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../data/mud-data.db');
console.log('Checking database at:', dbPath);

const db = new sqlite3.Database(dbPath);
db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='player_actions'", (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('player_actions table exists:', rows.length > 0);
    if (rows.length > 0) {
      console.log('Table info:', rows[0]);
    }
  }
  db.close();
});