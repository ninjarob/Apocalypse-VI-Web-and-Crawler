# Documentation Index

This directory contains organized documentation for the Apocalypse VI MUD project, structured for efficient AI indexing, developer communication, and roadmap planning.

## 📁 Documentation Structure

### 🔍 Technical Documentation (`technical/`)
Documentation focused on AI efficient indexing and understanding of the application:

- **[SETUP.md](technical/SETUP.md)** - Detailed installation and configuration
- **[OLLAMA_SETUP.md](technical/OLLAMA_SETUP.md)** - Local AI setup guide
- **[QUICK_REFERENCE.md](technical/QUICK_REFERENCE.md)** - Common commands and troubleshooting
- **[ITEMS_SCHEMA.md](technical/ITEMS_SCHEMA.md)** - Database schema documentation
- **[analyze-bridge-roads.md](technical/analyze-bridge-roads.md)** - Bridge and road analysis

### 💬 Development Communication (`development/`)
Tools for efficient AI ↔ developer communication:

- **[DEVELOPMENT_STATUS.md](development/DEVELOPMENT_STATUS.md)** - Current development status and completed work
- **[SESSION_HANDOFF.md](development/SESSION_HANDOFF.md)** - Session handoffs and context preservation
- **[ARCHIVE.md](development/ARCHIVE.md)** - Historical features and implementation details

### 🗺️ Roadmap & Planning (`roadmap/`)
Future features, work plans, and project direction.

*(Future features and roadmap items will be documented here)*

## 🏗️ Architecture Overview

### Project Structure
```
Apocalypse VI MUD/
├── crawler/           # AI crawler agent
├── backend/           # REST API & database
├── frontend/          # React admin interface
├── shared/            # TypeScript types
├── docs/              # 📁 Organized documentation
│   ├── technical/     # 🔍 AI indexing & understanding
│   ├── development/   # 💬 AI-dev communication
│   └── roadmap/       # 🗺️ Future planning
└── scripts/           # Database utilities
```

### Key Components

- **Crawler**: AI-powered autonomous MUD exploration
- **Backend**: Express.js API with SQLite database
- **Frontend**: React admin interface with map visualization
- **AI**: Local Ollama integration (free, no API costs)

### Database Schema

- **SQLite Database:** `backend/mud-data.db`
- **Seed Script:** `backend/seed.ts`
- **Tables:** rooms, exits, items, npcs, spells, commands, etc.

## 🚀 Quick Start

See **[SETUP.md](technical/SETUP.md)** for detailed installation instructions.

## 📖 Related Documentation

- **[README.md](../README.md)** - Project overview
- **[crawler/README.md](../crawler/README.md)** - Crawler-specific documentation
- **[backend/DATABASE.md](../backend/DATABASE.md)** - Database management
- **[backend/tests/manual/README.md](../backend/tests/manual/README.md)** - Testing documentation

## 🤝 Contributing

When adding new documentation:

1. **Technical docs** → `docs/technical/`
2. **Development updates** → `docs/development/`
3. **Future plans** → `docs/roadmap/`
4. Update this index file
5. Update root README.md links if needed
