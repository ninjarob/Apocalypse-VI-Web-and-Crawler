import express, { Request, Response } from 'express';
import { getDatabase } from './database';

const router = express.Router();

/**
 * Entity configuration - defines schema and serialization for each entity type
 */
interface EntityConfig {
  table: string;
  idField: string;
  nameField?: string;
  autoIncrement: boolean;
  uniqueField?: string;
  jsonFields?: string[];
  booleanFields?: string[];
  sortBy: string;
}

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
 * Serialize JSON fields for storage
 */
function serialize(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * Deserialize JSON fields from storage
 */
function deserialize(value: string | null): any {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Deserialize an entity based on its configuration
 */
function deserializeEntity(row: any, config: EntityConfig): any {
  if (!row) return null;
  
  const entity = { ...row };
  
  // Deserialize JSON fields
  if (config.jsonFields) {
    config.jsonFields.forEach(field => {
      if (entity[field]) {
        entity[field] = deserialize(entity[field]) || (Array.isArray(entity[field]) ? [] : null);
      }
    });
  }
  
  // Convert boolean fields
  if (config.booleanFields) {
    config.booleanFields.forEach(field => {
      if (field in entity) {
        entity[field] = Boolean(entity[field]);
      }
    });
  }
  
  return entity;
}

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
router.get('/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  const config = ENTITY_CONFIG[type];
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  const { category, ability_id, zone_id, id } = req.query;
  let sql = `SELECT * FROM ${config.table}`;
  const params: any[] = [];
  const conditions: string[] = [];
  
  // Support category filter for commands
  if (category && type === 'commands') {
    conditions.push('category = ?');
    params.push(category);
  }
  
  // Support ability_id filter for ability_scores
  if (ability_id && type === 'ability_scores') {
    conditions.push('ability_id = ?');
    params.push(ability_id);
  }
  
  // Support zone_id filter for rooms
  if (zone_id && type === 'rooms') {
    conditions.push('zone_id = ?');
    params.push(zone_id);
  }
  
  // Support id filter for any entity type
  if (id) {
    conditions.push(`${config.idField} = ?`);
    params.push(id);
  }
  
  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  
  sql += ` ORDER BY ${config.sortBy}`;
  
  const db = getDatabase();
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(`Error querying ${type}:`, err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows.map(row => deserializeEntity(row, config)));
  });
});

/**
 * GET /:type/:id - Get single entity by ID
 */
router.get('/:type/:id', (req: Request, res: Response) => {
  const { type, id } = req.params;
  const config = ENTITY_CONFIG[type];
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  const sql = `SELECT * FROM ${config.table} WHERE ${config.idField} = ?`;
  
  const db = getDatabase();
  db.get(sql, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: `${type} not found` });
    }
    res.json(deserializeEntity(row, config));
  });
});

/**
 * POST /:type - Create or update an entity
 */
router.post('/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  const config = ENTITY_CONFIG[type];
  const entity = req.body;
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  // All tables now use auto-increment, just insert directly
  if (config.autoIncrement) {
    return insertEntity(type, config, entity, res);
  }
  
  // Check for uniqueness constraint
  const uniqueField = config.uniqueField || config.idField;
  const checkSql = `SELECT * FROM ${config.table} WHERE ${uniqueField} = ?`;
  
  const db = getDatabase();
  db.get(checkSql, [entity[uniqueField]], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (existing) {
      updateEntity(type, config, entity, existing, res);
    } else {
      insertEntity(type, config, entity, res);
    }
  });
});

/**
 * PUT /:type/:identifier - Update specific entity
 */
router.put('/:type/:identifier', (req: Request, res: Response) => {
  const { type, identifier } = req.params;
  const config = ENTITY_CONFIG[type];
  const updates = req.body;
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  // Check if entity exists
  let checkSql = `SELECT * FROM ${config.table} WHERE ${config.idField} = ?`;
  if (config.uniqueField && config.uniqueField !== config.idField) {
    checkSql = `SELECT * FROM ${config.table} WHERE ${config.idField} = ? OR ${config.uniqueField} = ?`;
  }
  
  const checkParams = config.uniqueField && config.uniqueField !== config.idField 
    ? [identifier, identifier] 
    : [identifier];
  
  const db = getDatabase();
  db.get(checkSql, checkParams, (err, existing) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!existing) {
      return res.status(404).json({ error: `${type} not found` });
    }
    
    // Build dynamic update query
    const fields: string[] = [];
    const params: any[] = [];
    
    Object.keys(updates).forEach(key => {
      if (key !== config.idField && updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        
        if (config.jsonFields && config.jsonFields.includes(key)) {
          params.push(serialize(updates[key]));
        } else if (config.booleanFields && config.booleanFields.includes(key)) {
          params.push(updates[key] ? 1 : 0);
        } else {
          params.push(updates[key]);
        }
      }
    });
    
    if (fields.length === 0) {
      return res.json({ success: true, changes: 0 });
    }
    
    fields.push('updatedAt = CURRENT_TIMESTAMP');
    params.push(identifier);
    params.push(identifier);
    
    const updateField = config.uniqueField || config.idField;
    const sql = `UPDATE ${config.table} SET ${fields.join(', ')} WHERE ${updateField} = ? OR ${config.idField} = ?`;
    
    db.run(sql, params, function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ success: true, changes: this.changes });
    });
  });
});

/**
 * DELETE /:type/:id - Delete an entity
 */
router.delete('/:type/:id', (req: Request, res: Response) => {
  const { type, id } = req.params;
  const config = ENTITY_CONFIG[type];
  
  if (!config) {
    return res.status(400).json({ error: `Unknown entity type: ${type}` });
  }
  
  const sql = `DELETE FROM ${config.table} WHERE ${config.idField} = ?`;
  
  const db = getDatabase();
  db.run(sql, [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: `${type} not found` });
    }
    res.json({ success: true, deleted: id });
  });
});

/**
 * Helper: Insert new entity
 */
function insertEntity(_type: string, config: EntityConfig, entity: any, res: Response): void {
  const columns = Object.keys(entity).filter(key => {
    if (entity[key] === undefined) return false;
    if (config.autoIncrement && key === config.idField) return false;
    return true;
  });
  const placeholders = columns.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${config.table} (${columns.join(', ')}) VALUES (${placeholders})`;
  
  const params = columns.map(col => {
    if (config.jsonFields && config.jsonFields.includes(col)) {
      return serialize(entity[col]);
    }
    if (config.booleanFields && config.booleanFields.includes(col)) {
      return entity[col] ? 1 : 0;
    }
    return entity[col];
  });
  
  const db = getDatabase();
  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (config.autoIncrement) {
      entity[config.idField] = this.lastID;
    }
    res.status(201).json(entity);
  });
}

/**
 * Helper: Update existing entity
 */
function updateEntity(_type: string, config: EntityConfig, entity: any, _existing: any, res: Response): void {
  const updates: string[] = [];
  const params: any[] = [];
  
  Object.keys(entity).forEach(key => {
    if (key !== config.idField && entity[key] !== undefined) {
      updates.push(`${key} = ?`);
      
      if (config.jsonFields && config.jsonFields.includes(key)) {
        params.push(serialize(entity[key]));
      } else if (config.booleanFields && config.booleanFields.includes(key)) {
        params.push(entity[key] ? 1 : 0);
      } else {
        params.push(entity[key]);
      }
    }
  });
  
  if (updates.length === 0) {
    res.json(entity);
    return;
  }
  
  updates.push('updatedAt = CURRENT_TIMESTAMP');
  const uniqueField = config.uniqueField || config.idField;
  params.push(entity[uniqueField]);
  
  const sql = `UPDATE ${config.table} SET ${updates.join(', ')} WHERE ${uniqueField} = ?`;
  
  const db = getDatabase();
  db.run(sql, params, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(entity);
  });
}

export default router;
