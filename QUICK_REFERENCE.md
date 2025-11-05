# Quick Reference Guide

## 🚀 Starting the System

### Method 1: Automated Start (Recommended)
```powershell
.\start.ps1
```
This opens 3 terminal windows automatically.

### Method 2: Manual Start
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev

# Terminal 3 - Crawler
cd crawler
npm run dev
```

## 🔧 Configuration Files

### Crawler Settings
**File:** `crawler\.env`
```env
# MUD Connection
MUD_HOST=apocalypse6.com
MUD_PORT=6000
MUD_USERNAME=YourCharacterName
MUD_PASSWORD=YourPassword

# AI Provider (Ollama - Local & Free!)
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Backend API (Optional)
BACKEND_URL=http://localhost:3002/api

# Crawler Settings
MAX_ACTIONS_PER_SESSION=100
DELAY_BETWEEN_ACTIONS_MS=2000
LOG_LEVEL=info
SINGLE_TASK_MODE=false
```

**Note:** Ollama runs locally - no API keys needed!

### Backend Settings
**File:** `backend\.env`
```env
PORT=3002
NODE_ENV=development
# SQLite database created automatically at backend/mud-data.db
```

## 📊 Accessing Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | Web interface (Vite dev server) |
| Backend API | http://localhost:3002/api | REST API |
| Ollama | http://localhost:11434 | Local AI (llama3.2:3b) |

## 🛠️ Common Commands

### Install Dependencies
```powershell
.\install.ps1
```

### Check Ollama
```powershell
# List installed models
ollama list

# Test Ollama is running
curl http://localhost:11434/api/tags

# Pull required model
ollama pull llama3.2:3b
```
```powershell
# Crawler logs (timestamped files)
Get-Content "crawler\logs\combined-*.log" | Select-Object -Last 50

# Latest log file
Get-Content (Get-ChildItem crawler\logs\combined-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName -Tail 50

# Watch logs in real-time
Get-Content (Get-ChildItem crawler\logs\combined-*.log | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName -Wait

# Check archived logs
Get-ChildItem crawler\logs\archive\
```

## 📁 Important Files
```

### Check Ollama
```powershell
# List installed models
ollama list

# Test Ollama is running
curl http://localhost:11434/api/tags

# Pull required model
ollama pull llama3.2:3b
```

### View Logs

| File | Purpose |
|------|---------|
| `crawler/src/index.ts` | Main crawler loop, help integration |
| `crawler/src/aiAgent.ts` | Ollama AI decision-making |
| `crawler/src/parser.ts` | Text parsing logic |
| `crawler/src/knowledgeManager.ts` | Persistent AI knowledge |
| `crawler/ai-knowledge.md` | AI's learned knowledge |
| `backend/src/routes.ts` | API endpoints |
| `backend/src/database.ts` | SQLite schema & initialization |
| `frontend/src/App.tsx` | Main React app |

## 🔍 Troubleshooting

### Crawler Won't Connect
```powershell
# Test MUD connection
telnet apocalypse6.com 6000

# Check credentials in crawler\.env
notepad crawler\.env
```

### Backend Won't Start
```powershell
# Check port 3002 is free
netstat -ano | findstr :3002

# Backend uses SQLite (no MongoDB required)
# Database created automatically at backend/mud-data.db
```

### Frontend Shows No Data
1. Check backend is running (http://localhost:3002/api/stats)
2. Check browser console (F12)
3. Verify crawler has saved data
4. Clear browser cache

### AI Errors / Ollama Issues
1. Verify Ollama is running: `ollama list`
2. Check model installed: `ollama pull llama3.2:3b`
3. Test connection: `curl http://localhost:11434/api/tags`
4. Review logs: `crawler\logs\combined-*.log`
5. Check .env: `OLLAMA_MODEL=llama3.2:3b` (with :3b tag!)

### AI Stuck in Loops
- System has anti-repetition blocking (blocks commands used in last 3 actions)
- Check logs for: `⚠️ AI chose "X" but it was used N time(s)`
- May need to adjust fallback commands in `aiAgent.ts`

## 🎯 Quick Tasks

### Change Exploration Speed
Edit `crawler\.env`:
```env
DELAY_BETWEEN_ACTIONS_MS=1000  # Faster
DELAY_BETWEEN_ACTIONS_MS=5000  # Slower
```

### Limit Exploration Duration
Edit `crawler\.env`:
```env
MAX_ACTIONS_PER_SESSION=50   # Short test
MAX_ACTIONS_PER_SESSION=100  # Normal testing
MAX_ACTIONS_PER_SESSION=1000 # Extended session
```

### Use Single-Task Mode (Testing)
Edit `crawler\.env`:
```env
SINGLE_TASK_MODE=true   # AI makes 1 decision then exits
SINGLE_TASK_MODE=false  # Normal continuous exploration
```

### Run Specific Tasks
```powershell
# Available tasks
npm run dev -- --task=document-actions    # Discover player commands
npm run dev -- --task=document-help       # Document help topics  
npm run dev -- --task=document-zone       # OLD zone mapping method
npm run dev -- --task=document-zone-new   # NEW coordinate-based zone mapping
npm run dev -- --task=document-room       # Document current room
npm run dev -- --task=learn-game          # AI learning session
npm run dev -- --task=play-game           # Autonomous gameplay
```

### New Coordinate-Based Zone Crawler
The new `document-zone-new` task:
- Starts at coordinates 0,0,0 or current room location
- Loads existing rooms for the current zone
- Tracks mapped vs unmapped exits for each room
- Systematically explores all unmapped exits
- Creates new rooms and connections as discovered
- Navigates between rooms and verifies location
- More efficient and systematic than the old method

### AI Provider (Ollama - No API Keys!)
Ollama runs locally, completely free:
```powershell
# Install Ollama from https://ollama.com/download

# Pull the model
ollama pull llama3.2:3b

# Start Ollama (auto-starts on Windows, or:)
ollama serve

# Model will be used automatically by crawler
```

No need for OpenAI or Anthropic API keys!

### Clear Database
```powershell
# Delete SQLite database
Remove-Item backend\mud-data.db

# Backend will recreate on next start
```

### View AI Knowledge
```powershell
# See what AI has learned
notepad crawler\ai-knowledge.md

# AI updates this every 50 actions and at session end
```

### Export Data (SQLite)
```powershell
# Use sqlite3 or DB Browser for SQLite
# Download: https://sqlitebrowser.org/
# Open: backend\mud-data.db
```

## 📈 Monitoring

### Watch Crawler in Real-Time
```powershell
# Follow logs
Get-Content "crawler\logs\combined.log" -Wait
```

### Check System Status
```powershell
# Backend health
curl http://localhost:3002/health

# Get statistics
curl http://localhost:3002/api/stats

# Crawler status
curl http://localhost:3002/api/crawler/status

# Check Ollama
curl http://localhost:11434/api/tags

# View AI knowledge
Get-Content crawler\ai-knowledge.md
```

## 🔑 API Endpoints

### GET Endpoints
```
GET /api/rooms          # All rooms
GET /api/rooms/:id      # Single room
GET /api/npcs           # All NPCs
GET /api/items          # All items
GET /api/spells         # All spells
GET /api/attacks        # All attacks
GET /api/commands       # All commands (with help docs!)
GET /api/commands/:name # Single command details
GET /api/stats          # Statistics
GET /api/crawler/status # Crawler status
```

### POST/PUT Endpoints
```
POST /api/rooms         # Create/update room
POST /api/npcs          # Create/update NPC
POST /api/items         # Create/update item
POST /api/spells        # Create/update spell
POST /api/commands      # Create command
PUT  /api/commands/:name # Update command (adds test results)
POST /api/crawler/status # Update crawler status
```

## 💡 Tips

### No API Costs with Ollama!
- Ollama runs 100% locally - no internet needed for AI
- No API keys, no usage limits, no costs
- Models download once, run forever
- Privacy: your data never leaves your computer

### AI Knowledge System
- AI learns across sessions via `ai-knowledge.md`
- Updates every 50 actions automatically
- Review what AI learned: `notepad crawler\ai-knowledge.md`
- Knowledge includes: commands, rooms, NPCs, lessons learned

### Command Learning
- AI captures "commands" output automatically
- Queues "help <command>" for documentation
- Stores syntax and descriptions in database
- All commands tracked with test results

### Improve Data Quality
- Review and adjust parsing logic in `crawler/src/parser.ts`
- Enhance AI prompts in `crawler/src/aiAgent.ts`
- Add custom extraction patterns for game-specific text

### Speed Up Development
- Use `tsx watch` for auto-reload during development
- Keep browser DevTools open for debugging
- Monitor all 3 terminals simultaneously

### Backup Strategy
```powershell
# Backup database (SQLite - single file)
Copy-Item backend\mud-data.db backup-$(Get-Date -Format "yyyy-MM-dd").db

# Backup AI knowledge
Copy-Item crawler\ai-knowledge.md ai-knowledge-backup-$(Get-Date -Format "yyyy-MM-dd").md

# Backup logs
Compress-Archive crawler\logs\archive\* logs-backup-$(Get-Date -Format "yyyy-MM-dd").zip
```

## 📚 Keyboard Shortcuts

### VS Code (if editing)
- `Ctrl+Shift+P` - Command palette
- `Ctrl+`` - Toggle terminal
- `F5` - Start debugging
- `Ctrl+Shift+F` - Search in files

### Browser (frontend)
- `F12` - DevTools
- `Ctrl+Shift+C` - Inspect element
- `Ctrl+Shift+R` - Hard refresh

## 🎨 Customization Ideas

### Easy
- Change frontend colors in `frontend/src/index.css`
- Adjust crawler delay timing
- Modify AI prompt instructions

### Medium
- Add new entity types to database
- Create custom API endpoints
- Add filtering/sorting to frontend

### Advanced
- Implement coordinate-based mapping
- Add graph visualization for relationships
- Create admin panel for crawler control
- Build natural language query interface

## 📞 Need Help?

1. Check logs in `crawler/logs/`
2. Review documentation files
3. Test individual components
4. Check error messages carefully
5. Verify configuration files

## 🌟 Best Practices

- Start with small test runs (50 actions)
- Monitor logs during first run
- Review AI decisions to optimize prompts
- Back up database before major changes
- Keep dependencies updated
- Use TypeScript types for safety
- Comment complex logic
- Test API endpoints before using
- Version control your customizations

---

**Happy Exploring!** 🗺️🤖
