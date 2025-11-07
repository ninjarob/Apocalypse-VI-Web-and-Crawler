# Apocalypse VI MUD Crawler

AI-powered autonomous crawler for documenting and exploring the Apocalypse VI MUD.

## Project Structure

- **crawler/** - AI agent that connects to the MUD, explores, and extracts data
- **backend/** - Node.js API server with database integration
- **frontend/** - React web interface for browsing discovered content
- **shared/** - Shared types and utilities

## Setup

```bash
# Install all dependencies
npm run install-all

# Set up environment variables (see .env.example files)
# Create .env files in crawler/ and backend/
```

### Starting the Backend (Recommended: PM2)

The backend should be run using PM2 for process management:

```bash
cd backend

# Build the backend first
npm run build

# Start with PM2 (preferred)
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs mud-backend

# Stop when needed
pm2 stop mud-backend
```

**Alternative (Development)**: You can also run `npm run dev` for direct execution, but PM2 is preferred for stability.

### Starting Other Services

```bash
# Start the frontend (in another terminal)
npm run dev:frontend

# Run the crawler (in another terminal)
npm run dev:crawler
```

## Features

- **Autonomous Exploration**: AI decides where to go and what to examine
- **Intelligent Parsing**: Extracts entities from unstructured text
- **Comprehensive Database**: Rooms, NPCs, items, spells, attacks, and more
- **Web Interface**: Browse and search all discovered content
- **Real-time Updates**: See the crawler's progress live

## Configuration

- MUD Host: apocalypse6.com:6000
- Database: PostgreSQL (configurable)
- AI: OpenAI GPT-4 (configurable)
