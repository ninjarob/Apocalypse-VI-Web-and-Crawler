# Quick Reference Guide

## 🤖 AI Agent Section

### Context Preservation
**CRITICAL**: Always read these before starting work:
1. `docs/development/AI_AGENT_REFERENCE.md` - Current objectives and commands
2. Top of `docs/development/DEVELOPMENT_STATUS.md` - AI context summary
3. `docs/development/SESSION_HANDOFF.md` - Latest session context

### Session Documentation
**MANDATORY**: After completing work:
1. Update `docs/development/DEVELOPMENT_STATUS.md` with changes
2. Update `docs/development/SESSION_HANDOFF.md` using the template
3. Include test commands and next steps

### Current Investigation (Parser Bug)
**Objective**: Fix spurious west exit from cfhilnoq to lnoq  
**Test Command**:
```powershell
cd scripts ; npm run seed ; npm run parse-logs "sessions/Exploration - Astyll Hills.txt" --zone-id 9 ; npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```
**Expected**: `cfhilnoq` exits = 'north, south' (no 'west')

---

## 🚀 Starting the System

```powershell
# Automated (Recommended)
.\start.ps1

# Manual (3 terminals needed)
cd backend && npm run dev    # Terminal 1
cd frontend && npm run dev   # Terminal 2
cd crawler && npm run dev    # Terminal 3
```

## 📊 Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Web interface |
| Backend API | http://localhost:3002/api | REST API |
| Ollama | http://localhost:11434 | Local AI |

## 🔧 Common Commands

### ⚡ RELIABLE COMMAND PATTERNS (Windows PowerShell)
**🚨 IMPORTANT**: These patterns are tested and work reliably in Windows PowerShell. Use them to avoid command failures:

**✅ RELIABLE PATTERNS:**
```powershell
# ✅ Data Processing (RECOMMENDED - from scripts directory)
cd scripts ; npm run seed
cd scripts ; npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9
cd scripts ; npm run calculate-coordinates 9

# ✅ Database Queries (RECOMMENDED - full absolute path)
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT * FROM rooms LIMIT 5"

# ✅ API Calls (PowerShell native - no external tools needed)
Invoke-RestMethod "http://localhost:3002/api/rooms"
Invoke-RestMethod "http://localhost:3002/api/stats"

# ✅ Export Room Data to JSON Files (for seed script)
Invoke-WebRequest -Uri "http://localhost:3002/api/rooms?zone_id=9" -OutFile "data/rooms_for_zone_9.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/room_exits?zone_id=9" -OutFile "data/room_exits_for_zone_9.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/rooms?zone_id=12" -OutFile "data/rooms_for_zone_12.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/room_exits?zone_id=12" -OutFile "data/room_exits_for_zone_12.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/rooms?zone_id=2" -OutFile "data/rooms_for_zone_2.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/room_exits?zone_id=2" -OutFile "data/room_exits_for_zone_2.json"

# ✅ File Operations (PowerShell native)
Get-Content crawler\logs\combined-*.log -Tail 20
Select-String -Path crawler\logs\*.log -Pattern "ERROR"
Copy-Item backend\mud-data.db "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').db"

# ✅ Process Management (PowerShell native)
Get-Process node
Stop-Process -Name node -Force
```

**❌ AVOID THESE PATTERNS (They Fail in PowerShell):**
```powershell
# ❌ FAILS: jq command (not available in Windows)
curl http://localhost:3002/api/stats | jq .rooms

# ❌ FAILS: Relative paths with npx tsx
npx tsx scripts/query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: cd && command chaining
cd scripts && npx tsx query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: Direct node execution
node scripts/query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: Unix-style curl with complex options
curl -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d '{"prompt":"test"}'
```

### ⚡ PRIORITY: Auto-Approved Commands (VS Code Settings)
**🚨 IMPORTANT**: When running commands in VS Code, prioritize the **auto-approved versions** configured in your settings.json. These commands are pre-approved and will execute without additional prompts:

**Auto-Approved Commands Include:**
- `npm install`, `npx` commands
- `npm run build`, `pm2 restart` commands  
- `npm run crawl:*` scripts
- `npm run seed`, `npm run parse-logs`
- `node calculate-coordinates.js` (with zone IDs)
- `node query-db.ts` (with full absolute paths)
- `cd backend ; node calculate-coordinates.js`
- `cd crawler ; node parse-logs.ts`
- And many more - see your VS Code settings.json for the complete list

**✅ RECOMMENDED: Use these auto-approved patterns:**
```powershell
# ✅ Auto-approved: Full absolute path for query-db.ts
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT * FROM rooms WHERE portal_key = 'dgklmoq'"

# ✅ Auto-approved: Scripts directory commands (RECOMMENDED)
cd scripts ; npm run seed
cd scripts ; npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9
cd scripts ; npm run calculate-coordinates 9

# ✅ Auto-approved: NPM scripts
npm run seed
npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9
npm run calculate-coordinates 9
```

### ✅ Data Processing Pipeline (RECOMMENDED WORKFLOW)
```powershell
# 1. Reset database with seed data
cd scripts
npm run seed

# 2. Parse exploration logs (creates rooms & exits)
npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9

# 3. Calculate geographical coordinates
npm run calculate-coordinates 9

# Result: 102 rooms with coordinates, 214 exits saved
```

#### 📋 Data Processing Pipeline - Complete Guide

The data processing pipeline converts raw MUD exploration logs into structured, geographically-positioned room data. This three-step process is essential for populating the database with accurate room, exit, and coordinate information.

##### Step 1: Database Seeding (`npm run seed`)

**Purpose**: Initializes the database with reference data and schema, preparing it for room data.

**What it does**:
- Creates all database tables (rooms, exits, items, classes, races, etc.)
- Seeds reference data (terrains, flags, classes, races, spells, etc.)
- Optionally seeds room data (can be skipped with `SKIP_ROOMS_SEEDING=true`)

**Options**:
- `SKIP_ROOMS_SEEDING=true`: Skip seeding room data (useful when rooms come from parsing logs)
- Default: Seeds everything including reference data

**Example Commands**:
```powershell
# Full seed (includes reference data and any existing rooms)
cd scripts ; npm run seed

# Skip room seeding (for log parsing workflow)
$env:SKIP_ROOMS_SEEDING="true" ; cd scripts ; npm run seed
```

**Output**: Lists counts of seeded entities (abilities, races, classes, zones, etc.)

##### Step 2: Log Parsing (`npm run parse-logs <log-file> --zone-id <id>`)

**Purpose**: Parses raw MUD session logs to extract room and exit information.

**What it does**:
- Reads exploration log files containing MUD session output
- Extracts room titles, descriptions, and exit information
- Creates room and room_exit records in database
- Detects zone transitions and marks zone exit rooms
- Associates rooms with portal keys for navigation

**Required Parameters**:
- `<log-file>`: Path to the exploration log file (e.g., `"../scripts/sessions/Exploration - Astyll Hills.txt"`)
- `--zone-id <id>`: Zone ID to assign parsed rooms to (e.g., `9` for Astyll Hills)

**Optional Parameters**:
- `--export <file>`: Export parsed data to JSON file for review
- `--dry-run`: Parse and show stats only, don't save to database

**Example Commands**:
```powershell
# Parse and save to database
cd scripts ; npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9

# Parse and export to JSON for review
cd scripts ; npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9 --export astyll-review.json --dry-run

# Parse and both save and export
cd scripts ; npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9 --export astyll-data.json
```

**Log File Requirements**:
- Raw MUD session output with ANSI color codes
- Room titles in bold cyan (`\u001b[1m\u001b[36mRoom Name\u001b[0m`)
- Exit lists in format: `Obvious Exits: north, east, south, west`
- Movement commands and responses
- Zone transitions (detected by `who -z` command output)

**Output**: Shows parsing statistics (rooms found, exits created, zone exits marked)

##### Step 3: Coordinate Calculation (`npm run calculate-coordinates <zone-id>`)

**Purpose**: Calculates geographical coordinates for rooms based on their exit connections.

**What it does**:
- Analyzes room exit connections to determine relative positions
- Assigns X,Y coordinates using graph layout algorithms
- Handles multi-level areas (up/down transitions)
- Applies collision avoidance to prevent overlapping rooms
- Uses configurable spacing (150px horizontal, 105px vertical by default)

**Required Parameters**:
- `<zone-id>`: Zone ID to calculate coordinates for (e.g., `9`)

**Coordinate System**:
- Origin (0,0,0) is the starting room
- North = negative Y (moves up on screen)
- South = positive Y (moves down on screen)
- East = positive X (moves right)
- West = negative X (moves left)
- Up/Down create sub-levels with vertical offsets

**Example Commands**:
```powershell
# Calculate coordinates for Astyll Hills (zone 9)
cd scripts ; npm run calculate-coordinates 9

# Calculate coordinates for Midgaard City (zone 2)
cd scripts ; npm run calculate-coordinates 2
```

**Output**: Shows coordinate ranges and room counts processed

#### 🔄 Complete Pipeline Example

```powershell
# Astyll Hills Zone 9 Processing
cd scripts

# 1. Seed database (skip rooms since they'll come from parsing)
$env:SKIP_ROOMS_SEEDING="true" ; npm run seed

# 2. Parse exploration log
npm run parse-logs "../scripts/sessions/Exploration - Astyll Hills.txt" --zone-id 9

# 3. Calculate coordinates
npm run calculate-coordinates 9

# Result: Zone 9 ready with rooms, exits, and coordinates
```

#### 💾 Exporting Room Data to JSON Files

After parsing and calculating coordinates, you can export the room data back to JSON files for the seed script:

```powershell
# Export all zones at once
cd "c:\work\other\Apocalypse VI MUD"

Invoke-WebRequest -Uri "http://localhost:3002/api/rooms?zone_id=9" -OutFile "data/rooms_for_zone_9.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/room_exits?zone_id=9" -OutFile "data/room_exits_for_zone_9.json"

Invoke-WebRequest -Uri "http://localhost:3002/api/rooms?zone_id=12" -OutFile "data/rooms_for_zone_12.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/room_exits?zone_id=12" -OutFile "data/room_exits_for_zone_12.json"

Invoke-WebRequest -Uri "http://localhost:3002/api/rooms?zone_id=2" -OutFile "data/rooms_for_zone_2.json"
Invoke-WebRequest -Uri "http://localhost:3002/api/room_exits?zone_id=2" -OutFile "data/room_exits_for_zone_2.json"

# Result: 6 JSON files exported with fresh data including coordinates
```

**Use Case**: After reprocessing exploration logs, export the data so the seed script can load it in future database rebuilds.

**API Endpoints**:
- `GET /api/rooms?zone_id=<id>` - Returns all rooms for a zone
- `GET /api/room_exits?zone_id=<id>` - Returns all exits for rooms in a zone

#### Zone Alias System (Automatic Zone Detection)

**Purpose**: Automatically detects zone transitions during parsing using zone aliases, eliminating manual zone corrections.

**How it works**:
- Parser reads zone names from `who -z` commands in exploration logs
- Matches zone names against both primary names and aliases in database
- Automatically assigns rooms to correct zones during parsing
- Prevents zone misassignment (e.g., Juris rooms going to Haunted Forest)

**Zone Alias Configuration**:
- Stored in `scripts/seed.ts` in zone definitions
- Example: Zone 47 "Juris" has alias "Juris, The City of Law"
- Allows parser to recognize zone references in various formats

**Benefits**:
- ✅ Automatic zone assignment during log parsing
- ✅ Eliminates manual database corrections
- ✅ Handles zone name variations in logs
- ✅ Maintains zone boundary integrity

**Example Zone Detection**:
```
🗺️  Zone detected: "Juris, The City of Law" (current: "Haunted Forest")
🗺️  Zone change detected: Haunted Forest → Juris, The City of Law
🔀 Zone exit (different zone): The West Gate of Juris (Zone 47: Juris, The City of Law)
```

**Adding New Zone Aliases**:
1. Edit `scripts/seed.ts` zone definitions
2. Add `alias: "Zone Name Variation"` to zone object
3. Re-seed database: `npm run seed`
4. Re-parse logs for automatic zone assignment

#### 🐛 Troubleshooting Data Processing

**Parser Issues**:
- **No rooms found**: Check log file format and ANSI color codes
- **Zone not detected**: Ensure `who -z` commands are in the log
- **Missing exits**: Verify exit format matches expected pattern

**Coordinate Issues**:
- **Overlapping rooms**: Check collision avoidance settings in script
- **Disconnected areas**: Ensure all rooms are connected via exits
- **Wrong positioning**: Verify starting room and exit directions

**Database Issues**:
- **Foreign key errors**: Ensure zones exist before parsing
- **Duplicate rooms**: Check for existing rooms with same portal keys
- **Missing reference data**: Run full seed without SKIP_ROOMS_SEEDING

**Verification Commands**:
```powershell
# Check zone data
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT COUNT(*) as rooms FROM rooms WHERE zone_id = 9"

# Check coordinates
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT MIN(x) as min_x, MAX(x) as max_x, MIN(y) as min_y, MAX(y) as max_y FROM rooms WHERE zone_id = 9 AND x IS NOT NULL"

# Check exits
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT COUNT(*) as exits FROM room_exits re JOIN rooms r ON re.from_room_id = r.id WHERE r.zone_id = 9"
```

#### 📊 Expected Results by Zone

| Zone | Zone ID | Expected Rooms | Notes |
|------|---------|----------------|-------|
| Midgaard City | 2 | ~119 | Central hub, well explored |
| Astyll Hills | 9 | ~100 | Northern hills, cave system |
| Haunted Forest | 12 | ~50-70 | Eastern forest area |
| Dwarven Kingdom | 11 | ~80-100 | Mountain caverns |

#### 🔧 Advanced Options

**Custom Coordinate Spacing**:
Edit `scripts/calculate-coordinates.ts` to adjust:
```typescript
const NODE_WIDTH = 150;   // Horizontal spacing
const NODE_HEIGHT = 105; // Vertical spacing
```

**Zone Detection**:
The parser auto-detects zones from logs but can be overridden with `--zone-id`.

**Export/Import**:
Use `--export` for reviewing parsed data before database commit, useful for validation.

### 📋 Reference Data Management
**Full Guide**: See `docs/technical/REFERENCE_DATA_MANAGEMENT.md`

```powershell
# View all entity types (room types, classes, races, etc.)
curl http://localhost:3002/api/entity-types

# Get all room terrains
curl http://localhost:3002/api/room_terrains

# Add new room terrain
curl -X POST "http://localhost:3002/api/room_terrains" \
  -H "Content-Type: application/json" \
  -d '{"name":"Volcano","description":"Lava-filled volcanic terrain"}'

# Get all character classes
curl http://localhost:3002/api/classes

# Add new character class
curl -X POST "http://localhost:3002/api/classes" \
  -H "Content-Type: application/json" \
  -d '{"name":"Necromancer","description":"Master of death magic"}'

# Get all races
curl http://localhost:3002/api/races

# Add new race
curl -X POST "http://localhost:3002/api/races" \
  -H "Content-Type: application/json" \
  -d '{"name":"Elf","description":"Graceful forest dwellers"}'

# Update existing entity
curl -X PUT "http://localhost:3002/api/room_terrains/1" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'

# Delete entity (use with caution!)
curl -X DELETE "http://localhost:3002/api/room_terrains/1"
```

### 🐛 Parser Bug Investigation (RESOLVED)
**Status**: ✅ FIXED - pendingLook mechanism implemented  
**Issue**: Parser wasn't creating exits for movements from rooms observed via "look" commands  
**Solution**: Added pendingLook flag to treat observed rooms as valid current rooms  
**Verification**: North exit from "Outside the City Walls" now correctly created

```powershell
# Verify fix (should show 2 exits: north, south)
cd scripts ; npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT r.id, r.name, r.portal_key, GROUP_CONCAT(re.direction || ' -> ' || t.name, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id LEFT JOIN rooms t ON re.to_room_id = t.id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```

### Crawler Operations
```powershell
# NEW coordinate-based zone mapper (RECOMMENDED)
npm run crawl:document-zone-new

# Parse MUD session logs
npx tsx parse-logs.ts "sessions/log.txt" --zone-id 2

# Dry run (no database save)
npx tsx parse-logs.ts "sessions/log.txt" --dry-run --export output.json
```

### Database Operations
```powershell
# Seed/reset database
# ⚠️  IMPORTANT: This will COMPLETELY RESET the database with seeded data!
cd scripts
npm run seed

# Skip room seeding (for testing or when rooms come from crawler)
$env:SKIP_ROOMS_SEEDING="true" ; cd scripts ; npm run seed

# AVOID direct sqlite3 commands - use query-db.js instead
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT * FROM rooms LIMIT 10"
```

### Development Workflow
```powershell
# Start all services (3 terminals)
.\start.ps1

# Check system health
curl http://localhost:3002/health

# API statistics
curl http://localhost:3002/api/stats

# Test frontend build
cd frontend && npm run build

# Run backend tests (when available)
cd backend && npm test

# Format code
cd backend && npm run lint
cd frontend && npm run lint
```

### API Testing & Debugging
```powershell
# Get all rooms (PowerShell native)
Invoke-RestMethod "http://localhost:3002/api/rooms"

# Get rooms in zone 2 (PowerShell native)
Invoke-RestMethod "http://localhost:3002/api/rooms?zone_id=2"

# Get specific room (PowerShell native)
Invoke-RestMethod "http://localhost:3002/api/rooms/123"

# Get room by name (PowerShell native)
Invoke-RestMethod "http://localhost:3002/api/rooms/by-name/The%20Temple"

# Get entity types (PowerShell native)
Invoke-RestMethod "http://localhost:3002/api/entity-types"

# Create test room (PowerShell native)
Invoke-RestMethod -Method Post -Uri "http://localhost:3002/api/rooms" -Body '{"name":"Test Room","description":"A test","zone_id":2}' -ContentType "application/json"

# Update room (PowerShell native)
Invoke-RestMethod -Method Put -Uri "http://localhost:3002/api/rooms/123" -Body '{"description":"Updated description"}' -ContentType "application/json"

# Delete room (PowerShell native)
Invoke-RestMethod -Method Delete -Uri "http://localhost:3002/api/rooms/123"
```

### Ollama Setup
```powershell
# Pull AI model (one-time)
ollama pull llama3.2:3b

# Verify Ollama is running
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Test AI model (PowerShell native)
Invoke-RestMethod -Method Post -Uri "http://localhost:11434/api/generate" -Body '{"model":"llama3.2:3b","prompt":"Hello","stream":false}' -ContentType "application/json"
```

### View Logs
```powershell
# Latest crawler log (tail 50 lines)
Get-Content (Get-ChildItem crawler\logs\combined-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName -Tail 50

# Watch logs in real-time
Get-Content (Get-ChildItem crawler\logs\combined-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName -Wait

# Search logs for errors
Select-String -Path crawler\logs\*.log -Pattern "ERROR" -CaseSensitive:$false

# Backend logs (if using file logging)
Get-Content backend\logs\*.log -Tail 20
```

### File Operations
```powershell
# Backup database
Copy-Item backend\mud-data.db "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss').db"

# Clean build artifacts
cd frontend && Remove-Item -Recurse -Force dist,node_modules/.vite
cd backend && Remove-Item -Recurse -Force dist
cd crawler && Remove-Item -Recurse -Force dist

# Reset all node_modules
Remove-Item -Recurse -Force **/node_modules
npm install

# Check disk usage
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum
```

## ⚙️ Configuration

### Crawler (.env)
```env
# MUD Connection
MUD_HOST=apocalypse6.com
MUD_PORT=6000
MUD_USERNAME=YourCharacter
MUD_PASSWORD=YourPassword

# AI (Ollama - Local & Free!)
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Backend API
BACKEND_URL=http://localhost:3002/api

# Limits
MAX_ACTIONS_PER_SESSION=1000
DELAY_BETWEEN_ACTIONS_MS=2000
```

### Backend (.env)
```env
PORT=3002
NODE_ENV=development
DATABASE_PATH=./mud-data.db
```

### Frontend (vite.config.ts)
```typescript
// Development proxy to backend
server: {
  proxy: {
    '/api': 'http://localhost:3002'
  }
}
```

## 🔍 Troubleshooting

### Crawler Won't Connect
```powershell
# Test MUD connection
telnet apocalypse6.com 6000

# Check .env credentials
notepad crawler\.env

# Test with verbose logging
cd crawler && DEBUG=* npm run dev
```

### Ollama Not Responding
```powershell
# Check if running
ollama list

# Test connection
curl http://localhost:11434/api/tags

# Pull model if missing (note :3b tag!)
ollama pull llama3.2:3b

# Restart Ollama service
ollama serve
```

### Backend Won't Start
```powershell
# Check port availability
netstat -ano | findstr :3002

# Kill process using port
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess

# Check database file
Test-Path backend\mud-data.db

# Reinitialize database
cd backend && npm run seed
```

### Frontend Build Issues
```powershell
# Clear cache and rebuild
cd frontend
Remove-Item -Recurse -Force node_modules/.vite
npm run build

# Check for TypeScript errors
npx tsc --noEmit

# Verify API connectivity
curl http://localhost:3002/api/stats
```

### Database Access Issues
**🚨 CRITICAL: USE THE API, NOT DIRECT DATABASE QUERIES 🚨**

Direct database access in PowerShell is **HIGHLY PROBLEMATIC** due to path escaping and environment issues. Always use the REST API instead.

**✅ ALWAYS USE THE API (RECOMMENDED)**:
```powershell
# Use the API - it's reliable and consistent
curl http://localhost:3002/api/rooms
curl http://localhost:3002/api/room_exits
curl http://localhost:3002/api/zones

# Or in browser: http://localhost:3002/api/rooms
# Or with PowerShell: Invoke-RestMethod "http://localhost:3002/api/rooms"
```

**Why the API is better:**
- ✅ Tested, consistent, and handles all edge cases properly
- ✅ Proper JSON formatting and error handling
- ✅ No path/escaping issues in PowerShell
- ✅ Works reliably across different environments
- ✅ Supports filtering (e.g., `?zone_id=2`)

### ✅ CORRECT Database Query Method (When API Won't Work)
**🚨 IMPORTANT: Only use direct database queries when the API cannot provide the needed data. Use this EXACT method:**

```powershell
# ✅ CORRECT: Use full absolute path with npx tsx (RECOMMENDED)
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT * FROM rooms WHERE portal_key = 'dgklmoq'"

# ✅ CORRECT: With complex queries (use double quotes around entire command)
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT r.name, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'dgklmoq' GROUP BY r.id"

# ✅ CORRECT: JSON output for PowerShell processing
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT * FROM rooms LIMIT 5" --json
```

**❌ PROBLEMATIC METHODS (Will Fail in PowerShell):**
```powershell
# ❌ FAILS: Relative path issues
npx tsx scripts/query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: cd scripts doesn't work in PowerShell context
cd scripts && npx tsx query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: npm run from scripts directory (PowerShell path issues)
cd scripts && npm run query-db -- "SELECT * FROM rooms"

# ❌ FAILS: Direct node execution (missing dependencies)
node scripts/query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: Backend query-db.js (different script, unreliable)
node backend/query-db.js "SELECT * FROM rooms"

# ❌ FAILS: Direct sqlite3 commands (path/escaping issues)
sqlite3 backend/mud-data.db "SELECT * FROM rooms"
```

**Why the correct method works:**
- **query-db.ts**: Uses `npx tsx` for TypeScript execution, full absolute path prevents PowerShell path resolution issues, runs from project root where tsx can find node_modules

## 📁 Important Files

| File/Directory | Purpose |
|----------------|---------|
| `crawler/ai-knowledge.md` | AI's learned knowledge |
| `crawler/logs/` | Crawler execution logs |
| `backend/mud-data.db` | SQLite database |
| `backend/seed.ts` | Database schema & seed data |
| `shared/types.ts` | TypeScript interfaces |
| `shared/entity-config.ts` | Entity configurations |
| `docs/index.md` | Documentation navigation |
| `docs/technical/ARCHITECTURE.md` | System architecture |
| `docs/technical/CODE_PATTERNS.md` | Code conventions |

## 🎯 Quick Tasks

### Explore a Zone
```powershell
cd crawler
npm run crawl:document-zone-new
```

### Parse Manual Exploration
```powershell
# 1. Manually explore MUD and save session log
# 2. Parse the log file
cd crawler
npx tsx parse-logs.ts "sessions/yourlog.txt" --zone-id 2
```

### Adjust Crawler Speed
Edit `crawler/.env`:
```env
DELAY_BETWEEN_ACTIONS_MS=1000  # Faster (1 second)
DELAY_BETWEEN_ACTIONS_MS=5000  # Slower (5 seconds)
```

### View AI Knowledge
```powershell
notepad crawler\ai-knowledge.md
# Updates every 50 actions
```

### Database Queries (via API)
```powershell
# Get zone information
curl "http://localhost:3002/api/zones"

# Get rooms with exits
curl "http://localhost:3002/api/rooms?zone_id=2&_include=exits"

# Search player actions
curl "http://localhost:3002/api/player_actions?type=command"
```

### Development Shortcuts
```powershell
# Kill all Node processes
Stop-Process -Name node -Force

# Find what's using a port
Get-NetTCPConnection -LocalPort 3002 | Select-Object LocalPort,OwningProcess

# Clean and restart
.\start.ps1

# Check Git status
git status --short

# Quick commit
git add . && git commit -m "Quick update"
```

## 📊 Monitoring & Metrics

### System Health
```powershell
# Backend health
curl http://localhost:3002/health

# API statistics
curl http://localhost:3002/api/stats

# Database size
(Get-Item backend\mud-data.db).Length / 1MB
```

### Performance Checks
```powershell
# API response time (PowerShell native)
Measure-Command { Invoke-RestMethod "http://localhost:3002/api/rooms" | Out-Null }

# Memory usage (PowerShell native)
Get-Process node | Select-Object Name,Id,WorkingSet

# Disk usage (PowerShell native)
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum
```

### Log Analysis
```powershell
# Count errors in logs (PowerShell native)
Select-String -Path crawler\logs\*.log -Pattern "ERROR" -CaseSensitive:$false | Measure-Object

# Recent crawler activity (PowerShell native)
Get-Content crawler\logs\combined-*.log -Tail 20

# Search for specific events (PowerShell native)
Select-String -Path crawler\logs\*.log -Pattern "room.*saved" -CaseSensitive:$false
```

## 🔄 Data Management

### Backup & Restore
```powershell
# Create timestamped backup
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
Copy-Item backend\mud-data.db "backup-$timestamp.db"

# Restore from backup
Copy-Item backup-20250123-143000.db backend\mud-data.db
```

### Data Export
```powershell
# Export rooms to JSON
curl http://localhost:3002/api/rooms > rooms.json

# Export player actions
curl http://localhost:3002/api/player_actions > actions.json

# Export all data
curl http://localhost:3002/api/stats > stats.json
```

### Data Validation
```powershell
# Check room count (PowerShell native - no external tools needed)
(Invoke-RestMethod "http://localhost:3002/api/stats").rooms

# Verify zone assignments (PowerShell native)
(Invoke-RestMethod "http://localhost:3002/api/rooms?zone_id=2").Count

# Check for orphaned exits (use query-db.ts for complex queries)
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT COUNT(*) as orphaned FROM room_exits re LEFT JOIN rooms r ON re.from_room_id = r.id WHERE r.id IS NULL"
```

## 📞 Support

1. Check logs: `crawler/logs/combined-*.log`
2. Review config: `crawler/.env` and `backend/.env`
3. See docs/technical/SETUP.md for detailed configuration
4. See docs/development/DEVELOPMENT_STATUS.md for current status
5. Check docs/technical/ARCHITECTURE.md for system understanding
6. Review docs/technical/CODE_PATTERNS.md for implementation details

## 💡 Pro Tips

- **Use PowerShell Native Commands**: Prefer `Invoke-RestMethod`, `Get-Content`, `Select-String` over Unix tools like `jq`, `tail`, `grep`
- **Full Absolute Paths**: Always use full absolute paths with `npx tsx` commands to avoid PowerShell path resolution issues
- **Scripts Directory**: Run data processing commands from the `scripts/` directory for reliable npm script execution
- **API First**: Always use REST API instead of direct database access - it's more reliable in PowerShell
- **Ollama is FREE**: No API costs, unlimited usage
- **AI updates knowledge**: Check `ai-knowledge.md` periodically
- **Parser is fast**: Manual exploration + parsing beats live crawling
- **Use --dry-run**: Test parser changes without DB writes
- **Backup database**: `Copy-Item backend\mud-data.db backup.db`
- **Pipeline works**: Seed → Parse → Calculate coordinates for reliable data processing
- **Check health**: Use `/health` endpoint for system status
- **Monitor logs**: Real-time log watching helps catch issues early
- **Version control**: Commit frequently with descriptive messages

---

**For detailed setup**: See docs/technical/SETUP.md  
**For current dev status**: See docs/development/DEVELOPMENT_STATUS.md  
**For historical features**: See ARCHIVE.md  
**For API details**: See docs/technical/BACKEND_API.md, docs/technical/FRONTEND_API.md, docs/technical/CRAWLER_API.md
