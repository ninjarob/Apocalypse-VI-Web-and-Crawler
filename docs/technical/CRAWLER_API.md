# Crawler API Documentation

## Overview

The crawler provides a TypeScript API client for communicating with the backend API during autonomous MUD exploration. It handles data persistence, error recovery, and graceful degradation when the backend is unavailable.

**Location:** `crawler/src/api.ts`

## Architecture

The crawler API client includes:

- **BackendAPI class** - Main API client with error handling
- **Entity-specific methods** - Specialized methods for different data types
- **Generic methods** - CRUD operations for any entity type
- **Error handling** - Graceful degradation and retry logic

## BackendAPI Class

### Constructor
```typescript
const api = new BackendAPI(baseUrl: string);
```

**Parameters:**
- `baseUrl` (string) - Backend API base URL (e.g., 'http://localhost:3002')

### Error Handling
The API client includes sophisticated error handling:

- **Connection failures** - Logs warnings but continues operation
- **Retry logic** - Automatic retry for transient failures
- **Graceful degradation** - Continues crawling even if backend is down
- **Rate limiting** - Prevents spam during connection issues

## Entity-Specific Methods

### Room Operations

#### saveRoom(room: Partial<Room>): Promise<Room | null>
Save a discovered room to the database.

**Parameters:**
- `room` (Partial<Room>) - Room data (name, description, zone_id, etc.)

**Returns:** Saved room object or null if failed

**Example:**
```typescript
const room = await api.saveRoom({
  name: 'The Temple',
  description: 'A grand temple...',
  zone_id: 2,
  portal_key: 'temple_key'
});
```

#### getRoomByName(name: string): Promise<Room | null>
Find an existing room by exact name.

**Parameters:**
- `name` (string) - Room name to search for

**Returns:** Room object or null if not found

#### getAllRooms(): Promise<Room[]>
Get all rooms from the database.

**Returns:** Array of all rooms

### NPC Operations

#### saveNPC(npc: Partial<NPC>): Promise<void>
Save a discovered NPC.

**Parameters:**
- `npc` (Partial<NPC>) - NPC data

### Item Operations

#### saveItem(item: Partial<Item>): Promise<void>
Save a discovered item.

**Parameters:**
- `item` (Partial<Item>) - Item data

### Spell Operations

#### saveSpell(spell: Partial<Spell>): Promise<void>
Save a discovered spell.

**Parameters:**
- `spell` (Partial<Spell>) - Spell data

### Character Management Operations

#### saveCharacter(character: Partial<Character>): Promise<Character | null>
Save or update a character managed by the AI agent.

**Parameters:**
- `character` (Partial<Character>) - Character data with comprehensive tracking metadata

**Returns:** Saved character object or null if failed

**Required Fields for New Characters:**
- `name`, `race`, `class`, `level`
- `purpose`: Why character was created (required for tracking)
- `specialization`: Character role/type
- `account_name`: AI agent account identifier

**Example:**
```typescript
const character = await api.saveCharacter({
  name: 'Zelthar',
  race: 'Elf',
  class: 'Ranger',
  level: 5,
  hp: 45,
  mana: 60,
  moves: 120,
  account_name: 'ai_agent',
  is_active: true,
  purpose: 'Explore Haunted Forest zone - high DEX build',
  specialization: 'explorer',
  created_at: new Date().toISOString(),
  session_count: 0,
  areas_explored: 0
});

// Log creation to audit trail
await api.logCharacterEvent({
  character_id: character.id,
  event_type: 'created',
  details: `Created for: ${character.purpose}`
});
```

#### getCharacterByName(name: string): Promise<Character | null>
Find an existing character by name.

**Parameters:**
- `name` (string) - Character name

**Returns:** Character object or null if not found

#### getAllCharacters(accountName?: string): Promise<Character[]>
Get all characters, optionally filtered by account.

**Parameters:**
- `accountName` (optional string) - Filter by account name

**Returns:** Array of characters

#### deleteCharacter(characterId: number): Promise<void>
Delete a character from the database (mirrors in-game deletion).

**Parameters:**
- `characterId` (number) - ID of character to delete

**Example:**
```typescript
// Delete test character after experiment
await api.deleteCharacter(testChar.id);
```

#### setActiveCharacter(characterId: number): Promise<void>
Mark a character as the currently active one.

**Parameters:**
- `characterId` (number) - ID of character to make active

#### getUnusedCharacters(daysInactive: number = 7): Promise<Character[]>
Find characters that haven't been used recently.

**Parameters:**
- `daysInactive` (number) - Days since last played (default: 7)

**Returns:** Array of inactive characters

**Example:**
```typescript
// Find characters unused for 7+ days
const staleChars = await api.getUnusedCharacters(7);
console.log(`Found ${staleChars.length} unused characters`);
```

#### getCharacterAuditReport(): Promise<CharacterAuditReport>
Generate comprehensive character roster report.

**Returns:** Audit report with statistics and recommendations

**Example:**
```typescript
const report = await api.getCharacterAuditReport();
console.log(`Total characters: ${report.total_count}`);
console.log(`Active: ${report.active_count}`);
console.log(`Candidates for deletion: ${report.deletion_candidates.length}`);
```

#### logCharacterEvent(event: CharacterEvent): Promise<void>
Log character lifecycle events for audit trail.

**Parameters:**
- `event` (CharacterEvent) - Event data (type, character_id, details)

**Event Types:** 'created', 'deleted', 'logged_in', 'logged_out', 'purpose_changed'

**Example:**
```typescript
await api.logCharacterEvent({
  character_id: char.id,
  event_type: 'deleted',
  details: 'Unused for 14 days, failed experimental build',
  timestamp: new Date().toISOString()
});
```

#### exportCharacterList(format: 'json' | 'csv' = 'json'): Promise<string>
Export character list for manual review.

**Parameters:**
- `format` (string) - Output format (json or csv)

**Returns:** Formatted character list

**Example:**
```typescript
// Export for human review
const csv = await api.exportCharacterList('csv');
fs.writeFileSync('character-audit.csv', csv);
```

### Player Action Operations

#### savePlayerAction(action: PlayerActionData): Promise<void>
Save a discovered player command or action.

**Parameters:**
- `action` (object) - Action data with name, type, syntax, etc.

#### updatePlayerAction(name: string, updates: any): Promise<void>
Update an existing player action.

#### getAllPlayerActions(type?: string): Promise<PlayerAction[]>
Get all player actions, optionally filtered by type.

### Crawler Status

#### updateCrawlerStatus(status: string): Promise<void>
Update the crawler's current status.

**Parameters:**
- `status` (string) - Status message (e.g., 'exploring', 'learning', 'idle')

**Example:**
```typescript
await api.updateCrawlerStatus('exploring_zone_2');
```

## Generic Methods

### saveEntity(type: string, entity: any): Promise<void>
Save any entity type to the database.

**Parameters:**
- `type` (string) - Entity type ('races', 'classes', etc.)
- `entity` (any) - Entity data

### getEntity(type: string, id: string): Promise<any | null>
Get a specific entity by ID.

### getAllEntities(type: string, filters?: Record<string, any>): Promise<any[]>
Get all entities of a type with optional filtering.

### updateEntity(type: string, id: string, updates: any): Promise<void>
Update an entity.

### deleteEntity(type: string, id: string): Promise<void>
Delete an entity.

## Convenience Methods

The API provides convenience methods that internally use the generic methods:

### Races
- `saveRace(race: RaceData): Promise<void>`
- `getAllRaces(): Promise<Race[]>`

### Classes
- `saveClass(gameClass: ClassData): Promise<void>`
- `getAllClasses(): Promise<Class[]>`

### Skills
- `saveSkill(skill: SkillData): Promise<void>`
- `getAllSkills(): Promise<Skill[]>`

### Help Entries
- `saveHelpEntry(helpEntry: HelpEntryData): Promise<void>`
- `getAllHelpEntries(): Promise<HelpEntry[]>`
- `updateHelpEntry(id: number, updates: any): Promise<void>`

### World Entities
- `saveLore(lore: Partial<Lore>): Promise<void>`
- `saveFaction(faction: Partial<Faction>): Promise<void>`
- `saveQuest(quest: Partial<Quest>): Promise<void>`
- `saveRegion(region: Partial<Region>): Promise<void>`
- `saveRelationship(relationship: Partial<Relationship>): Promise<void>`

And corresponding getter methods for each type.

## Usage Patterns

### Basic Room Discovery
```typescript
import { BackendAPI } from './api';

const api = new BackendAPI('http://localhost:3002');

// Save a discovered room
const room = await api.saveRoom({
  name: 'Dark Forest',
  description: 'A dense, shadowy forest...',
  zone_id: 9,
  portal_key: 'dark_forest_entrance'
});

if (room) {
  console.log(`Saved room: ${room.name} (ID: ${room.id})`);
} else {
  console.log('Failed to save room - continuing exploration');
}
```

### Player Action Discovery
```typescript
// Save a discovered command
await api.savePlayerAction({
  name: 'cast',
  type: 'command',
  syntax: 'cast <spell> [on <target>]',
  description: 'Cast a magical spell',
  category: 'magic',
  documented: true,
  discovered: new Date()
});

// Update action usage statistics
await api.updatePlayerAction('cast', {
  successCount: 15,
  lastTested: new Date()
});
```

### Status Updates
```typescript
// Update crawler status during different phases
await api.updateCrawlerStatus('connecting_to_mud');
await api.updateCrawlerStatus('exploring_zone_2');
await api.updateCrawlerStatus('learning_game_mechanics');
await api.updateCrawlerStatus('idle');
```

### Error Handling
```typescript
// The API handles errors gracefully - crawler continues even if backend is down
try {
  await api.saveRoom(roomData);
} catch (error) {
  // This won't throw - API handles errors internally
  // But you can still check the return value
}

const room = await api.saveRoom(roomData);
if (!room) {
  console.log('Room save failed - backend may be unavailable');
}
```

### Batch Operations
```typescript
// Save multiple related entities
const entities = [
  { type: 'races', data: raceData },
  { type: 'classes', data: classData },
  { type: 'skills', data: skillData }
];

for (const { type, data } of entities) {
  await api.saveEntity(type, data);
}
```

## Configuration

The API client is configured with:

- **Base URL** - Backend API endpoint
- **Timeout settings** - For HTTP requests
- **Retry logic** - For failed requests
- **Logging** - Integration with crawler logging system

## Dependencies

- `axios` - HTTP client library
- Shared types from `../../shared/types`
- Logger from `./logger`

## Best Practices

1. **Check return values** - Methods return null/false on failure
2. **Continue on errors** - Crawler should continue exploring even if saves fail
3. **Use appropriate methods** - Entity-specific methods for common operations
4. **Batch operations** - Save related data together when possible
5. **Status updates** - Keep status current for monitoring
6. **Error logging** - Use the built-in logging for debugging

## Integration with Crawler Tasks

The API is used throughout the crawler task system:

```typescript
// In a crawler task
export class ExploreTask implements CrawlerTask {
  async execute(config: CrawlerConfig): Promise<void> {
    const api = config.api;

    // Update status
    await api.updateCrawlerStatus('exploring');

    // Save discovered data
    await api.saveRoom(roomData);
    await api.savePlayerAction(actionData);

    // Continue exploration...
  }
}
```

This ensures all crawler activities are properly tracked and data is persisted to the backend database.