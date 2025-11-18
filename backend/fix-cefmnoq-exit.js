#!/usr/bin/env node
/**
 * Fix spurious exit from "Surrounded by grasslands" (cefmnoq)
 * 
 * Issue: Room 188 (cefmnoq) has west exit going to room 187 (cdijlnoq)
 * Fix: Should go to room 131 (cdeghjklmoq) instead
 * 
 * Based on exploration log line 7421 which shows:
 * west - North end of the grasslands (cdeghjklmoq)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/mud-data.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('Connected to database.');
});

// First, verify the current state
console.log('\n=== Current State ===');
db.all(`
  SELECT re.id, re.direction, r1.name as from_room, r1.portal_key as from_key, 
         r2.name as to_room, r2.portal_key as to_key
  FROM room_exits re
  JOIN rooms r1 ON re.from_room_id = r1.id
  JOIN rooms r2 ON re.to_room_id = r2.id
  WHERE re.from_room_id = 188 AND re.direction = 'west'
`, [], (err, rows) => {
  if (err) {
    console.error('Error querying current state:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.table(rows);
  
  if (rows.length === 0) {
    console.log('No west exit found from room 188. Nothing to fix.');
    db.close();
    process.exit(0);
  }
  
  if (rows[0].to_key === 'cdeghjklmoq') {
    console.log('Exit already points to the correct destination. Nothing to fix.');
    db.close();
    process.exit(0);
  }
  
  // Update the exit
  console.log('\n=== Updating Exit ===');
  console.log('Changing west exit from room 188 (cefmnoq) to room 131 (cdeghjklmoq)...');
  
  db.run(`
    UPDATE room_exits 
    SET to_room_id = 131, 
        updatedAt = datetime('now')
    WHERE from_room_id = 188 AND direction = 'west'
  `, [], function(err) {
    if (err) {
      console.error('Error updating exit:', err.message);
      db.close();
      process.exit(1);
    }
    
    console.log(`Updated ${this.changes} row(s).`);
    
    // Check if reverse exit exists (east from room 131 to room 188)
    console.log('\n=== Checking Reverse Exit ===');
    db.all(`
      SELECT re.id, re.direction, r1.name as from_room, r1.portal_key as from_key,
             r2.name as to_room, r2.portal_key as to_key
      FROM room_exits re
      JOIN rooms r1 ON re.from_room_id = r1.id
      JOIN rooms r2 ON re.to_room_id = r2.id
      WHERE re.from_room_id = 131 AND re.to_room_id = 188
    `, [], (err, rows) => {
      if (err) {
        console.error('Error checking reverse exit:', err.message);
        db.close();
        process.exit(1);
      }
      
      if (rows.length > 0) {
        console.log('Reverse exit already exists:');
        console.table(rows);
        
        // Verify final state
        verifyFinalState();
      } else {
        console.log('No reverse exit found. Creating east exit from room 131 to room 188...');
        
        db.run(`
          INSERT INTO room_exits (from_room_id, to_room_id, direction, description, look_description, createdAt, updatedAt)
          VALUES (131, 188, 'east', 'The grasslands continue to the east.', 'The grasslands continue to the east.', datetime('now'), datetime('now'))
        `, [], function(err) {
          if (err) {
            console.error('Error creating reverse exit:', err.message);
            db.close();
            process.exit(1);
          }
          
          console.log(`Created reverse exit (ID: ${this.lastID}).`);
          
          // Verify final state
          verifyFinalState();
        });
      }
    });
  });
});

function verifyFinalState() {
  console.log('\n=== Final State ===');
  db.all(`
    SELECT re.id, re.direction, r1.id as from_id, r1.name as from_room, r1.portal_key as from_key,
           r2.id as to_id, r2.name as to_room, r2.portal_key as to_key
    FROM room_exits re
    JOIN rooms r1 ON re.from_room_id = r1.id
    JOIN rooms r2 ON re.to_room_id = r2.id
    WHERE (re.from_room_id = 188 AND re.to_room_id = 131)
       OR (re.from_room_id = 131 AND re.to_room_id = 188)
    ORDER BY re.from_room_id, re.direction
  `, [], (err, rows) => {
    if (err) {
      console.error('Error verifying final state:', err.message);
    } else {
      console.table(rows);
      console.log('\n✅ Exit fix complete!');
    }
    
    db.close();
  });
}
