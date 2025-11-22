# Testing Guide

## Overview

This guide covers testing strategies and practices for the Apocalypse VI MUD project, including unit tests, integration tests, manual testing procedures, and quality assurance processes.

## Testing Architecture

### Test Types

1. **Unit Tests** - Individual functions and modules
2. **Integration Tests** - Component interactions and API endpoints
3. **End-to-End Tests** - Full user workflows
4. **Manual Tests** - Exploratory testing and edge cases

### Test Locations

```
Apocalypse VI MUD/
├── backend/
│   └── tests/           # Backend tests
│       ├── unit/        # Unit tests
│       ├── integration/ # Integration tests
│       └── manual/      # Manual test procedures
├── frontend/
│   └── (future)         # Frontend tests
├── crawler/
│   └── (future)         # Crawler tests
└── scripts/             # Test utilities
```

## Backend Testing

### Unit Tests

**Framework:** Jest + Supertest
**Location:** `backend/tests/unit/`

#### Running Unit Tests

```bash
cd backend
npm test
```

#### Test Structure

```typescript
// Example unit test
import { RoomService } from '../../src/services/RoomService';
import { RepositoryFactory } from '../../src/repositories/GenericRepository';

describe('RoomService', () => {
  let roomService: RoomService;

  beforeEach(() => {
    roomService = new RoomService();
  });

  describe('getRoomById', () => {
    it('should return room when found', async () => {
      const mockRoom = { id: 1, name: 'Test Room' };
      jest.spyOn(RepositoryFactory, 'getRepository').mockReturnValue({
        findById: jest.fn().mockResolvedValue(mockRoom)
      });

      const result = await roomService.getRoomById('1');

      expect(result).toEqual(mockRoom);
    });

    it('should throw error when room not found', async () => {
      jest.spyOn(RepositoryFactory, 'getRepository').mockReturnValue({
        findById: jest.fn().mockResolvedValue(null)
      });

      await expect(roomService.getRoomById('999')).rejects.toThrow('Room not found');
    });
  });
});
```

### Integration Tests

**Framework:** Jest + Supertest
**Location:** `backend/tests/integration/`

#### API Endpoint Testing

```typescript
import request from 'supertest';
import app from '../../src/index';

describe('Rooms API', () => {
  describe('GET /api/rooms', () => {
    it('should return all rooms', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should filter rooms by zone', async () => {
      const response = await request(app)
        .get('/api/rooms?zone_id=2')
        .expect(200);

      response.body.forEach((room: any) => {
        expect(room.zone_id).toBe(2);
      });
    });
  });

  describe('POST /api/rooms', () => {
    it('should create a new room', async () => {
      const roomData = {
        name: 'Test Room',
        description: 'A test room',
        zone_id: 2
      };

      const response = await request(app)
        .post('/api/rooms')
        .send(roomData)
        .expect(201);

      expect(response.body).toMatchObject(roomData);
      expect(response.body.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
```

### Manual Testing

**Location:** `backend/tests/manual/`

#### Database Testing Checklist

- [ ] Database connection established
- [ ] All tables created correctly
- [ ] Seed data loaded properly
- [ ] Foreign key constraints working
- [ ] Indexes created for performance
- [ ] Data integrity maintained

#### API Testing Checklist

- [ ] All endpoints respond correctly
- [ ] CRUD operations work for all entities
- [ ] Validation errors returned properly
- [ ] Authentication/authorization working
- [ ] Error handling graceful
- [ ] Response formats consistent

#### Data Pipeline Testing

**Room Discovery Pipeline:**
1. Start with clean database (`SKIP_ROOMS_SEEDING=true`)
2. Run log parser on exploration data
3. Verify rooms saved with correct data
4. Run coordinate calculation
5. Verify coordinates assigned correctly
6. Check frontend displays rooms properly

**Command:**
```bash
# Test complete pipeline
cd backend
npm run seed  # With SKIP_ROOMS_SEEDING=true
npm run parse-logs "../scripts/sessions/Exploration - Northern Midgaard City.txt" --zone-id 2
node calculate-coordinates.js 2
```

## Frontend Testing

### Component Testing (Future)

**Framework:** React Testing Library + Jest
**Location:** `frontend/src/__tests__/`

#### Component Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { RoomList } from '../components/RoomList';
import { api } from '../api';

jest.mock('../api');

describe('RoomList', () => {
  const mockRooms = [
    { id: 1, name: 'Temple', zone_id: 2 },
    { id: 2, name: 'Shop', zone_id: 2 }
  ];

  beforeEach(() => {
    (api.getAll as jest.Mock).mockResolvedValue(mockRooms);
  });

  it('displays room list', async () => {
    render(<RoomList />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    expect(await screen.findByText('Temple')).toBeInTheDocument();
    expect(screen.getByText('Shop')).toBeInTheDocument();
  });

  it('filters rooms by zone', async () => {
    render(<RoomList zoneId={2} />);

    expect(await screen.findByText('Temple')).toBeInTheDocument();
    expect(screen.queryByText('Other Zone Room')).not.toBeInTheDocument();
  });
});
```

### E2E Testing (Future)

**Framework:** Playwright or Cypress
**Location:** `frontend/e2e/`

#### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('admin can view and edit rooms', async ({ page }) => {
  await page.goto('/admin');

  // Check room list loads
  await expect(page.locator('[data-testid="room-list"]')).toBeVisible();

  // Click on a room
  await page.locator('[data-testid="room-item"]').first().click();

  // Check room details page
  await expect(page.locator('[data-testid="room-name"]')).toBeVisible();

  // Edit room
  await page.locator('[data-testid="edit-button"]').click();
  await page.fill('[data-testid="description-input"]', 'Updated description');
  await page.click('[data-testid="save-button"]');

  // Check success message
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

## Crawler Testing

### Parser Testing

**Location:** `crawler/src/__tests__/`

#### Parser Unit Tests

```typescript
import { MudLogParser } from '../parser';

describe('MudLogParser', () => {
  let parser: MudLogParser;

  beforeEach(() => {
    parser = new MudLogParser();
  });

  describe('parseRoomTitle', () => {
    it('should extract room name from ANSI-formatted title', () => {
      const input = '\u001b[0;36mThe Temple of Midgaard\u001b[0m';
      const result = parser.parseRoomTitle(input);

      expect(result).toBe('The Temple of Midgaard');
    });

    it('should handle plain text titles', () => {
      const input = 'A Dark Alley';
      const result = parser.parseRoomTitle(input);

      expect(result).toBe('A Dark Alley');
    });
  });

  describe('parseExits', () => {
    it('should extract exit directions', () => {
      const input = 'Obvious exits: north, south, east';
      const result = parser.parseExits(input);

      expect(result).toEqual(['north', 'south', 'east']);
    });

    it('should handle empty exits', () => {
      const input = 'Obvious exits: none';
      const result = parser.parseExits(input);

      expect(result).toEqual([]);
    });
  });
});
```

### Integration Testing

**Location:** `crawler/integration-tests/`

#### Crawler Integration Tests

```typescript
import { Crawler } from '../index';
import { BackendAPI } from '../api';

describe('Crawler Integration', () => {
  let crawler: Crawler;
  let mockApi: jest.Mocked<BackendAPI>;

  beforeEach(() => {
    mockApi = {
      saveRoom: jest.fn(),
      updateCrawlerStatus: jest.fn()
    } as any;

    crawler = new Crawler(mockApi);
  });

  describe('Room Discovery', () => {
    it('should save discovered rooms', async () => {
      const mockRoomData = {
        name: 'Test Room',
        description: 'A test room',
        exits: ['north', 'south']
      };

      await crawler.processRoomData(mockRoomData);

      expect(mockApi.saveRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Room',
          description: 'A test room'
        })
      );
    });

    it('should update status during exploration', async () => {
      await crawler.startExploration();

      expect(mockApi.updateCrawlerStatus).toHaveBeenCalledWith('exploring');
    });
  });
});
```

## Test Data Management

### Test Database

**Setup:**
```bash
# Create test database
cd backend
npm run seed:test

# Run tests against test database
npm test -- --testPathPattern=integration
```

### Mock Data

**Location:** `backend/tests/fixtures/`

```typescript
// Test data fixtures
export const mockRooms = [
  {
    id: 1,
    name: 'The Temple',
    description: 'A grand temple',
    zone_id: 2,
    portal_key: 'temple'
  },
  {
    id: 2,
    name: 'Dark Alley',
    description: 'A narrow alley',
    zone_id: 2,
    portal_key: 'alley'
  }
];

export const mockPlayerActions = [
  {
    name: 'look',
    type: 'command',
    description: 'Look around the room'
  },
  {
    name: 'north',
    type: 'movement',
    description: 'Move north'
  }
];
```

## Continuous Integration

### GitHub Actions (Future)

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Run integration tests
        run: npm run test:integration
```

### Test Coverage

**Target Coverage:** 80% minimum

```bash
# Generate coverage report
npm test -- --coverage

# View coverage report
open coverage/lcov-report/index.html
```

## Manual Testing Procedures

### Room Discovery Testing

1. **Setup Test Environment**
   ```bash
   cd backend
   SKIP_ROOMS_SEEDING=true npm run seed
   ```

2. **Run Parser on Test Data**
   ```bash
   npm run parse-logs "../scripts/sessions/test-exploration.txt" --zone-id 99
   ```

3. **Verify Data Integrity**
   ```bash
   # Check rooms were saved
   sqlite3 mud-data.db "SELECT COUNT(*) FROM rooms WHERE zone_id = 99;"

   # Check exits were created
   sqlite3 mud-data.db "SELECT COUNT(*) FROM room_exits WHERE from_room_id IN (SELECT id FROM rooms WHERE zone_id = 99);"
   ```

4. **Run Coordinate Calculation**
   ```bash
   node calculate-coordinates.js 99
   ```

5. **Verify Frontend Display**
   - Start frontend
   - Navigate to admin interface
   - Check test zone appears on map
   - Verify room connections display correctly

### Performance Testing

1. **Load Testing**
   ```bash
   # Test API endpoints under load
   artillery quick --count 10 --num 50 http://localhost:3002/api/rooms
   ```

2. **Database Performance**
   ```bash
   # Test query performance
   time sqlite3 mud-data.db "SELECT * FROM rooms WHERE zone_id = 2;"
   ```

3. **Memory Usage**
   ```bash
   # Monitor crawler memory usage
   cd crawler && npm run dev &
   watch -n 1 'ps aux | grep node'
   ```

## Debugging and Troubleshooting

### Common Test Issues

1. **Database Connection Errors**
   - Ensure database file exists
   - Check file permissions
   - Verify SQLite is installed

2. **API Test Failures**
   - Check server is running
   - Verify port configuration
   - Check CORS settings

3. **Crawler Test Timeouts**
   - Increase timeout values
   - Check network connectivity
   - Verify MUD server availability

### Debugging Tools

- **Database Browser:** `sqlite3 mud-data.db`
- **API Testing:** Postman, Insomnia, or curl
- **Network Monitoring:** Wireshark for crawler connections
- **Memory Profiling:** Chrome DevTools for frontend
- **Log Analysis:** Structured logging in all components

## Best Practices

### Test Organization

1. **Arrange-Act-Assert Pattern**
   ```typescript
   it('should create room successfully', () => {
     // Arrange
     const roomData = { name: 'Test Room' };

     // Act
     const result = await api.create('rooms', roomData);

     // Assert
     expect(result.name).toBe('Test Room');
     expect(result.id).toBeDefined();
   });
   ```

2. **Descriptive Test Names**
   ```typescript
   describe('RoomService.getRoomById', () => {
     it('should return room when found', () => {
       // Test implementation
     });

     it('should throw NotFoundError when room does not exist', () => {
       // Test implementation
     });
   });
   ```

3. **Test Data Isolation**
   ```typescript
   beforeEach(async () => {
     // Clean up test data
     await cleanupTestData();

     // Setup fresh test data
     await setupTestData();
   });
   ```

### Mocking Strategies

1. **API Mocking**
   ```typescript
   jest.mock('../api');
   const mockApi = api as jest.Mocked<typeof api>;
   mockApi.getAll.mockResolvedValue(mockData);
   ```

2. **Database Mocking**
   ```typescript
   jest.mock('../database');
   const mockDb = database as jest.Mocked<typeof database>;
   mockDb.query.mockResolvedValue(mockResult);
   ```

3. **External Service Mocking**
   ```typescript
   jest.mock('axios');
   (axios.get as jest.Mock).mockResolvedValue({ data: mockResponse });
   ```

## Future Testing Improvements

1. **Visual Regression Testing**
   - Screenshot comparison for UI changes
   - Map visualization accuracy testing

2. **Performance Testing**
   - Load testing for concurrent users
   - Memory leak detection
   - Database query optimization

3. **Security Testing**
   - Input validation testing
   - SQL injection prevention
   - Authentication bypass testing

4. **Accessibility Testing**
   - Screen reader compatibility
   - Keyboard navigation
   - Color contrast validation

This testing guide should be updated as new testing practices are adopted and test coverage expands.