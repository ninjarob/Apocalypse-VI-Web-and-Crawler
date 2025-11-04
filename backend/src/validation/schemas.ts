import { z } from 'zod';

/**
 * Validation schemas for all entity types in the system
 * Uses Zod for type-safe input validation with schema composition
 */

// ============================================================================
// Base Schemas - Common patterns used across entities
// ============================================================================

const timestampSchema = z.string().datetime().optional();
const jsonFieldSchema = z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional();
const booleanFieldSchema = z.union([z.boolean(), z.number().int().min(0).max(1)]).optional();

/**
 * Base schema for entities with timestamps
 */
const withTimestamps = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

/**
 * Base schema for entities with ID
 */
const withId = z.object({
  id: z.number().int().positive().optional()
});

/**
 * Base schema for entities with name
 */
const withName = (maxLength = 255) => z.object({
  name: z.string().min(1).max(maxLength)
});

/**
 * Base schema for entities with description
 */
const withDescription = (required = false) => z.object({
  description: required ? z.string().min(1) : z.string().optional().nullable()
});

/**
 * Base schema for entities with raw MUD text
 */
const withRawText = z.object({
  rawText: z.string().optional().nullable()
});

/**
 * Factory function for simple entities with id, name, description, and timestamps
 * Reduces duplication for lookup/reference tables
 */
function createSimpleEntitySchema(options?: { 
  maxNameLength?: number; 
  requireDescription?: boolean;
  includeRawText?: boolean;
}) {
  const maxNameLength = options?.maxNameLength || 100;
  const requireDescription = options?.requireDescription || false;
  const includeRawText = options?.includeRawText || false;

  let schema = withId
    .merge(withName(maxNameLength))
    .merge(withDescription(requireDescription))
    .merge(withTimestamps);

  if (includeRawText) {
    schema = schema.merge(withRawText);
  }

  return schema;
}

/**
 * Factory function for update schemas - makes all fields optional except ID
 */
function createUpdateSchema<T extends z.ZodRawShape>(baseSchema: z.ZodObject<T>) {
  return baseSchema.partial().required({ id: true });
}

// ============================================================================
// Room Schemas
// ============================================================================

// ============================================================================
// Room Exit Schemas
// ============================================================================

const directionEnum = z.enum([
  'north', 'south', 'east', 'west',
  'up', 'down', 'in', 'out', 'enter', 'exit'
]);

export const roomSchema = z.object({
  id: z.number().int().positive().optional(), // Optional for auto-increment
  zone_id: z.number().int().positive().optional().nullable(),
  vnum: z.number().int().positive().optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  exits: jsonFieldSchema,
  npcs: jsonFieldSchema,
  items: jsonFieldSchema,
  coordinates: jsonFieldSchema,
  area: z.string().max(255).optional().nullable(),
  flags: z.string().max(255).optional().nullable(),
  terrain: z.string().max(100).optional().nullable(),
  portal_key: z.string().max(100).optional().nullable(),
  greater_binding_key: z.string().max(100).optional().nullable(),
  zone_exit: booleanFieldSchema,
  visitCount: z.number().int().min(0).optional(),
  firstVisited: timestampSchema.nullable(),
  lastVisited: timestampSchema.nullable(),
  rawText: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const roomUpdateSchema = roomSchema.partial().extend({
  roomExits: z.array(z.object({
    direction: directionEnum,
    description: z.string().max(500).optional().nullable(),
    door_name: z.string().max(100).optional().nullable(),
    door_description: z.string().max(1000).optional().nullable(),
    look_description: z.string().max(2000).optional().nullable(),
    is_door: booleanFieldSchema,
    is_locked: booleanFieldSchema,
    is_zone_exit: booleanFieldSchema,
    to_room_id: z.number().int().positive().optional().nullable(),
    from_room_id: z.number().int().positive().optional()
  })).optional()
});

export const roomExitSchema = z.object({
  id: z.number().int().positive().optional(),
  from_room_id: z.number().int().positive(),
  to_room_id: z.number().int().positive().optional().nullable(),
  direction: directionEnum,
  description: z.string().max(500).optional().nullable(),
  door_name: z.string().max(100).optional().nullable(),
  door_description: z.string().max(1000).optional().nullable(),
  look_description: z.string().max(2000).optional().nullable(),
  is_door: booleanFieldSchema,
  is_locked: booleanFieldSchema,
  is_zone_exit: booleanFieldSchema,
  key_vnum: z.number().int().positive().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const roomExitUpdateSchema = roomExitSchema.partial();

// ============================================================================
// Room Objects Schemas
// ============================================================================

export const roomObjectSchema = z.object({
  id: z.number().int().positive().optional(),
  room_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  keywords: z.string().max(500).optional().nullable(),
  is_interactive: booleanFieldSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const roomObjectUpdateSchema = roomObjectSchema.partial().required({ id: true });

// ============================================================================
// NPC Schemas
// ============================================================================

export const npcSchema = withId
  .merge(withName(255))
  .merge(withDescription(false))
  .merge(withRawText)
  .merge(withTimestamps)
  .extend({
    location: z.string().max(255).optional().nullable(),
    dialogue: jsonFieldSchema,
    hostile: booleanFieldSchema,
    level: z.number().int().min(1).max(100).optional().nullable(),
    race: z.string().max(100).optional().nullable(),
    class: z.string().max(100).optional().nullable()
  });

export const npcUpdateSchema = createUpdateSchema(npcSchema);

// ============================================================================
// Item Schemas
// ============================================================================

export const itemSchema = withId
  .merge(withName(255))
  .merge(withDescription(false))
  .merge(withRawText)
  .merge(withTimestamps)
  .extend({
    type: z.string().max(100).optional().nullable(),
    location: z.string().max(255).optional().nullable(),
    properties: jsonFieldSchema,
    stats: jsonFieldSchema
  });

export const itemUpdateSchema = createUpdateSchema(itemSchema);

// ============================================================================
// Spell Schemas
// ============================================================================

export const spellSchema = withId
  .merge(withName(255))
  .merge(withDescription(false))
  .merge(withRawText)
  .merge(withTimestamps)
  .extend({
    manaCost: z.number().int().min(0).optional().nullable(),
    level: z.number().int().min(1).max(100).optional().nullable(),
    type: z.string().max(100).optional().nullable(),
    effects: jsonFieldSchema
  });

export const spellUpdateSchema = createUpdateSchema(spellSchema);

// ============================================================================
// Attack Schemas
// ============================================================================

export const attackSchema = withId
  .merge(withName(255))
  .merge(withDescription(false))
  .merge(withRawText)
  .merge(withTimestamps)
  .extend({
    damage: z.string().max(100).optional().nullable(),
    type: z.string().max(100).optional().nullable(),
    requirements: jsonFieldSchema
  });

export const attackUpdateSchema = createUpdateSchema(attackSchema);

// ============================================================================
// Player Action Schemas
// ============================================================================

const actionTypeEnum = z.enum(['command', 'social', 'emote', 'spell', 'skill', 'other']);

export const playerActionSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  type: actionTypeEnum,
  category: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  syntax: z.string().max(500).optional().nullable(),
  examples: jsonFieldSchema,
  requirements: jsonFieldSchema,
  levelRequired: z.number().int().min(1).max(100).optional().nullable(),
  relatedActions: jsonFieldSchema,
  testResults: jsonFieldSchema,
  documented: booleanFieldSchema,
  discovered: timestampSchema.nullable(),
  lastTested: timestampSchema.nullable(),
  timesUsed: z.number().int().min(0).optional(),
  successCount: z.number().int().min(0).optional(),
  failCount: z.number().int().min(0).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const playerActionUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: actionTypeEnum.optional(),
  category: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  syntax: z.string().max(500).optional().nullable(),
  examples: jsonFieldSchema,
  requirements: jsonFieldSchema,
  levelRequired: z.number().int().min(1).max(100).optional().nullable(),
  relatedActions: jsonFieldSchema,
  testResults: jsonFieldSchema,
  documented: booleanFieldSchema,
  discovered: timestampSchema.nullable(),
  lastTested: timestampSchema.nullable(),
  timesUsed: z.number().int().min(0).optional(),
  successCount: z.number().int().min(0).optional(),
  failCount: z.number().int().min(0).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

// ============================================================================
// Race Schemas
// ============================================================================

export const raceSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  stats: jsonFieldSchema,
  abilities: jsonFieldSchema,
  requirements: jsonFieldSchema,
  helpText: z.string().optional().nullable(),
  discovered: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const raceUpdateSchema = raceSchema.partial().required({ id: true });

// ============================================================================
// Skill Schemas
// ============================================================================

export const skillSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  requirements: jsonFieldSchema,
  effects: jsonFieldSchema,
  manaCost: z.number().int().min(0).optional().nullable(),
  cooldown: z.number().int().min(0).optional().nullable(),
  helpText: z.string().optional().nullable(),
  discovered: timestampSchema.nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const skillUpdateSchema = skillSchema.partial().required({ id: true });

// ============================================================================
// Ability Schemas
// ============================================================================

export const abilitySchema = createSimpleEntitySchema().extend({
  short_name: z.string().max(10).optional().nullable()
});

export const abilityUpdateSchema = createUpdateSchema(abilitySchema);

// ============================================================================
// Ability Score Schemas
// ============================================================================

export const abilityScoreSchema = z.object({
  id: z.number().int().positive().optional(),
  ability_id: z.number().int().positive(),
  score: z.number().int().min(1).max(26),
  effects: jsonFieldSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const abilityScoreUpdateSchema = abilityScoreSchema.partial().required({ id: true });

// ============================================================================
// Saving Throw Schemas
// ============================================================================

export const savingThrowSchema = createSimpleEntitySchema();
export const savingThrowUpdateSchema = createUpdateSchema(savingThrowSchema);

// ============================================================================
// Spell Modifier Schemas
// ============================================================================

export const spellModifierSchema = createSimpleEntitySchema();
export const spellModifierUpdateSchema = createUpdateSchema(spellModifierSchema);

// ============================================================================
// Elemental Resistance Schemas
// ============================================================================

export const elementalResistanceSchema = createSimpleEntitySchema();
export const elementalResistanceUpdateSchema = createUpdateSchema(elementalResistanceSchema);

// ============================================================================
// Physical Resistance Schemas
// ============================================================================

export const physicalResistanceSchema = createSimpleEntitySchema();
export const physicalResistanceUpdateSchema = createUpdateSchema(physicalResistanceSchema);

// ============================================================================
// Class Group Schemas
// ============================================================================

export const classGroupSchema = createSimpleEntitySchema();
export const classGroupUpdateSchema = createUpdateSchema(classGroupSchema);

// ============================================================================
// Class Schemas
// ============================================================================

export const classSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  class_group_id: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  alignment_requirement: z.string().max(100).optional().nullable(),
  hp_regen: z.number().int().optional().nullable(),
  mana_regen: z.number().int().optional().nullable(),
  move_regen: z.number().int().optional().nullable(),
  special_notes: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const classUpdateSchema = classSchema.partial().required({ id: true });

// ============================================================================
// Class Proficiency Schemas
// ============================================================================

export const classProficiencySchema = z.object({
  id: z.number().int().positive().optional(),
  class_id: z.number().int().positive(),
  name: z.string().min(1).max(200),
  level_required: z.number().int().min(1).max(100),
  is_skill: booleanFieldSchema,
  prerequisite_id: z.number().int().positive().optional().nullable(),
  description: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const classProficiencyUpdateSchema = classProficiencySchema.partial().required({ id: true });

// ============================================================================
// Class Perk Schemas
// ============================================================================

export const classPerkSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  description: z.string().optional().nullable(),
  effect: z.string().max(500).optional().nullable(),
  is_unique: booleanFieldSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const classPerkUpdateSchema = classPerkSchema.partial().required({ id: true });

// ============================================================================
// Class Perk Availability Schemas
// ============================================================================

export const classPerkAvailabilitySchema = z.object({
  id: z.number().int().positive().optional(),
  class_id: z.number().int().positive(),
  perk_id: z.number().int().positive(),
  min_level: z.number().int().min(1).max(100).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const classPerkAvailabilityUpdateSchema = classPerkAvailabilitySchema.partial().required({ id: true });

// ============================================================================
// Zone Schemas
// ============================================================================

export const zoneSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  author: z.string().max(100).optional().nullable(),
  difficulty: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const zoneUpdateSchema = zoneSchema.partial().required({ id: true });

// ============================================================================
// Zone Area Schemas
// ============================================================================

export const zoneAreaSchema = z.object({
  id: z.number().int().positive().optional(),
  zone_id: z.number().int().positive(),
  name: z.string().min(1).max(255),
  min_level: z.number().int().min(1).max(100).optional().nullable(),
  max_level: z.number().int().min(1).max(100).optional().nullable(),
  recommended_class: z.string().max(200).optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
}).refine(
  (data) => !data.min_level || !data.max_level || data.min_level <= data.max_level,
  { message: 'min_level must be less than or equal to max_level' }
);

export const zoneAreaUpdateSchema = zoneAreaSchema.partial().required({ id: true });

// ============================================================================
// Zone Connection Schemas
// ============================================================================

export const zoneConnectionSchema = z.object({
  id: z.number().int().positive().optional(),
  zone_id: z.number().int().positive(),
  connected_zone_id: z.number().int().positive(),
  createdAt: timestampSchema
}).refine(
  (data) => data.zone_id !== data.connected_zone_id,
  { message: 'A zone cannot connect to itself' }
);

export const zoneConnectionUpdateSchema = zoneConnectionSchema.partial().required({ id: true });

// ============================================================================
// Help Entry Schemas
// ============================================================================

export const helpEntrySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  variations: jsonFieldSchema,
  helpText: z.string().min(1),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const helpEntryUpdateSchema = helpEntrySchema.partial().required({ id: true });

// ============================================================================
// Schema Registry - Maps entity type names to their validation schemas
// ============================================================================

export const CREATE_SCHEMAS: Record<string, z.ZodSchema> = {
  rooms: roomSchema,
  room_exits: roomExitSchema,
  room_objects: roomObjectSchema,
  npcs: npcSchema,
  items: itemSchema,
  spells: spellSchema,
  attacks: attackSchema,
  player_actions: playerActionSchema,
  races: raceSchema,
  skills: skillSchema,
  abilities: abilitySchema,
  ability_scores: abilityScoreSchema,
  saving_throws: savingThrowSchema,
  spell_modifiers: spellModifierSchema,
  elemental_resistances: elementalResistanceSchema,
  physical_resistances: physicalResistanceSchema,
  class_groups: classGroupSchema,
  classes: classSchema,
  class_proficiencies: classProficiencySchema,
  class_perks: classPerkSchema,
  class_perk_availability: classPerkAvailabilitySchema,
  zones: zoneSchema,
  zone_areas: zoneAreaSchema,
  zone_connections: zoneConnectionSchema,
  help_entries: helpEntrySchema
};

export const UPDATE_SCHEMAS: Record<string, z.ZodSchema> = {
  rooms: roomUpdateSchema,
  room_exits: roomExitUpdateSchema,
  room_objects: roomObjectUpdateSchema,
  npcs: npcUpdateSchema,
  items: itemUpdateSchema,
  spells: spellUpdateSchema,
  attacks: attackUpdateSchema,
  player_actions: playerActionUpdateSchema,
  races: raceUpdateSchema,
  skills: skillUpdateSchema,
  abilities: abilityUpdateSchema,
  ability_scores: abilityScoreUpdateSchema,
  saving_throws: savingThrowUpdateSchema,
  spell_modifiers: spellModifierUpdateSchema,
  elemental_resistances: elementalResistanceUpdateSchema,
  physical_resistances: physicalResistanceUpdateSchema,
  class_groups: classGroupUpdateSchema,
  classes: classUpdateSchema,
  class_proficiencies: classProficiencyUpdateSchema,
  class_perks: classPerkUpdateSchema,
  class_perk_availability: classPerkAvailabilityUpdateSchema,
  zones: zoneUpdateSchema,
  zone_areas: zoneAreaUpdateSchema,
  zone_connections: zoneConnectionUpdateSchema,
  help_entries: helpEntryUpdateSchema
};

// ============================================================================
// Type exports for TypeScript inference
// ============================================================================

export type Room = z.infer<typeof roomSchema>;
export type RoomExit = z.infer<typeof roomExitSchema>;
export type RoomObject = z.infer<typeof roomObjectSchema>;
export type NPC = z.infer<typeof npcSchema>;
export type Item = z.infer<typeof itemSchema>;
export type Spell = z.infer<typeof spellSchema>;
export type Attack = z.infer<typeof attackSchema>;
export type PlayerAction = z.infer<typeof playerActionSchema>;
export type Race = z.infer<typeof raceSchema>;
export type Skill = z.infer<typeof skillSchema>;
export type Ability = z.infer<typeof abilitySchema>;
export type AbilityScore = z.infer<typeof abilityScoreSchema>;
export type SavingThrow = z.infer<typeof savingThrowSchema>;
export type SpellModifier = z.infer<typeof spellModifierSchema>;
export type ElementalResistance = z.infer<typeof elementalResistanceSchema>;
export type PhysicalResistance = z.infer<typeof physicalResistanceSchema>;
export type ClassGroup = z.infer<typeof classGroupSchema>;
export type Class = z.infer<typeof classSchema>;
export type ClassProficiency = z.infer<typeof classProficiencySchema>;
export type ClassPerk = z.infer<typeof classPerkSchema>;
export type ClassPerkAvailability = z.infer<typeof classPerkAvailabilitySchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type ZoneArea = z.infer<typeof zoneAreaSchema>;
export type ZoneConnection = z.infer<typeof zoneConnectionSchema>;
export type HelpEntry = z.infer<typeof helpEntrySchema>;
