import express from 'express';
import { getDatabase } from './database';
import { promisify } from 'util';

const router = express.Router();

// Helper to parse JSON fields
function parseJSON(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Helper to stringify objects for storage
function stringifyJSON(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

// ===== ROOMS =====

router.get('/rooms', async (req, res) => {
  try {
    const db = getDatabase();
    const all = promisify(db.all.bind(db));
    const rows = await all('SELECT * FROM rooms ORDER BY lastVisited DESC');
    const rooms = rows.map((row: any) => ({
      ...row,
      exits: parseJSON(row.exits),
      npcs: parseJSON(row.npcs),
      items: parseJSON(row.items),
      coordinates: parseJSON(row.coordinates),
      visitCount: Number(row.visitCount)
    }));
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/rooms/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    const row = await get('SELECT * FROM rooms WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Room not found' });
    const room = {
      ...row,
      exits: parseJSON(row.exits),
      npcs: parseJSON(row.npcs),
      items: parseJSON(row.items),
      coordinates: parseJSON(row.coordinates)
    };
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

router.get('/rooms/by-name/:name', async (req, res) => {
  try {
    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    const row = await get('SELECT * FROM rooms WHERE name = ?', [req.params.name]);
    if (!row) return res.status(404).json({ error: 'Room not found' });
    const room = {
      ...row,
      exits: parseJSON(row.exits),
      npcs: parseJSON(row.npcs),
      items: parseJSON(row.items),
      coordinates: parseJSON(row.coordinates)
    };
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    const run = promisify(db.run.bind(db));
    
    const existing = await get('SELECT * FROM rooms WHERE id = ?', [req.body.id]);
    
    if (existing) {
      await run(
        'UPDATE rooms SET visitCount = visitCount + 1, lastVisited = ?, updatedAt = ? WHERE id = ?',
        [new Date().toISOString(), new Date().toISOString(), req.body.id]
      );
      const updated = await get('SELECT * FROM rooms WHERE id = ?', [req.body.id]);
      res.json(updated);
    } else {
      await run(
        `INSERT INTO rooms (id, name, description, exits, npcs, items, coordinates, area, visitCount, firstVisited, lastVisited, rawText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.body.id,
          req.body.name,
          req.body.description,
          stringifyJSON(req.body.exits),
          stringifyJSON(req.body.npcs),
          stringifyJSON(req.body.items),
          stringifyJSON(req.body.coordinates),
          req.body.area,
          req.body.visitCount || 1,
          req.body.firstVisited || new Date().toISOString(),
          req.body.lastVisited || new Date().toISOString(),
          req.body.rawText
        ]
      );
      const created = await get('SELECT * FROM rooms WHERE id = ?', [req.body.id]);
      res.status(201).json(created);
    }
  } catch (error) {
    console.error('Error saving room:', error);
    res.status(500).json({ error: 'Failed to save room' });
  }
});

// Stats endpoint - must come before other wildcard routes
router.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();
    const get = promisify(db.get.bind(db));
    
    const [rooms, npcs, items, spells, attacks, commands, lore, factions, quests, regions, relationships] = await Promise.all([
      get('SELECT COUNT(*) as count FROM rooms').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM npcs').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM items').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM spells').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM attacks').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM commands').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM lore').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM factions').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM quests').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM regions').then((r: any) => r.count),
      get('SELECT COUNT(*) as count FROM relationships').then((r: any) => r.count)
    ]);
    
    res.json({
      rooms,
      npcs,
      items,
      spells,
      attacks,
      commands,
      lore,
      factions,
      quests,
      regions,
      relationships,
      total: rooms + npcs + items + spells + attacks + commands + lore + factions + quests + regions + relationships
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
