import express from 'express';
import { getDatabase } from './database';
import { Database } from 'sqlite3';

const router = express.Router();

// Promisify database methods
function promisifyGet(db: Database) {
  return (sql: string, params?: any[]): Promise<any> => {
    return new Promise((resolve, reject) => {
      db.get(sql, params || [], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };
}

function promisifyAll(db: Database) {
  return (sql: string, params?: any[]): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      db.all(sql, params || [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };
}

function promisifyRun(db: Database) {
  return (sql: string, params?: any[]): Promise<void> => {
    return new Promise((resolve, reject) => {
      db.run(sql, params || [], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };
}

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

router.get('/rooms', async (_req, res) => {
  try {
    const db = getDatabase();
    const all = promisifyAll(db);
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
    const get = promisifyGet(db);
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
    const get = promisifyGet(db);
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
    const get = promisifyGet(db);
    const run = promisifyRun(db);
    
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
router.get('/stats', async (_req, res) => {
  try {
    const db = getDatabase();
    const get = promisifyGet(db);
    
    // Only query tables that actually exist in the current schema
    const [rooms, npcs, items, spells, attacks, abilities, races, zones] = await Promise.all([
      get('SELECT COUNT(*) as count FROM rooms').then((r: any) => r?.count || 0).catch(() => 0),
      get('SELECT COUNT(*) as count FROM npcs').then((r: any) => r?.count || 0).catch(() => 0),
      get('SELECT COUNT(*) as count FROM items').then((r: any) => r?.count || 0).catch(() => 0),
      get('SELECT COUNT(*) as count FROM spells').then((r: any) => r?.count || 0).catch(() => 0),
      get('SELECT COUNT(*) as count FROM attacks').then((r: any) => r?.count || 0).catch(() => 0),
      get('SELECT COUNT(*) as count FROM abilities').then((r: any) => r?.count || 0).catch(() => 0),
      get('SELECT COUNT(*) as count FROM races').then((r: any) => r?.count || 0).catch(() => 0),
      get('SELECT COUNT(*) as count FROM zones').then((r: any) => r?.count || 0).catch(() => 0)
    ]);
    
    res.json({
      rooms,
      npcs,
      items,
      spells,
      attacks,
      abilities,
      races,
      zones,
      total: rooms + npcs + items + spells + attacks + abilities + races + zones
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
