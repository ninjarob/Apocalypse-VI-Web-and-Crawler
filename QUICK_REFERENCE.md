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
**IMPORTANT**: Avoid `sqlite3` commands in PowerShell - they fail with path/escaping issues

**DO THIS**:
```powershell
# Use Node.js script
node backend/query-db.js "SELECT * FROM rooms LIMIT 5"

# Or use API
curl http://localhost:3002/api/rooms
```

**NOT THIS**:
```powershell
# ❌ This will likely fail
sqlite3 backend/mud-data.db "SELECT * FROM rooms"
```

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
3. See SETUP.md for detailed configuration
4. See DEVELOPMENT_STATUS.md for current status

## 💡 Pro Tips

- **Ollama is FREE**: No API costs, unlimited usage
- **AI updates knowledge**: Check `ai-knowledge.md` periodically
- **Parser is fast**: Manual exploration + parsing beats live crawling
- **Use --dry-run**: Test parser changes without DB writes
- **Backup database**: `Copy-Item backend\mud-data.db backup.db`

---

**For detailed setup**: See SETUP.md  
**For current dev status**: See DEVELOPMENT_STATUS.md  
**For historical features**: See ARCHIVE.md
