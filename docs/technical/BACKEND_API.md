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

- `rooms` - Game locations
- `npcs` - Non-player characters
- `items` - Game items and equipment
- `spells` - Magic spells
- `attacks` - Combat attacks
- `abilities` - Character abilities
- `races` - Character races
- `classes` - Character classes
- `skills` - Special skills
- `help_entries` - In-game help
- `player_actions` - Discovered player commands
- `factions` - Game factions
- `quests` - Game quests
- `regions` - World regions
- `relationships` - Entity relationships
- `lore` - World lore
- `room_exits` - Room connections
- `class_proficiencies` - Class skill proficiencies
- `ability_scores` - Ability score requirements
- `commands` - Game commands
- `zones` - Game zones/areas

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