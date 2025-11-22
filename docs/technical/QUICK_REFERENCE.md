# Quick Reference Guide

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

### ✅ Data Processing Pipeline (RECOMMENDED WORKFLOW)
```powershell
# 1. Reset database with seed data
cd backend
npm run seed

# 2. Parse exploration logs (creates rooms & exits)
cd ../crawler
npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9

# 3. Calculate geographical coordinates
cd ../backend
node calculate-coordinates.js 9

# Result: 102 rooms with coordinates, 214 exits saved
```

### 🐛 Parser Bug Investigation (RESOLVED)
**Status**: ✅ FIXED - pendingLook mechanism implemented  
**Issue**: Parser wasn't creating exits for movements from rooms observed via "look" commands  
**Solution**: Added pendingLook flag to treat observed rooms as valid current rooms  
**Verification**: North exit from "Outside the City Walls" now correctly created

```powershell
# Verify fix (should show 2 exits: north, south)
cd backend
node query-db.js "SELECT r.id, r.name, r.portal_key, GROUP_CONCAT(re.direction || ' -> ' || t.name, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id LEFT JOIN rooms t ON re.to_room_id = t.id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
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
cd backend
npm run seed

# AVOID direct sqlite3 commands - use query-db.js instead
node query-db.js "SELECT * FROM rooms LIMIT 10"
```

### Ollama Setup
```powershell
# Pull AI model (one-time)
ollama pull llama3.2:3b

# Verify Ollama is running
curl http://localhost:11434/api/tags

# List installed models
ollama list
```

### View Logs
```powershell
# Latest crawler log (tail 50 lines)
Get-Content (Get-ChildItem crawler\logs\combined-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName -Tail 50

# Watch logs in real-time
Get-Content (Get-ChildItem crawler\logs\combined-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName -Wait
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
```

## 🔍 Troubleshooting

### Crawler Won't Connect
```powershell
# Test MUD connection
telnet apocalypse6.com 6000

# Check .env credentials
notepad crawler\.env
```

### Ollama Not Responding
```powershell
# Check if running
ollama list

# Test connection
curl http://localhost:11434/api/tags

# Pull model if missing (note :3b tag!)
ollama pull llama3.2:3b
```

### Backend Won't Start
```powershell
# Check port availability
netstat -ano | findstr :3002

# Database is SQLite - no external DB needed
# Created automatically at backend/mud-data.db
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

## 📁 Important Files

| File/Directory | Purpose |
|----------------|---------|
| `crawler/ai-knowledge.md` | AI's learned knowledge |
| `crawler/logs/` | Crawler execution logs |
| `backend/mud-data.db` | SQLite database |
| `backend/seed.ts` | Database schema & seed data |
| `shared/types.ts` | TypeScript interfaces |
| `shared/entity-config.ts` | Entity configurations |

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

## 📞 Support

1. Check logs: `crawler/logs/combined-*.log`
2. Review config: `crawler/.env` and `backend/.env`
3. See docs/technical/SETUP.md for detailed configuration
4. See docs/development/DEVELOPMENT_STATUS.md for current status

## 💡 Pro Tips

- **Ollama is FREE**: No API costs, unlimited usage
- **AI updates knowledge**: Check `ai-knowledge.md` periodically
- **Parser is fast**: Manual exploration + parsing beats live crawling
- **Use --dry-run**: Test parser changes without DB writes
- **Backup database**: `Copy-Item backend\mud-data.db backup.db`
- **Pipeline works**: Seed → Parse → Calculate coordinates for reliable data processing

---

**For detailed setup**: See docs/technical/SETUP.md  
**For current dev status**: See docs/development/DEVELOPMENT_STATUS.md  
**For historical features**: See ARCHIVE.md
