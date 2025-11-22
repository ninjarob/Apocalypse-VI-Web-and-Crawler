#!/usr/bin/env node
/**
 * Database Query Utility
 * 
 * Executes SQL queries against the MUD database and displays results in a readable format.
 * 
 * Usage:
 *   node query-db.js "SELECT * FROM rooms WHERE portal_key = 'cfhilnoq'"
 *   node query-db.js "SELECT COUNT(*) as total FROM rooms"
 *   node query-db.js "SELECT * FROM room_exits WHERE from_room_id = 1"
 * 
 * Options:
 *   --json    Output results as JSON instead of table format
 *   --db      Specify alternate database path (default: ../data/mud-data.db)
 * 
 * Examples:
 *   node query-db.js "SELECT * FROM rooms LIMIT 5"
 *   node query-db.js "SELECT * FROM rooms" --json
 *   node query-db.js "SELECT * FROM rooms" --db ./test.db
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let sqlQuery = null;
let outputJson = false;
let dbPath = path.join(__dirname, '../data/mud-data.db');

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--json') {
    outputJson = true;
  } else if (args[i] === '--db' && args[i + 1]) {
    dbPath = args[i + 1];
    i++; // Skip next arg
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
Database Query Utility

Usage:
  node query-db.js "SQL QUERY" [OPTIONS]

Options:
  --json      Output results as JSON
  --db PATH   Use alternate database file
  --help, -h  Show this help message

Examples:
  node query-db.js "SELECT * FROM rooms WHERE portal_key = 'cfhilnoq'"
  node query-db.js "SELECT COUNT(*) as total FROM rooms"
  node query-db.js "SELECT * FROM room_exits WHERE from_room_id = 1"
  node query-db.js "SELECT * FROM rooms LIMIT 5" --json

Common Queries:
  # Count rooms
  node query-db.js "SELECT COUNT(*) as total FROM rooms"
  
  # Find room by portal key
  node query-db.js "SELECT * FROM rooms WHERE portal_key = 'cfhilnoq'"
  
  # Find room by name
  node query-db.js "SELECT * FROM rooms WHERE name LIKE '%muddy%'"
  
  # Get exits for a room
  node query-db.js "SELECT * FROM room_exits WHERE from_room_id = 1"
  
  # Get zones
  node query-db.js "SELECT * FROM zones"
`);
    process.exit(0);
  } else if (!sqlQuery) {
    sqlQuery = args[i];
  }
}

// Validate input
if (!sqlQuery) {
  console.error('Error: No SQL query provided');
  console.error('Usage: node query-db.js "SQL QUERY"');
  console.error('Try: node query-db.js --help');
  process.exit(1);
}

// Connect to database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    console.error('Database path:', dbPath);
    process.exit(1);
  }
});

// Execute query
const queryType = sqlQuery.trim().toUpperCase().split(/\s+/)[0];
const isSelectQuery = queryType === 'SELECT' || queryType === 'PRAGMA';

if (isSelectQuery) {
  db.all(sqlQuery, [], (err, rows) => {
    if (err) {
      console.error('Query Error:', err.message);
      console.error('SQL:', sqlQuery);
      db.close();
      process.exit(1);
    }

    if (outputJson) {
      console.log(JSON.stringify(rows, null, 2));
    } else {
      if (rows.length === 0) {
        console.log('No results found.');
      } else {
        console.log(`\nFound ${rows.length} row(s):\n`);
        console.table(rows);
      }
    }
    
    db.close();
  });
} else {
  // For non-SELECT queries (INSERT, UPDATE, DELETE, etc.)
  db.run(sqlQuery, [], function(err) {
    if (err) {
      console.error('Query Error:', err.message);
      console.error('SQL:', sqlQuery);
      db.close();
      process.exit(1);
    }

    console.log(`Query executed successfully.`);
    console.log(`Rows affected: ${this.changes}`);
    if (this.lastID) {
      console.log(`Last inserted ID: ${this.lastID}`);
    }
    
    db.close();
  });
}