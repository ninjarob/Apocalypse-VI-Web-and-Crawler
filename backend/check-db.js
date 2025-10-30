const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/mud-data.db');
const db = new sqlite3.Database(dbPath);

console.log('\n📊 Class Proficiency Counts:\n');
db.all(`
  SELECT c.name as class_name, COUNT(cp.id) as prof_count 
  FROM classes c 
  LEFT JOIN class_proficiencies cp ON c.id = cp.class_id 
  GROUP BY c.id 
  ORDER BY c.name
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    rows.forEach(r => {
      console.log(`  ${r.class_name.padEnd(15)} ${r.prof_count} proficiencies`);
    });
    const total = rows.reduce((sum, r) => sum + r.prof_count, 0);
    console.log(`\n  Total: ${total} proficiencies`);
    
    // Check prerequisites
    console.log('\n📋 Prerequisites Sample:\n');
    db.all(`
      SELECT cp.name, c.name as class_name, prereq.name as prerequisite 
      FROM class_proficiencies cp 
      JOIN classes c ON cp.class_id = c.id 
      LEFT JOIN class_proficiencies prereq ON cp.prerequisite_id = prereq.id 
      WHERE cp.prerequisite_id IS NOT NULL 
      LIMIT 15
    `, (err2, prereqs) => {
      if (err2) {
        console.error('Error:', err2);
      } else {
        prereqs.forEach(p => {
          console.log(`  ${p.name} (${p.class_name}) requires ${p.prerequisite}`);
        });
        console.log('\n✅ Verification complete!');
      }
      db.close();
    });
  }
});
