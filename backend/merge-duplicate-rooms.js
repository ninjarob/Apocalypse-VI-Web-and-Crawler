const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data/mud-data.db');

// Function to merge duplicate rooms
async function mergeDuplicateRooms() {
  try {
    // Get all duplicate groups
    const duplicates = await new Promise((resolve, reject) => {
      db.all(`SELECT TRIM(name) as trimmed_name, GROUP_CONCAT(id) as ids
              FROM rooms
              GROUP BY TRIM(name)
              HAVING COUNT(*) > 1
              ORDER BY COUNT(*) DESC`, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Found ${duplicates.length} groups of duplicate rooms`);

    for (const group of duplicates) {
      const trimmedName = group.trimmed_name;
      const ids = group.ids.split(',').map(id => parseInt(id)).sort((a, b) => b - a); // Sort descending (newest first)

      console.log(`\nProcessing "${trimmedName}" with IDs: [${ids.join(', ')}]`);

      // Keep the highest ID (most recent), delete others
      const keepId = ids[0];
      const deleteIds = ids.slice(1);

      console.log(`Keeping room ID ${keepId}, deleting IDs: [${deleteIds.join(', ')}]`);

      // Update all exits that reference the rooms to be deleted
      for (const deleteId of deleteIds) {
        // Get all exits from the room to be deleted
        const exitsToUpdate = await new Promise((resolve, reject) => {
          db.all('SELECT * FROM room_exits WHERE from_room_id = ?', [deleteId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        for (const exit of exitsToUpdate) {
          // Check if the target room already has an exit in this direction
          const existingExit = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM room_exits WHERE from_room_id = ? AND direction = ?',
                   [keepId, exit.direction], (err, row) => {
              if (err) reject(err);
              else resolve(row);
            });
          });

          if (existingExit) {
            // Target room already has this direction, delete the duplicate exit
            console.log(`Room ${keepId} already has ${exit.direction} exit, deleting duplicate from room ${deleteId}`);
            await new Promise((resolve, reject) => {
              db.run('DELETE FROM room_exits WHERE id = ?', [exit.id], function(err) {
                if (err) reject(err);
                else resolve();
              });
            });
          } else {
            // Update the exit to point to the target room
            await new Promise((resolve, reject) => {
              db.run('UPDATE room_exits SET from_room_id = ? WHERE id = ?',
                     [keepId, exit.id], function(err) {
                if (err) reject(err);
                else {
                  console.log(`Updated exit ${exit.direction} from room ${deleteId} to ${keepId}`);
                  resolve();
                }
              });
            });
          }
        }

        // Update exits that point TO the room to be deleted
        await new Promise((resolve, reject) => {
          db.run('UPDATE room_exits SET to_room_id = ? WHERE to_room_id = ?',
                 [keepId, deleteId], function(err) {
            if (err) reject(err);
            else {
              console.log(`Updated ${this.changes} exits pointing to room ${deleteId} to point to ${keepId}`);
              resolve();
            }
          });
        });
      }

      // Delete the duplicate rooms
      for (const deleteId of deleteIds) {
        await new Promise((resolve, reject) => {
          db.run('DELETE FROM rooms WHERE id = ?', [deleteId], function(err) {
            if (err) reject(err);
            else {
              console.log(`Deleted room ID ${deleteId}`);
              resolve();
            }
          });
        });
      }
    }

    console.log('\nDuplicate room merge completed!');

  } catch (error) {
    console.error('Error merging duplicates:', error);
  } finally {
    db.close();
  }
}

mergeDuplicateRooms();