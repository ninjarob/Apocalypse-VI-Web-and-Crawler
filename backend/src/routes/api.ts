import express, { Request, Response } from 'express';
import { EntityConfig } from '../repositories/BaseRepository';
import { repositories } from '../repositories';
import { asyncHandler, validateCreate, validateUpdate } from '../middleware';
import { BadRequestError } from '../errors/CustomErrors';
import { RoomService, ZoneService, GenericService } from '../services';

console.log('[API ROUTES] Loading api.ts module');

// Initialize services
const roomService = new RoomService();
const zoneService = new ZoneService();

const router = express.Router();

/**
 * Helper function to apply validation middleware dynamically
 * Wraps validation middleware in a promise-based pattern
 */
async function applyValidation(
  req: Request,
  res: Response,
  validationMiddleware: (req: Request, res: Response, next: (err?: any) => void) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    validationMiddleware(req, res, (err?: any) => {
      if (err) {reject(err);}
      else {resolve();}
    });
  });
}

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
  const room = await roomService.getRoomByName(req.params.name);
  res.json(room);
}));

/**
 * POST /rooms - Create or update a room (with visit tracking)
 */
router.post('/rooms', validateCreate('rooms'), asyncHandler(async (req: Request, res: Response) => {
  const room = await roomService.createOrUpdateRoom(req.body);
  res.status(room.visitCount === 1 ? 201 : 200).json(room);
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

    // Build filters from query parameters
    const filters: Record<string, any> = {};
    const { category, ability_id, zone_id, class_id, id } = req.query;

    console.log('[API] Query params:', req.query);
    console.log('[API] Type:', type);
    
    if (category && type === 'commands') {filters.category = category;}
    if (ability_id && type === 'ability_scores') {filters.ability_id = parseInt(ability_id as string);}
    if (zone_id && type === 'rooms') {filters.zone_id = parseInt(zone_id as string);}
    if (class_id && type === 'class_proficiencies') {
      console.log('[API] Adding class_id filter:', class_id);
      filters.class_id = parseInt(class_id as string);
    }
    if (id) {filters[config.idField] = id;}

    console.log('[API] Filters:', filters);

    // Use appropriate service based on entity type
    let entities;
    if (type === 'rooms') {
      entities = await roomService.getRooms(filters);
    } else if (type === 'zones') {
      entities = await zoneService.getZones();
    } else if (type === 'items') {
      // Use specialized ItemRepository for rich metadata
      entities = await repositories.items.findAll();
    } else {
      const service = new GenericService(config);
      entities = await service.getAll(filters);
    }

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

    // Use appropriate service based on entity type
    let entity;
    if (type === 'rooms') {
      entity = await roomService.getRoomById(id);
    } else if (type === 'zones') {
      entity = await zoneService.getZoneById(parseInt(id));
    } else if (type === 'items') {
      // Use specialized ItemRepository for rich metadata
      entity = await repositories.items.findById(id);
    } else {
      const service = new GenericService(config);
      entity = await service.getById(id);
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
    await applyValidation(req, res, validateCreate(type));
    next();
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type } = req.params;
    const config = ENTITY_CONFIG[type];

    if (!config) {
      throw new BadRequestError(`Unknown entity type: ${type}`);
    }

    const entity = req.body;

    // Use appropriate service based on entity type
    let result;
    if (type === 'rooms') {
      result = await roomService.createOrUpdateRoom(entity);
      return res.status(result.visitCount === 1 ? 201 : 200).json(result);
    } else if (type === 'zones') {
      result = await zoneService.createZone(entity);
      return res.status(201).json(result);
    } else {
      const service = new GenericService(config);

      // For auto-increment tables, always create
      if (config.autoIncrement) {
        result = await service.create(entity);
        return res.status(201).json(result);
      }

      // For tables with unique constraints, upsert
      result = await service.createOrUpdate(entity);
      return res.status(201).json(result);
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
    await applyValidation(req, res, validateUpdate(type));
    next();
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, identifier } = req.params;
    const config = ENTITY_CONFIG[type];

    if (!config) {
      throw new BadRequestError(`Unknown entity type: ${type}`);
    }

    const updates = req.body;

    // Use appropriate service based on entity type
    let updated;
    if (type === 'rooms') {
      updated = await roomService.updateRoom(identifier, updates);
    } else if (type === 'zones') {
      updated = await zoneService.updateZone(parseInt(identifier), updates);
    } else {
      const service = new GenericService(config);
      updated = await service.update(identifier, updates);
    }

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

    // Use appropriate service based on entity type
    if (type === 'rooms') {
      await roomService.deleteRoom(id);
    } else if (type === 'zones') {
      await zoneService.deleteZone(parseInt(id));
    } else {
      const service = new GenericService(config);
      await service.delete(id);
    }

    res.json({ success: true, deleted: id });
  })
);

// Catch-all 404 handler has been moved to global error handler in index.ts

console.log('[API ROUTES] All routes registered, exporting router');

export default router;
