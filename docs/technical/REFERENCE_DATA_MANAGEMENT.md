# Adding and Modifying Reference Data

## Overview

This guide explains how to add, modify, and manage reference data entities in the Apocalypse VI MUD system. The system uses a **generic entity configuration system** that handles most reference data types uniformly.

## 🤖 AI Agent Quick Reference

### Entity Types and Their Purposes
- **room_terrains**: Terrain types for rooms (road, forest, mountain, etc.)
- **room_flags**: Special properties for rooms (dark, safe, indoors, etc.)
- **item_types**: Categories of items (weapon, armor, food, etc.)
- **item_materials**: Materials items are made of (steel, wood, gold, etc.)
- **item_bindings**: How items bind to characters (non-binding, bind-on-pickup, etc.)
- **wear_locations**: Where items can be worn (head, body, hands, etc.)
- **stat_types**: Character statistics (strength, intelligence, hitpoints, etc.)
- **abilities**: Base character abilities (STR, INT, WIS, DEX, CON, CHA)
- **ability_scores**: Numerical values and effects for abilities
- **saving_throws**: Defensive rolls (paralyzation, breath weapon, etc.)
- **spell_modifiers**: Damage type modifiers for spells
- **elemental_resistances**: Resistances to elemental damage
- **physical_resistances**: Resistances to physical damage types
- **races**: Playable character races (Human, Elf, Dwarf, etc.)
- **classes**: Character classes (Fighter, Mage, Cleric, etc.)
- **class_groups**: Groups of related classes (Warrior, Priest, Wizard, Rogue)
- **class_proficiencies**: Skills available to classes
- **class_perks**: Special abilities for classes
- **spells**: Magic spells and their effects
- **attacks**: Combat attacks and abilities
- **player_actions**: Available player commands and actions
- **zones**: Geographic zones in the world
- **zone_areas**: Sub-areas within zones
- **zone_connections**: Connections between zones

### Quick Workflow for Adding Reference Data

1. **Identify Entity Type**: Determine which entity config applies
2. **Check Current Data**: Query existing data via API
3. **Add to Seed Script**: Update `scripts/seed.ts` with new data
4. **Reseed Database**: Run `npm run seed` in backend directory
5. **Verify**: Check API endpoints and frontend admin interface

## Entity Configuration System

All reference data is managed through `shared/entity-config.ts`. Each entity type has:

```typescript
{
  table: 'table_name',           // Database table name
  idField: 'id',                 // Primary key field
  nameField: 'name',             // Display name field (optional)
  autoIncrement: true,           // Auto-incrementing IDs
  uniqueField: 'name',           // Field that must be unique (optional)
  jsonFields: ['effects'],       // Fields stored as JSON
  booleanFields: ['is_active'],  // Boolean fields
  sortBy: 'name',                // Default sort order
  display: {                     // Frontend display config
    name: 'Display Name',
    singular: 'Singular Name',
    icon: '🚪',
    description: 'Description for UI'
  }
}
```

## Adding New Reference Data

### Method 1: Via Seed Script (Recommended)

**File**: `scripts/seed.ts`

Most reference data is seeded in arrays within the `seedData()` function. To add new data:

1. **Locate the seeding section** for your entity type
2. **Add new entries** to the appropriate array
3. **Run the seed script**

**Example - Adding a New Room Terrain**:
```typescript
// In scripts/seed.ts, find the roomTerrains array:
const roomTerrains = [
  ['road', 'Road - Roads, streets, paths, trails (outdoor travel routes)'],
  ['forest', 'Forest - Forests, woods, jungles, wooded areas'],
  ['mountain', 'Mountain - Mountains, hills, peaks, rocky terrain'],
  // Add your new terrain:
  ['swamp', 'Swamp - Marshes, wetlands, muddy terrain']
];
```

**Example - Adding a New Race**:
```typescript
// In scripts/seed.ts, find the races array:
const races = [
  { name: 'DWARF', description: 'Short, stocky, and muscular...' },
  { name: 'ELF', description: 'Almost as tall as Humans...' },
  // Add your new race:
  { name: 'HALF-DRAGON', description: 'Born of dragon and humanoid heritage...' }
];
```

### Method 2: Via API (For Runtime Additions)

Use the REST API to add data without reseeding:

```powershell
# Add a new room terrain
curl -X POST "http://localhost:3002/api/room_terrains" `
  -H "Content-Type: application/json" `
  -d '{"value": "volcano", "label": "Volcano", "description": "Lava flows and volcanic terrain"}'

# Add a new item type
curl -X POST "http://localhost:3002/api/item_types" `
  -H "Content-Type: application/json" `
  -d '{"name": "POTION", "description": "Magical potions and elixirs"}'
```

## Modifying Existing Reference Data

### Via API (Recommended for Existing Data)

```powershell
# Update a room terrain
curl -X PUT "http://localhost:3002/api/room_terrains/5" `
  -H "Content-Type: application/json" `
  -d '{"description": "Updated description for this terrain"}'

# Update a class
curl -X PUT "http://localhost:3002/api/classes/1" `
  -H "Content-Type: application/json" `
  -d '{"description": "Updated class description"}'
```

### Via Seed Script (For Bulk Changes)

1. **Edit the seed data** in `scripts/seed.ts`
2. **Reseed the database** (⚠️ **This will reset ALL data**)

```powershell
cd backend
npm run seed
```

## Specific Entity Type Guides

### Room Terrains & Flags

**Purpose**: Define terrain types and special properties for rooms

**Adding New Terrain**:
```typescript
// scripts/seed.ts
const roomTerrains = [
  // ... existing terrains
  ['tundra', 'Tundra - Frozen plains and icy wastelands'],
  ['desert', 'Desert - Sandy dunes and arid landscapes']
];
```

**Adding New Room Flag**:
```typescript
// scripts/seed.ts
const roomFlags = [
  // ... existing flags
  ['frozen', 'Frozen - Room is extremely cold'],
  ['haunted', 'Haunted - Ghosts and spirits inhabit this area']
];
```

### Item Types, Materials & Bindings

**Purpose**: Define item categories, materials, and binding behaviors

**Adding New Item Type**:
```typescript
// scripts/seed.ts
const itemTypes = [
  // ... existing types
  ['SCROLL', 'Magical scrolls with spells'],
  ['GEM', 'Precious gems and jewels']
];
```

**Adding New Material**:
```typescript
// scripts/seed.ts
const itemMaterials = [
  // ... existing materials
  ['mithril', 'Mithril - Light, strong, magical metal'],
  ['dragonscale', 'Dragonscale - Tough, fire-resistant material']
];
```

### Character Stats & Abilities

**Purpose**: Define character statistics and ability systems

**Adding New Stat Type**:
```typescript
// scripts/seed.ts
const statTypes = [
  // ... existing stats
  ['LUCK', 'Luck - Influences random events'],
  ['CHARISMA', 'Charisma - Social and leadership ability']
];
```

**Adding New Ability Score Effects**:
Ability scores are complex and require careful calculation. See existing patterns in `scripts/seed.ts` for strength, intelligence, etc.

### Classes, Races & Proficiencies

**Purpose**: Define playable character options and their abilities

**Adding New Race**:
```typescript
// scripts/seed.ts
const races = [
  // ... existing races
  {
    name: 'CENTAUR',
    description: 'Half-human, half-horse creatures known for their speed and archery skills.'
  }
];
```

**Adding New Class**:
Classes are complex with many properties. Study existing class definitions in `scripts/seed.ts`.

**Adding Class Proficiencies**:
Proficiencies are loaded from `data/class-proficiencies.json`. Edit this file and the seeding will pick up changes.

### Spells & Attacks

**Purpose**: Define magical spells and combat abilities

**Adding New Spell**:
```typescript
// scripts/seed.ts
const spells = [
  // ... existing spells
  {
    name: 'Fireball',
    level: 3,
    type: 'damage',
    effects: [{ type: 'fire_damage', amount: '3d6' }]
  }
];
```

### Zones & Areas

**Purpose**: Define geographic regions and their connections

**Adding New Zone**:
```typescript
// scripts/seed.ts
const zones = [
  // ... existing zones
  {
    id: 75,
    name: 'Crystal Caves',
    description: 'Ancient caves filled with magical crystals...',
    author: 'YourName',
    difficulty: 3
  }
];
```

## Verification Steps

After making changes, always verify:

1. **Database Updated**:
```powershell
# Check entity count
curl "http://localhost:3002/api/stats"

# Check specific entity
curl "http://localhost:3002/api/room_terrains"
```

2. **Frontend Admin Interface**:
- Navigate to `/admin` in the frontend
- Check that new entities appear in dropdowns and lists

3. **API Endpoints**:
```powershell
# Test CRUD operations
curl "http://localhost:3002/api/your_entity_type"
curl "http://localhost:3002/api/your_entity_type/1"
```

## Common Patterns

### JSON Fields
Some entities store complex data as JSON:
```typescript
// Example: Ability scores with effects
{
  score: 18,
  effects: {
    weight_capacity: 450,
    damage_bonus: 2,
    hp_regen: 4
  }
}
```

### Relationships
Entities often reference each other:
- Classes belong to class_groups
- Class proficiencies reference classes
- Rooms reference zones and terrains
- Items reference types, materials, bindings

### Unique Constraints
Many entities have unique fields (usually `name` or `value`):
- room_terrains.value must be unique
- races.name must be unique
- classes.name must be unique

## Troubleshooting

### Changes Not Appearing
1. **Reseed the database**: `cd backend && npm run seed`
2. **Restart services**: Frontend/backend may need restart to pick up config changes
3. **Check entity config**: Verify `shared/entity-config.ts` has correct configuration

### API Errors
1. **Check entity type**: Must match keys in `ENTITY_CONFIG`
2. **Validate JSON**: Ensure proper JSON formatting for complex fields
3. **Check unique constraints**: Can't add duplicates of unique fields

### Frontend Issues
1. **Clear cache**: Browser cache may need clearing
2. **Check admin config**: Verify `frontend/src/admin/entityConfigs.ts`
3. **API connectivity**: Ensure backend is running and accessible

## Best Practices

1. **Use seed script** for initial data and bulk changes
2. **Use API** for runtime modifications and testing
3. **Test thoroughly** - reference data affects many parts of the system
4. **Document changes** - update this guide when adding new entity types
5. **Backup database** before reseeding
6. **Check relationships** - ensure foreign keys are valid

## Quick Commands

```powershell
# Reseed database
cd backend && npm run seed

# Check entity counts
curl "http://localhost:3002/api/stats"

# List all entity types
curl "http://localhost:3002/api/entity-types"

# View specific entity data
curl "http://localhost:3002/api/room_terrains"
curl "http://localhost:3002/api/races"
curl "http://localhost:3002/api/classes"
```

This documentation enables AI agents to quickly understand and execute reference data management tasks across the entire system.