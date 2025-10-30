import express, { Request, Response } from 'express';
import { EntityConfig } from '../repositories/BaseRepository';
import { RepositoryFactory } from '../repositories/GenericRepository';
import { repositories } from '../repositories';
import { Room } from '../repositories/RoomRepository';
import { asyncHandler, validateCreate, validateUpdate } from '../middleware';
import { BadRequestError, createNotFoundError } from '../errors/CustomErrors';

console.log('[API ROUTES] Loading api.ts module');

const router = express.Router();

/**
 * Entity configuration - defines schema and serialization for each entity type
 * This is the single source of truth for all entity types in the system
 */
const ENTITY_CONFIG: Record<string, EntityConfig> = {
  rooms: {
    table: 'rooms',
    idField: 'id',
    nameField: 'name',
    autoIncrement: false,
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
  class_groups: {
    table: 'class_groups',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'id'
  },
  class_proficiencies: {
    table: 'class_proficiencies',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'class_id, level_required, name'
  },
  class_perks: {
    table: 'class_perks',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'category, name'
  },
  class_perk_availability: {
    table: 'class_perk_availability',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'class_id, perk_id'
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

// Extract valid entity types for validation
const VALID_ENTITY_TYPES = Object.keys(ENTITY_CONFIG);

console.log(`✓ API Router configured with ${VALID_ENTITY_TYPES.length} entity types`);
console.log(`✓ Entity types: ${VALID_ENTITY_TYPES.join(', ')}`);

// ==================== META ENDPOINTS ====================

/**
 * GET /entity-types - List all available entity types
 */
router.get('/entity-types', (_req: Request, res: Response) => {
  res.json({
    types: VALID_ENTITY_TYPES,
    config: ENTITY_CONFIG
  });
});

/**
 * GET /stats - Get counts for all major entity types
 */
router.get('/stats', asyncHandler(async (_req: Request, res: Response) => {
  const [rooms, npcs, items, spells, attacks, abilities, races, zones] = await Promise.all([
    repositories.rooms.count().catch(() => 0),
    // For entities without specific repositories, use generic count
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
}));

// ==================== CUSTOM ROOM ENDPOINTS ====================

/**
 * GET /rooms/by-name/:name - Get room by name
 */
router.get('/rooms/by-name/:name', asyncHandler(async (req: Request, res: Response) => {
  const room = await repositories.rooms.findByName(req.params.name);
  if (!room) {
    throw createNotFoundError('Room', req.params.name);
  }
  res.json(room);
}));

/**
 * POST /rooms - Create or update a room (with visit tracking)
 */
router.post('/rooms', validateCreate('rooms'), asyncHandler(async (req: Request, res: Response) => {
  const existing = await repositories.rooms.findById(req.body.id);
  
  if (existing) {
    // Update visit count for existing room
    const updated = await repositories.rooms.recordVisit(req.body.id);
    return res.json(updated);
  }
  
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
}));

// ==================== GENERIC CRUD ENDPOINTS ====================

/**
 * GET /:type - Get all entities of a type with optional filtering
 */
router.get(
  '/:type',
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    console.log(`[API] GET /:type - type=${type}`);
    
    const config = ENTITY_CONFIG[type];
    
    if (!config) {
      console.log(`[API] Unknown entity type: ${type}`);
      throw new BadRequestError(
        `Unknown entity type: ${type}`,
        { validTypes: VALID_ENTITY_TYPES }
      );
    }
    
    console.log(`[API] Config found for ${type}:`, { table: config.table, idField: config.idField });
    
    const repository = RepositoryFactory.getRepository(config);
    
    // Build filters from query parameters
    const filters: Record<string, any> = {};
    const { category, ability_id, zone_id, id } = req.query;
    
    if (category && type === 'commands') filters.category = category;
    if (ability_id && type === 'ability_scores') filters.ability_id = ability_id;
    if (zone_id && type === 'rooms') filters.zone_id = zone_id;
    if (id) filters[config.idField] = id;
    
    console.log(`[API] Filters:`, filters);
    
    const entities = await repository.findWithFilters(filters);
    console.log(`[API] Found ${entities.length} entities`);
    
    res.json(entities);
  })
);

/**
 * GET /:type/:id - Get single entity by ID
 */
router.get(
  '/:type/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, id } = req.params;
    const config = ENTITY_CONFIG[type];
    
    if (!config) {
      throw new BadRequestError(`Unknown entity type: ${type}`);
    }
    
    const repository = RepositoryFactory.getRepository(config);
    const entity = await repository.findById(id);
    
    if (!entity) {
      throw createNotFoundError(type, id);
    }
    
    res.json(entity);
  })
);

/**
 * POST /:type - Create or update an entity
 */
router.post(
  '/:type',
  asyncHandler(async (req: Request, res: Response, next) => {
    const { type } = req.params;
    
    // Apply validation middleware dynamically
    const validationMiddleware = validateCreate(type);
    await new Promise<void>((resolve, reject) => {
      validationMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    next();
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const config = ENTITY_CONFIG[type];
    
    if (!config) {
      throw new BadRequestError(`Unknown entity type: ${type}`);
    }
    
    const entity = req.body;
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
      throw new BadRequestError(`${uniqueField} is required`);
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
  })
);

/**
 * PUT /:type/:identifier - Update specific entity
 */
router.put(
  '/:type/:identifier',
  asyncHandler(async (req: Request, res: Response, next) => {
    const { type } = req.params;
    
    // Apply validation middleware dynamically
    const validationMiddleware = validateUpdate(type);
    await new Promise<void>((resolve, reject) => {
      validationMiddleware(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    next();
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, identifier } = req.params;
    const config = ENTITY_CONFIG[type];
    
    if (!config) {
      throw new BadRequestError(`Unknown entity type: ${type}`);
    }
    
    const updates = req.body;
    const repository = RepositoryFactory.getRepository(config);
    
    // Try to find by ID first
    let existing = await repository.findById(identifier);
    
    // If not found and there's a unique field, try that
    if (!existing && config.uniqueField && config.uniqueField !== config.idField) {
      existing = await repository.findByUnique(identifier);
    }
    
    if (!existing) {
      throw createNotFoundError(type, identifier);
    }
    
    const id = (existing as any)[config.idField];
    const updated = await repository.update(id, updates);
    
    res.json({ success: true, entity: updated });
  })
);

/**
 * DELETE /:type/:id - Delete an entity
 */
router.delete(
  '/:type/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { type, id } = req.params;
    const config = ENTITY_CONFIG[type];
    
    if (!config) {
      throw new BadRequestError(`Unknown entity type: ${type}`);
    }
    
    const repository = RepositoryFactory.getRepository(config);
    const deleted = await repository.delete(id);
    
    if (!deleted) {
      throw createNotFoundError(type, id);
    }
    
    res.json({ success: true, deleted: id });
  })
);

// Catch-all 404 handler has been moved to global error handler in index.ts

console.log('[API ROUTES] All routes registered, exporting router');

export default router;
