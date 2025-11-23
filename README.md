# Apocalypse VI MUD

AI-powered autonomous crawler and mapping system for the Apocalypse VI MUD.

## Quick Start

```powershell
# Automated setup and start
.\install.ps1   # Install all dependencies
.\start.ps1     # Start all services (opens 3 terminals)
```

Access the web interface at **http://localhost:5173**

## Project Structure

- **crawler/** - AI agent for autonomous MUD exploration
- **backend/** - REST API with SQLite database
- **frontend/** - React admin interface and map viewer
- **shared/** - TypeScript types used across modules

## Core Features

- **Autonomous Exploration** - AI-driven zone mapping and room documentation
- **Room Management** - Full CRUD interface with exit binding
- **Zone Mapping** - Coordinate-based room tracking and visualization
- **Character Maintenance** - Automatic rest, hunger, and thirst management
- **Local AI** - Free Ollama integration (no API costs)

## Configuration

**MUD Server**: apocalypse6.com:6000  
**Backend API**: http://localhost:3002  
**Frontend**: http://localhost:5173  
**Database**: SQLite (backend/mud-data.db)  
**AI**: Ollama llama3.2:3b (local, free)

## Essential Setup Steps

1. **Install Ollama** (local AI - free!)
   ```powershell
   # Download from https://ollama.ai
   ollama pull llama3.2:3b
   ```

2. **Configure Environment**
   - Create `crawler/.env` with MUD credentials
   - Create `backend/.env` with PORT=3002
   - See SETUP.md for detailed configuration

3. **Start Services**
   ```powershell
   .\start.ps1  # Opens 3 terminals automatically
   ```

## Documentation

- **[docs/](docs/)** - Organized project documentation
  - **[Technical](docs/technical/)** - Setup, configuration, and technical guides
  - **[Development](docs/development/)** - Status updates and communication
  - **[Roadmap](docs/roadmap/)** - Future features and planning
- **SETUP.md** → **[docs/technical/SETUP.md](docs/technical/SETUP.md)**
- **QUICK_REFERENCE.md** → **[docs/technical/QUICK_REFERENCE.md](docs/technical/QUICK_REFERENCE.md)**
- **DEVELOPMENT_STATUS.md** → **[docs/development/DEVELOPMENT_STATUS.md](docs/development/DEVELOPMENT_STATUS.md)**

## Support

For issues, check:
1. Logs in `crawler/logs/`
2. QUICK_REFERENCE.md troubleshooting section
3. SETUP.md for configuration help

Updated on November 22, 2025.
