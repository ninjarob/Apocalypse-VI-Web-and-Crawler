# Apocalypse VI MUD Crawler - Setup Guide

## Prerequisites

Before starting, ensure you have:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Ollama** - [Download](https://ollama.ai/) - Local AI model runner (no API costs!)
- **Git** (optional, for version control)

## Quick Start

### 1. Install Dependencies

Open PowerShell/Terminal in the project root and run:

```powershell
# Install root dependencies
npm install

# Install all workspace dependencies
cd crawler
npm install
cd ..\backend
npm install
cd ..\frontend
npm install
cd ..
```

### 2. Set Up Ollama

Install and start Ollama with the llama3.2:3b model:

```powershell
# Pull the model
ollama pull llama3.2:3b

# Test it's working
ollama run llama3.2:3b
```

Type `/bye` to exit the test chat.

### 3. Configure Environment Variables

**Backend** - Create `backend/.env`:
```env
PORT=3002
NODE_ENV=development
# SQLite database will be created automatically at backend/mud-data.db
```

**Crawler** - Create `crawler/.env`:
```env
MUD_HOST=apocalypse6.com
MUD_PORT=6000
MUD_USERNAME=Pocket
MUD_PASSWORD=P0ck3t

# Ollama settings (local AI - FREE!)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

BACKEND_URL=http://localhost:3002/api
MAX_ACTIONS_PER_SESSION=1000
DELAY_BETWEEN_ACTIONS_MS=2000
LOG_LEVEL=info
SINGLE_TASK_MODE=false
```

### 4. Start the Application

You'll need **3 terminal windows**:

**Terminal 1 - Backend API:**
```powershell
cd backend
npm run dev
```
Wait for: `✓ SQLite database initialized` and `✓ Server running on http://localhost:3002`

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```
Wait for: `Local: http://localhost:5173`

**Terminal 3 - Crawler:**
```powershell
cd crawler
npm run build
npm start
```
The crawler will connect to the MUD and start exploring!

### 5. View Results

Open your browser to: **http://localhost:5173**

You'll see:
- **Dashboard** - Overview of discoveries
- **Rooms** - All explored rooms
- **NPCs** - Characters encountered
- **Items** - Equipment and objects
- **Spells** - Magic and abilities

## How It Works

### The Crawler Process

1. **Connects** to apocalypse6.com:6000 via telnet
2. **Logs in** with your character (Pocket)
3. **AI decides** what command to execute next based on:
   - Current room description
   - Unexplored exits
   - Items/NPCs mentioned
   - Command history
4. **Parses** the MUD's text response
5. **Extracts** structured data (rooms, NPCs, items, lore, factions, quests)
6. **Saves** to SQLite database via backend API (or keeps in ai-knowledge.md if backend offline)
7. **Repeats** until max actions reached

### AI Decision Making

The AI agent uses Ollama (llama3.2:3b) locally to:
- Choose intelligent exploration strategies
- Prioritize unexplored areas
- Examine interesting objects
- Interact with NPCs
- Avoid repetitive actions
- Learn game commands
- **Extract world lore** - History, myths, prophecies
- **Track factions** - Guilds, kingdoms, organizations
- **Discover quests** - Objectives, rewards, storylines
- **Map relationships** - NPC connections and rivalries
- **Understand geography** - Regions, landmarks, features

### Data Storage

SQLite database (`backend/mud-data.db`) with tables:
- `rooms` - Room descriptions, exits, coordinates
- `npcs` - Character info, hostility, stats
- `items` - Equipment, weapons, properties
- `spells` - Magic spells and abilities
- `attacks` - Combat moves
- `commands` - Tested MUD commands and results
- `crawler_status` - Real-time crawler status
- `lore` - World history, myths, current events
- `factions` - Guilds, kingdoms, organizations
- `quests` - Storylines, objectives, rewards
- `regions` - Geographic areas and features
- `relationships` - NPC connections and dynamics

The AI also maintains `crawler/ai-knowledge.md` - a persistent knowledge base updated as it learns.

## Customization

### Adjust Crawler Behavior

Edit `crawler/.env`:
- `MAX_ACTIONS_PER_SESSION` - How long to explore (default: 1000 commands)
- `DELAY_BETWEEN_ACTIONS_MS` - Wait time between commands (default: 2000ms)
- `LOG_LEVEL` - Logging detail: debug, info, warn, error
- `SINGLE_TASK_MODE` - Set to `true` for focused exploration, `false` for continuous

### Use Different Ollama Models

The crawler supports any Ollama model. To try a different one:

```powershell
# Pull a different model
ollama pull llama3.1:8b

# Update crawler/.env
OLLAMA_MODEL=llama3.1:8b
```

Recommended models:
- `llama3.2:3b` - Fast, good for most tasks (default)
- `llama3.1:8b` - More capable, slower
- `qwen2.5:7b` - Alternative with good reasoning

### Modify Exploration Strategy

Edit `crawler/src/aiAgent.ts` to change:
- Prompt instructions
- Priority of actions
- Command patterns
- Risk tolerance

## Troubleshooting

### Crawler won't connect to MUD
- Check firewall settings
- Verify `MUD_HOST` and `MUD_PORT` in `.env`
- Test connection: `telnet apocalypse6.com 6000`

### Ollama not responding
- Ensure Ollama is installed and running
- Test: `ollama list` should show your models
- Check: `http://localhost:11434` should be accessible
- Restart Ollama if needed

### Backend errors
- Verify backend is running on port 3002
- Check `backend/mud-data.db` is being created
- Review backend logs for SQLite errors

### Frontend shows no data
- Verify backend is running on port 3002
- Check browser console for errors
- Ensure `BACKEND_URL` in crawler/.env is correct

### TypeScript errors
- Run `npm install` in each directory
- Delete `node_modules` and reinstall if needed

## Project Structure

```
Apocalypse VI MUD/
├── crawler/           # AI crawler agent
│   ├── src/
│   │   ├── index.ts       # Main crawler loop
│   │   ├── mudClient.ts   # Telnet connection
│   │   ├── aiAgent.ts     # AI decision making
│   │   ├── parser.ts      # Text parsing
│   │   ├── api.ts         # Backend API client
│   │   └── logger.ts      # Logging
│   └── logs/          # Crawler logs
├── backend/           # REST API & database
│   └── src/
│       ├── index.ts       # Express server
│       ├── routes.ts      # API endpoints
│       └── database.ts    # SQLite schema & init
├── frontend/          # React web interface
│   └── src/
│       ├── App.tsx        # Main app
│       ├── api.ts         # API client
│       └── pages/         # Page components
└── shared/            # Shared TypeScript types
    └── types.ts
```

## Next Steps

1. **Monitor the crawler** - Watch logs in terminal and `crawler/logs/`
2. **Browse discoveries** - Open http://localhost:3000
3. **Adjust settings** - Tune delay, max actions, AI behavior
4. **Enhance parsers** - Improve text extraction in `parser.ts`
5. **Add features** - Map visualization, relationship graphs, etc.

## Advanced Features (Future)

- Interactive map with room coordinates
- NPC relationship tracking
- Quest/storyline detection
- Combat log analysis
- Item crafting trees
- Real-time crawler control panel
- Multiple character support
- MUD command learning
- Natural language queries

## Tips

- Start with a low `MAX_ACTIONS_PER_SESSION` (e.g., 50) to test
- **Ollama is FREE** - unlimited usage, no API costs!
- The crawler learns as it goes - early data may be imperfect
- Check `crawler/ai-knowledge.md` to see what the AI has learned
- The AI builds deep world understanding over time (lore, factions, quests)
- You can manually add data via the API
- Back up `backend/mud-data.db` periodically
- Review AI decisions in logs to improve prompts

## Support

For issues:
1. Check logs in `crawler/logs/`
2. Verify all services are running
3. Test individual components
4. Review error messages carefully

Happy exploring! 🗺️🤖
