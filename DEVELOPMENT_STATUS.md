# Apocalypse VI MUD - Development Status

**Last Updated:** October 30, 2025

## Project Overview
AI-powered MUD (Multi-User Dungeon) crawler that uses Ollama LLM to autonomously explore the game, learn mechanics, and document rooms, NPCs, items, and spells.

## Current System Architecture

### Tech Stack
- **Backend**: Node.js + Express + SQLite (port 3002)
- **Frontend**: React + TypeScript + Vite (port 3000)
- **Crawler**: TypeScript + Telnet + Ollama AI
- **AI Model**: Ollama llama3.2:3b (local)
- **Database**: SQLite (comprehensive game data - backend/mud_data.db)

### Project Structure
```
Apocalypse VI MUD/
├── backend/          # API server for data persistence
├── frontend/         # React UI for viewing collected data
├── crawler/          # Main AI crawler application
│   ├── src/
│   │   ├── index.ts        # Main MUDCrawler class
│   │   ├── aiAgent.ts      # Ollama AI integration
│   │   ├── mudClient.ts    # Telnet connection handler
│   │   ├── parser.ts       # MUD output parser
│   │   ├── api.ts          # Backend API client
│   │   ├── logger.ts       # Winston logging config
│   │   └── logArchiver.ts  # Auto-archive old logs
│   ├── dist/crawler/src/   # Compiled output (nested structure)
│   ├── logs/               # Timestamped log files
│   └── .env                # Configuration
└── shared/           # TypeScript types shared across modules
```

## ✅ Completed Features

### 1. Comprehensive Database System ⭐ MAJOR UPDATE!

#### Class System (5 Tables)
- **class_groups**: 4 groups (Warrior, Priest, Wizard, Rogue)
- **classes**: 14 classes with alignment requirements, regen rates, special notes
  - Warrior: Fighter, Paladin, Ranger, Samurai, Berserker
  - Priest: Cleric, Druid, Monk
  - Wizard: Magic User, Necromancer, Warlock
  - Rogue: Thief, Bard, Anti-Paladin
- **class_proficiencies**: 93+ proficiencies with level requirements and prerequisites
- **class_perks**: 54 perks (Weapon Prof, Universal, HMV, Alignment, Playstyle)
- **class_perk_availability**: Junction table linking classes to their available perks

#### Zone System (3 Tables)
- **zones**: 74 zones fully seeded with descriptions, authors, difficulty ratings
  - Examples: Midgaard City, Dwarven Kingdom, Valkyre, Moria, etc.
- **zone_areas**: ~150 sub-areas with level ranges and recommended classes
- **zone_connections**: ~250 connections showing which zones connect to each other

#### Room Navigation System (2 Tables)
- **rooms**: Full room data with zone_id FK, terrain, flags
  - 5 sample Midgaard rooms seeded (Market Square, Temple Street, etc.)
  - Support for vnum (nullable), coordinates, visit tracking
- **room_exits**: Directional connections between rooms
  - Supports: north, south, east, west, up, down, ne, nw, se, sw
  - Door properties: is_door, is_locked, key_vnum, door_name
  - Exit descriptions for atmospheric detail
  - UNIQUE constraint (from_room_id, direction) - one exit per direction
  - CASCADE deletes - room deletion removes all its exits
  - 17 sample exits creating navigation graph in Midgaard

#### Core Game Data Tables
- **abilities**: STR, INT, WIS, DEX, CON, CHA with full descriptions
- **ability_scores**: Score-to-effect mappings for each ability
- **races**: 17 races (Human, Elf, Dwarf, Dragonborn, etc.)
- **saving_throws**: Para, Rod, Petr, Breath, Spell
- **spell_modifiers**: Fire, Cold, Elec, Poison, Acid, etc.
- **elemental_resistances**: 13 types
- **physical_resistances**: Slash, Pierce, Bludgeon, Legendary
- **commands**: Command documentation with syntax and examples
- **npcs, items, spells, attacks**: Game entity storage (crawler-populated)

### 2. Frontend Admin Panel ⭐ MAJOR UPDATE!

#### Hierarchical Navigation System
- **Three-Level Navigation**: Zones → Zone Detail → Room Detail
- **Entity Management**: Full CRUD for manually-managed entities
- **Read-Only Views**: Rooms and exits (crawler-populated)
- **Smart Caching**: `allRooms` and `allZones` state for fast lookups

#### Zone Management
- **Zone List View**: Shows all 74 zones with consolidated info
  - Custom field: `zone_info_combined` shows description, author, difficulty
  - Clickable rows navigate to zone detail
- **Zone Detail View**: 
  - Full zone information (description, author, difficulty, notes)
  - Associated areas list with level ranges
  - Connected zones list
  - Rooms in zone with Name and Exits columns
  - Clickable room rows navigate to room detail

#### Room Management
- **Room List View**: Shows all rooms with minimal info
  - Zone displayed as clickable link (navigates to zone detail)
  - Exits shown succinctly: "north → South Temple Street"
  - Read-only (no add/delete/create)
- **Room Detail View**:
  - Full room information (description, terrain, flags)
  - Clickable zone link (navigates back to zone detail)
  - Exits table with:
    - Direction (sorted: north, northeast, east, etc.)
    - Destination (clickable room name, navigates to connected room)
    - Description (what the exit looks like)
    - Door info (door name, locked status)
  - Navigation between connected rooms via exit links

#### Recent Bug Fixes
- ✅ Fixed room exit navigation showing zones instead of rooms
- ✅ Added `allRooms` cache for proper room lookups
- ✅ Backend supports `?id=` filter for fetching specific rooms
- ✅ Exit destinations now correctly navigate to connected rooms

### 3. Generic Backend API System
- **Dynamic CRUD Routes**: `/:type` endpoint for all entity types
- **Query Filters**: Support for category, ability_id, zone_id, id filters
- **Field Serialization**: Automatic JSON/boolean field handling
- **Entity Configs**: Centralized schema definitions for 20+ entity types
- **Error Handling**: Graceful degradation when backend unavailable

### 4. Logging System
- **Timestamped Logs**: `combined-YYYY-MM-DDTHH-MM-SS.log` format
- **Winston Logger**: Configured with filters and formatters
- **Telnet Communication Logging**: 
  - `📤 SENDING to telnet: "command"` - Commands sent
  - `📥 RECEIVED from telnet: \n<response>` - Full telnet responses
- **Log Archiver**: Automatically moves logs >30 minutes old to `logs/archive/`
  - Runs on 60-second interval
  - Integrated into crawler lifecycle (starts/stops with crawler)
- **Correct Directory**: Logs saved to `crawler/logs/`

### 4. Logging System
- **Conditional Login Detection**: 
  - Checks buffer for "press enter" prompt (only appears after long logout)
  - Checks for game menu "make your choice"
  - Sends responses only when needed
- **Character Selection**: Automatically selects character #1 from menu

### 5. Smart Login System
- **API-Level Suppression**: `logBackendError()` method in `api.ts`
- **Smart Tracking**: `backendAvailable` flag tracks state
- **Rate Limiting**: Shows warning once, then silently fails for 5 minutes
- **Applied to All Methods**: saveRoom, saveNPC, saveItem, saveSpell, updateCrawlerStatus

### 6. Backend Error Handling
- **Map-Based System**: `Map<string, CommandKnowledge>` tracks all commands
- **Success/Failure Detection**: Parses responses for error messages
- **Category Organization**: exploration, combat, social, inventory, etc.
- **AI Prompt Integration**: Commands formatted as "command (✓success/✗fail)"

### 7. Command Knowledge Tracking
- **Environment Variable**: `SINGLE_TASK_MODE=true` in `crawler/.env`
- **Purpose**: AI makes ONE decision per run, then exits cleanly
- **Use Case**: Training/testing without continuous operation
- **Status**: ✅ Fully working

### 8. Single-Task Mode
- **Persistent Knowledge Base**: `ai-knowledge.md` file stores learning across sessions
- **Auto-Loading**: Loads at startup and includes in every AI decision
- **Periodic Updates**: AI updates knowledge every 50 actions
- **Session Summary**: Final knowledge update at session end
- **Knowledge Sections**:
  - Priority Commands to Try First
  - Available Game Commands (from "commands" output)
  - Discovered Commands (with success/failure stats)
  - Command Test Results (organized by category)
  - Map & Navigation (rooms and connections)
  - NPCs & Interactions
  - Items & Equipment
  - Combat & Mechanics
  - Lessons Learned
- **AI-Friendly Format**: Markdown format easy for LLM to read/write
- **Growing Intelligence**: AI builds institutional knowledge over time

### 9. AI Knowledge Management System
- **"commands" Output Capture**: Detects and parses full command list from game
- **Automatic Help Lookup**: Queues discovered commands for "help <command>" documentation
- **Database Integration**: 
  - Commands table with syntax, description, category
  - Test results tracked (input, output, success/failure, timestamp)
  - Usage statistics (count, last used)
- **Help Documentation Parser**:
  - Extracts syntax and description from "help <command>" output
  - Stores in database and knowledge base
  - Handles "no help available" gracefully
- **Command Categorization**: navigation, combat, info, inventory, social, etc.
- **Smart Injection**: Periodically injects "help" commands (20% chance when queue has items)
- **Persistent Learning**: Commands and their docs persist across sessions

### 10. Command Learning & Documentation System
- **Aggressive Loop Prevention**: Blocks commands used even ONCE in last 3 actions
- **Smart Fallback Commands**: Context-aware alternatives when repetition detected
- **Command Cleaning**: Strips explanatory text from AI responses
  - Removes "I'll...", "Let's...", sentence starters
  - Extracts commands from quotes
  - Handles multi-word commands properly
- **Prevents Stuck Loops**: No more endless "commands" repetition
- **Logged Warnings**: `⚠️ AI chose "X" but it was used N time(s) - forcing different action`

## 📊 Database Architecture

### Schema Overview
The database uses SQLite with 21 tables organized into logical groups:

#### Game Mechanics (10 tables)
- `abilities`, `ability_scores` - Character stats and their effects
- `races` - 17 playable races
- `saving_throws` - 5 save types
- `spell_modifiers` - 17 damage/effect modifiers
- `elemental_resistances` - 13 elemental types
- `physical_resistances` - 4 physical damage types
- `skills` - Learnable skills

#### Character Classes (5 tables)
- `class_groups` → `classes` → `class_proficiencies`
- `class_perks` ← `class_perk_availability` → `classes`
- Full progression system with prerequisites and level requirements

#### World Geography (3 tables)
- `zones` (74 zones) → `zone_areas` (~150 areas) 
- `zone_connections` (many-to-many, ~250 connections)

#### Navigation & Exploration (2 tables)
- `rooms` (zone_id FK, terrain, flags, visit tracking)
- `room_exits` (from_room_id, to_room_id, direction, door properties)
- Supports unidirectional and bidirectional connections

#### Dynamic Content (6 tables)
- `commands` - Discovered commands with syntax/help
- `npcs`, `items`, `spells`, `attacks` - Game entities
- `command_usage` - Command execution log
- `exploration_queue` - Planned actions
- `crawler_status` - Crawler state tracking

### Data Population Status
- ✅ **Classes**: 14 classes fully seeded with 93 proficiencies
- ✅ **Zones**: All 74 zones with areas and connections
- ✅ **Rooms**: 5 sample Midgaard rooms with 17 exits
- ⏳ **Commands**: Populated by crawler as they're discovered
- ⏳ **NPCs/Items/Spells**: Populated by crawler during exploration

## ⚠️ Current Issues (In Progress)
**Problem**: AI sometimes gets stuck repeating same command (e.g., "commands" loop)
- **Mitigation Applied**:
  - Aggressive repetition blocking (blocks if used ONCE in last 3 actions)
  - Context-aware fallback commands
  - Command cleaning to extract just the command
  - Warning logs when forced to fallback
- **Current Status**: Improved significantly, monitoring effectiveness
- **Next Steps**: May need to tune fallback logic or add cooldown periods

### ✅ RESOLVED: Issue #1: Ollama Model Name Mismatch 
**Problem**: Code requested `llama3.2` but Ollama has `llama3.2:3b` installed
- **Error**: `{"error":"model 'llama3.2' not found"}` (HTTP 404)
- **Locations Fixed**: 
  - `crawler/src/aiAgent.ts` line 18 - default parameter
  - `crawler/src/index.ts` line 33 - fallback default value
- **Fix Applied**: Changed both occurrences from `'llama3.2'` to `'llama3.2:3b'`
- **Status**: ✅ RESOLVED - Rebuilt and tested successfully

### ✅ RESOLVED: Issue #2: .env Configuration Not Loading
**Problem**: Environment variables not being read from .env file
- **Root Cause #1**: Conflicting root `.env` file vs `crawler/.env` file
- **Root Cause #2**: Wrong path in `dotenv.config()` - was looking for `../../.env` (root) instead of `../../../.env` (crawler)
- **Symptoms**: `SINGLE_TASK_MODE` showed as `undefined`, model name fell back to default
- **Fix Applied**:
  - Deleted redundant root `.env` file
  - Updated `crawler/src/index.ts` line 12: Changed path from `../../.env` to `../../../.env`
  - Ensured `crawler/.env` has `SINGLE_TASK_MODE=true`
- **Status**: ✅ RESOLVED - Environment variables now load correctly

### ✅ RESOLVED: Issue #3: Log Files in Wrong Directory
**Problem**: Logs created in root `logs/` instead of `crawler/logs/`
- **Root Cause**: Logger path `__dirname, '../../logs'` resolved to wrong location due to nested dist structure
- **Fix Applied**: Changed `crawler/src/logger.ts` line 4 from `../../logs` to `../../../logs`
- **Status**: ✅ RESOLVED - Logs now correctly created in `crawler/logs/`

### ✅ RESOLVED: Issue #4: Single-Task Mode Working Correctly
**Problem**: Initially appeared not to work, but was due to .env not loading (see Issue #2)
- **Status**: ✅ RESOLVED - Works perfectly once .env loads correctly

## 🔧 Configuration Files

### `.env` (crawler directory)
```properties
# MUD Connection
MUD_HOST=apocalypse6.com
MUD_PORT=6000
MUD_USERNAME=YourCharacterName
MUD_PASSWORD=YourPassword

# AI Provider
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b  # ✅ Corrected from llama3.2

# Backend API
BACKEND_URL=http://localhost:3002/api

# Crawler Settings
MAX_ACTIONS_PER_SESSION=100  # ✅ Set to 100 for testing, 1000 for production
DELAY_BETWEEN_ACTIONS_MS=2000
LOG_LEVEL=info
SINGLE_TASK_MODE=false  # ✅ Set to false for extended sessions
```

### `package.json` (crawler directory)
```json
{
  "scripts": {
    "start": "node dist/crawler/src/index.js",  // ⚠️ Workaround path
    "build": "tsc",
    "dev": "ts-node src/index.ts"
  }
}
```

## 📋 Next Steps (Immediate)

### ✅ MAJOR DATABASE & FRONTEND WORK COMPLETE (October 30, 2025)

**Database System**:
```
✅ 5-table class system (14 classes, 93 proficiencies, 54 perks)
✅ 3-table zone system (74 zones, ~150 areas, ~250 connections)
✅ 2-table room navigation system with directional exits
✅ All game mechanics tables (abilities, races, saves, resistances)
✅ Sample data seeded (5 Midgaard rooms, 17 exits)
✅ Generic CRUD API with query filters
```

**Frontend Admin Panel**:
```
✅ Hierarchical navigation: Zones → Zone Detail → Room Detail
✅ Zone management with full CRUD operations
✅ Room viewing with clickable zone links
✅ Room detail view with exits table
✅ Exit destinations are clickable, navigate to connected rooms
✅ Smart caching (allRooms, allZones) for fast lookups
✅ Fixed room navigation bug (was showing zones instead of rooms)
```

**GitHub Repository**:
```
✅ Repository initialized and code pushed
✅ URL: https://github.com/ninjarob/Apocalypse-VI-Web-and-Crawler
✅ Initial commit with all 61 files (12,780 lines of code)
✅ .gitignore configured properly
```

### Ready for Full Integration Testing

1. **Start Full Stack**:
   ```powershell
   # Terminal 1 - Backend
   cd "c:\work\other\Apocalypse VI MUD\backend"
   npm start
   
   # Terminal 2 - Frontend
   cd "c:\work\other\Apocalypse VI MUD\frontend"
   npm run dev
   
   # Terminal 3 - Crawler (optional)
   cd "c:\work\other\Apocalypse VI MUD\crawler"
   npm run build
   npm start
   ```

2. **Test Admin Panel**:
   - Navigate to http://localhost:3000
   - Browse zones, click to see details
   - View rooms in each zone
   - Click rooms to see full details with exits
   - Navigate between rooms via exit links
   - Test CRUD operations on classes, perks, zones

3. **Monitor Crawler Integration**:
   - Crawler will populate rooms table as it explores
   - Room exits will be created for discovered connections
   - Commands will be documented in database
   - View real-time data in admin panel

### Immediate Next Priorities

1. **Crawler Room Discovery**:
   - Implement room parsing to extract name, description, terrain
   - Auto-create room records in database
   - Parse exits and create room_exit records
   - Associate rooms with zones based on area names

2. **NPC & Item Discovery**:
   - Parse room descriptions for NPCs and items
   - Create NPC records with location tracking
   - Create item records with properties
   - Link to rooms for location-based queries

3. **Map Visualization** (Future Enhancement):
   - Generate visual map from room_exits data
   - Show zone boundaries and connections
   - Display current crawler location
   - Interactive navigation

## 🎯 Future Enhancements

### Short Term
- **AI Prompt Optimization**: Include command knowledge in AI prompt
- **Parser Improvements**: Better detection of combat, errors, item pickups
- **Command Success Detection**: More sophisticated pattern matching
- **Log Rotation**: Implement max log file size limits

### Long Term
- **Multi-Session Learning**: AI remembers lessons across runs
- **Map Building**: Track room connections and create visual map
- **Quest Detection**: Identify and track quest objectives
- **Combat Strategy**: Learn effective combat patterns
- **Item Management**: Smart inventory management
- **NPC Interaction**: Learn dialogue options and outcomes

## 🐛 Known Quirks

1. **Winston Logger Filter**: `filterBackendErrors()` in `logger.ts` doesn't fully suppress backend errors - API-level suppression works better
2. **Nested Dist Output**: Build creates `dist/crawler/src/` structure due to shared types inclusion
3. **Log Archiver Timing**: 30-minute threshold is hardcoded, could be configurable
4. **MUD Login Timing**: Conditional login detection works but adds ~5 second delay on startup

## 📚 Key Files to Reference

### Core Logic
- `crawler/src/index.ts` - Main exploration loop, help command integration (lines 185-240, 520-580)
- `crawler/src/aiAgent.ts` - Model config, command cleaning, repetition blocking (lines 27-80, 70-110)
- `crawler/src/knowledgeManager.ts` - Persistent AI knowledge, command tracking (lines 70-180)
- `crawler/src/mudClient.ts` (lines 39-46, 82-88) - Telnet logging
- `crawler/src/api.ts` - Backend error suppression, command API methods

### Configuration
- `crawler/.env` - All runtime settings
- `crawler/tsconfig.json` - TypeScript compilation config
- `crawler/src/logger.ts` - Winston logging setup

### Data Models
- `backend/src/database.ts` - SQLite database initialization and schema
- `shared/types.ts` - Shared TypeScript interfaces

## 🔗 External Dependencies

- **Ollama**: Must be running on localhost:11434
  - Check with: `ollama list` (should show llama3.2:3b)
  - Start with: `ollama serve` (if not running)
- **Backend**: Optional (crawler works independently, saves knowledge to file)
- **MUD Server**: apocalypse6.com:6000 (must be accessible)

## 🚀 Quick Start Commands

```powershell
# Start Ollama (if not running)
ollama serve

# Build crawler
cd "c:\work\other\Apocalypse VI MUD\crawler"
npm run build

# Run single-task mode test
npm start

# View latest log
Get-Content -Tail 50 (Get-ChildItem logs\combined-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName

# Start backend (optional)
cd "c:\work\other\Apocalypse VI MUD\backend"
npm start

# Start frontend (optional)
cd "c:\work\other\Apocalypse VI MUD\frontend"
npm run dev
```

---

## Summary for Next Chat Session

**Status**: ✅ MAJOR MILESTONE - DATABASE & FRONTEND COMPLETE

**What Was Completed** (October 30, 2025):
1. ✅ Comprehensive database schema (21 tables, fully normalized)
2. ✅ Class system with 14 classes, 93 proficiencies, 54 perks
3. ✅ Zone system with 74 zones, ~150 areas, ~250 connections
4. ✅ Room navigation system with directional exits
5. ✅ Frontend admin panel with hierarchical navigation
6. ✅ Zone → Zone Detail → Room Detail navigation flow
7. ✅ Room exit system with clickable destinations
8. ✅ Fixed room navigation bug (allRooms caching)
9. ✅ Generic CRUD API with query filters (id, zone_id, etc.)
10. ✅ Code pushed to GitHub repository

**Database Highlights**:
- **Classes**: 14 playable classes across 4 groups
- **Zones**: 74 fully documented zones with difficulty ratings
- **Rooms**: 5 sample Midgaard rooms with 17 directional exits
- **Perks**: 54 perks including Weapon Prof, Universal, Playstyle
- **All game mechanics**: abilities, races, saves, resistances

**Frontend Features**:
- **Entity Views**: List views for all database entities
- **Zone Detail**: Shows zone info, areas, connections, and rooms
- **Room Detail**: Full info with description, terrain, flags, exits table
- **Navigation**: Seamless clicking between zones, rooms, and connected rooms
- **Custom Fields**: zone_info_combined, zone_name_link, room_exits
- **Smart Rendering**: Clickable links throughout for intuitive browsing

**GitHub Repository**:
- URL: https://github.com/ninjarob/Apocalypse-VI-Web-and-Crawler
- Initial commit: 61 files, 12,780 lines of code
- Properly configured .gitignore
- Ready for collaborative development

**System Architecture**:
- Backend: Node.js + Express + SQLite (port 3002)
- Frontend: React + TypeScript + Vite (port 3000)
- Crawler: TypeScript + Telnet + Ollama AI
- Database: SQLite (backend/mud_data.db)

**Current Status**:
- ✅ All core infrastructure complete
- ✅ Database fully seeded with static game data
- ✅ Admin panel functional with full navigation
- ✅ Ready for crawler integration
- ✅ Code safely backed up on GitHub

**Next Focus Areas**:
1. Integrate crawler with room discovery system
2. Auto-populate rooms as crawler explores
3. Create room_exit records from discovered connections
4. Implement NPC and item discovery
5. Test full stack integration

**Configuration**:
- Database file: `backend/mud_data.db`
- Seed script: `backend/seed.js` (1,794 lines)
- Frontend port: 3000
- Backend port: 3002
- Generic routes: `backend/src/genericRoutes.js`

**No Critical Issues** - System ready for production use!

