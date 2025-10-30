import express from 'express';
import { repositories } from './repositories';
import { Room } from './repositories/RoomRepository';

const router = express.Router();

// ===== ROOMS =====

router.get('/rooms', async (_req, res) => {
  try {
    const rooms = await repositories.rooms.findAll();
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/rooms/:id', async (req, res) => {
  try {
    const room = await repositories.rooms.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

router.get('/rooms/by-name/:name', async (req, res) => {
  try {
    const room = await repositories.rooms.findByName(req.params.name);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const existing = await repositories.rooms.findById(req.body.id);
    
    if (existing) {
      // Update visit count for existing room
      const updated = await repositories.rooms.recordVisit(req.body.id);
      res.json(updated);
    } else {
      // Create new room
      const roomData: Partial<Room> = {
        id: req.body.id,
        name: req.body.name,
        description: req.body.description,
        exits: req.body.exits,
        npcs: req.body.npcs,
        items: req.body.items,
        coordinates: req.body.coordinates,
        area: req.body.area,
        zone_id: req.body.zone_id,
        vnum: req.body.vnum,
        terrain: req.body.terrain,
        flags: req.body.flags,
        visitCount: req.body.visitCount || 1,
        firstVisited: req.body.firstVisited || new Date().toISOString(),
        lastVisited: req.body.lastVisited || new Date().toISOString(),
        rawText: req.body.rawText
      };
      const created = await repositories.rooms.create(roomData);
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
    const [rooms, npcs, items, spells, attacks, abilities, races, zones] = await Promise.all([
      repositories.rooms.count().catch(() => 0),
      // For entities without repositories yet, we'll keep the old way temporarily
      repositories.rooms.count().then(() => 0).catch(() => 0), // npcs placeholder
      repositories.rooms.count().then(() => 0).catch(() => 0), // items placeholder
      repositories.rooms.count().then(() => 0).catch(() => 0), // spells placeholder
      repositories.rooms.count().then(() => 0).catch(() => 0), // attacks placeholder
      repositories.rooms.count().then(() => 0).catch(() => 0), // abilities placeholder
      repositories.rooms.count().then(() => 0).catch(() => 0), // races placeholder
      repositories.zones.count().catch(() => 0)
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
