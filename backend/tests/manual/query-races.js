const {db} = require('./src/database');

db.all('SELECT id, name, description FROM races ORDER BY name', [], (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  console.log('\n=== Races in Database ===\n');
  rows.forEach(r => {
    console.log(`${r.name} (${r.id})`);
    if (r.description) {
      const desc = r.description.substring(0, 80);
      console.log(`  ${desc}${r.description.length > 80 ? '...' : ''}`);
    }
    console.log();
  });
  
  console.log(`Total: ${rows.length} races discovered`);
  process.exit(0);
});
