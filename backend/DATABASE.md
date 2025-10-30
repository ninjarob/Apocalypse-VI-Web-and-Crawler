# Database Seeding & Management

## Overview

This document describes how to seed and manage the MUD database.

## Quick Start

### Reset and Seed Database

```bash
# Delete existing database and seed with fresh data
npm run db:reset
```

### Seed Only (Keep Existing Data)

```bash
# This will drop and recreate all tables, then seed
npm run seed
```

## Database Schema

### Core Tables

#### `abilities`
- Character ability scores (STR, INT, WIS, DEX, CON, CHA)
- Auto-incrementing ID
- Fields: `id`, `name`, `short_name`, `description`, `createdAt`, `updatedAt`

#### `races`
- Playable races in the game
- Fields: `id`, `name`, `description`, `stats` (JSON), `abilities` (JSON), `requirements` (JSON), `helpText`, `discovered`, `createdAt`, `updatedAt`

#### `classes`
- Playable classes in the game
- Fields: `id`, `name`, `description`, `stats` (JSON), `abilities` (JSON), `requirements` (JSON), `startingEquipment` (JSON), `helpText`, `discovered`, `createdAt`, `updatedAt`

#### `skills`
- Skills/abilities in the game
- Fields: `id`, `name`, `description`, `type`, `requirements` (JSON), `effects` (JSON), `manaCost`, `cooldown`, `helpText`, `discovered`, `createdAt`, `updatedAt`

### Exploration Tables

#### `rooms`
- Game world locations discovered by crawler
- Fields: `id`, `name`, `description`, `exits` (JSON), `npcs` (JSON), `items` (JSON), `coordinates` (JSON), `area`, `visitCount`, `firstVisited`, `lastVisited`, `rawText`, `createdAt`, `updatedAt`

#### `npcs`
- Non-player characters discovered
- Fields: `id`, `name`, `description`, `location`, `dialogue` (JSON), `hostile` (boolean), `level`, `race`, `class`, `rawText`, `createdAt`, `updatedAt`

#### `items`
- Items discovered in the game
- Fields: `id`, `name`, `description`, `type`, `location`, `properties` (JSON), `stats` (JSON), `rawText`, `createdAt`, `updatedAt`

#### `spells`
- Spells discovered in the game
- Fields: `id`, `name`, `description`, `manaCost`, `level`, `type`, `effects` (JSON), `rawText`, `createdAt`, `updatedAt`

#### `attacks`
- Combat attacks discovered
- Fields: `id`, `name`, `description`, `damage`, `type`, `requirements` (JSON), `rawText`, `createdAt`, `updatedAt`

### Command Tracking Tables

#### `commands`
- All MUD commands discovered
- Fields: `id`, `name`, `category`, `description`, `syntax`, `examples` (JSON), `requirements` (JSON), `levelRequired`, `relatedCommands` (JSON), `documented` (boolean), `rawHelpText`, `discovered`, `lastTested`, `timesUsed`, `successCount`, `failCount`, `createdAt`, `updatedAt`

#### `command_usage`
- Log of command attempts by AI crawler
- Fields: `id`, `commandName`, `fullCommand`, `roomLocation`, `context`, `success` (boolean), `response`, `errorMessage`, `timestamp`

#### `exploration_queue`
- Queue of locations/commands to explore
- Fields: `id`, `priority`, `commandToTry`, `targetRoom`, `reason`, `status`, `result`, `createdAt`, `executedAt`

#### `crawler_status`
- Current state of crawler
- Fields: `id`, `status`, `currentRoom`, `timestamp`, `roomsDiscovered`, `npcsDiscovered`, `itemsDiscovered`, `commandsDiscovered`, `actionsCompleted`, `createdAt`

## Seed Data

### Abilities (6 entries)
1. **Strength (STR)** - Physical power, damage, carrying capacity
2. **Intelligence (INT)** - Memory, reasoning, learning, mana bonus
3. **Wisdom (WIS)** - Intuition, judgment, mana pool, mana regen
4. **Dexterity (DEX)** - Agility, reflexes, balance, armor bonus
5. **Constitution (CON)** - Physique, hardiness, health, hitpoints
6. **Charisma (CHA)** - Persuasiveness, magnetism, leadership

### Races (17 entries)
- Dwarf, Elf, Gnome, Half-Elf, Half-Giant, Halfling, Human
- Minotaur, Pixie, Triton, Uldra, Dragonborn, Troll
- Planewalker, Tiefling, Wemic, Lizardkind

## Customization

Edit `backend/seed.js` to:
- Add more seed data
- Modify existing seed data
- Add custom tables
- Change table structure

## Notes

- The seed script drops ALL existing tables before creating new ones
- Use `npm run seed` to get a fresh start
- The database file is `backend/mud_data.db`
- Crawler will populate exploration tables automatically as it runs
- Use the Admin UI to manage entities after seeding
