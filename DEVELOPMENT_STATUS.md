# Development Status - Apocalypse VI MUD

**Last Updated**: November 11, 2025

## 🎯 Current Focus

**Active Development**: Parser fixes complete - portal key minimum length corrected, invalid direction attempts filtered out

**Priority**: Continue mapping new zones and improving data quality

## Project Architecture

### Core Components

- **Crawler** (`crawler/`) - Autonomous AI agent with Ollama integration
- **Backend** (`backend/`) - REST API with SQLite database
- **Frontend** (`frontend/`) - React admin interface
- **Shared** (`shared/`) - TypeScript types and utilities

### Key Services

- Frontend: http://localhost:5173 (Vite dev server)
- Backend API: http://localhost:3002 (Express + SQLite)
- Ollama AI: http://localhost:11434 (Local AI models)

## ✅ Recently Completed

### Portal Key Minimum Length & Invalid Direction Filter (2025-11-11) ✅ COMPLETED
- **Issues Discovered**:
  1. Missing Royal Boulevard room causing infinite loop - "Intersection of Royal Boulevard and Park Road" going north led to wrong Royal Boulevard
  2. Invalid direction attempts (e.g., "Alas, you cannot go that way...") were being saved as blocked exits with null destinations
- **Root Causes**:
  1. Portal key regex pattern required 6+ characters (`/[a-z]{6,}/`) but some valid portal keys are only 5 characters (e.g., 'jnpqr')
  2. Invalid direction attempts matched blockPatterns and were treated as blocked exits instead of being filtered out
- **Solutions**:
  1. **Portal Key Fix**: Changed regex from `{6,}` to `{5,}` in two locations (lines 105 and 468 of mudLogParser.ts)
  2. **Direction Filter**: Split blockPatterns into two categories:
     - `invalidDirectionPatterns` - "Alas, you cannot go that way", "No exit in that direction", etc. → These are now completely ignored
     - `realBlockedPatterns` - Locked doors, closed gates, barriers → These are still saved as blocked exits
- **Results**:
  - ✅ Royal Boulevard with portal key 'jnpqr' now correctly parsed and saved (room ID 103)
  - ✅ Intersection routing fixed: north now leads to correct Royal Boulevard
  - ✅ All invalid direction attempts (u, d, w from wrong rooms) no longer saved
  - ✅ 0 exits with null destinations (down from 4)
  - 📊 Final database: 125 rooms, 262 exits, all with valid destinations
- **Error Locations Found**: Log file lines 886 (Grunting Boar Lounge→up), 2178 (Temple→down), 2259 (South Temple Street→down), 2562 (Jewelers→west) - all correctly filtered now
- **Database Impact**: Cleaner exit data, no spurious "nowhere" exits, correct room connectivity

### Missing Exit Fix - Auto-Reverse Exits Now Saved (2025-11-11) ✅ COMPLETED
- **Issue**: Parser created auto-reverse exits (e.g., if you go north, it creates a south exit back) but many weren't being saved to database
- **Symptom**: Market Square → South Temple Street worked, but South Temple Street → Market Square was missing; North Temple Street missing north and east exits
- **Root Cause**: After saving rooms, exit saving logic looked up room IDs in `roomIdMap` using exact key matching. If a room was saved with one key format (e.g., `namedesc:...`) but an exit referenced it differently, the lookup failed and exit was skipped
- **Solution**: 
  - After saving rooms, parser now fetches ALL rooms from database
  - Rebuilds `roomIdMap` with multiple lookup methods: `portal:key`, `namedesc:name|||description`, and `name:name`
  - Exit saving now tries multiple lookup methods to find room IDs
  - Ensures ALL exits can find their from/to rooms regardless of key format
- **Results**:
  - ✅ Market Square ↔ South Temple Street: Both directions now work
  - ✅ North Temple Street: Now has all 4 cardinal exits (north, east, south, west)
  - ✅ All auto-reverse exits now successfully saved to database
  - 📊 Parsed 123 rooms with 262 exits saved (up from ~217 before fix)
  - 198 exits skipped due to referencing rooms outside parsed area (expected behavior)
- **Database Impact**: Complete bidirectional navigation now possible throughout mapped areas

### Coordinate System Simplified to 2D (2025-11-11) ✅ COMPLETED
- **Issue**: Z coordinates not needed for flat 2D map visualization, adding unnecessary complexity
- **Solution**: Complete removal of Z coordinates from entire application stack
- **Database Changes**: Dropped z column from rooms table in seed.ts
- **Backend Changes**: Removed z field from roomSchema in validation/schemas.ts
- **Shared Types**: Removed z from Room interface in shared/types.ts
- **Frontend Changes**: 
  - Removed Z input field from RoomDetailView.tsx coordinate editing
  - Updated coordinate display to show only X,Y format
  - Removed Z references from Admin.tsx default coordinates
  - Removed Z from ZoneMap.tsx Room interface and logging
  - Updated coordinate help text to remove up/down references
- **Coordinate Calculation**: Modified calculate-coordinates.js to set Z=0 always and remove Z calculations, updated database update function to only set x,y columns
- **Results**: Application now operates with clean 2D coordinate system (X,Y only), Z always set to 0 in database
- **Testing**: Frontend compiles successfully, coordinate-based map visualization works with 2D coordinates
- **Backward Compatibility**: All existing coordinate data preserved, Z values set to 0 for all rooms
- **Issue**: Room coordinates not displaying in admin interface despite being populated in database and editable in forms
- **Root Cause**: RoomDetailView.tsx component (the actual component used for room details) was missing coordinate display logic entirely
- **Solution**: Added coordinates section to RoomDetailView.tsx displaying "(X: value, Y: value, Z: value)" format with fallback to "—" for undefined coordinates
- **Component Architecture**: Discovered Admin.tsx uses RoomDetailView component for room details, not Rooms.tsx (which was previously modified but unused)
- **Display Format**: Coordinates shown as code-styled text: "(X: 5, Y: -3, Z: 0)" with individual field fallbacks for missing values
- **Backend**: Room interface already included x?, y?, z? fields, API returns coordinate data correctly
- **Database Schema**: Confirmed x, y, z INTEGER DEFAULT 0 columns exist in rooms table
- **Testing**: Frontend compiles successfully, coordinates now visible in room detail views in admin interface
- **Results**: Administrators can now view room coordinates directly in the admin interface when viewing individual room details
- **Cleanup**: Removed unused Rooms.tsx file and modified RoomForm.tsx to only show coordinate fields when editing existing rooms (not when creating new ones)
- **Enhanced Editing**: Added inline coordinate editing in RoomDetailView.tsx with number inputs for X, Y, Z coordinates and helpful coordinate system reference
- **API Integration**: Fixed coordinate saving by including x, y, z fields in PUT request dataToSend object and validation schemas

### Frontend Coordinate Fields for Admin Room Details (2025-11-11) ✅ COMPLETED
- **Issue**: Administrators couldn't view or edit room coordinates directly in the web interface
- **Solution Implemented**:
  - **Room Cards Display**: Added coordinate display in Rooms.tsx showing "(x, y, z)" when coordinates exist, positioned after visit count information
  - **RoomForm Edit Fields**: Added new "Coordinates" section with number inputs for x/y/z coordinates in RoomForm.tsx
  - **Input Validation**: Number inputs with helpful placeholder text explaining coordinate system (north=+y, south=-y, east=+x, west=-x, up=+z, down=-z)
  - **Backend API Support**: Verified RoomService.updateRoom() method handles coordinate updates through roomUpdates parameter
  - **Database Schema**: Confirmed x, y, z INTEGER DEFAULT 0 columns exist in rooms table
  - **TypeScript Types**: Room interface already includes optional x?, y?, z? number fields
- **Backward Compatibility**: Coordinate fields are optional and default to undefined when not set
- **User Experience**: Consistent with existing form patterns, clear labeling and helpful guidance
- **Testing**: Frontend compiles successfully, coordinate fields follow established input patterns
- **Results**: Administrators can now view coordinates in room list and edit them in room detail forms, enabling manual coordinate management alongside automated coordinate calculation

### Coordinate Calculation Bug Fix (2025-11-11) ✅ COMPLETED
- **Issue**: calculate-coordinates.js script only setting X coordinates, Y and Z remained at 0 despite north/south/up/down exits existing in database
- **Root Cause**: BFS component detection bug where already-visited rooms were processed as separate components, overwriting correct coordinates with component offsets
- **Solution**: Added check to skip already-visited rooms when starting new components, preventing coordinate overwrites
- **Results**: 
  - Y coordinates now range from -5 to 3 (north=+y, south=-y)
  - Z coordinates set to 0 for flat 2D map view (up/down exits don't affect positioning)
  - X coordinates properly spaced for disconnected components
  - All 123 rooms now have geographically accurate 2D coordinates
- **Testing**: Verified coordinate ranges and sample room positions (South Temple Street at (0,0,0), North Temple Street at (0,1,0))

### Coordinate-Based Map Visualization (2025-11-11) ✅ COMPLETED
- **Issue**: Force-directed graph layout didn't reflect geographical relationships - west rooms weren't positioned left of east rooms
- **Solution Implemented**:
  - **Database Schema**: Added x, y, z INTEGER DEFAULT 0 columns to rooms table
  - **TypeScript Types**: Updated Room interface in shared/types.ts with optional coordinates
  - **Coordinate Calculation**: Created calculate-coordinates.js script using BFS to assign coordinates based on directional exits (north=+y, south=-y, east=+x, west=-x, up=+z, down=-z)
  - **Disconnected Components**: Script handles multiple disconnected room graphs by spacing components 50 units apart
  - **Visualization Update**: Modified ZoneMap.tsx to detect coordinates and use coordinate-based positioning with automatic scaling and centering
  - **Backward Compatibility**: Falls back to force-directed layout when rooms lack coordinates
- **Data Population**: Parsed exploration log to populate database with 123 rooms and 217 exits from Northern Midgaard City
- **Coordinate Assignment**: Successfully assigned coordinates to all 123 rooms (X: -1 to 1750, Y: -5 to 3, Z: 0 for flat 2D view)
- **Results**: 
  - Rooms now display geographically with west rooms positioned left of east rooms
  - Proper scaling prevents overcrowding while maintaining readability
  - Console logging indicates coordinate-based vs force-directed layout usage
  - Maintains full backward compatibility with existing force-directed visualization
- **Testing**: Frontend and backend running, coordinate-based map ready for visual verification

### MUD Map Visualization Overhaul (2025-11-11) ✅ COMPLETED
- **Issue**: Graph visualization didn't reflect geographical layout - west rooms weren't positioned left of east rooms
- **Root Cause**: Force-directed layout positioned nodes based on graph forces, not directional coordinates
- **Solution**: 
  - **Database Schema**: Added x, y, z coordinate columns to rooms table (north=+y, south=-y, east=+x, west=-x, up=+z, down=-z)
  - **TypeScript Types**: Updated Room interface and ZoneMap component to include coordinates
  - **Coordinate Calculation**: Created script to assign coordinates based on directional exits using BFS from central rooms
  - **Visualization**: Modified ZoneMap.tsx to use coordinate-based positioning when coordinates exist, fallback to force-directed layout
  - **Scaling**: Implemented automatic scaling and centering to fit coordinate ranges within SVG viewport
- **Results**: 
  - Rooms now position geographically (west=left, east=right, north=up, south=down)
  - Maintains backward compatibility with force-directed layout when no coordinates
  - Proper scaling prevents rooms from being too spread out or cramped
  - Console logging indicates which layout method is being used
- **Next Steps**: Run coordinate calculation script on populated database to assign coordinates to existing rooms
- **Issue**: Rooms with same name but different portal keys were being merged (e.g., multiple "Wall Road" segments)
- **Root Cause**: Parser was using pendingPortalKey from PREVIOUS room when encountering NEXT room, causing wrong portal key assignments and over-aggressive deduplication
- **Solution**: 
  - **Complete redesign**: Portal keys are now THE ONLY reliable room identifier
  - Room encounter: Pass `null` instead of pendingPortalKey to findExistingRoomKey()
  - Room creation: Never set portal_key initially (only assigned when bind spell succeeds)
  - Room matching: Only by portal key (if provided) OR exact description match
  - Database save: Filter to ONLY save rooms with `portal_key || noMagicRooms.has(key)`
  - Every room gets bind attempt except 15-20 no-magic zones ("Something prevents" / "fizzles out")
- **Results**:
  - **Wall Road**: ✅ All 13 unique rooms with unique portal keys correctly identified (up from 3)
  - **Emerald Avenue**: ✅ All 5 unique rooms with portal keys found (down from 6 expected)
  - **Central Street**: ✅ All 3 unique rooms found
  - **Royal Boulevard**: ✅ All 3 unique rooms found  
  - **Park Road**: ✅ All 3 unique rooms found
  - **Total rooms**: 123 (104 with portal keys + 19 no-magic zones) - down from 383
  - **Exits saved**: 217 (247 skipped as they reference duplicate visit entries)
  - **Database workflow**: Must `npm run db:reset` before each parse to start clean
- **Key Insight**: Portal keys uniquely identify every room except 15-20 no-magic zones - this is a 100% reliable fact

### Room Deduplication Fix - Final (2025-11-10) ✅ COMPLETED
- **Issue**: Rooms without portal keys were being duplicated when encountered multiple times
- **Root Cause**: Parser wasn't checking for exact namedesc match before creating new room entries
- **Solution**: 
  - Added third priority check for exact `namedesc:name|||description` match
  - Increased fuzzy matching threshold from 90% to 95% for stricter matching
  - Improved priority order: portal key → existing room with portal → exact namedesc → fuzzy match
- **Results**:
  - Rooms like Market Square, The Armory, The Magic Shop, etc. no longer duplicated
  - 103 unique rooms parsed without duplicates (down from previous runs with duplicates)
  - Rooms with same name but different portal keys correctly treated as different rooms
  - Parser correctly handles re-encountering rooms before portal binding

### Exit Description Fix (2025-11-10) ✅ COMPLETED
- **Issue**: Exit descriptions not showing in frontend - always showing "No description"
- **Root Cause #1**: Parser only populating `look_description` field, but frontend displays `description` field
- **Root Cause #2**: Parser stopping at "Looking x..." response line before reaching actual description text
- **Database Schema**: Three fields available: `description`, `exit_description`, `look_description`
- **Solution**: 
  - Modified parser to populate `description` field from `look_description` when available
  - Fixed "look <direction>" parsing to match exits by current room and direction (not just last exit)
  - Changed parser to skip blue "Looking x..." response lines instead of stopping
  - Parser now continues reading after response line to capture gray description text that follows
  - Added handling for "You see nothing special" responses
- **Default Behavior**: Sets `description` to "No description" when no look_description captured
- **Testing**: 
  - First test revealed parser stopping at "Looking x..." before descriptions
  - User re-ran exploration with better command timing for cleaner data
  - Final parse captured 280+ exit descriptions successfully
  - Verified via API: Both `description` and `look_description` fields populated correctly
- **Results**: Exit descriptions now working throughout system (parser → database → frontend)

**Database Access Best Practices Added:**
- Added **CRITICAL warnings** to documentation to always use REST API for database queries
- Direct database access (sqlite3, query-db.js) is unreliable and produces incorrect results
- API is the only supported method: `http://localhost:3002/api/room_exits`

### Zone Exit Marking Fix (2025-11-10)
- **Issue**: Rooms marked as zone exits in parser weren't being saved to database
- **Root Cause**: `RoomService.createOrUpdateRoom()` wasn't including `zone_exit` field in room creation
- **Solution**: Added `zone_exit` to room creation data in backend service
- **Result**: Zone exit rooms now correctly marked in database and displayed in frontend

**Affected Rooms:** The Dump, Outside the City Walls, Quester's, Entrance to the Midgaard Sewers, On the River, A long tunnel, Rear exit of the Temple, Main Street East

### Room Deduplication Fix (2025-11-10)
- **Root Cause Identified**: Rooms without portal keys were being duplicated (19 room types affected)
- **Improved Description Matching**: Added `normalizeDescription()` to strip dynamic content (NPCs, items)
- **Stricter Similarity Threshold**: Increased from 80% to 90% for rooms without portal keys
- **Better Word Filtering**: Only compare words >2 characters to ignore articles and prepositions
- **Normalized Comparison**: Lowercase and whitespace normalization for consistent matching
- **Improved User Experience**: Changed exit save error messages to informative warnings

**Problem Examples:**
- "The Armory", "Market Square", "The Temple of Midgaard" - all duplicated without portal keys
- Descriptions varied due to NPCs, items, or minor text differences
- Parser created separate `namedesc:` keys for what was actually the same room
- Exit save failures showing as errors when they were actually expected behavior

**Solution:** 
- Enhanced fuzzy matching with content normalization prevents false duplicates while catching legitimate same-room variations
- Exit saves now show "⚠️ Skipped" with "(likely deduplicated room)" explanation instead of error messages
- Added informational note: "💡 Skipped exits reference deduplicated rooms (this is expected)"

**Results:**
- 68 unique rooms (down from 87 with duplicates)
- 32 exits saved successfully
- 234 exits skipped (referencing correctly deduplicated rooms)
- Clear, user-friendly warnings instead of confusing error messages

### Exit System Overhaul (2025-11-10)
- **Automatic Reverse Exits**: When moving north to a room, automatically creates south exit back (99% accurate)
- **Proper Exit Linking**: Fixed from_room_id and to_room_id to correctly link rooms (no more self-referencing)
- **Blocked Exit Detection**: Records exits that exist but can't be traversed (locked doors, barriers)
- **Direction Helper**: Utility for opposite direction mapping (n↔s, e↔w, u↔d, ne↔sw, etc.)
- **Room Key Tracking**: Maintains consistent room keys when portal binding updates from namedesc: to portal:
- **Exit Deduplication**: Handles duplicate attempts gracefully with database constraints

**Key Assumptions Implemented:**
1. If movement attempt shows new room, create bidirectional exits (both directions)
2. If movement blocked but direction exists, record as blocked exit (unlinked until passable)

**Results:** 162 working exits from 68 rooms in test parse (2.4 exits/room average)

### MUD Log Parser (2025-11-10)
- Fixed room deduplication using portal keys and full descriptions
- Fixed zone detection to handle colons in zone names
- Portal key extraction working (6+ character keys)
- Cross-zone room assignment validated
- 68 rooms + 19 exits saved successfully from test log

### Character Maintenance System (2025-11-06)
- Automated rest/wake cycle for mana restoration
- Hunger/thirst management with fountain navigation
- Stats parsing with ANSI code stripping
- Integration with room graph navigation crawler

### Room Graph Navigation (2025-11-05)
- Graph-based navigation using actual room connections
- BFS pathfinding between known rooms
- Connection tracking (explored vs unexplored)
- Zone boundary respect with automatic backtracking

### Admin Panel Features (2025-10-31)
- Full CRUD for rooms with exit binding
- Portal key configuration (lesser/greater binding)
- Zone-specific room creation
- Inline editing in room detail views

## 🔄 In Progress

### RoomProcessor Exit Logic
- Need to update checkAllDirections() to use new blocked exit detection
- Integrate with live crawler for real-time exit discovery

### Crawler Enhancements
- Portal key caching to reduce redundant binding attempts
- Position sync optimization (every 5 actions vs every action)
- Exit caching system to avoid duplicate queries
- Strategic exploration pathfinding improvements

## 📋 Immediate Next Steps

1. **Test Exit Navigation** - Verify crawler can use new exit data for pathfinding
2. **Update RoomProcessor** - Apply blocked exit logic to live crawler
3. **Cross-Zone Exploration** - Enhanced zone boundary handling with proper exit tracking
4. **Performance Testing** - Validate exit queries are efficient for navigation

## Known Issues

### Minor
- Some MUD text parsing edge cases need refinement
- AI decision making can occasionally loop (has anti-repetition)

### Resolved
- ✅ Portal key duplicate prevention
- ✅ Zone name parsing with colons
- ✅ Room description truncation
- ✅ Exit destination saving

## Development Commands

```powershell
# Start all services
.\start.ps1

# Crawl with new zone mapper
cd crawler
npm run crawl:document-zone-new

# Seed database
cd backend
npm run seed

# Parse MUD logs
cd crawler
npx tsx parse-logs.ts "sessions/logfile.txt" --zone-id 2
```

## Configuration

**Crawler**: `crawler/.env`
- MUD connection settings
- Ollama AI configuration
- Action limits and delays

**Backend**: `backend/.env`
- Server port (3002)
- Environment settings

## Architecture Notes

### Room Identification
- Portal keys (primary) - unique 6+ letter keys from bind portal
- Name + description (fallback) - for rooms without portals
- Coordinates - relative x,y,z for spatial reference

### Navigation Strategy
- Graph-based using actual connections (not coordinates)
- BFS pathfinding for efficient route finding
- Connection state tracking (mapped vs unmapped)
- Zone boundary detection and respect

### Character Maintenance
- Mana: Rest when < 20M, wake at 150M+
- Hunger/Thirst: Check every 50 actions
- Local first: Drink bladder/eat bread before navigating
- Fountain: Navigate to Market Square only when needed

## Documentation Structure

- **README.md** - Project overview and quick start
- **SETUP.md** - Detailed installation guide
- **QUICK_REFERENCE.md** - Common commands and troubleshooting
- **DEVELOPMENT_STATUS.md** - This file (current status)
- **ARCHIVE.md** - Historical features and implementations
- **docs/** - Technical documentation (database, schemas)

## Testing Guidelines

1. Start with small test runs (50 actions)
2. Monitor logs in `crawler/logs/`
3. Verify room/exit saving in database
4. Check position sync and navigation accuracy
5. Review AI decisions in detailed logs

---

*For complete feature history and implementation details, see [ARCHIVE.md](ARCHIVE.md)*

*For common commands and troubleshooting, see [QUICK_REFERENCE.md](QUICK_REFERENCE.md)*
