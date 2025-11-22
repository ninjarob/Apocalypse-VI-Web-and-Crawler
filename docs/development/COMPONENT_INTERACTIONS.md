# Component Interactions Documentation

## Overview

This document describes how components interact across the Apocalypse VI MUD system, including data flow, communication patterns, and integration points between the crawler, backend, and frontend.

## System Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Crawler     │    │     Backend     │    │    Frontend     │
│   (AI Agent)    │◄──►│   (REST API)    │◄──►│  (React App)    │
│                 │    │                 │    │                 │
│ • MUD Client    │    │ • Express.js     │    │ • Admin UI      │
│ • Parser        │    │ • SQLite DB      │    │ • Map Viewer    │
│ • AI Decision   │    │ • Validation     │    │ • Data Tables   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Shared Types  │
                    │   (TypeScript)  │
                    └─────────────────┘
```

## Data Flow Patterns

### 1. Room Discovery Flow

```
Crawler → Parser → Backend API → Database → Frontend
   ↓        ↓         ↓           ↓         ↓
• Telnet  • Parse   • Validate  • Store   • Display
• Explore • Extract • Save     • Query   • Visualize
• Learn   • Portal  • Update   • Filter  • Admin
          • Keys    • Stats    • Sort
```

**Detailed Flow:**
1. **Crawler** connects to MUD server via Telnet
2. **Crawler** sends exploration commands and receives room data
3. **Parser** extracts room information, exits, and portal keys
4. **Parser** calls Backend API to save room data
5. **Backend** validates and stores data in SQLite database
6. **Frontend** queries API to display rooms on map/admin interface

### 2. Player Action Discovery Flow

```
Crawler → AI Agent → Parser → Backend → Database → Frontend
   ↓         ↓         ↓        ↓        ↓         ↓
• Execute • Analyze  • Extract • Save   • Store   • Display
• Commands• Patterns • Syntax  • Update • Query   • Filter
• Learn   • Categorize• Help   • Stats  • Search  • Export
```

### 3. Real-time Status Updates

```
Crawler → Backend API → Database → Frontend (WebSocket/Polling)
   ↓         ↓            ↓         ↓
• Update  • Save       • Store   • Display
• Status  • Timestamp  • Query   • Refresh
• Progress• Log        • History • Monitor
```

## Component Communication

### Crawler ↔ Backend

**Protocol:** HTTP REST API
**Data Format:** JSON
**Error Handling:** Graceful degradation (crawler continues if backend down)

**Key Integration Points:**
- `BackendAPI.saveRoom()` - Room persistence
- `BackendAPI.savePlayerAction()` - Command discovery
- `BackendAPI.updateCrawlerStatus()` - Progress tracking
- `BackendAPI.getRoomByName()` - Room deduplication

**Error Scenarios:**
- Backend unavailable → Crawler logs warning, continues exploration
- Validation errors → Crawler logs error, skips invalid data
- Network timeouts → Automatic retry with backoff

### Backend ↔ Frontend

**Protocol:** HTTP REST API
**Data Format:** JSON
**Authentication:** None (development only)

**Key Integration Points:**
- Generic CRUD endpoints (`/api/:type`)
- Specialized endpoints (`/api/stats`, `/api/rooms/by-name/:name`)
- Real-time data queries for admin interface
- Map visualization data (rooms, exits, coordinates)

**Data Synchronization:**
- Frontend polls for updates (no real-time WebSocket yet)
- Admin operations trigger immediate re-queries
- Map data cached in component state

### Frontend ↔ Crawler

**Protocol:** Indirect (via Backend API)
**Data Flow:** Frontend monitors crawler status through backend

**Integration Points:**
- Crawler status display in admin interface
- Start/stop crawler controls (future feature)
- View crawler logs and discovered data

## Shared Data Models

### Core Entities

All components share TypeScript interfaces defined in `shared/types.ts`:

```typescript
// Room data shared across all components
interface Room {
  id: number;
  name: string;
  description: string;
  zone_id: number;
  x?: number;
  y?: number;
  terrain: string;
  flags: string;
  portal_key?: string;
  visit_count: number;
}

// Player actions discovered by crawler, displayed in frontend
interface PlayerAction {
  id: number;
  name: string;
  type: string;
  syntax?: string;
  description?: string;
  category?: string;
  documented: boolean;
  discovered: Date;
  lastTested?: Date;
  successCount: number;
  failCount: number;
}
```

### Entity Configuration

Shared configuration in `shared/entity-config.ts` defines:

- Database table mappings
- Field validation rules
- Unique constraints
- Auto-increment settings
- Foreign key relationships

## Error Handling Patterns

### Crawler Error Handling

```typescript
// Graceful degradation - continue even if backend fails
async saveRoom(room: Partial<Room>): Promise<Room | null> {
  try {
    const response = await axios.post(`${this.baseUrl}/rooms`, room);
    return response.data;
  } catch (error) {
    this.logBackendError('save room', error);
    return null; // Continue crawling
  }
}
```

### Backend Error Handling

```typescript
// Structured error responses
app.use(errorHandler);
app.use(notFoundHandler);

// Validation middleware
async function validateCreate(type: string) {
  // Validate entity data
  // Throw BadRequestError on validation failure
}
```

### Frontend Error Handling

```typescript
// Component-level error boundaries
try {
  const data = await api.getAll<Room>('rooms');
  setRooms(data);
} catch (error) {
  setError('Failed to load rooms');
  console.error(error);
}
```

## State Management

### Crawler State

- **Parser State:** Current room, pending actions, zone mapping
- **AI State:** Learning progress, decision models, exploration strategy
- **Connection State:** MUD server connection, retry logic

### Backend State

- **Database State:** SQLite connections, transaction management
- **API State:** Request validation, response formatting
- **Service State:** Business logic, data transformation

### Frontend State

- **Component State:** React hooks, local state management
- **Global State:** Context providers for shared data
- **Cache State:** API response caching, optimistic updates

## Performance Considerations

### Crawler Performance

- **Batch Operations:** Save multiple entities together
- **Connection Pooling:** Reuse HTTP connections
- **Error Throttling:** Prevent log spam during outages
- **Memory Management:** Stream processing for large datasets

### Backend Performance

- **Database Indexing:** Optimized queries for common operations
- **Connection Limits:** SQLite concurrent connection handling
- **Validation Caching:** Cache expensive validation operations
- **Response Compression:** Minimize payload sizes

### Frontend Performance

- **Lazy Loading:** Load data on demand
- **Virtual Scrolling:** Handle large datasets efficiently
- **Memoization:** Cache expensive computations
- **Optimistic Updates:** Immediate UI feedback

## Monitoring and Debugging

### Logging Integration

- **Crawler Logs:** `crawler/logs/` directory
- **Backend Logs:** Console output with Morgan middleware
- **Frontend Logs:** Browser console and error boundaries

### Health Checks

- **Backend Health:** `/health` endpoint
- **Database Health:** Connection validation
- **Crawler Health:** Status updates and heartbeat

### Debugging Tools

- **Database Browser:** Direct SQLite inspection
- **API Testing:** Postman/Insomnia for endpoint testing
- **Network Monitoring:** Browser dev tools for frontend debugging
- **Log Analysis:** Structured logging for issue diagnosis

## Future Enhancements

### Planned Improvements

1. **Real-time Communication**
   - WebSocket integration for live updates
   - Real-time crawler progress monitoring
   - Live map updates during exploration

2. **Advanced Caching**
   - Redis integration for performance
   - Intelligent cache invalidation
   - Distributed caching for scalability

3. **Enhanced Error Recovery**
   - Automatic retry with exponential backoff
   - Circuit breaker patterns
   - Data reconciliation for failed operations

4. **Performance Monitoring**
   - APM integration (New Relic, DataDog)
   - Custom metrics and alerting
   - Performance profiling tools

This document should be updated whenever new component interactions are added or existing patterns are modified.