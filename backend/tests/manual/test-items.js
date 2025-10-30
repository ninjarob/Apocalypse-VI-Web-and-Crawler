const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'mud-data.db');
const db = new sqlite3.Database(dbPath);

console.log('📦 Checking Items Data...\n');

// Check reference tables
db.all('SELECT * FROM item_types', (err, rows) => {
  if (err) {
    console.error('❌ Error querying item_types:', err.message);
    return;
  }
  console.log(`✓ Item Types (${rows.length}):`);
  rows.forEach(row => console.log(`  - ${row.name}: ${row.description}`));
});

db.all('SELECT * FROM item_materials', (err, rows) => {
  if (err) {
    console.error('❌ Error querying item_materials:', err.message);
    return;
  }
  console.log(`\n✓ Item Materials (${rows.length}):`);
  console.log(`  ${rows.map(r => r.name).join(', ')}`);
});

db.all('SELECT * FROM wear_locations', (err, rows) => {
  if (err) {
    console.error('❌ Error querying wear_locations:', err.message);
    return;
  }
  console.log(`\n✓ Wear Locations (${rows.length}):`);
  rows.forEach(row => console.log(`  - ${row.name}: ${row.description} (slots: ${row.slot_limit})`));
});

// Check items
db.all('SELECT i.id, i.name, t.name as type FROM items i JOIN item_types t ON i.type_id = t.id', (err, rows) => {
  if (err) {
    console.error('❌ Error querying items:', err.message);
    return;
  }
  console.log(`\n✓ Items (${rows.length}):`);
  rows.forEach(row => console.log(`  - ${row.name} (${row.type}) [${row.id}]`));
  
  // Check detailed metadata for first item
  if (rows.length > 0) {
    const itemId = rows[0].id;
    console.log(`\n📋 Detailed metadata for "${rows[0].name}":`);
    
    db.all(`
      SELECT sf.name as stat_name, ise.modifier
      FROM item_stat_effects ise
      JOIN stat_types sf ON ise.stat_type_id = sf.id
      WHERE ise.item_id = ?
    `, [itemId], (err, stats) => {
      if (err) console.error('  Error querying stats:', err.message);
      else {
        console.log('  Stats:');
        stats.forEach(s => console.log(`    - ${s.stat_name}: ${s.modifier > 0 ? '+' : ''}${s.modifier}`));
      }
    });
    
    db.all(`
      SELECT wl.name
      FROM item_wear_locations iwl
      JOIN wear_locations wl ON iwl.location_id = wl.id
      WHERE iwl.item_id = ?
    `, [itemId], (err, locs) => {
      if (err) console.error('  Error querying wear locations:', err.message);
      else {
        console.log('  Wear Locations:');
        locs.forEach(l => console.log(`    - ${l.name}`));
      }
    });
    
    db.all(`
      SELECT f.name
      FROM item_flag_instances ifi
      JOIN item_flags f ON ifi.flag_id = f.id
      WHERE ifi.item_id = ?
    `, [itemId], (err, flags) => {
      if (err) console.error('  Error querying flags:', err.message);
      else {
        console.log('  Flags:');
        flags.forEach(f => console.log(`    - ${f.name}`));
      }
      
      // Close database after all queries
      setTimeout(() => db.close(), 100);
    });
  } else {
    db.close();
  }
});
