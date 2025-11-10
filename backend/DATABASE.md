# Database Management Guide

## Overview

The MUD project uses SQLite for data persistence. The database is located at `data/mud-data.db` (project root) and contains game mechanics, world data, and crawler discoveries.

## Quick Commands

```bash
# From backend directory:

# Seed database (drops and recreates all tables)
npm run seed

# Reset database (delete file and reseed)
npm run db:reset

# Build TypeScript
npm run build

# Start server
npm run dev
```

## Database Location

- **Path:** `data/mud-data.db` (relative to project root)
- **Access:** Backend API server (read/write), Crawler (via API)
- **Backup:** Copy the .db file before running `db:reset`

## Database Schema

The schema is defined and maintained in `backend/seed.ts`. For detailed documentation on specific subsystems:

- **Items System:** See `docs/ITEMS_SCHEMA.md` for comprehensive item schema documentation

### Character System Tables

#### `abilities`
Core character abilities (Strength, Intelligence, Wisdom, Dexterity, Constitution, Charisma)
- Fields: `id`, `name`, `short_name`, `description`, `createdAt`, `updatedAt`

#### `ability_scores`
Numerical ability values and their effects
- Fields: `id`, `ability_id`, `score`, `effects` (JSON), `createdAt`, `updatedAt`

#### `races`
Playable character races (17 races including Dwarf, Elf, Human, Dragonborn, etc.)
- Fields: `id`, `name`, `description`, `stats` (JSON), `abilities` (JSON), `requirements` (JSON), `helpText`, `discovered`, `createdAt`, `updatedAt`

#### `classes`
Playable character classes linked to class groups
- Fields: `id`, `name`, `class_group_id`, `description`, `stats` (JSON), `abilities` (JSON), `requirements` (JSON), `startingEquipment` (JSON), `hp_regen`, `mana_regen`, `move_regen`, `helpText`, `discovered`, `createdAt`, `updatedAt`

#### `class_groups`
Groups of related classes (Mage, Warrior, Cleric, Rogue, Psionicist)
- Fields: `id`, `name`, `description`, `createdAt`, `updatedAt`

#### `class_proficiencies`
Skills available to each class at different levels
- Fields: `id`, `class_id`, `name`, `level_required`, `description`, `prerequisite_id`, `createdAt`, `updatedAt`

#### `class_perks`
Special abilities and perks available to classes
- Fields: `id`, `name`, `description`, `category`, `createdAt`, `updatedAt`

#### `class_perk_availability`
Junction table linking perks to classes
- Fields: `id`, `class_id`, `perk_id`, `level_required`

#### `skills`
General skills and abilities
- Fields: `id`, `name`, `description`, `type`, `requirements` (JSON), `effects` (JSON), `manaCost`, `cooldown`, `helpText`, `discovered`, `createdAt`, `updatedAt`

#### `saving_throws`
Types of saving throws
- Fields: `id`, `name`, `description`, `createdAt`, `updatedAt`

#### `spell_modifiers`
Modifiers affecting spell power
- Fields: `id`, `name`, `description`, `createdAt`, `updatedAt`

#### `elemental_resistances`
Resistance to elemental damage types
- Fields: `id`, `name`, `description`, `createdAt`, `updatedAt`

#### `physical_resistances`
Resistance to physical damage types
- Fields: `id`, `name`, `description`, `createdAt`, `updatedAt`


### World & Exploration Tables

#### `zones`
Geographic zones in the game world
- Fields: `id`, `name`, `description`, `author`, `difficulty`, `min_level`, `max_level`, `vnum_range_start`, `vnum_range_end`, `reset_time_minutes`, `createdAt`, `updatedAt`

#### `zone_areas`
Sub-areas within zones
- Fields: `id`, `zone_id`, `name`, `description`, `min_level`, `max_level`, `features` (JSON), `dangers` (JSON), `createdAt`, `updatedAt`

#### `zone_connections`
Connections between zones
- Fields: `id`, `zone_id`, `connected_zone_id`, `description`, `difficulty`, `createdAt`, `updatedAt`

#### `rooms`
Discovered game locations (populated by crawler)
- Fields: `id`, `zone_id`, `vnum`, `name`, `description`, `exits` (JSON), `npcs` (JSON), `items` (JSON), `area`, `flags`, `terrain`, `visitCount`, `firstVisited`, `lastVisited`, `rawText`, `createdAt`, `updatedAt`

#### `room_exits`
Detailed exit information between rooms
- Fields: `id`, `from_room_id`, `to_room_id`, `direction`, `description`, `is_door`, `is_locked`, `is_hidden`, `key_vnum`, `difficulty`, `createdAt`, `updatedAt`

#### `npcs`
Non-player characters discovered
- Fields: `id`, `name`, `description`, `location`, `dialogue` (JSON), `hostile` (boolean), `level`, `race`, `class`, `rawText`, `createdAt`, `updatedAt`

### Items System

See `docs/ITEMS_SCHEMA.md` for complete documentation. Core tables:

#### `items`
Main item table with basic properties
- Fields: `id`, `name`, `vnum`, `type_id`, `material_id`, `min_level`, `size_id`, `weight`, `value`, `rent`, `location`, `description`, `long_description`, `rawText`, `identified`, `createdAt`, `updatedAt`

#### Reference Tables
- `item_types` - WEAPON, ARMOR, FOOD, LIGHT, SCROLL, POTION, etc.
- `item_materials` - Wood, Iron, Steel, Mithril, etc.
- `item_flags` - MAGIC, CURSED, INVISIBLE, GLOW, etc.
- `wear_locations` - HEAD, BODY, HANDS, FEET, etc.
- `stat_types` - HP, MANA, ARMOR, DAMAGE, etc.
- `item_bindings` - NONE, ON_EQUIP, ON_PICKUP, SOULBOUND

#### Type-Specific Tables
- `item_weapons` - Weapon-specific stats (damage, type, skill)
- `item_armor` - Armor-specific stats (armor points, type)
- `item_lights` - Light source stats (intensity, duration)
- `item_containers` - Container stats (capacity, flags)
- `item_consumables` - Food/drink stats (restoration values)

#### Junction/Relationship Tables
- `item_flag_instances` - Items to flags (many-to-many)
- `item_wear_locations` - Items to wear slots (many-to-many)
- `item_stat_effects` - Stat bonuses per item
- `item_spell_effects` - Spell effects on items (scrolls, wands)
- `item_granted_abilities` - Special abilities granted by items
- `item_restrictions` - Class/race restrictions
- `item_binding_instances` - Binding status per item
- `item_customizations` - Custom names/descriptions


### Combat & Magic Tables

#### `spells`
Spells and magical abilities
- Fields: `id`, `name`, `description`, `manaCost`, `level`, `type`, `effects` (JSON), `rawText`, `createdAt`, `updatedAt`

#### `attacks`
Combat attacks and special moves
- Fields: `id`, `name`, `description`, `damage`, `type`, `requirements` (JSON), `rawText`, `createdAt`, `updatedAt`

### Command & Action Tracking

#### `commands`
MUD commands discovered and documented
- Fields: `id`, `name`, `category`, `description`, `syntax`, `examples` (JSON), `requirements` (JSON), `levelRequired`, `relatedCommands` (JSON), `documented` (boolean), `rawHelpText`, `discovered`, `lastTested`, `timesUsed`, `successCount`, `failCount`, `createdAt`, `updatedAt`

#### `player_actions`
Player actions and their usage
- Fields: `id`, `name`, `type` (enum: command, social, emote, spell, skill, other), `category`, `description`, `syntax`, `examples` (JSON), `requirements` (JSON), `relatedActions` (JSON), `timesUsed`, `lastUsed`, `documented` (boolean), `createdAt`, `updatedAt`

#### `socials`
Social/emote commands
- Fields: `id`, `name`, `description`, `toSelf`, `toTarget`, `toOthers`, `requiresTarget` (boolean), `createdAt`, `updatedAt`

#### `command_usage`
Log of command attempts by crawler
- Fields: `id`, `commandName`, `fullCommand`, `roomLocation`, `context`, `success` (boolean), `response`, `errorMessage`, `timestamp`

#### `exploration_queue`
Queue of locations/commands to explore
- Fields: `id`, `priority`, `commandToTry`, `targetRoom`, `reason`, `status`, `result`, `createdAt`, `executedAt`

#### `crawler_status`
Current state of AI crawler
- Fields: `id`, `status`, `currentRoom`, `timestamp`, `roomsDiscovered`, `npcsDiscovered`, `itemsDiscovered`, `commandsDiscovered`, `actionsCompleted`, `createdAt`

## Seed Data Summary

The seed script (`backend/seed.ts`) populates reference tables with:

- **6 Abilities:** Strength, Intelligence, Wisdom, Dexterity, Constitution, Charisma
- **17 Races:** Dwarf, Elf, Gnome, Half-Elf, Half-Giant, Halfling, Human, Minotaur, Pixie, Triton, Uldra, Dragonborn, Troll, Planewalker, Tiefling, Wemic, Lizardkind
- **5 Class Groups:** Mage, Warrior, Cleric, Rogue, Psionicist
- **40+ Classes:** 11 Mage classes, 8 Warrior classes, 8 Cleric classes, 8 Rogue classes, 6 Psionicist classes
- **700+ Class Proficiencies:** Skills and abilities for each class across all levels
- **Item Reference Data:** Types, materials, flags, wear locations, bindings, stat types

## API Access

**🚨 CRITICAL: ALWAYS USE THE API FOR DATABASE ACCESS 🚨**

The database should **ONLY** be accessed through the REST API:

- **Backend API:** REST endpoints at `http://localhost:3002/api`
- **Generic CRUD:** `/api/{entity-type}` supports GET, POST, PUT, DELETE for all entities
- **Specialized Endpoints:** Custom logic for rooms (visit tracking), zones, items

See backend API routes in `backend/src/routes/api.ts` for complete endpoint documentation.

### ❌ DO NOT USE DIRECT DATABASE ACCESS

**NEVER** use these methods to access the database:
- ❌ `sqlite3` command-line tool (fails in PowerShell with path/escaping issues)
- ❌ `query-db.js` script (unreliable, often returns incorrect or incomplete data)
- ❌ Any other direct database queries (inconsistent results)

**Why the API is required:**
1. **Reliability:** Direct database access in PowerShell has numerous path/escaping issues
2. **Consistency:** query-db.js and other scripts often return wrong or incomplete results
3. **Proper Formatting:** API returns properly formatted JSON
4. **Error Handling:** API handles edge cases and provides meaningful error messages
5. **Tested:** API endpoints are tested and validated, direct queries are not

### ✅ Example API Usage

```powershell
# Get all rooms
curl http://localhost:3002/api/rooms

# Get specific room
curl http://localhost:3002/api/rooms?id=123

# Get exits from a room
curl http://localhost:3002/api/room_exits?from_room_id=123

# Get all zones
curl http://localhost:3002/api/zones

# In browser (easier to read JSON)
# http://localhost:3002/api/rooms
# http://localhost:3002/api/room_exits
```

## Customization

To modify the database:

1. **Edit Schema:** Update table definitions in `backend/seed.ts`
2. **Add Seed Data:** Add entries in the seed functions
3. **Reset Database:** Run `npm run db:reset` to apply changes
4. **Update Validation:** Add/update schemas in `backend/src/validation/schemas.ts`
5. **Update Config:** Add entity to `shared/entity-config.ts` for generic API support

## Architecture Notes

- **Shared Types:** Type definitions in `shared/types.ts` used by frontend and backend
- **Entity Config:** `shared/entity-config.ts` defines all entity types and their properties
- **JSON Fields:** Complex data stored as JSON in SQLite (arrays, objects)
- **Auto-increment vs Natural Keys:** Items use string IDs, most entities use auto-increment integers
- **Foreign Keys:** Enforced for referential integrity
- **Timestamps:** All tables have `createdAt` and `updatedAt` fields

## Testing

Manual test scripts available in `backend/tests/manual/`:
- `check-db.js` - Verify database integrity
- `query-races.js` - Quick race queries
- `test-generic-api.js` - Test CRUD operations
- `test-validation.js` - Test input validation
- `test-error-handling.js` - Test error responses
- `test-items.js` - Test item system

See `backend/tests/manual/README.md` for usage instructions.

## Backup & Recovery

```bash
# Backup
cp data/mud-data.db data/backups/mud-data-$(date +%Y%m%d).db

# Restore
cp data/backups/mud-data-20241030.db data/mud-data.db

# Fresh start
npm run db:reset
```
