/**
 * Shared entity configuration
 * This is the single source of truth for all entity types in the system
 * Can be used by both frontend and backend
 */

export interface EntityConfig {
  // Backend configuration
  table: string;
  idField: string;
  nameField?: string;
  autoIncrement: boolean;
  uniqueField?: string;
  jsonFields?: string[];
  booleanFields?: string[];
  sortBy: string;

  // Frontend display configuration
  display?: {
    name: string;          // Display name (e.g., "NPCs", "Items")
    singular: string;      // Singular form (e.g., "NPC", "Item")
    icon?: string;         // Icon emoji or identifier
    description?: string;  // Description for tooltips/help
  };
}

export const ENTITY_CONFIG: Record<string, EntityConfig> = {
  rooms: {
    table: 'rooms',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['exits', 'npcs', 'items', 'coordinates'],
    sortBy: 'lastVisited DESC',
    display: {
      name: 'Rooms',
      singular: 'Room',
      icon: '🚪',
      description: 'Locations in the MUD world'
    }
  },
  npcs: {
    table: 'npcs',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['dialogue'],
    booleanFields: ['hostile'],
    sortBy: 'name',
    display: {
      name: 'NPCs',
      singular: 'NPC',
      icon: '🧙',
      description: 'Non-player characters'
    }
  },
  items: {
    table: 'items',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['properties', 'stats'],
    sortBy: 'name',
    display: {
      name: 'Items',
      singular: 'Item',
      icon: '📦',
      description: 'Items and equipment'
    }
  },
  spells: {
    table: 'spells',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['effects'],
    sortBy: 'name',
    display: {
      name: 'Spells',
      singular: 'Spell',
      icon: '✨',
      description: 'Magic spells and incantations'
    }
  },
  attacks: {
    table: 'attacks',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['requirements'],
    sortBy: 'name',
    display: {
      name: 'Attacks',
      singular: 'Attack',
      icon: '⚔️',
      description: 'Combat attacks and abilities'
    }
  },
  player_actions: {
    table: 'player_actions',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['examples', 'requirements', 'relatedActions', 'testResults'],
    booleanFields: ['documented'],
    sortBy: 'type, category, name',
    display: {
      name: 'Player Actions',
      singular: 'Player Action',
      icon: '🎮',
      description: 'Available player actions'
    }
  },
  races: {
    table: 'races',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['stats', 'abilities', 'requirements'],
    sortBy: 'name',
    display: {
      name: 'Races',
      singular: 'Race',
      icon: '👥',
      description: 'Playable character races'
    }
  },
  classes: {
    table: 'classes',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['stats', 'abilities', 'requirements', 'startingEquipment'],
    sortBy: 'name',
    display: {
      name: 'Classes',
      singular: 'Class',
      icon: '🎓',
      description: 'Character classes'
    }
  },
  class_groups: {
    table: 'class_groups',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'id',
    display: {
      name: 'Class Groups',
      singular: 'Class Group',
      icon: '📚',
      description: 'Groups of related classes'
    }
  },
  class_proficiencies: {
    table: 'class_proficiencies',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'class_id, level_required, name',
    display: {
      name: 'Class Proficiencies',
      singular: 'Class Proficiency',
      description: 'Skills available to classes'
    }
  },
  class_perks: {
    table: 'class_perks',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'category, name',
    display: {
      name: 'Class Perks',
      singular: 'Class Perk',
      description: 'Special abilities for classes'
    }
  },
  class_perk_availability: {
    table: 'class_perk_availability',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'class_id, perk_id',
    display: {
      name: 'Class Perk Availability',
      singular: 'Class Perk Availability',
      description: 'Which perks are available to which classes'
    }
  },
  skills: {
    table: 'skills',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['requirements', 'effects'],
    sortBy: 'name',
    display: {
      name: 'Skills',
      singular: 'Skill',
      icon: '🎯',
      description: 'Character skills'
    }
  },
  abilities: {
    table: 'abilities',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    sortBy: 'name',
    display: {
      name: 'Abilities',
      singular: 'Ability',
      icon: '💪',
      description: 'Base character abilities'
    }
  },
  ability_scores: {
    table: 'ability_scores',
    idField: 'id',
    autoIncrement: true,
    jsonFields: ['effects'],
    sortBy: 'ability_id, score',
    display: {
      name: 'Ability Scores',
      singular: 'Ability Score',
      description: 'Numerical ability values'
    }
  },
  saving_throws: {
    table: 'saving_throws',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'id',
    display: {
      name: 'Saving Throws',
      singular: 'Saving Throw',
      description: 'Defensive rolls'
    }
  },
  spell_modifiers: {
    table: 'spell_modifiers',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'name',
    display: {
      name: 'Spell Modifiers',
      singular: 'Spell Modifier',
      description: 'Modifiers affecting spell power'
    }
  },
  elemental_resistances: {
    table: 'elemental_resistances',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'name',
    display: {
      name: 'Elemental Resistances',
      singular: 'Elemental Resistance',
      icon: '🔥',
      description: 'Resistance to elemental damage'
    }
  },
  physical_resistances: {
    table: 'physical_resistances',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'name',
    display: {
      name: 'Physical Resistances',
      singular: 'Physical Resistance',
      icon: '🛡️',
      description: 'Resistance to physical damage'
    }
  },
  zones: {
    table: 'zones',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    sortBy: 'id',
    display: {
      name: 'Zones',
      singular: 'Zone',
      icon: '🗺️',
      description: 'Geographic zones in the world'
    }
  },
  zone_areas: {
    table: 'zone_areas',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'zone_id, id',
    display: {
      name: 'Zone Areas',
      singular: 'Zone Area',
      description: 'Sub-areas within zones'
    }
  },
  zone_connections: {
    table: 'zone_connections',
    idField: 'id',
    autoIncrement: true,
    sortBy: 'zone_id, connected_zone_id',
    display: {
      name: 'Zone Connections',
      singular: 'Zone Connection',
      description: 'Connections between zones'
    }
  },
  room_exits: {
    table: 'room_exits',
    idField: 'id',
    autoIncrement: true,
    booleanFields: ['is_door', 'is_locked'],
    sortBy: 'from_room_id, direction',
    display: {
      name: 'Room Exits',
      singular: 'Room Exit',
      description: 'Exits connecting rooms'
    }
  },
  room_objects: {
    table: 'room_objects',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    booleanFields: ['is_interactive'],
    sortBy: 'room_id, name',
    display: {
      name: 'Room Objects',
      singular: 'Room Object',
      description: 'Objects and features in rooms'
    }
  },
  help_entries: {
    table: 'help_entries',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    jsonFields: ['variations'],
    sortBy: 'name',
    display: {
      name: 'Help Entries',
      singular: 'Help Entry',
      icon: '📚',
      description: 'Help files and documentation'
    }
  }
};
