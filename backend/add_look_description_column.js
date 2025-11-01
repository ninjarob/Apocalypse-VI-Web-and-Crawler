import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database location: data/mud-data.db at project root
const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, '../data/mud-data.db');

console.log('🔄 Adding look_description column to room_exits table...');
console.log(`📁 Database location: ${DB_FILE}`);

// Create database connection
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✓ Connected to database');

    // Add the look_description column to room_exits table
    db.run(`ALTER TABLE room_exits ADD COLUMN look_description TEXT`, (err) => {
      if (err) {
        console.error('❌ Error adding column:', err.message);
        process.exit(1);
      } else {
        console.log('✓ Successfully added look_description column to room_exits table');
        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
          } else {
            console.log('✓ Database connection closed');
          }
          process.exit(0);
        });
      }
    });
  }
});