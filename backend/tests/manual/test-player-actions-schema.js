const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../data/mud-data.db');
const db = new sqlite3.Database(dbPath);

console.log('\n📊 Testing Player Actions Table Structure:\n');

// First check if table exists
db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name='player_actions'`, (err, tables) => {
  if (err) {
    console.error('Error checking tables:', err);
    db.close();
    return;
  }

  if (tables.length === 0) {
    console.error('❌ player_actions table does not exist!');
    db.close();
    return;
  }

  console.log('✓ player_actions table exists');

  // Check table schema
  db.all(`PRAGMA table_info(player_actions)`, (err, columns) => {
    if (err) {
      console.error('Error getting table info:', err);
      db.close();
      return;
    }

    console.log('Player Actions Table Columns:');
    columns.forEach(col => {
      console.log(`  ${col.name.padEnd(20)} ${col.type.padEnd(10)} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
    });

    console.log('\nAll columns found:', columns.map(c => c.name).join(', '));

    // Check if testResults column exists
    const testResultsCol = columns.find(col => col.name === 'testResults');
    if (!testResultsCol) {
      console.error('❌ testResults column not found!');
      db.close();
      return;
    }

    console.log('\n✅ testResults column found with type:', testResultsCol.type);

    // Test inserting sample data with testResults array
    const sampleTestResults = JSON.stringify([
      {
        command_result: 'Command executed successfully',
        tested_by_character: 'TestCharacter',
        tested_at: new Date().toISOString(),
        character_class: 'Warrior'
      },
      {
        command_result: 'Command failed with error',
        tested_by_character: 'TestCharacter2',
        tested_at: new Date().toISOString(),
        character_class: 'Mage'
      }
    ]);

    const sampleAction = {
      name: 'test-action',
      type: 'command',
      description: 'Test action for schema validation',
      syntax: 'test <arg>',
      examples: 'test hello',
      testResults: sampleTestResults,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.run(`
      INSERT INTO player_actions (name, type, description, syntax, examples, testResults, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sampleAction.name,
      sampleAction.type,
      sampleAction.description,
      sampleAction.syntax,
      sampleAction.examples,
      sampleAction.testResults,
      sampleAction.createdAt,
      sampleAction.updatedAt
    ], function(err) {
      if (err) {
        console.error('❌ Error inserting test data:', err);
      } else {
        console.log('✅ Successfully inserted test action with testResults array');

        // Verify the data was stored correctly
        db.get(`SELECT id, name, testResults FROM player_actions WHERE name = ?`, ['test-action'], (err, row) => {
          if (err) {
            console.error('❌ Error retrieving test data:', err);
          } else {
            console.log('\n📋 Retrieved test action:');
            console.log(`  ID: ${row.id}`);
            console.log(`  Name: ${row.name}`);
            console.log(`  Test Results: ${row.testResults}`);

            try {
              const parsedResults = JSON.parse(row.testResults);
              console.log('\n✅ Successfully parsed testResults JSON:');
              parsedResults.forEach((result, index) => {
                console.log(`  Test ${index + 1}:`);
                console.log(`    Result: ${result.command_result}`);
                console.log(`    Character: ${result.tested_by_character}`);
                console.log(`    Class: ${result.character_class}`);
                console.log(`    Timestamp: ${result.tested_at}`);
              });

              // Clean up test data
              db.run(`DELETE FROM player_actions WHERE name = ?`, ['test-action'], (err) => {
                if (err) {
                  console.error('❌ Error cleaning up test data:', err);
                } else {
                  console.log('\n🧹 Cleaned up test data');
                }
                db.close();
              });
            } catch (parseErr) {
              console.error('❌ Error parsing testResults JSON:', parseErr);
              db.close();
            }
          }
        });
      }
    });
  });
});