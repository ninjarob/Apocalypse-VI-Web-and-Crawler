import { z } from 'zod';

/**
 * Validation schemas for all entity types in the system
 * Uses Zod for type-safe input validation
 */

// ============================================================================
// Base Schemas - Common patterns used across entities
// ============================================================================

const timestampSchema = z.string().datetime().optional();
const jsonFieldSchema = z.union([z.string(), z.record(z.string(), z.any()), z.array(z.any())]).optional();
const booleanFieldSchema = z.union([z.boolean(), z.number().int().min(0).max(1)]).optional();

/**
 * Factory function for simple entities with id, name, description, and timestamps
 * Reduces duplication for lookup/reference tables
 */
function createSimpleEntitySchema(options?: { maxNameLength?: number; requireDescription?: boolean }) {
  const maxNameLength = options?.maxNameLength || 100;
  const requireDescription = options?.requireDescription || false;

  return z.object({
    id: z.number().int().positive().optional(),
    name: z.string().min(1).max(maxNameLength),
    description: requireDescription 
      ? z.string().min(1) 
      : z.string().optional().nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema
  });
}

/**
 * Factory function for update schemas of simple entities
 */
function createSimpleEntityUpdateSchema(baseSchema: z.ZodObject<any>) {
  return baseSchema.partial().required({ id: true });
}

// ============================================================================
// Room Schemas
// ============================================================================

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
  visitCount: z.number().int().min(0).optional(),
  firstVisited: timestampSchema.nullable(),
  lastVisited: timestampSchema.nullable(),
  rawText: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const roomUpdateSchema = roomSchema.partial().required({ id: true });

// ============================================================================
// Room Exit Schemas
// ============================================================================

const directionEnum = z.enum([
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
  'up', 'down'
]);

export const roomExitSchema = z.object({
  id: z.number().int().positive().optional(),
  from_room_id: z.number().int().positive(),
  to_room_id: z.number().int().positive().optional().nullable(),
  direction: directionEnum,
  description: z.string().max(500).optional().nullable(),
  door_name: z.string().max(100).optional().nullable(),
  is_door: booleanFieldSchema,
  is_locked: booleanFieldSchema,
  key_vnum: z.number().int().positive().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const roomExitUpdateSchema = roomExitSchema.partial().required({ id: true });

// ============================================================================
// NPC Schemas
// ============================================================================

export const npcSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  dialogue: jsonFieldSchema,
  hostile: booleanFieldSchema,
  level: z.number().int().min(1).max(100).optional().nullable(),
  race: z.string().max(100).optional().nullable(),
  class: z.string().max(100).optional().nullable(),
  rawText: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const npcUpdateSchema = npcSchema.partial().required({ id: true });

// ============================================================================
// Item Schemas
// ============================================================================

export const itemSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  properties: jsonFieldSchema,
  stats: jsonFieldSchema,
  rawText: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const itemUpdateSchema = itemSchema.partial().required({ id: true });

// ============================================================================
// Spell Schemas
// ============================================================================

export const spellSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  manaCost: z.number().int().min(0).optional().nullable(),
  level: z.number().int().min(1).max(100).optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  effects: jsonFieldSchema,
  rawText: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const spellUpdateSchema = spellSchema.partial().required({ id: true });

// ============================================================================
// Attack Schemas
// ============================================================================

export const attackSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  damage: z.string().max(100).optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  requirements: jsonFieldSchema,
  rawText: z.string().optional().nullable(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const attackUpdateSchema = attackSchema.partial().required({ id: true });

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
  documented: booleanFieldSchema,
  discovered: timestampSchema.nullable(),
  lastTested: timestampSchema.nullable(),
  timesUsed: z.number().int().min(0).optional(),
  successCount: z.number().int().min(0).optional(),
  failCount: z.number().int().min(0).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const playerActionUpdateSchema = playerActionSchema.partial().required({ id: true });

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

export const abilityUpdateSchema = createSimpleEntityUpdateSchema(abilitySchema);

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
export const savingThrowUpdateSchema = createSimpleEntityUpdateSchema(savingThrowSchema);

// ============================================================================
// Spell Modifier Schemas
// ============================================================================

export const spellModifierSchema = createSimpleEntitySchema();
export const spellModifierUpdateSchema = createSimpleEntityUpdateSchema(spellModifierSchema);

// ============================================================================
// Elemental Resistance Schemas
// ============================================================================

export const elementalResistanceSchema = createSimpleEntitySchema();
export const elementalResistanceUpdateSchema = createSimpleEntityUpdateSchema(elementalResistanceSchema);

// ============================================================================
// Physical Resistance Schemas
// ============================================================================

export const physicalResistanceSchema = createSimpleEntitySchema();
export const physicalResistanceUpdateSchema = createSimpleEntityUpdateSchema(physicalResistanceSchema);

// ============================================================================
// Class Group Schemas
// ============================================================================

export const classGroupSchema = createSimpleEntitySchema();
export const classGroupUpdateSchema = createSimpleEntityUpdateSchema(classGroupSchema);

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
// Schema Registry - Maps entity type names to their validation schemas
// ============================================================================

export const CREATE_SCHEMAS: Record<string, z.ZodSchema> = {
  rooms: roomSchema,
  room_exits: roomExitSchema,
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
  zone_connections: zoneConnectionSchema
};

export const UPDATE_SCHEMAS: Record<string, z.ZodSchema> = {
  rooms: roomUpdateSchema,
  room_exits: roomExitUpdateSchema,
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
  zone_connections: zoneConnectionUpdateSchema
};

// ============================================================================
// Type exports for TypeScript inference
// ============================================================================

export type Room = z.infer<typeof roomSchema>;
export type RoomExit = z.infer<typeof roomExitSchema>;
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
