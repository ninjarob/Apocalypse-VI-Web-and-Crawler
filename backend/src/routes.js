const express = require('express');
const { db, serialize, deserialize } = require('./database');

const router = express.Router();

// Helper to convert SQLite row to object with deserialized JSON fields
function deserializeRoom(row) {
  if (!row) return null;
  return {
    ...row,
    exits: deserialize(row.exits) || [],
    npcs: deserialize(row.npcs) || [],
    items: deserialize(row.items) || [],
    coordinates: deserialize(row.coordinates),
  };
}

function deserializeNPC(row) {
  if (!row) return null;
  return {
    ...row,
    dialogue: deserialize(row.dialogue) || [],
    hostile: Boolean(row.hostile),
  };
}

function deserializeItem(row) {
  if (!row) return null;
  return {
    ...row,
    properties: deserialize(row.properties),
    stats: deserialize(row.stats),
  };
}

function deserializeSpell(row) {
  if (!row) return null;
  return {
    ...row,
    effects: deserialize(row.effects) || [],
  };
}

function deserializeAttack(row) {
  if (!row) return null;
  return {
    ...row,
    requirements: deserialize(row.requirements) || [],
  };
}

// ========== ROOM ROUTES ==========

router.get('/rooms', (req, res) => {
  db.all('SELECT * FROM rooms ORDER BY lastVisited DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(deserializeRoom));
  });
});

router.get('/rooms/:id', (req, res) => {
  db.get('SELECT * FROM rooms WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(deserializeRoom(row));
  });
});

router.get('/rooms/by-name/:name', (req, res) => {
  db.get('SELECT * FROM rooms WHERE name = ?', [req.params.name], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(deserializeRoom(row));
  });
});

router.post('/rooms', (req, res) => {
  const room = req.body;
  
  // Check if room exists
  db.get('SELECT * FROM rooms WHERE id = ?', [room.id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update existing room
      const sql = `UPDATE rooms SET 
        visitCount = visitCount + 1,
        lastVisited = ?,
        updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`;
      
      db.run(sql, [new Date().toISOString(), room.id], function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ ...room, visitCount: existing.visitCount + 1 });
      });
    } else {
      // Insert new room
      const sql = `INSERT INTO rooms (
        id, name, description, exits, npcs, items, coordinates, area,
        visitCount, firstVisited, lastVisited, rawText
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        room.id,
        room.name,
        room.description,
        serialize(room.exits),
        serialize(room.npcs),
        serialize(room.items),
        serialize(room.coordinates),
        room.area,
        room.visitCount || 1,
        room.firstVisited || new Date().toISOString(),
        room.lastVisited || new Date().toISOString(),
        room.rawText
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(room);
      });
    }
  });
});

// ========== NPC ROUTES ==========

router.get('/npcs', (req, res) => {
  db.all('SELECT * FROM npcs ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(deserializeNPC));
  });
});

router.get('/npcs/:id', (req, res) => {
  db.get('SELECT * FROM npcs WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'NPC not found' });
    }
    res.json(deserializeNPC(row));
  });
});

router.post('/npcs', (req, res) => {
  const npc = req.body;
  
  db.get('SELECT * FROM npcs WHERE id = ?', [npc.id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update existing NPC
      const sql = `UPDATE npcs SET 
        name = ?, description = ?, location = ?, dialogue = ?,
        hostile = ?, level = ?, race = ?, class = ?, rawText = ?,
        updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`;
      
      const params = [
        npc.name, npc.description, npc.location, serialize(npc.dialogue),
        npc.hostile ? 1 : 0, npc.level, npc.race, npc.class, npc.rawText, npc.id
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(npc);
      });
    } else {
      // Insert new NPC
      const sql = `INSERT INTO npcs (
        id, name, description, location, dialogue, hostile, level, race, class, rawText
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        npc.id, npc.name, npc.description, npc.location, serialize(npc.dialogue),
        npc.hostile ? 1 : 0, npc.level, npc.race, npc.class, npc.rawText
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(npc);
      });
    }
  });
});

// ========== ITEM ROUTES ==========

router.get('/items', (req, res) => {
  db.all('SELECT * FROM items ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(deserializeItem));
  });
});

router.get('/items/:id', (req, res) => {
  db.get('SELECT * FROM items WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(deserializeItem(row));
  });
});

router.post('/items', (req, res) => {
  const item = req.body;
  
  db.get('SELECT * FROM items WHERE id = ?', [item.id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update existing item
      const sql = `UPDATE items SET 
        name = ?, description = ?, type = ?, location = ?,
        properties = ?, stats = ?, rawText = ?,
        updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`;
      
      const params = [
        item.name, item.description, item.type, item.location,
        serialize(item.properties), serialize(item.stats), item.rawText, item.id
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(item);
      });
    } else {
      // Insert new item
      const sql = `INSERT INTO items (
        id, name, description, type, location, properties, stats, rawText
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        item.id, item.name, item.description, item.type, item.location,
        serialize(item.properties), serialize(item.stats), item.rawText
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(item);
      });
    }
  });
});

// ========== SPELL ROUTES ==========

router.get('/spells', (req, res) => {
  db.all('SELECT * FROM spells ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(deserializeSpell));
  });
});

router.post('/spells', (req, res) => {
  const spell = req.body;
  
  db.get('SELECT * FROM spells WHERE id = ?', [spell.id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update
      const sql = `UPDATE spells SET 
        name = ?, description = ?, manaCost = ?, level = ?,
        type = ?, effects = ?, rawText = ?,
        updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`;
      
      const params = [
        spell.name, spell.description, spell.manaCost, spell.level,
        spell.type, serialize(spell.effects), spell.rawText, spell.id
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(spell);
      });
    } else {
      // Insert
      const sql = `INSERT INTO spells (
        id, name, description, manaCost, level, type, effects, rawText
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        spell.id, spell.name, spell.description, spell.manaCost, spell.level,
        spell.type, serialize(spell.effects), spell.rawText
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(spell);
      });
    }
  });
});

// ========== ATTACK ROUTES ==========

router.get('/attacks', (req, res) => {
  db.all('SELECT * FROM attacks ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(deserializeAttack));
  });
});

router.post('/attacks', (req, res) => {
  const attack = req.body;
  
  db.get('SELECT * FROM attacks WHERE id = ?', [attack.id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update
      const sql = `UPDATE attacks SET 
        name = ?, description = ?, damage = ?, type = ?,
        requirements = ?, rawText = ?,
        updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?`;
      
      const params = [
        attack.name, attack.description, attack.damage, attack.type,
        serialize(attack.requirements), attack.rawText, attack.id
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(attack);
      });
    } else {
      // Insert
      const sql = `INSERT INTO attacks (
        id, name, description, damage, type, requirements, rawText
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        attack.id, attack.name, attack.description, attack.damage,
        attack.type, serialize(attack.requirements), attack.rawText
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(attack);
      });
    }
  });
});

// ========== CRAWLER STATUS ROUTES ==========

router.get('/crawler/status', (req, res) => {
  db.get('SELECT * FROM crawler_status ORDER BY timestamp DESC LIMIT 1', [], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row || { status: 'idle' });
  });
});

router.post('/crawler/status', (req, res) => {
  const { status, timestamp } = req.body;
  
  // Get counts
  db.get('SELECT COUNT(*) as roomCount FROM rooms', [], (err, roomData) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT COUNT(*) as npcCount FROM npcs', [], (err, npcData) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT COUNT(*) as itemCount FROM items', [], (err, itemData) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const sql = `INSERT INTO crawler_status (
          status, timestamp, roomsDiscovered, npcsDiscovered, itemsDiscovered
        ) VALUES (?, ?, ?, ?, ?)`;
        
        const params = [
          status,
          timestamp || new Date().toISOString(),
          roomData.roomCount,
          npcData.npcCount,
          itemData.itemCount
        ];
        
        db.run(sql, params, function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({
            id: this.lastID,
            status,
            timestamp,
            roomsDiscovered: roomData.roomCount,
            npcsDiscovered: npcData.npcCount,
            itemsDiscovered: itemData.itemCount
          });
        });
      });
    });
  });
});

// ========== STATS ROUTE ==========

router.get('/stats', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM rooms', [], (err, rooms) => {
    if (err) return res.status(500).json({ error: err.message });
    
    db.get('SELECT COUNT(*) as count FROM npcs', [], (err, npcs) => {
      if (err) return res.status(500).json({ error: err.message });
      
      db.get('SELECT COUNT(*) as count FROM items', [], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        
        db.get('SELECT COUNT(*) as count FROM spells', [], (err, spells) => {
          if (err) return res.status(500).json({ error: err.message });
          
          db.get('SELECT COUNT(*) as count FROM attacks', [], (err, attacks) => {
            if (err) return res.status(500).json({ error: err.message });
            
            db.get('SELECT COUNT(*) as count FROM commands WHERE documented = 1', [], (err, commands) => {
              if (err) return res.status(500).json({ error: err.message });
              
              db.get('SELECT COUNT(*) as count FROM races', [], (err, races) => {
                if (err) return res.status(500).json({ error: err.message });
                
                const stats = {
                  rooms: rooms.count,
                  npcs: npcs.count,
                  items: items.count,
                  spells: spells.count,
                  attacks: attacks.count,
                  commandsDocumented: commands.count,
                  races: races.count,
                  total: rooms.count + npcs.count + items.count + spells.count + attacks.count + races.count
                };
                
                res.json(stats);
              });
            });
          });
        });
      });
    });
  });
});

// ========== COMMAND ROUTES ==========

router.get('/commands', (req, res) => {
  const category = req.query.category;
  let sql = 'SELECT * FROM commands ORDER BY category, name';
  let params = [];
  
  if (category) {
    sql = 'SELECT * FROM commands WHERE category = ? ORDER BY name';
    params = [category];
  }
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(row => ({
      ...row,
      examples: deserialize(row.examples),
      requirements: deserialize(row.requirements),
      relatedCommands: deserialize(row.relatedCommands),
      documented: Boolean(row.documented)
    })));
  });
});

router.get('/commands/:id', (req, res) => {
  db.get('SELECT * FROM commands WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Command not found' });
    }
    res.json({
      ...row,
      examples: deserialize(row.examples),
      requirements: deserialize(row.requirements),
      relatedCommands: deserialize(row.relatedCommands),
      documented: Boolean(row.documented)
    });
  });
});

// Create or update command
router.post('/commands', (req, res) => {
  const command = req.body;
  const commandId = command.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  db.get('SELECT * FROM commands WHERE name = ?', [command.name], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update existing command
      const sql = `UPDATE commands SET 
        syntax = ?,
        description = ?,
        category = ?,
        documented = ?,
        rawHelpText = ?,
        updatedAt = CURRENT_TIMESTAMP
        WHERE name = ?`;
      
      const params = [
        command.syntax || existing.syntax,
        command.description || existing.description,
        command.category || existing.category,
        command.documented ? 1 : existing.documented,
        command.rawHelpText || existing.rawHelpText,
        command.name
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(command);
      });
    } else {
      // Insert new command
      const sql = `INSERT INTO commands (
        id, name, syntax, description, category, documented, rawHelpText
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        commandId,
        command.name,
        command.syntax || null,
        command.description || null,
        command.category || null,
        command.documented ? 1 : 0,
        command.rawHelpText || null
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(command);
      });
    }
  });
});

// Update command (for adding test results)
router.put('/commands/:name', (req, res) => {
  const updates = req.body;
  
  db.get('SELECT * FROM commands WHERE name = ?', [req.params.name], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!existing) {
      return res.status(404).json({ error: 'Command not found' });
    }
    
    // Build dynamic update query based on provided fields (only valid schema fields)
    const fields = [];
    const params = [];
    
    if (updates.description) {
      fields.push('description = ?');
      params.push(updates.description);
    }
    if (updates.syntax) {
      fields.push('syntax = ?');
      params.push(updates.syntax);
    }
    if (updates.category) {
      fields.push('category = ?');
      params.push(updates.category);
    }
    if (updates.rawHelpText) {
      fields.push('rawHelpText = ?');
      params.push(updates.rawHelpText);
    }
    if (updates.documented !== undefined) {
      fields.push('documented = ?');
      params.push(updates.documented ? 1 : 0);
    }
    
    if (fields.length === 0) {
      // No valid fields to update, but still return success
      return res.json({ success: true, changes: 0 });
    }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(req.params.name);
    
    const sql = `UPDATE commands SET ${fields.join(', ')} WHERE name = ?`;
    
    db.run(sql, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    });
  });
});

router.post('/commands/:id/document', (req, res) => {
  const { description, syntax, examples, requirements, levelRequired, relatedCommands, rawHelpText } = req.body;
  
  const sql = `UPDATE commands SET 
    description = ?,
    syntax = ?,
    examples = ?,
    requirements = ?,
    levelRequired = ?,
    relatedCommands = ?,
    rawHelpText = ?,
    documented = 1,
    updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?`;
  
  const params = [
    description,
    syntax,
    serialize(examples),
    serialize(requirements),
    levelRequired,
    serialize(relatedCommands),
    rawHelpText,
    req.params.id
  ];
  
  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, commandId: req.params.id });
  });
});

router.post('/commands/usage', (req, res) => {
  const { commandName, context, success, response } = req.body;
  
  const sql = `INSERT INTO command_usage (commandName, context, success, response) VALUES (?, ?, ?, ?)`;
  const params = [commandName, context, success ? 1 : 0, response];
  
  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ id: this.lastID });
  });
});

router.get('/commands/categories/list', (req, res) => {
  db.all('SELECT DISTINCT category FROM commands ORDER BY category', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(r => r.category));
  });
});

// ========== RACE ROUTES ==========

router.get('/races', (req, res) => {
  db.all('SELECT * FROM races ORDER BY name', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(row => ({
      ...row,
      stats: deserialize(row.stats),
      abilities: deserialize(row.abilities),
      requirements: deserialize(row.requirements)
    })));
  });
});

router.get('/races/:id', (req, res) => {
  db.get('SELECT * FROM races WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Race not found' });
    }
    res.json({
      ...row,
      stats: deserialize(row.stats),
      abilities: deserialize(row.abilities),
      requirements: deserialize(row.requirements)
    });
  });
});

router.post('/races', (req, res) => {
  const race = req.body;
  const raceId = race.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  db.get('SELECT * FROM races WHERE name = ?', [race.name], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existing) {
      // Update existing race
      const sql = `UPDATE races SET 
        description = ?,
        stats = ?,
        abilities = ?,
        requirements = ?,
        helpText = ?,
        updatedAt = CURRENT_TIMESTAMP
        WHERE name = ?`;
      
      const params = [
        race.description || existing.description,
        serialize(race.stats) || existing.stats,
        serialize(race.abilities) || existing.abilities,
        serialize(race.requirements) || existing.requirements,
        race.helpText || existing.helpText,
        race.name
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(race);
      });
    } else {
      // Insert new race
      const sql = `INSERT INTO races (
        id, name, description, stats, abilities, requirements, helpText, discovered
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const params = [
        raceId,
        race.name,
        race.description || null,
        serialize(race.stats) || null,
        serialize(race.abilities) || null,
        serialize(race.requirements) || null,
        race.helpText || null,
        race.discovered || new Date().toISOString()
      ];
      
      db.run(sql, params, function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json(race);
      });
    }
  });
});

module.exports = router;
