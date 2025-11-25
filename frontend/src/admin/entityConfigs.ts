import { EntityConfig } from './types';

export const ENTITY_CONFIGS: EntityConfig[] = [
  {
    name: 'Abilities',
    endpoint: 'abilities',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'short_name', type: 'text', label: 'Short Name' },
      { name: 'description', type: 'textarea', label: 'Description' }
    ]
  },
  {
    name: 'Saving Throws',
    endpoint: 'saving_throws',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Spell Modifiers',
    endpoint: 'spell_modifiers',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Elemental Resistances',
    endpoint: 'elemental_resistances',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Physical Resistances',
    endpoint: 'physical_resistances',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'text', label: 'Description' }
    ]
  },
  {
    name: 'Races',
    endpoint: 'races',
    readOnly: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'stats', type: 'json', label: 'Stats (JSON)' },
      { name: 'abilities', type: 'json', label: 'Abilities (JSON Array)' }
    ]
  },
  {
    name: 'Classes',
    endpoint: 'classes',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'stats_combined', type: 'text', label: 'Stats' },
      { name: 'special_notes', type: 'textarea', label: 'Special Notes' }
    ]
  },
  {
    name: 'Skills',
    endpoint: 'skills',
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'type', type: 'text', label: 'Type' },
      { name: 'manaCost', type: 'number', label: 'Mana Cost' },
      { name: 'cooldown', type: 'number', label: 'Cooldown' }
    ]
  },
  {
    name: 'Zones',
    endpoint: 'zones',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'Zone #' },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'alias', type: 'text', label: 'Alias' },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'zone_info_combined', type: 'custom', label: 'Zone Info' },
      { name: 'notes', type: 'textarea', label: 'Notes' }
    ]
  },
  {
    name: 'Player Actions',
    endpoint: 'player_actions',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Action', required: true },
      { name: 'type', type: 'text', label: 'Type', required: true },
      { name: 'category', type: 'text', label: 'Category' },
      { name: 'description', type: 'custom', label: 'Description', custom: 'truncatedDescription' },
      { name: 'syntax', type: 'textarea', label: 'Syntax', hideInTable: true },
      { name: 'examples', type: 'textarea', label: 'Examples', hideInTable: true },
      { name: 'requirements', type: 'text', label: 'Requirements', hideInTable: true },
      { name: 'levelRequired', type: 'number', label: 'Level Required', hideInTable: true },
      { name: 'relatedActions', type: 'text', label: 'Related Actions', hideInTable: true },
      { name: 'documented', type: 'number', label: 'Documented', hideInTable: true },
      { name: 'discovered', type: 'text', label: 'Discovered', hideInTable: true },
      { name: 'lastTested', type: 'text', label: 'Last Tested', hideInTable: true },
      { name: 'timesUsed', type: 'number', label: 'Times Used', hideInTable: true },
      { name: 'successCount', type: 'number', label: 'Success Count', hideInTable: true },
      { name: 'failCount', type: 'number', label: 'Fail Count', hideInTable: true },
      { name: 'testResults', type: 'json', label: 'Test Results', hideInTable: true }
    ]
  },
  {
    name: 'Rooms',
    endpoint: 'rooms',
    readOnly: false,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'zone_id', type: 'number', label: 'Zone', custom: 'zone_name_link' },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'exits', type: 'custom', label: 'Exits', custom: 'room_exits' }
    ]
  },
  {
    name: 'NPCs',
    endpoint: 'npcs',
    readOnly: false,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'short_desc', type: 'text', label: 'Short Desc' },
      { name: 'level', type: 'number', label: 'Level' },
      { name: 'race', type: 'text', label: 'Race' },
      { name: 'class', type: 'text', label: 'Class' },
      { name: 'is_aggressive', type: 'number', label: 'Aggressive', hideInTable: true },
      { name: 'is_invisible', type: 'number', label: 'Invisible', hideInTable: true },
      { name: 'is_cloaked', type: 'number', label: 'Cloaked', hideInTable: true },
      { name: 'is_hidden', type: 'number', label: 'Hidden', hideInTable: true },
      { name: 'hp_max', type: 'number', label: 'Max HP', hideInTable: true },
      { name: 'mana_max', type: 'number', label: 'Max Mana', hideInTable: true },
      { name: 'long_desc', type: 'textarea', label: 'Long Description', hideInTable: true },
      { name: 'notes', type: 'textarea', label: 'Notes', hideInTable: true },
      { name: 'rawText', type: 'textarea', label: 'Raw Text', hideInTable: true }
    ]
  },
  {
    name: 'NPC Equipment',
    endpoint: 'npc_equipment',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'npc_id', type: 'number', label: 'NPC ID', required: true },
      { name: 'item_name', type: 'text', label: 'Item Name', required: true },
      { name: 'slot', type: 'text', label: 'Slot' },
      { name: 'is_wielded', type: 'number', label: 'Wielded' },
      { name: 'is_worn', type: 'number', label: 'Worn' },
      { name: 'is_in_inventory', type: 'number', label: 'In Inventory' },
      { name: 'quantity', type: 'number', label: 'Quantity' },
      { name: 'identified', type: 'number', label: 'Identified' }
    ]
  },
  {
    name: 'NPC Spells',
    endpoint: 'npc_spells',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'npc_id', type: 'number', label: 'NPC ID', required: true },
      { name: 'spell_name', type: 'text', label: 'Spell Name', required: true },
      { name: 'spell_type', type: 'text', label: 'Type' },
      { name: 'mana_cost', type: 'number', label: 'Mana Cost' },
      { name: 'observed_count', type: 'number', label: 'Times Observed' },
      { name: 'last_observed', type: 'text', label: 'Last Observed' }
    ]
  },
  {
    name: 'NPC Dialogue',
    endpoint: 'npc_dialogue',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'npc_id', type: 'number', label: 'NPC ID', required: true },
      { name: 'dialogue_text', type: 'textarea', label: 'Dialogue Text', required: true },
      { name: 'dialogue_type', type: 'text', label: 'Type' },
      { name: 'trigger_keyword', type: 'text', label: 'Trigger Keyword' },
      { name: 'context', type: 'text', label: 'Context' },
      { name: 'recorded_at', type: 'text', label: 'Recorded At' }
    ]
  },
  {
    name: 'NPC Paths',
    endpoint: 'npc_paths',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'npc_id', type: 'number', label: 'NPC ID', required: true },
      { name: 'room_id', type: 'number', label: 'Room ID', required: true },
      { name: 'sequence_order', type: 'number', label: 'Sequence', required: true },
      { name: 'direction_from_previous', type: 'text', label: 'Direction' },
      { name: 'wait_time_seconds', type: 'number', label: 'Wait Time (s)' },
      { name: 'notes', type: 'text', label: 'Notes' }
    ]
  },
  {
    name: 'NPC Spawn Info',
    endpoint: 'npc_spawn_info',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'npc_id', type: 'number', label: 'NPC ID', required: true },
      { name: 'room_id', type: 'number', label: 'Spawn Room', required: true },
      { name: 'spawn_rate_minutes', type: 'number', label: 'Spawn Rate (min)' },
      { name: 'max_instances', type: 'number', label: 'Max Instances' },
      { name: 'last_observed_spawn', type: 'text', label: 'Last Observed' },
      { name: 'spawn_conditions', type: 'text', label: 'Spawn Conditions' }
    ]
  },
  {
    name: 'NPC Flags',
    endpoint: 'npc_flags',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Flag Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'category', type: 'text', label: 'Category' }
    ]
  },
  {
    name: 'NPC Flag Instances',
    endpoint: 'npc_flag_instances',
    readOnly: false,
    fields: [
      { name: 'npc_id', type: 'number', label: 'NPC ID', required: true },
      { name: 'flag_id', type: 'number', label: 'Flag ID', required: true },
      { name: 'active', type: 'number', label: 'Active' }
    ]
  },
  {
    name: 'Character Positions',
    endpoint: 'character_positions',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Position Name', required: true },
      { name: 'description', type: 'textarea', label: 'Description' }
    ]
  },
  {
    name: 'Items',
    endpoint: 'items',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'text', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'type', type: 'text', label: 'Type' },
      { name: 'description', type: 'custom', label: 'Description', custom: 'itemDescription' },
      { name: 'attributes', type: 'custom', label: 'Attributes', custom: 'itemAttributes' },
      { name: 'material', type: 'text', label: 'Material', hideInTable: true },
      { name: 'size', type: 'text', label: 'Size', hideInTable: true },
      { name: 'weight', type: 'number', label: 'Weight', hideInTable: true },
      { name: 'value', type: 'number', label: 'Value', hideInTable: true },
      { name: 'stats', type: 'json', label: 'Stats', hideInTable: true },
      { name: 'properties', type: 'json', label: 'Properties', hideInTable: true },
      { name: 'rawText', type: 'textarea', label: 'Raw Text', hideInTable: true }
    ]
  },
  {
    name: 'Help Entries',
    endpoint: 'help_entries',
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'variations', type: 'json', label: 'Variations', hideInTable: true },
      { name: 'helpText', type: 'textarea', label: 'Help Text', hideInTable: true }
    ]
  },
  {
    name: 'Room Terrains',
    endpoint: 'room_terrains',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'value', type: 'text', label: 'Value', required: true },
      { name: 'description', type: 'textarea', label: 'Description' }
    ]
  },
  {
    name: 'Room Flags',
    endpoint: 'room_flags',
    readOnly: false,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'value', type: 'text', label: 'Value', required: true },
      { name: 'description', type: 'textarea', label: 'Description' }
    ]
  }
];