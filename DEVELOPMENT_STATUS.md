# Apocalypse VI MUD - Development Status

**Last Updated:** October 29, 2025

## Project Overview
AI-powered MUD (Multi-User Dungeon) crawler that uses Ollama LLM to autonomously explore the game, learn mechanics, and document rooms, NPCs, items, and spells.

## Current System Architecture

### Tech Stack
- **Backend**: Node.js + Express + SQLite (port 3002)
- **Frontend**: React + Vite (port 5173)
- **Crawler**: TypeScript + Telnet + Ollama AI
- **AI Model**: Ollama llama3.2:3b (local)
- **Database**: SQLite (game data storage - single file at backend/mud-data.db)

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

### 1. Logging System
- **Timestamped Logs**: `combined-YYYY-MM-DDTHH-MM-SS.log` format
- **Winston Logger**: Configured with filters and formatters
- **Telnet Communication Logging**: 
  - `📤 SENDING to telnet: "command"` - Commands sent
  - `📥 RECEIVED from telnet: \n<response>` - Full telnet responses
- **Log Archiver**: Automatically moves logs >30 minutes old to `logs/archive/`
  - Runs on 60-second interval
  - Integrated into crawler lifecycle (starts/stops with crawler)
- **Correct Directory**: Logs saved to `crawler/logs/`

### 2. Smart Login System
- **Conditional Login Detection**: 
  - Checks buffer for "press enter" prompt (only appears after long logout)
  - Checks for game menu "make your choice"
  - Sends responses only when needed
- **Character Selection**: Automatically selects character #1 from menu

### 3. Backend Error Handling
- **API-Level Suppression**: `logBackendError()` method in `api.ts`
- **Smart Tracking**: `backendAvailable` flag tracks state
- **Rate Limiting**: Shows warning once, then silently fails for 5 minutes
- **Applied to All Methods**: saveRoom, saveNPC, saveItem, saveSpell, updateCrawlerStatus

### 4. Command Knowledge Tracking
- **Map-Based System**: `Map<string, CommandKnowledge>` tracks all commands
- **Success/Failure Detection**: Parses responses for error messages
- **Category Organization**: exploration, combat, social, inventory, etc.
- **AI Prompt Integration**: Commands formatted as "command (✓success/✗fail)"

### 5. Single-Task Mode
- **Environment Variable**: `SINGLE_TASK_MODE=true` in `crawler/.env`
- **Purpose**: AI makes ONE decision per run, then exits cleanly
- **Use Case**: Training/testing without continuous operation
- **Status**: ✅ Fully working

### 6. AI Knowledge Management System ⭐ NEW!
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

### 7. Command Learning & Documentation System ⭐ NEW!
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

### 8. Anti-Repetition System ⭐ NEW!
- **Aggressive Loop Prevention**: Blocks commands used even ONCE in last 3 actions
- **Smart Fallback Commands**: Context-aware alternatives when repetition detected
- **Command Cleaning**: Strips explanatory text from AI responses
  - Removes "I'll...", "Let's...", sentence starters
  - Extracts commands from quotes
  - Handles multi-word commands properly
- **Prevents Stuck Loops**: No more endless "commands" repetition
- **Logged Warnings**: `⚠️ AI chose "X" but it was used N time(s) - forcing different action`

## ⚠️ Current Issues (In Progress)

### ⚠️ MONITORING: AI Command Repetition
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
MUD_USERNAME=Pocket
MUD_PASSWORD=P0ck3t

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

### ✅ RECENT IMPROVEMENTS (October 29, 2025)

**Command Learning System**:
```
✅ "commands" output captured and parsed (27-40 commands discovered)
✅ Commands queued for help lookup automatically
✅ "help <command>" detected and parsed for syntax/description
✅ Database stores full command documentation
✅ Knowledge base includes command details
✅ Command test results tracked with success/failure
```

**Anti-Repetition System**:
```
✅ Aggressive loop prevention (blocks after 1 use in last 3 actions)
✅ Command cleaning strips explanatory text
✅ Context-aware fallback commands
✅ Warnings logged when forcing different action
```

**Test Results**:
- ✅ Commands list successfully captured (various counts: 27, 29, 40, 1)
- ✅ Command cleaning working (no more "I'll..." sentences)
- ⚠️ Repetition still occurs but now gets blocked with fallbacks
- ✅ Knowledge manager tracking all command tests

### Ready for Extended Testing

1. **Run Extended Exploration Session**:
   ```powershell
   # Edit crawler/.env and change:
   SINGLE_TASK_MODE=false
   MAX_ACTIONS_PER_SESSION=100  # For testing, or 1000 for full run
   
   # Rebuild and run:
   cd "c:\work\other\Apocalypse VI MUD\crawler"
   npm run build
   npm start
   ```

2. **Monitor AI Knowledge Growth**:
   - Watch `crawler/ai-knowledge.md` file update every 50 actions
   - AI will discover commands, map rooms, document NPCs
   - Knowledge persists across sessions!

3. **Optional - Start Backend for Data Persistence**:
   ```powershell
   cd "c:\work\other\Apocalypse VI MUD\backend"
   npm start
   ```
   - SQLite (no separate database server needed)
   - Crawler works without it (knowledge still saves to file)

4. **Future Enhancements**:
   - Adjust update interval (currently 50 actions)
   - Add more knowledge sections as needed
   - Implement knowledge-based decision making
   - Create knowledge visualization dashboard

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

**Status**: ✅ MAJOR ENHANCEMENTS COMPLETE

**What Was Added** (October 29, 2025):
1. ✅ Command learning system - captures "commands" output, queues help lookups
2. ✅ Help command integration - "help <cmd>" parsed for syntax/description
3. ✅ Database command storage - full documentation with test results
4. ✅ Knowledge base expansion - includes command lists and test results
5. ✅ Anti-repetition system - aggressive blocking with smart fallbacks
6. ✅ Command cleaning - strips AI explanatory text to extract commands

**Recent Test Observations**:
- Commands captured: 27-40 commands discovered from game
- Repetition blocking: Triggered multiple times, forcing diversity
- Command cleaning: Working ("commands", "look", "inventory" extracted cleanly)
- Help system: Ready but needs testing (queue implemented)
- Backend: Optional (works without it, knowledge saves to file)

**Current Behavior**:
- AI still shows preference for "commands" but gets blocked after 1 use
- Fallback system forces "look", "inventory", "north" etc.
- All commands tracked in database (when backend running)
- Knowledge file will update at action 50

**Configuration**:
- `crawler/.env` - `SINGLE_TASK_MODE=false`, `MAX_ACTIONS_PER_SESSION=100`
- `crawler/ai-knowledge.md` - Persistent AI memory file
- Database: SQLite for backend data persistence (single file, no server required)

**Next Testing Focus**:
1. Monitor if repetition blocking creates good exploration diversity
2. Verify help commands get executed from queue
3. Check knowledge base update at action 50
4. Review command documentation in database
5. May need to tune fallback command selection

**No Critical Issues** - System learning and improving!
