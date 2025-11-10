# Development Status - Apocalypse VI MUD

**Last Updated**: November 10, 2025

## 🎯 Current Focus

**Active Development**: Exit system improvements with automatic reverse exit creation

**Priority**: Proper exit linking between rooms for accurate navigation

## Project Architecture

### Core Components

- **Crawler** (`crawler/`) - Autonomous AI agent with Ollama integration
- **Backend** (`backend/`) - REST API with SQLite database
- **Frontend** (`frontend/`) - React admin interface
- **Shared** (`shared/`) - TypeScript types and utilities

### Key Services

- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:3002 (Express + SQLite)
- Ollama AI: http://localhost:11434 (Local AI models)

## ✅ Recently Completed

### Exit System Overhaul (2025-11-10)
- **Automatic Reverse Exits**: When moving north to a room, automatically creates south exit back (99% accurate)
- **Proper Exit Linking**: Fixed from_room_id and to_room_id to correctly link rooms (no more self-referencing)
- **Blocked Exit Detection**: Records exits that exist but can't be traversed (locked doors, barriers)
- **Direction Helper**: Utility for opposite direction mapping (n↔s, e↔w, u↔d, ne↔sw, etc.)
- **Room Key Tracking**: Maintains consistent room keys when portal binding updates from namedesc: to portal:
- **Exit Deduplication**: Handles duplicate attempts gracefully with database constraints

**Key Assumptions Implemented:**
1. If movement attempt shows new room, create bidirectional exits (both directions)
2. If movement blocked but direction exists, record as blocked exit (unlinked until passable)

**Results:** 162 working exits from 68 rooms in test parse (2.4 exits/room average)

### MUD Log Parser (2025-11-10)
- Fixed room deduplication using portal keys and full descriptions
- Fixed zone detection to handle colons in zone names
- Portal key extraction working (6+ character keys)
- Cross-zone room assignment validated
- 68 rooms + 19 exits saved successfully from test log

### Character Maintenance System (2025-11-06)
- Automated rest/wake cycle for mana restoration
- Hunger/thirst management with fountain navigation
- Stats parsing with ANSI code stripping
- Integration with room graph navigation crawler

### Room Graph Navigation (2025-11-05)
- Graph-based navigation using actual room connections
- BFS pathfinding between known rooms
- Connection tracking (explored vs unexplored)
- Zone boundary respect with automatic backtracking

### Admin Panel Features (2025-10-31)
- Full CRUD for rooms with exit binding
- Portal key configuration (lesser/greater binding)
- Zone-specific room creation
- Inline editing in room detail views

## 🔄 In Progress

### RoomProcessor Exit Logic
- Need to update checkAllDirections() to use new blocked exit detection
- Integrate with live crawler for real-time exit discovery

### Crawler Enhancements
- Portal key caching to reduce redundant binding attempts
- Position sync optimization (every 5 actions vs every action)
- Exit caching system to avoid duplicate queries
- Strategic exploration pathfinding improvements

## 📋 Immediate Next Steps

1. **Test Exit Navigation** - Verify crawler can use new exit data for pathfinding
2. **Update RoomProcessor** - Apply blocked exit logic to live crawler
3. **Cross-Zone Exploration** - Enhanced zone boundary handling with proper exit tracking
4. **Performance Testing** - Validate exit queries are efficient for navigation

## Known Issues

### Minor
- Some MUD text parsing edge cases need refinement
- AI decision making can occasionally loop (has anti-repetition)

### Resolved
- ✅ Portal key duplicate prevention
- ✅ Zone name parsing with colons
- ✅ Room description truncation
- ✅ Exit destination saving

## Development Commands

```powershell
# Start all services
.\start.ps1

# Crawl with new zone mapper
cd crawler
npm run crawl:document-zone-new

# Seed database
cd backend
npm run seed

# Parse MUD logs
cd crawler
npx tsx parse-logs.ts "sessions/logfile.txt" --zone-id 2
```

## Configuration

**Crawler**: `crawler/.env`
- MUD connection settings
- Ollama AI configuration
- Action limits and delays

**Backend**: `backend/.env`
- Server port (3002)
- Environment settings

## Architecture Notes

### Room Identification
- Portal keys (primary) - unique 6+ letter keys from bind portal
- Name + description (fallback) - for rooms without portals
- Coordinates - relative x,y,z for spatial reference

### Navigation Strategy
- Graph-based using actual connections (not coordinates)
- BFS pathfinding for efficient route finding
- Connection state tracking (mapped vs unmapped)
- Zone boundary detection and respect

### Character Maintenance
- Mana: Rest when < 20M, wake at 150M+
- Hunger/Thirst: Check every 50 actions
- Local first: Drink bladder/eat bread before navigating
- Fountain: Navigate to Market Square only when needed

## Documentation Structure

- **README.md** - Project overview and quick start
- **SETUP.md** - Detailed installation guide
- **QUICK_REFERENCE.md** - Common commands and troubleshooting
- **DEVELOPMENT_STATUS.md** - This file (current status)
- **ARCHIVE.md** - Historical features and implementations
- **docs/** - Technical documentation (database, schemas)

## Testing Guidelines

1. Start with small test runs (50 actions)
2. Monitor logs in `crawler/logs/`
3. Verify room/exit saving in database
4. Check position sync and navigation accuracy
5. Review AI decisions in detailed logs

---

*For complete feature history and implementation details, see [ARCHIVE.md](ARCHIVE.md)*

*For common commands and troubleshooting, see [QUICK_REFERENCE.md](QUICK_REFERENCE.md)*
