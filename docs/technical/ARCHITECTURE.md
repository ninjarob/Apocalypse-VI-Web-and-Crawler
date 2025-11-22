# Architecture Overview

## System Components

Apocalypse VI MUD is a full-stack application consisting of three main components that work together to explore and document a text-based MUD (Multi-User Dungeon) game.

### 🏗️ High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Crawler      │
│   (React)       │◄──►│  (Express.js)   │◄──►│   (AI Agent)    │
│                 │    │                 │    │                 │
│ • Map Display   │    │ • REST API      │    │ • MUD Client    │
│ • Admin UI      │    │ • Database      │    │ • AI Decision   │
│ • Data Viz      │    │ • Validation    │    │ • Exploration   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
       │                       │                       │
       └───────────────────────┼───────────────────────┘
                               ▼
                    ┌─────────────────┐
                    │   Database      │
                    │   (SQLite)      │
                    └─────────────────┘
```

## Component Details

### Frontend (React + TypeScript + Vite)

**Location:** `frontend/`
**Technology:** React 18, TypeScript, Vite, CSS Modules
**Purpose:** User interface for viewing and managing MUD data

**Key Features:**
- Interactive map visualization of discovered rooms
- Admin interface for managing all game entities
- Real-time data display and filtering
- Responsive design for different screen sizes

**Main Routes:**
- `/` - MUD Map Dashboard (room visualization)
- `/admin/*` - Admin interface (rooms, NPCs, items, etc.)

**Architecture:**
```
frontend/
├── src/
│   ├── App.tsx              # Main app component & routing
│   ├── main.tsx             # App entry point
│   ├── api.ts               # API client functions
│   ├── components/          # Reusable UI components
│   ├── pages/               # Page-level components
│   ├── hooks/               # Custom React hooks
│   └── utils/               # Utility functions
├── package.json
└── vite.config.ts
```

### Backend (Node.js + Express + TypeScript)

**Location:** `backend/`
**Technology:** Node.js, Express.js, TypeScript, SQLite3
**Purpose:** REST API server and database management

**Key Features:**
- RESTful API for all CRUD operations
- SQLite database with comprehensive schema
- Input validation and error handling
- Middleware for CORS, logging, and security

**API Structure:**
- **Base URL:** `http://localhost:3002/api`
- **Generic CRUD:** `/api/{entity-type}` (GET, POST, PUT, DELETE)
- **Specialized:** `/api/rooms`, `/api/zones`, `/api/stats`
- **Meta:** `/api/entity-types`, `/api/stats`

**Architecture:**
```
backend/
├── src/
│   ├── index.ts             # Server startup & middleware
│   ├── database.ts          # SQLite connection & utilities
│   ├── routes/
│   │   ├── index.ts         # Route exports
│   │   └── api.ts           # Main API routes
│   ├── services/            # Business logic layer
│   ├── repositories/        # Data access layer
│   ├── middleware/          # Express middleware
│   ├── validation/          # Input validation
│   └── errors/              # Error handling
├── seed.ts                  # Database seeding
├── package.json
└── tsconfig.json
```

### Crawler (AI Agent + MUD Client)

**Location:** `crawler/`
**Technology:** Node.js, TypeScript, Ollama (local AI)
**Purpose:** Autonomous exploration and data collection from MUD

**Key Features:**
- Telnet connection to MUD server
- AI-powered decision making for exploration
- Log parsing and data extraction
- Task-based automation system

**Task Types:**
- `document-actions` - Discover and document player actions
- `document-help` - Extract help system content
- `learn-game` - Learn game mechanics through interaction
- `play-game` - Extended gameplay sessions

**Architecture:**
```
crawler/
├── src/
│   ├── index.ts             # Main entry point
│   ├── mudClient.ts         # Telnet MUD connection
│   ├── aiAgent.ts           # Ollama AI integration
│   ├── parser.ts            # MUD output parsing
│   ├── tasks/               # Task implementations
│   ├── api.ts               # Backend API client
│   └── logger.ts            # Logging utilities
├── ai-knowledge.md          # AI learning data
├── package.json
└── tsconfig.json
```

## Data Flow

### Exploration Workflow

1. **Crawler connects** to MUD server via Telnet
2. **AI Agent** makes decisions about what actions to take
3. **MUD Client** sends commands and receives responses
4. **Parser** extracts structured data from text responses
5. **API Client** sends parsed data to Backend API
6. **Backend** validates and stores data in SQLite database
7. **Frontend** displays updated data in real-time

### Data Processing Pipeline

```
MUD Server → Crawler → Parser → API → Backend → Database → Frontend
     │           │        │       │       │         │         │
     │           │        │       │       │         │         │
     ▼           ▼        ▼       ▼       ▼         ▼         ▼
Raw Text    AI Analysis  Structured  REST API  Validation  SQLite   React UI
```

## Database Schema

**Technology:** SQLite3
**Location:** `data/mud-data.db`

### Core Tables

#### World Data
- `zones` - Geographic areas
- `rooms` - Individual locations (populated by crawler)
- `room_exits` - Connections between rooms
- `room_objects` - Interactive objects in rooms

#### Entities
- `npcs` - Non-player characters
- `items` - Equipment and objects
- `spells` - Magical abilities
- `attacks` - Combat moves

#### Character System
- `races` - Playable races
- `classes` - Character classes
- `abilities` - Base stats (STR, INT, WIS, etc.)
- `skills` - Learned abilities
- `class_proficiencies` - Class-specific skills

#### Game Mechanics
- `player_actions` - Available commands and actions
- `help_entries` - In-game help documentation
- `commands` - Discovered command usage

### Key Relationships

```
zones (1) ──── (M) rooms
rooms (1) ──── (M) room_exits (M) ──── (1) rooms
rooms (1) ──── (M) npcs
rooms (1) ──── (M) items
classes (1) ──── (M) class_proficiencies
races (1) ──── (M) abilities (M) ──── (1) classes
```

## API Design

### REST Endpoints

**Generic CRUD Pattern:**
```
GET    /api/{entity}           # List all
GET    /api/{entity}/{id}      # Get by ID
POST   /api/{entity}           # Create
PUT    /api/{entity}/{id}      # Update
DELETE /api/{entity}/{id}      # Delete
```

**Specialized Endpoints:**
```
GET    /api/rooms/by-name/{name}    # Find room by name
GET    /api/zones/{id}/connections # Get zone connections
GET    /api/stats                  # System statistics
GET    /api/entity-types           # Available entity types
```

### Request/Response Format

**Request:**
```json
{
  "name": "Example Room",
  "description": "A sample location",
  "zone_id": 1
}
```

**Response:**
```json
{
  "id": 123,
  "name": "Example Room",
  "description": "A sample location",
  "zone_id": 1,
  "visitCount": 1,
  "createdAt": "2025-11-22T...",
  "updatedAt": "2025-11-22T..."
}
```

## Shared Architecture

### Type Definitions

**Location:** `shared/types.ts`
**Purpose:** TypeScript interfaces shared across all components

Key interfaces:
- `Room` - Room data structure
- `NPC` - Non-player character data
- `Item` - Item/equipment data
- `PlayerAction` - Available actions
- `Stats` - System statistics

### Entity Configuration

**Location:** `shared/entity-config.ts`
**Purpose:** Centralized configuration for all entity types

Features:
- Database table mappings
- Field configurations
- Frontend display settings
- Validation rules

## Development Workflow

### Local Development Setup

1. **Install Dependencies:**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend  
   cd frontend && npm install
   
   # Crawler
   cd crawler && npm install
   ```

2. **Start Services:**
   ```bash
   # Backend (Terminal 1)
   cd backend && npm run dev
   
   # Frontend (Terminal 2)  
   cd frontend && npm run dev
   
   # Crawler (Terminal 3 - when needed)
   cd crawler && npm run crawl -- --task=document-actions
   ```

3. **Access Application:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3002/api`
   - Database: `data/mud-data.db`

### Build & Deployment

- **Frontend:** `npm run build` → static files in `dist/`
- **Backend:** `npm run build` → compiled JS in `dist/`
- **Database:** SQLite file can be copied/deployed directly

## Key Design Decisions

### Why SQLite?
- **Simple:** No separate database server required
- **File-based:** Easy backup and deployment
- **ACID:** Reliable transactions for data integrity
- **JSON Support:** Native JSON column types for complex data

### Why Local AI (Ollama)?
- **Privacy:** No external API calls or data sharing
- **Cost:** Free to run locally
- **Offline:** Works without internet connection
- **Control:** Full control over AI behavior and data

### Why Modular Architecture?
- **Separation of Concerns:** Each component has clear responsibilities
- **Independent Deployment:** Components can be updated separately
- **Technology Flexibility:** Different tech stacks per component
- **Scalability:** Easy to scale individual components

### Why Shared Type Definitions?
- **Type Safety:** Consistent interfaces across components
- **DRY Principle:** Single source of truth for data structures
- **Refactoring:** Changes propagate automatically
- **Documentation:** Types serve as living documentation

## Performance Considerations

### Database Optimization
- **Indexes:** Primary keys and common query fields indexed
- **JSON Fields:** Efficient storage for complex nested data
- **Connection Pooling:** Single SQLite connection reused
- **Batch Operations:** Multiple inserts in single transactions

### API Performance
- **Pagination:** Large result sets paginated
- **Filtering:** Server-side filtering reduces data transfer
- **Caching:** Frontend caches frequently accessed data
- **Compression:** Response compression for large payloads

### Frontend Performance
- **Code Splitting:** Route-based code splitting
- **Lazy Loading:** Components loaded on demand
- **Virtual Scrolling:** Large lists use virtual scrolling
- **Memoization:** Expensive computations cached

## Security Considerations

### API Security
- **Input Validation:** All inputs validated against schemas
- **SQL Injection Protection:** Parameterized queries only
- **CORS:** Configured for frontend origin only
- **Error Handling:** Sensitive information not exposed in errors

### Data Privacy
- **Local AI:** No data sent to external services
- **Local Database:** Data stays on local machine
- **No Telemetry:** No usage tracking or analytics
- **User Control:** Full control over data collection

## Future Architecture Considerations

### Scalability
- **Database:** Could migrate to PostgreSQL for multi-user scenarios
- **API:** Could add GraphQL for more flexible queries
- **Frontend:** Could add service worker for offline functionality
- **Crawler:** Could distribute across multiple instances

### Monitoring & Observability
- **Logging:** Structured logging with correlation IDs
- **Metrics:** API response times and error rates
- **Health Checks:** Automated monitoring of all components
- **Tracing:** Request tracing across component boundaries

### Testing Strategy
- **Unit Tests:** Individual functions and components
- **Integration Tests:** API endpoints and component interactions
- **E2E Tests:** Full user workflows
- **Performance Tests:** Load testing and benchmarking</content>
<parameter name="filePath">c:\work\other\Apocalypse VI MUD\docs\technical\ARCHITECTURE.md