# Backend API Documentation

## Overview

The backend provides a RESTful API for managing MUD world data, including rooms, NPCs, items, spells, and other game entities. The API is built with Express.js and uses SQLite as the database.

**Base URL:** `http://localhost:3002/api`

## Authentication

Currently, no authentication is required for API access.

## Response Format

All responses follow a consistent JSON format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

## Error Handling

Errors are returned with appropriate HTTP status codes:

- `400` - Bad Request (invalid parameters)
- `404` - Not Found
- `500` - Internal Server Error

Error response format:
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": { ... }
  }
}
```

## Endpoints

### Meta Endpoints

#### GET /entity-types
Get all available entity types and their configurations.

**Response:**
```json
{
  "types": ["rooms", "npcs", "items", ...],
  "config": {
    "rooms": { "table": "rooms", "idField": "id", ... },
    ...
  }
}
```

#### GET /stats
Get counts for all major entity types.

**Response:**
```json
{
  "rooms": 125,
  "npcs": 45,
  "items": 78,
  "spells": 234,
  "attacks": 156,
  "abilities": 89,
  "races": 12,
  "zones": 73,
  "playerActions": 45,
  "total": 857
}
```

### Room Endpoints

#### GET /rooms/by-name/:name
Get a room by its exact name.

**Parameters:**
- `name` (string) - Room name

**Response:**
```json
{
  "id": 1,
  "name": "The Temple of Midgaard",
  "description": "You are in the temple...",
  "zone_id": 2,
  "x": 0,
  "y": -315,
  "terrain": "city",
  "flags": "",
  "portal_key": "abc123",
  "visit_count": 5
}
```

#### POST /rooms
Create or update a room (used by crawler).

**Request Body:**
```json
{
  "name": "New Room",
  "description": "Room description",
  "zone_id": 2,
  "portal_key": "unique_key",
  "terrain": "city"
}
```

**Response:** Room object (201 for new, 200 for update)

### Generic CRUD Endpoints

The API provides generic CRUD operations for all entity types. Replace `:type` with any entity type (rooms, npcs, items, etc.).

#### GET /:type
Get all entities of a type with optional filtering.

**Query Parameters:**
- `category` (string) - Filter by category (for commands)
- `ability_id` (number) - Filter by ability ID (for ability_scores)
- `zone_id` (number) - Filter rooms by zone
- `portal_key` (string) - Filter rooms by portal key
- `class_id` (number) - Filter class_proficiencies by class
- `id` (string) - Filter by ID
- `from_room_id` (number) - Filter room_exits by from room
- `direction` (string) - Filter room_exits by direction

**Response:** Array of entities

#### GET /:type/:id
Get a single entity by ID.

**Parameters:**
- `id` (string/number) - Entity ID

**Response:** Single entity object

#### POST /:type
Create a new entity.

**Request Body:** Entity data object

**Response:** Created entity (201 status)

#### PUT /:type/:identifier
Update an existing entity.

**Parameters:**
- `identifier` (string) - Entity ID or unique field value

**Request Body:** Updated entity data

**Response:**
```json
{
  "success": true,
  "entity": { ... }
}
```

#### DELETE /:type/:id
Delete an entity.

**Parameters:**
- `id` (string/number) - Entity ID

**Response:**
```json
{
  "success": true,
  "deleted": "entity_id"
}
```

### Zone Endpoints

#### GET /zones/:id/connections
Get zone connections for navigation.

**Parameters:**
- `id` (number) - Zone ID

**Response:** Array of connected zones with exit information

## Entity Types

The API supports the following entity types:

### World & Navigation
- `rooms` - Game locations
- `zones` - Game zones/areas
- `room_exits` - Room connections
- `regions` - World regions

### Characters & NPCs
- `npcs` - Non-player characters
- `npc_equipment` - NPC equipment templates
- `npc_spells` - NPC spells and abilities
- `npc_dialogue` - NPC conversation data
- `npc_paths` - NPC movement patterns
- `npc_spawn_info` - NPC spawn locations and rates
- `npc_flags` - NPC status flags (reference)
- `npc_flag_instances` - Active NPC flags

### Items & Equipment
- `items` - Game items and equipment
- `item_types` - Item type reference (WEAPON, ARMOR, etc.)
- `item_materials` - Item material reference (iron, leather, etc.)
- `item_sizes` - Item size reference (small, large, etc.)
- `item_flags` - Item flag reference (MAGIC, CURSED, etc.)
- `wear_locations` - Equipment slot reference (FINGER, NECK, WIELD, etc.)
- `stat_types` - Stat modifier reference (HITROLL, DAMROLL, etc.)
- `item_bindings` - Item binding types (BIND_ON_PICKUP, etc.)

### Character Systems
- `races` - Character races
- `classes` - Character classes
- `class_groups` - Class group categories
- `class_proficiencies` - Class skill proficiencies
- `class_perks` - Class perk reference
- `class_perk_availability` - Class-specific perks
- `abilities` - Character abilities (STR, DEX, etc.)
- `ability_scores` - Ability score requirements
- `skills` - Special skills
- `character_positions` - Character position states (standing, sitting, etc.)

### Combat & Magic
- `spells` - Magic spells
- `attacks` - Combat attacks
- `saving_throws` - Saving throw types
- `spell_modifiers` - Spell modifier types
- `elemental_resistances` - Elemental resistance types
- `physical_resistances` - Physical resistance types

### Game Content
- `help_entries` - In-game help
- `player_actions` - Discovered player commands
- `factions` - Game factions
- `quests` - Game quests
- `lore` - World lore
- `relationships` - Entity relationships
- `commands` - Game commands

## Validation

All create/update operations include validation:

- **Create operations** validate required fields
- **Update operations** validate field types and constraints
- Invalid requests return 400 status with error details

## Rate Limiting

Currently no rate limiting is implemented.

## Examples

### Get all rooms in zone 2
```
GET /api/rooms?zone_id=2
```

### Create a new NPC
```
POST /api/npcs
{
  "name": "Shopkeeper",
  "description": "A friendly shopkeeper",
  "zone_id": 2,
  "stats": { "level": 10 }
}
```

### Update a room
```
PUT /api/rooms/123
{
  "description": "Updated room description"
}
```

### Get player actions by type
```
GET /api/player_actions?type=command
```