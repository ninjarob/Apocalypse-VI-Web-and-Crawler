# Frontend API Documentation

## Overview

The frontend provides a TypeScript API client for interacting with the backend REST API. It includes generic CRUD operations and specialized methods for common use cases.

**Location:** `frontend/src/api.ts`

## Architecture

The API client is organized into:

- **Generic methods** - CRUD operations for any entity type
- **Specialized methods** - Custom endpoints (stats, crawler status)
- **Legacy methods** - Backward compatibility methods
- **Type exports** - Shared TypeScript interfaces

## Generic Methods

### getAll<T>(endpoint: string, filters?: Record<string, any>): Promise<T[]>
Fetch all entities of a type with optional filtering.

**Parameters:**
- `endpoint` (string) - API endpoint (e.g., 'rooms', 'npcs')
- `filters` (object) - Query parameters for filtering

**Example:**
```typescript
import { api } from './api';

// Get all rooms in zone 2
const rooms = await api.getAll<Room>('rooms', { zone_id: 2 });

// Get all spells
const spells = await api.getAll<Spell>('spells');
```

### getById<T>(endpoint: string, id: string | number): Promise<T>
Fetch a single entity by ID.

**Parameters:**
- `endpoint` (string) - API endpoint
- `id` (string|number) - Entity ID

**Example:**
```typescript
const room = await api.getById<Room>('rooms', 123);
```

### create<T>(endpoint: string, data: Partial<T>): Promise<T>
Create a new entity.

**Parameters:**
- `endpoint` (string) - API endpoint
- `data` (object) - Entity data to create

**Example:**
```typescript
const newRoom = await api.create<Room>('rooms', {
  name: 'New Room',
  description: 'A new location',
  zone_id: 2
});
```

### update<T>(endpoint: string, id: string | number, data: Partial<T>): Promise<T>
Update an existing entity.

**Parameters:**
- `endpoint` (string) - API endpoint
- `id` (string|number) - Entity ID
- `data` (object) - Updated entity data

**Example:**
```typescript
const updatedRoom = await api.update<Room>('rooms', 123, {
  description: 'Updated description'
});
```

### delete(endpoint: string, id: string | number): Promise<void>
Delete an entity.

**Parameters:**
- `endpoint` (string) - API endpoint
- `id` (string|number) - Entity ID

**Example:**
```typescript
await api.delete('rooms', 123);
```

## Specialized Methods

### getStats(): Promise<Stats>
Get database statistics for all entity types.

**Returns:** Object with counts for each entity type

**Example:**
```typescript
const stats = await api.getStats();
// Returns: { rooms: 125, npcs: 45, items: 78, ... }
```

### getCrawlerStatus(): Promise<CrawlerStatus>
Get current crawler status and progress.

**Returns:** Crawler status object with current activity and timestamp

**Example:**
```typescript
const status = await api.getCrawlerStatus();
// Returns: { status: 'exploring', timestamp: '2025-01-23T...' }
```

## Legacy Methods

### get(path: string): Promise<any>
Legacy method for GET requests.

**Parameters:**
- `path` (string) - Full API path (e.g., '/rooms?zone_id=2')

### post(path: string, data: any): Promise<any>
Legacy method for POST requests.

### put(path: string, data: any): Promise<any>
Legacy method for PUT requests.

### deleteRaw(path: string): Promise<any>
Legacy method for DELETE requests.

**Note:** These methods are kept for backward compatibility but the generic methods are preferred.

## Type Definitions

The API exports shared TypeScript interfaces:

```typescript
import type {
  Room,
  NPC,
  Item,
  Spell,
  Race,
  Abilities,
  SavingThrow,
  SpellModifier,
  ElementalResistance,
  PhysicalResistance,
  Stats,
  CrawlerStatus
} from './api';
```

## Error Handling

All methods throw errors for HTTP error responses. Error handling should be done at the call site:

```typescript
try {
  const rooms = await api.getAll<Room>('rooms');
  // Handle success
} catch (error) {
  console.error('Failed to fetch rooms:', error);
  // Handle error
}
```

## Usage Patterns

### Component Integration
```typescript
// React component example
import React, { useState, useEffect } from 'react';
import { api, Room } from '../api';

export const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const data = await api.getAll<Room>('rooms');
        setRooms(data);
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {rooms.map(room => (
        <div key={room.id}>{room.name}</div>
      ))}
    </div>
  );
};
```

### Admin Operations
```typescript
// Admin component for CRUD operations
import { api, Room } from '../api';

export const RoomManager = () => {
  const createRoom = async (roomData: Partial<Room>) => {
    try {
      const newRoom = await api.create<Room>('rooms', roomData);
      console.log('Room created:', newRoom);
    } catch (error) {
      console.error('Failed to create room:', error);
    }
  };

  const updateRoom = async (id: number, updates: Partial<Room>) => {
    try {
      const updatedRoom = await api.update<Room>('rooms', id, updates);
      console.log('Room updated:', updatedRoom);
    } catch (error) {
      console.error('Failed to update room:', error);
    }
  };

  const deleteRoom = async (id: number) => {
    try {
      await api.delete('rooms', id);
      console.log('Room deleted');
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };
};
```

### Real-time Updates
```typescript
// Polling for crawler status
import { api, CrawlerStatus } from '../api';

export const CrawlerMonitor = () => {
  const [status, setStatus] = useState<CrawlerStatus | null>(null);

  useEffect(() => {
    const pollStatus = async () => {
      try {
        const currentStatus = await api.getCrawlerStatus();
        setStatus(currentStatus);
      } catch (error) {
        console.error('Failed to get crawler status:', error);
      }
    };

    // Initial fetch
    pollStatus();

    // Poll every 5 seconds
    const interval = setInterval(pollStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>Crawler Status: {status?.status || 'Unknown'}</h3>
      <p>Last updated: {status?.timestamp}</p>
    </div>
  );
};
```

## Configuration

The API client uses a base URL defined as:

```typescript
const API_BASE = '/api';
```

This assumes the frontend is served from the same domain as the backend API.

## Dependencies

- `axios` - HTTP client library
- Shared types from `@shared/types`

## Best Practices

1. **Use generic methods** for standard CRUD operations
2. **Handle errors appropriately** at the component level
3. **Type your responses** using the provided TypeScript interfaces
4. **Use filters** to reduce data transfer for large datasets
5. **Consider caching** for frequently accessed data
6. **Implement loading states** for better UX