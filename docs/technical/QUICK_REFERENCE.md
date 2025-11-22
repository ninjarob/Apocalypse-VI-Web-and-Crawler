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
# Get all rooms
curl "http://localhost:3002/api/rooms"

# Get rooms in zone 2
curl "http://localhost:3002/api/rooms?zone_id=2"

# Get specific room
curl "http://localhost:3002/api/rooms/123"

# Get room by name
curl "http://localhost:3002/api/rooms/by-name/The%20Temple"

# Get entity types
curl "http://localhost:3002/api/entity-types"

# Create test room
curl -X POST "http://localhost:3002/api/rooms" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Room","description":"A test","zone_id":2}'

# Update room
curl -X PUT "http://localhost:3002/api/rooms/123" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated description"}'

# Delete room
curl -X DELETE "http://localhost:3002/api/rooms/123"
```

### Ollama Setup
```powershell
# Pull AI model (one-time)
ollama pull llama3.2:3b

# Verify Ollama is running
curl http://localhost:11434/api/tags

# List installed models
ollama list

# Test AI model
curl -X POST http://localhost:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:3b","prompt":"Hello","stream":false}'
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

Direct database access (sqlite3, query-db.js, etc.) is **HIGHLY PROBLEMATIC** and should be avoided. Use the REST API instead.

**✅ ALWAYS DO THIS**:
```powershell
# Use the API - it's reliable and consistent
curl http://localhost:3002/api/rooms
curl http://localhost:3002/api/room_exits
curl http://localhost:3002/api/zones

# Or in browser
# http://localhost:3002/api/rooms
# http://localhost:3002/api/room_exits?from_room_id=123
```

**❌ NEVER DO THIS**:
```powershell
# Direct sqlite3 commands - fail with path/escaping issues
sqlite3 backend/mud-data.db "SELECT * FROM rooms"

# query-db.js script - unreliable, often gives wrong results
node backend/query-db.js "SELECT * FROM rooms"

# Any other direct database access - just don't
```

**Why?**
- Direct database access in PowerShell has path/escaping issues
- query-db.js script is unreliable and often returns incorrect data
- API is tested, consistent, and handles all edge cases properly
- API provides proper JSON formatting and error handling

### ✅ CORRECT Database Query Method (query-db.ts)
**🚨 IMPORTANT: When you MUST query the database directly, use this EXACT method:**

```powershell
# ✅ CORRECT: Use full absolute path with npx tsx
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT * FROM rooms WHERE portal_key = 'dgklmoq'"

# ✅ CORRECT: With complex queries (use double quotes around entire command)
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT r.name, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'dgklmoq' GROUP BY r.id"

# ✅ CORRECT: JSON output
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT * FROM rooms LIMIT 5" --json
```

**❌ WRONG: These methods will FAIL:**
```powershell
# ❌ FAILS: Relative path issues
npx tsx scripts/query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: cd scripts doesn't work in PowerShell context
cd scripts && npx tsx query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: npm run from scripts directory (PowerShell path issues)
cd scripts && npm run query-db -- "SELECT * FROM rooms"

# ❌ FAILS: Direct node execution
node scripts/query-db.ts "SELECT * FROM rooms"

# ❌ FAILS: Backend query-db.js (different script, unreliable)
node backend/query-db.js "SELECT * FROM rooms"
```

**✅ CORRECT Coordinate Calculation Method:**
```powershell
# ✅ CORRECT: Run from scripts directory (RECOMMENDED)
cd scripts ; npm run calculate-coordinates 9

# ✅ CORRECT: With npm run from scripts directory
npm run calculate-coordinates 9
```

**❌ WRONG: These coordinate calculation methods will FAIL:**
```powershell
# ❌ FAILS: Wrong directory (calculate-coordinates.js is in scripts/, not backend/)
cd backend ; node calculate-coordinates.js 9

# ❌ FAILS: Direct node execution
node scripts/calculate-coordinates.js 9

# ❌ FAILS: Wrong working directory
cd crawler ; npm run calculate-coordinates 9
```

**Why these methods work:**
- **query-db.ts**: Uses `npx tsx` for TypeScript execution, full absolute path prevents PowerShell path resolution issues, runs from project root where tsx can find node_modules
- **calculate-coordinates**: Must be run from `scripts/` directory where the script and package.json are located, uses npm run for proper environment setup

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
# API response time
Measure-Command { curl http://localhost:3002/api/rooms | Out-Null }

# Memory usage
Get-Process node | Select-Object Name,Id,WorkingSet

# Disk usage
Get-ChildItem -Recurse | Measure-Object -Property Length -Sum
```

### Log Analysis
```powershell
# Count errors in logs
Select-String -Path crawler\logs\*.log -Pattern "ERROR" -CaseSensitive:$false | Measure-Object

# Recent crawler activity
Get-Content crawler\logs\combined-*.log -Tail 20

# Search for specific events
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
# Check room count
curl http://localhost:3002/api/stats | jq .rooms

# Verify zone assignments
curl "http://localhost:3002/api/rooms?zone_id=2" | jq length

# Check for orphaned exits
# (Compare room IDs in exits vs rooms table)
```

## 📞 Support

1. Check logs: `crawler/logs/combined-*.log`
2. Review config: `crawler/.env` and `backend/.env`
3. See docs/technical/SETUP.md for detailed configuration
4. See docs/development/DEVELOPMENT_STATUS.md for current status
5. Check docs/technical/ARCHITECTURE.md for system understanding
6. Review docs/technical/CODE_PATTERNS.md for implementation details

## 💡 Pro Tips

- **Ollama is FREE**: No API costs, unlimited usage
- **AI updates knowledge**: Check `ai-knowledge.md` periodically
- **Parser is fast**: Manual exploration + parsing beats live crawling
- **Use --dry-run**: Test parser changes without DB writes
- **Backup database**: `Copy-Item backend\mud-data.db backup.db`
- **Pipeline works**: Seed → Parse → Calculate coordinates for reliable data processing
- **API first**: Always use REST API instead of direct database access
- **Check health**: Use `/health` endpoint for system status
- **Monitor logs**: Real-time log watching helps catch issues early
- **Version control**: Commit frequently with descriptive messages

---

**For detailed setup**: See docs/technical/SETUP.md  
**For current dev status**: See docs/development/DEVELOPMENT_STATUS.md  
**For historical features**: See ARCHIVE.md  
**For API details**: See docs/technical/BACKEND_API.md, docs/technical/FRONTEND_API.md, docs/technical/CRAWLER_API.md
