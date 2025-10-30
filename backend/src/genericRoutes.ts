import express, { Request, Response } from 'express';
import { EntityConfig } from './repositories/BaseRepository';
import { RepositoryFactory } from './repositories/GenericRepository';

const router = express.Router();

/**
 * Entity configuration - defines schema and serialization for each entity type
 */
const ENTITY_CONFIG: Record<string, EntityConfig> = {
  rooms: {
    table: 'rooms',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['exits', 'npcs', 'items', 'coordinates'],
    sortBy: 'lastVisited DESC'
  },
  npcs: {
    table: 'npcs',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['dialogue'],
    booleanFields: ['hostile'],
    sortBy: 'name'
  },
  items: {
    table: 'items',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['properties', 'stats'],
    sortBy: 'name'
  },
  spells: {
    table: 'spells',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['effects'],
    sortBy: 'name'
  },
  attacks: {
    table: 'attacks',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['requirements'],
    sortBy: 'name'
  },
  player_actions: {
    table: 'player_actions',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['examples', 'requirements', 'relatedActions'],
    booleanFields: ['documented'],
    sortBy: 'type, category, name'
  },
  commands: {
    table: 'commands',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['examples', 'requirements', 'relatedCommands'],
    booleanFields: ['documented'],
    sortBy: 'category, name'
  },
  races: {
    table: 'races',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['stats', 'abilities', 'requirements'],
    sortBy: 'name'
  },
  classes: {
    table: 'classes',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['stats', 'abilities', 'requirements', 'startingEquipment'],
    sortBy: 'name'
  },
  skills: {
    table: 'skills',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['requirements', 'effects'],
    sortBy: 'name'
  },
  abilities: {
    table: 'abilities',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    sortBy: 'name'
  },
  ability_scores: {
    table: 'ability_scores',
    idField: 'id',
    autoIncrement: true,
    jsonFields: ['effects'],
    sortBy: 'ability_id, score'
  },
  saving_throws: {
    table: 'saving_throws',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'id'
  },
  spell_modifiers: {
    table: 'spell_modifiers',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'name'
  },
  elemental_resistances: {
    table: 'elemental_resistances',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'name'
  },
  physical_resistances: {
    table: 'physical_resistances',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'name'
  },
  zones: {
    table: 'zones',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'id'
  },
  zone_areas: {
    table: 'zone_areas',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'zone_id, id'
  },
  zone_connections: {
    table: 'zone_connections',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'zone_id, connected_zone_id'
  },
  room_exits: {
    table: 'room_exits',
    idField: 'id',
    autoIncrement: true,
    booleanFields: ['is_door', 'is_locked'],
    sortBy: 'from_room_id, direction'
  }
};

/**
 * GET /entity-types - List all available entity types
 */
router.get('/entity-types', (_req: Request, res: Response) => {
  res.json({
    types: Object.keys(ENTITY_CONFIG),
    config: ENTITY_CONFIG
  });
});

/**
 * GET /:type - Get all entities of a type
 */
router.get('/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const config = ENTITY_CONFIG[type];
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  try {
    const repository = RepositoryFactory.getRepository(config);
    
    // Build filters from query parameters
    const filters: Record<string, any> = {};
    const { category, ability_id, zone_id, id } = req.query;
    
    if (category && type === 'commands') filters.category = category;
    if (ability_id && type === 'ability_scores') filters.ability_id = ability_id;
    if (zone_id && type === 'rooms') filters.zone_id = zone_id;
    if (id) filters[config.idField] = id;
    
    const entities = await repository.findWithFilters(filters);
    res.json(entities);
  } catch (error: any) {
    console.error(`Error querying ${type}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /:type/:id - Get single entity by ID
 */
router.get('/:type/:id', async (req: Request, res: Response) => {
  const { type, id } = req.params;
  const config = ENTITY_CONFIG[type];
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  try {
    const repository = RepositoryFactory.getRepository(config);
    const entity = await repository.findById(id);
    
    if (!entity) {
      return res.status(404).json({ error: `${type} not found` });
    }
    
    res.json(entity);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /:type - Create or update an entity
 */
router.post('/:type', async (req: Request, res: Response) => {
  const { type } = req.params;
  const config = ENTITY_CONFIG[type];
  const entity = req.body;
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  try {
    const repository = RepositoryFactory.getRepository(config);
    
    // For auto-increment tables, always insert
    if (config.autoIncrement) {
      const created = await repository.create(entity);
      return res.status(201).json(created);
    }
    
    // For tables with unique constraints, upsert
    const uniqueField = config.uniqueField || config.idField;
    const uniqueValue = entity[uniqueField];
    
    if (!uniqueValue) {
      return res.status(400).json({ error: `${uniqueField} is required` });
    }
    
    const existing = await repository.findByUnique(uniqueValue);
    
    if (existing) {
      const id = (existing as any)[config.idField];
      const updated = await repository.update(id, entity);
      return res.json(updated);
    } else {
      const created = await repository.create(entity);
      return res.status(201).json(created);
    }
  } catch (error: any) {
    console.error(`Error saving ${type}:`, error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /:type/:identifier - Update specific entity
 */
router.put('/:type/:identifier', async (req: Request, res: Response) => {
  const { type, identifier } = req.params;
  const config = ENTITY_CONFIG[type];
  const updates = req.body;
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  try {
    const repository = RepositoryFactory.getRepository(config);
    
    // Try to find by ID first
    let existing = await repository.findById(identifier);
    
    // If not found and there's a unique field, try that
    if (!existing && config.uniqueField && config.uniqueField !== config.idField) {
      existing = await repository.findByUnique(identifier);
    }
    
    if (!existing) {
      return res.status(404).json({ error: `${type} not found` });
    }
    
    const id = (existing as any)[config.idField];
    const updated = await repository.update(id, updates);
    
    res.json({ success: true, entity: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /:type/:id - Delete an entity
 */
router.delete('/:type/:id', async (req: Request, res: Response) => {
  const { type, id } = req.params;
  const config = ENTITY_CONFIG[type];
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  try {
    const repository = RepositoryFactory.getRepository(config);
    const deleted = await repository.delete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: `${type} not found` });
    }
    
    res.json({ success: true, deleted: id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
