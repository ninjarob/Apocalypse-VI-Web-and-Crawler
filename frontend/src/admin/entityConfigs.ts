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
    readOnly: true,
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
    readOnly: true,
    clickable: true,
    fields: [
      { name: 'id', type: 'number', label: 'ID', hideInTable: true },
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'level', type: 'number', label: 'Level' },
      { name: 'race', type: 'text', label: 'Race' },
      { name: 'class', type: 'text', label: 'Class' },
      { name: 'hostile', type: 'number', label: 'Hostile' },
      { name: 'location', type: 'text', label: 'Location' },
      { name: 'description', type: 'textarea', label: 'Description', hideInTable: true },
      { name: 'dialogue', type: 'json', label: 'Dialogue', hideInTable: true },
      { name: 'rawText', type: 'textarea', label: 'Raw Text', hideInTable: true }
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
  }
];