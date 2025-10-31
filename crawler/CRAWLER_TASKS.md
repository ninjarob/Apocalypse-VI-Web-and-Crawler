# Crawler Task System

## Overview

The crawler now supports **task-based execution**, allowing you to run it in different modes depending on your goal.

## Available Tasks

### 1. **Document Actions** (`document-actions`)
**Purpose:** Systematically discover and document all player actions (commands) with their help text.

**What it does:**
- Gets the list of available commands from the game
- For each command, runs `help <command>` to get documentation
- Tests the command to see if it works
- Stores command info in the database

**When to use:** When you want to build a comprehensive database of all game commands.

### 2. **Document Help** (`document-help`)
**Purpose:** Document general help topics and game knowledge (not tied to specific commands).

**What it does:**
- Explores general help topics (rules, combat, leveling, lore, etc.)
- Documents game mechanics and rules
- Stores help text in the knowledge base
- Note: May require backend updates in the future to store general help text

**When to use:** When you want to document game mechanics, rules, and general information.

### 3. **Learn Game** (`learn-game`)
**Purpose:** Iteratively improve the AI's game knowledge through exploration.

**What it does:**
- Explores the game world systematically
- Learns from experiences
- Updates the knowledge base regularly (every 20 actions)
- Improves AI decision-making over time

**When to use:** When you want the AI to get better at playing the game by learning from its experiences.

### 4. **Play Game** (`play-game`)
**Purpose:** Play the game autonomously using current AI knowledge.

**What it does:**
- Uses existing AI knowledge to play the game
- Explores, completes quests, fights, levels up
- Makes decisions like a player would
- Does NOT focus on learning, just playing
- Tracks achievements and progress

**When to use:** When you want the AI to actually play the game and accomplish objectives.

## Usage

### Run with npm scripts:

```bash
# Document all player actions/commands
npm run crawl:document-actions

# Document general help topics
npm run crawl:document-help

# Learn the game iteratively
npm run crawl:learn-game

# Play the game
npm run crawl:play-game
```

### Or use the generic crawl command:

```bash
npm run crawl -- --task=document-actions
npm run crawl -- --task=document-help
npm run crawl -- --task=learn-game
npm run crawl -- --task=play-game
```

### Without task argument (shows usage):

```bash
npm run crawl
```

## Configuration

All tasks respect these environment variables from your `.env` file:

- `MUD_HOST` - MUD server address
- `MUD_PORT` - MUD server port
- `MUD_USERNAME` - Login username
- `MUD_PASSWORD` - Login password
- `OLLAMA_URL` - Ollama API URL
- `OLLAMA_MODEL` - AI model to use
- `BACKEND_URL` - Backend API URL
- `MAX_ACTIONS_PER_SESSION` - Maximum actions before stopping
- `DELAY_BETWEEN_ACTIONS_MS` - Delay between actions

## Architecture

### Task Files

- **`TaskManager.ts`** - Manages task lifecycle and routing
- **`DocumentActionsTask.ts`** - Documents player commands
- **`DocumentHelpTask.ts`** - Documents help topics
- **`LearnGameTask.ts`** - Learning mode
- **`PlayGameTask.ts`** - Playing mode

### Main Entry Point

- **`index.ts`** - Parses arguments, initializes components, runs selected task

## What Changed

### Old System
The old crawler was always in "exploration mode" - it would wander around, collect data, and occasionally update its knowledge base.

### New System
Now you explicitly choose what you want the crawler to do:
1. **Document Actions** - Focused on command discovery
2. **Document Help** - Focused on help/lore collection
3. **Learn Game** - Focused on improving AI knowledge
4. **Play Game** - Focused on autonomous gameplay

Each task has its own logic, goals, and success criteria.

## Knowledge Base

All tasks use the **KnowledgeManager** (`ai-knowledge.md`) to store and retrieve knowledge:
- Commands discovered
- Help topics
- Room connections
- NPC information
- Lore and story elements
- Lessons learned

The knowledge base is **cumulative** - it grows over multiple sessions and tasks.

## Next Steps

1. Test each task mode to ensure it works correctly
2. Consider adding backend support for general help text storage
3. Monitor the AI's learning progress across sessions
4. Adjust `MAX_ACTIONS_PER_SESSION` based on your needs

## Tips

- Start with `document-actions` to build your command database
- Use `learn-game` to improve the AI's decision-making
- Use `play-game` once the AI has good knowledge
- Use `document-help` to fill in lore and mechanics knowledge

## Backward Compatibility

The old `commandCrawler.ts` still exists and can be run with:
```bash
npm run learn-commands
```

This is now essentially equivalent to `document-actions` but uses the older implementation.
