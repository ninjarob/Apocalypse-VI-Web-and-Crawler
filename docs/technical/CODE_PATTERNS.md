# Code Patterns & Conventions

This document outlines the established patterns and conventions used throughout the Apocalypse VI MUD codebase. These patterns ensure consistency, maintainability, and efficient development across all components.

## Backend Architecture Patterns

### Repository Pattern

The backend uses a layered architecture with repositories handling data access:

#### Base Repository (`BaseRepository.ts`)
```typescript
export abstract class BaseRepository<T = any> {
  // Core database operations
  protected async get(sql: string, params: any[] = []): Promise<T | null>
  protected async all(sql: string, params: any[] = []): Promise<T[]>
  protected async run(sql: string, params: any[] = []): Promise<QueryResult>

  // Entity serialization/deserialization
  protected serializeEntity(entity: Partial<T>): any
  protected deserializeEntity(row: any): T

  // CRUD operations
  async findAll(filters?: Record<string, any>): Promise<T[]>
  async findById(id: string | number): Promise<T | null>
  async create(entity: Partial<T>): Promise<T>
  async update(id: string | number, updates: Partial<T>): Promise<T | null>
  async delete(id: string | number): Promise<boolean>
}
```

#### Generic Repository (`GenericRepository.ts`)
```typescript
export class GenericRepository<T = any> extends BaseRepository<T> {
  // Factory pattern for repository creation
  static getRepository(config: EntityConfig): GenericRepository
}
```

**Usage Pattern:**
```typescript
// Get repository instance
const repository = RepositoryFactory.getRepository(ENTITY_CONFIG.rooms);

// Standard CRUD operations
const rooms = await repository.findAll({ zone_id: 2 });
const room = await repository.findById(123);
const newRoom = await repository.create(roomData);
const updated = await repository.update(123, updates);
await repository.delete(123);
```

### Service Layer Pattern

Services provide business logic and coordinate between repositories:

#### Generic Service (`GenericService.ts`)
```typescript
export class GenericService extends BaseService {
  async getAll(filters?: Record<string, any>): Promise<any[]>
  async getById(id: string | number): Promise<any>
  async create(entityData: any): Promise<any>
  async update(id: string | number, updates: any): Promise<any>
  async delete(id: string | number): Promise<boolean>
  async createOrUpdate(entityData: any): Promise<any> // Upsert
}
```

#### Specialized Services (e.g., `RoomService.ts`)
```typescript
export class RoomService extends BaseService {
  // Business logic specific to rooms
  async getRoomByName(name: string): Promise<Room>
  async createOrUpdateRoom(roomData: any): Promise<Room>
  async getRoomsWithExits(filters?: any): Promise<Room[]>
}
```

**Service Usage Pattern:**
```typescript
// Use specialized service for complex logic
const roomService = new RoomService();
const room = await roomService.createOrUpdateRoom(roomData);

// Use generic service for simple CRUD
const itemService = new GenericService(ENTITY_CONFIG.items);
const items = await itemService.getAll({ type: 'weapon' });
```

### Error Handling Pattern

Custom error classes with consistent structure:

#### Error Hierarchy
```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;
}

// Specific error types
export class BadRequestError extends AppError      // 400
export class NotFoundError extends AppError        // 404
export class ConflictError extends AppError        // 409
export class ValidationError extends AppError      // 422
export class InternalServerError extends AppError  // 500
```

#### Error Handling Middleware
```typescript
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error with context
  logError(error, req);

  // Handle different error types
  if (error instanceof ZodError) {
    return handleZodError(error, res);
  }

  if (isAppError(error)) {
    return handleAppError(error, res);
  }

  return handleUnknownError(error, res);
}
```

**Error Throwing Pattern:**
```typescript
// Throw specific errors with context
if (!entity) {
  throw createNotFoundError('rooms', roomId);
}

if (existing) {
  throw new ConflictError(
    `Room with name "${name}" already exists`,
    'DUPLICATE',
    { field: 'name', value: name }
  );
}
```

### Validation Pattern

Zod schemas for runtime type validation:

#### Schema Definition
```typescript
// Create schemas in validation/schemas.ts
export const CREATE_ROOM_SCHEMA = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1),
  zone_id: z.number().int().positive().optional(),
  x: z.number().int().optional(),
  y: z.number().int().optional()
});

// Update schemas (all fields optional)
export const UPDATE_ROOM_SCHEMA = CREATE_ROOM_SCHEMA.partial();
```

#### Middleware Usage
```typescript
// Apply validation in routes
router.post('/rooms',
  validateCreate('rooms'),  // Validates request body
  asyncHandler(async (req: Request, res: Response) => {
    // req.body is now validated and typed
    const room = await roomService.createOrUpdateRoom(req.body);
    res.status(201).json(room);
  })
);
```

### Async Handler Pattern

Consistent error handling for async route handlers:

```typescript
// middleware/index.ts
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Usage in routes
router.get('/rooms', asyncHandler(async (req, res) => {
  const rooms = await roomService.getRooms();
  res.json(rooms);
}));
```

## Frontend Architecture Patterns

### API Client Pattern

Centralized API client with generic and specific methods:

```typescript
// Generic CRUD methods
export const api = {
  async getAll<T>(endpoint: string, filters?: Record<string, any>): Promise<T[]>
  async getById<T>(endpoint: string, id: string | number): Promise<T>
  async create<T>(endpoint: string, data: Partial<T>): Promise<T>
  async update<T>(endpoint: string, id: string | number, data: Partial<T>): Promise<T>
  async delete(endpoint: string, id: string | number): Promise<void>
};

// Usage
const rooms = await api.getAll<Room>('rooms', { zone_id: 2 });
const room = await api.getById<Room>('rooms', 123);
```

### Custom Hook Pattern

Reusable data fetching hooks:

```typescript
export function useApi<T>(
  endpoint: string,
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const result = await api.get(endpoint);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (options.autoLoad !== false) {
      load();
    }
  }, [endpoint]);

  return { data, loading, error, reload: load };
}

// Usage in components
const { data: rooms, loading, error, reload } = useApi<Room>('rooms');
```

### Component State Management

Simple state management with React hooks:

```typescript
function Admin() {
  const [selectedEntity, setSelectedEntity] = useState<EntityType | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filters, setFilters] = useState<Record<string, any>>({});

  // State management patterns
  const handleEntitySelect = (entity: EntityType) => {
    setSelectedEntity(entity);
    setSelectedItem(null); // Reset selection
  };

  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
  };
}
```

## Crawler Architecture Patterns

### Task-Based Architecture

Modular task system for different exploration modes:

```typescript
// TaskManager coordinates different exploration strategies
export class TaskManager {
  constructor(config: TaskManagerConfig) {
    this.mudClient = config.mudClient;
    this.aiAgent = config.aiAgent;
    this.api = config.api;
  }

  async runTask(taskType: string): Promise<void> {
    const task = this.createTask(taskType);
    await task.execute();
  }
}

// Individual task implementations
export class DocumentActionsTask implements Task {
  async execute(): Promise<void> {
    // Task-specific logic
  }
}
```

### AI Integration Pattern

Consistent AI agent interface:

```typescript
export class AIAgent {
  constructor(
    private ollamaUrl: string,
    private model: string,
    private api: BackendAPI
  ) {}

  async makeDecision(context: string, options: string[]): Promise<string> {
    // AI decision making logic
  }

  async analyzeText(text: string): Promise<ParsedResponse> {
    // Text analysis logic
  }
}
```

### Parser State Management

Centralized parser state with immutable updates:

```typescript
export class MudLogParser {
  private state: ParserState = {
    rooms: new Map(),
    currentRoomKey: null,
    currentZoneName: null,
    zoneMapping: new Map(),
    pendingPortalKey: null,
    pendingFlee: false
  };

  // State updates are immutable
  private updateState(updates: Partial<ParserState>): void {
    this.state = { ...this.state, ...updates };
  }
}
```

## Database Patterns

### Entity Configuration

Centralized entity configuration in `shared/entity-config.ts`:

```typescript
export const ENTITY_CONFIG: Record<string, EntityConfig> = {
  rooms: {
    table: 'rooms',
    idField: 'id',
    nameField: 'name',
    autoIncrement: true,
    uniqueField: 'name',
    jsonFields: ['exits', 'npcs', 'items'],
    booleanFields: ['zone_exit'],
    sortBy: 'lastVisited DESC',
    display: {
      name: 'Rooms',
      singular: 'Room',
      icon: '🚪',
      description: 'Locations in the MUD world'
    }
  }
};
```

### Migration Pattern

Database schema managed through seed scripts:

```typescript
// seed.ts - Single source of truth for schema
async function createTables() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      zone_id INTEGER,
      -- ... other fields
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
```

## Shared Code Patterns

### Type Definitions

Shared TypeScript interfaces in `shared/types.ts`:

```typescript
// Consistent interface definitions
export interface Room {
  id: number;
  name: string;
  description: string;
  zone_id?: number;
  x?: number;
  y?: number;
  visitCount: number;
  // ... other fields
}
```

### Configuration Management

Environment-based configuration:

```typescript
// .env files for different environments
MUD_HOST=apocalypse6.com
MUD_PORT=6000
OLLAMA_URL=http://localhost:11434
BACKEND_URL=http://localhost:3002/api

// Runtime configuration loading
const config = {
  host: process.env.MUD_HOST || 'apocalypse6.com',
  port: parseInt(process.env.MUD_PORT || '6000'),
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434'
};
```

## Testing Patterns

### Manual Test Scripts

Located in `backend/tests/manual/`:

```typescript
// test-generic-api.js - API endpoint testing
async function testRoomCRUD() {
  console.log('Testing room CRUD operations...');

  // Create
  const room = await api.post('/rooms', {
    name: 'Test Room',
    description: 'A test room'
  });

  // Read
  const fetched = await api.get(`/rooms/${room.id}`);

  // Update
  const updated = await api.put(`/rooms/${room.id}`, {
    description: 'Updated description'
  });

  // Delete
  await api.delete(`/rooms/${room.id}`);
}
```

## File Organization Patterns

### Directory Structure
```
backend/
├── src/
│   ├── index.ts              # Server entry point
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic
│   ├── repositories/         # Data access
│   ├── middleware/           # Express middleware
│   ├── validation/           # Input validation
│   ├── errors/               # Error classes
│   └── database.ts           # Database connection
├── tests/
│   └── manual/               # Manual test scripts
└── seed.ts                   # Database seeding

frontend/
├── src/
│   ├── App.tsx               # Main app component
│   ├── api.ts                # API client
│   ├── components/           # UI components
│   ├── pages/                # Page components
│   ├── hooks/                # Custom hooks
│   └── utils/                # Utilities
└── package.json

crawler/
├── src/
│   ├── index.ts              # Crawler entry point
│   ├── mudClient.ts          # MUD connection
│   ├── aiAgent.ts            # AI integration
│   ├── parser.ts             # Text parsing
│   ├── tasks/                # Task implementations
│   └── logger.ts             # Logging
└── package.json

shared/
├── types.ts                  # TypeScript interfaces
└── entity-config.ts          # Entity configuration
```

## Naming Conventions

### Files and Directories
- **PascalCase**: Class names (`BaseRepository.ts`, `RoomService.ts`)
- **camelCase**: Functions, variables, file names (`asyncHandler.ts`, `getAllRooms()`)
- **kebab-case**: Directory names (`error-handler.ts` → but we use camelCase)
- **UPPER_SNAKE_CASE**: Constants (`NODE_WIDTH`, `API_BASE`)

### Database
- **snake_case**: Table names (`room_exits`, `player_actions`)
- **snake_case**: Column names (`zone_id`, `created_at`)
- **PascalCase**: Enum values (when used)

### API Endpoints
- **Plural nouns**: `/api/rooms`, `/api/items`
- **Query parameters**: `?zone_id=2&limit=50`
- **Path parameters**: `/rooms/:id`

## Code Style Guidelines

### TypeScript
- **Strict mode**: Enabled in all `tsconfig.json`
- **Interface over type**: Use interfaces for object shapes
- **Explicit types**: Avoid `any` when possible
- **Optional properties**: Use `?:` for optional fields

### Error Handling
- **Throw early**: Validate inputs at function boundaries
- **Specific errors**: Use appropriate error types
- **Async consistency**: All async functions use `async/await`

### Logging
- **Structured logging**: Include context in log messages
- **Log levels**: `console.log`, `console.warn`, `console.error`
- **Emoji prefixes**: `✅`, `❌`, `⚠️`, `ℹ️` for visual clarity

This document should be updated whenever new patterns are established or existing patterns are modified.</content>
<parameter name="filePath">c:\work\other\Apocalypse VI MUD\docs\technical\CODE_PATTERNS.md