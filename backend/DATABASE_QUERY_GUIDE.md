# Database Query Guide

This guide explains how to query the MUD SQLite database directly using the `query-db.js` utility.

## Quick Start

```powershell
# Basic query
node query-db.js "SELECT * FROM rooms LIMIT 5"

# Count records
node query-db.js "SELECT COUNT(*) as total FROM rooms"

# JSON output
node query-db.js "SELECT * FROM zones" --json
```

## Usage

```
node query-db.js "SQL QUERY" [OPTIONS]
```

### Options

- `--json` - Output results as JSON instead of table format
- `--db PATH` - Specify alternate database file (default: `../data/mud-data.db`)
- `--help`, `-h` - Show help message

## Database Schema

### Tables

#### rooms
- `id` - Primary key (INTEGER)
- `portal_key` - Unique portal identifier (TEXT, unique)
- `name` - Room name (TEXT, required)
- `description` - Room description (TEXT)
- `zone_id` - Foreign key to zones (INTEGER)
- `x` - X coordinate (INTEGER)
- `y` - Y coordinate (INTEGER)
- `created_at` - Timestamp (TEXT)
- `updated_at` - Timestamp (TEXT)

#### room_exits
- `id` - Primary key (INTEGER)
- `from_room_id` - Source room (INTEGER, required)
- `to_room_id` - Destination room (INTEGER, required)
- `direction` - Exit direction (TEXT, required)
- `created_at` - Timestamp (TEXT)
- `updated_at` - Timestamp (TEXT)
- Unique constraint: `(from_room_id, direction)`

#### zones
- `id` - Primary key (INTEGER)
- `name` - Zone name (TEXT, unique, required)
- `description` - Zone description (TEXT)
- `created_at` - Timestamp (TEXT)
- `updated_at` - Timestamp (TEXT)

#### items
- `id` - Primary key (INTEGER)
- `name` - Item name (TEXT, required)
- `description` - Item description (TEXT)
- `type` - Item type (TEXT)
- `properties` - JSON properties (TEXT)
- `created_at` - Timestamp (TEXT)
- `updated_at` - Timestamp (TEXT)

#### player_actions
- `id` - Primary key (INTEGER)
- `name` - Action name (TEXT, unique, required)
- `description` - Action description (TEXT)
- `category` - Action category (TEXT)
- `syntax` - Action syntax (TEXT)
- `created_at` - Timestamp (TEXT)
- `updated_at` - Timestamp (TEXT)

## Common Query Patterns

### Rooms

```powershell
# Find room by portal key
node query-db.js "SELECT * FROM rooms WHERE portal_key = 'cfhilnoq'"

# Find rooms by name (partial match)
node query-db.js "SELECT * FROM rooms WHERE name LIKE '%muddy%'"

# Find rooms in a zone
node query-db.js "SELECT * FROM rooms WHERE zone_id = 9"

# Find rooms without coordinates
node query-db.js "SELECT * FROM rooms WHERE x IS NULL OR y IS NULL"

# Find rooms without portal keys
node query-db.js "SELECT * FROM rooms WHERE portal_key IS NULL OR portal_key = ''"

# Count rooms by zone
node query-db.js "SELECT zone_id, COUNT(*) as count FROM rooms GROUP BY zone_id"
```

### Exits

```powershell
# Get all exits from a room
node query-db.js "SELECT * FROM room_exits WHERE from_room_id = 1"

# Get exits for a room by portal key
node query-db.js "SELECT re.* FROM room_exits re JOIN rooms r ON re.from_room_id = r.id WHERE r.portal_key = 'cfhilnoq'"

# Find broken exits (to non-existent rooms)
node query-db.js "SELECT re.* FROM room_exits re LEFT JOIN rooms r ON re.to_room_id = r.id WHERE r.id IS NULL"

# Count exits per room
node query-db.js "SELECT from_room_id, COUNT(*) as exit_count FROM room_exits GROUP BY from_room_id ORDER BY exit_count DESC"

# Find rooms with specific exit direction
node query-db.js "SELECT r.* FROM rooms r JOIN room_exits re ON r.id = re.from_room_id WHERE re.direction = 'west'"
```

### Detailed Room Information

```powershell
# Get room with all exits
node query-db.js "SELECT r.id, r.name, r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"

# Get room with zone information
node query-db.js "SELECT r.*, z.name as zone_name FROM rooms r LEFT JOIN zones z ON r.zone_id = z.id WHERE r.portal_key = 'cfhilnoq'"

# Get room with connected rooms
node query-db.js "SELECT r1.name as from_room, re.direction, r2.name as to_room FROM room_exits re JOIN rooms r1 ON re.from_room_id = r1.id JOIN rooms r2 ON re.to_room_id = r2.id WHERE r1.portal_key = 'cfhilnoq'"
```

### Zones

```powershell
# List all zones
node query-db.js "SELECT * FROM zones"

# Count rooms per zone
node query-db.js "SELECT z.name, COUNT(r.id) as room_count FROM zones z LEFT JOIN rooms r ON z.id = r.zone_id GROUP BY z.id ORDER BY room_count DESC"

# Find zone by name
node query-db.js "SELECT * FROM zones WHERE name LIKE '%Astyll%'"
```

### Items

```powershell
# List all items
node query-db.js "SELECT * FROM items"

# Find item by name
node query-db.js "SELECT * FROM items WHERE name LIKE '%sword%'"

# Count items by type
node query-db.js "SELECT type, COUNT(*) as count FROM items GROUP BY type"
```

### Player Actions

```powershell
# List all actions
node query-db.js "SELECT * FROM player_actions"

# Find action by category
node query-db.js "SELECT * FROM player_actions WHERE category = 'combat'"

# Count actions by category
node query-db.js "SELECT category, COUNT(*) as count FROM player_actions GROUP BY category"
```

## Advanced Queries

### Find Duplicate Rooms

```powershell
# Rooms with same name and description
node query-db.js "SELECT name, description, COUNT(*) as count FROM rooms GROUP BY name, description HAVING count > 1"

# Show all instances of duplicates
node query-db.js "SELECT r.* FROM rooms r WHERE (name, description) IN (SELECT name, description FROM rooms GROUP BY name, description HAVING COUNT(*) > 1) ORDER BY name, id"
```

### Analyze Exit Patterns

```powershell
# Find rooms with mismatched exits (one-way passages)
node query-db.js "SELECT re1.* FROM room_exits re1 LEFT JOIN room_exits re2 ON re1.from_room_id = re2.to_room_id AND re1.to_room_id = re2.from_room_id WHERE re2.id IS NULL"

# Find rooms with no exits
node query-db.js "SELECT r.* FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE re.id IS NULL"
```

### Data Quality Checks

```powershell
# Find rooms with missing data
node query-db.js "SELECT * FROM rooms WHERE description IS NULL OR description = ''"

# Find exits to invalid rooms
node query-db.js "SELECT re.* FROM room_exits re LEFT JOIN rooms r ON re.to_room_id = r.id WHERE r.id IS NULL"

# Find orphaned items (if room_items table exists)
node query-db.js "SELECT i.* FROM items i LEFT JOIN room_items ri ON i.id = ri.item_id WHERE ri.id IS NULL"
```

## Troubleshooting

### Query Returns No Results

1. Check if database file exists: `Test-Path ..\data\mud-data.db`
2. Verify table names: `node query-db.js "SELECT name FROM sqlite_master WHERE type='table'"`
3. Check for case sensitivity in text comparisons
4. Use `LIKE` instead of `=` for partial matches

### Database Locked Error

The database might be in use by another process (backend server). Either:
- Stop the backend server temporarily
- Wait for current operations to complete
- Use the backend API instead for read operations

### Permission Errors

Ensure you have read access to the database file. The `query-db.js` script opens the database in read-only mode by default.

### Truncated Output

For large result sets, use:
- `LIMIT` clause to restrict rows
- `--json` flag for better formatting
- Redirect to file: `node query-db.js "SELECT * FROM rooms" > rooms.json`

## Schema Inspection

```powershell
# List all tables
node query-db.js "SELECT name FROM sqlite_master WHERE type='table'"

# Get table schema
node query-db.js "PRAGMA table_info(rooms)"

# Get indexes
node query-db.js "SELECT name FROM sqlite_master WHERE type='index'"

# Get database stats
node query-db.js "SELECT * FROM sqlite_master"
```

## Best Practices

1. **Always use LIMIT** for exploratory queries to avoid overwhelming output
2. **Use --json** when piping to other tools or for structured data
3. **Test queries on small datasets** before running on full database
4. **Use parameterized queries** in application code (not applicable to CLI tool)
5. **Close backend connections** if experiencing lock issues
6. **Back up database** before running UPDATE/DELETE queries

## Examples for Common Tasks

### Verify Portal Binding

```powershell
# Check if cfhilnoq room exists
node query-db.js "SELECT id, name, portal_key FROM rooms WHERE portal_key = 'cfhilnoq'"

# Check exits from cfhilnoq
node query-db.js "SELECT re.direction, r.name as destination FROM room_exits re JOIN rooms r ON re.to_room_id = r.id WHERE re.from_room_id = (SELECT id FROM rooms WHERE portal_key = 'cfhilnoq')"
```

### Debug Exit Issues

```powershell
# Find all muddy corridor rooms
node query-db.js "SELECT id, portal_key, name, SUBSTR(description, 1, 50) as desc_preview FROM rooms WHERE name = 'A muddy corridor'"

# Check which muddy corridors have west exits
node query-db.js "SELECT r.portal_key, r.name, re.direction FROM rooms r JOIN room_exits re ON r.id = re.from_room_id WHERE r.name = 'A muddy corridor' AND re.direction = 'west'"
```

### Coordinate System Analysis

```powershell
# Find coordinate range for a zone
node query-db.js "SELECT MIN(x) as min_x, MAX(x) as max_x, MIN(y) as min_y, MAX(y) as max_y FROM rooms WHERE zone_id = 9"

# Find rooms at specific coordinates
node query-db.js "SELECT name, portal_key FROM rooms WHERE x = 0 AND y = 0"
```
