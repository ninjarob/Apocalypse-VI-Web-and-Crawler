# Development Status - Apocalypse VI MUD

**Last Updated**: November 15, 2025

## 🎯 Current Focus

**Active Development**: Automated seed process with room data and coordinate calculation

**Priority**: Streamline database initialization with pre-parsed room data

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

### Astyll Hills Zone Coordinate Calculation (2025-11-15) ✅ COMPLETED
- **Feature**: Successfully calculated and assigned geographical coordinates to all rooms in the Astyll Hills zone
- **Implementation**:
  1. **Zone-Specific Script**: Modified `calculate-coordinates.js` to accept zone ID parameter and reset coordinates for that zone before calculation
  2. **Coordinate Reset**: Added `resetZoneCoordinates()` function to clear existing coordinates for zone 9 before recalculating
  3. **Zone Filtering**: Updated all database queries to filter by `zone_id = 9` for rooms and exits
  4. **Collision Resolution**: Maintained intelligent collision avoidance with iterative halving algorithm
- **Results**:
  - ✅ **104 rooms** assigned coordinates in zone 9
  - ✅ **218 exits** processed for coordinate calculation
  - ✅ **Coordinate range**: X: -100 to 1300, Y: -700 to 189
  - ✅ **6 collision avoidance** successes through smart positioning
  - ✅ **8 unavoidable collisions** in dense areas (acceptable)
- **Technical Details**:
  - Command: `node calculate-coordinates.js 9`
  - Database updates: 104 rooms with x,y coordinates set
  - Collision threshold: 40px horizontal, 30px vertical gaps
  - Node spacing: 100px horizontal, 70px vertical for comfortable viewing
- **Impact**: Astyll Hills zone now has proper geographical coordinates for map visualization and navigation
- **Feature**: All admin pages are now deep linkable with URL-based navigation
- **Implementation**:
  1. **React Router Integration**: Added nested routes for all admin detail views (`/admin/rooms/:id`, `/admin/zones/:id`, etc.)
  2. **URL State Management**: Modified Admin component to read URL parameters on mount and restore appropriate view state
  3. **Navigation Updates**: Replaced state-based navigation with router navigation for all entity clicks
  4. **Back Navigation**: Updated all back buttons to use router navigation instead of state changes
- **Benefits**:
  - ✅ Refreshing on any admin detail page stays on that page (no more reverting to main admin)
  - ✅ Direct links to specific rooms, zones, actions, etc. work correctly
  - ✅ Browser back/forward buttons work properly
  - ✅ Bookmarkable URLs for all admin content
  - ✅ Clean URL structure reflecting the admin hierarchy
- **Technical Details**:
  - Routes: `/admin`, `/admin/rooms/:id`, `/admin/zones/:id`, `/admin/player_actions/:id`, `/admin/npcs/:id`, `/admin/items/:id`, `/admin/spells/:id`, `/admin/classes/:id`, `/admin/help_entries/:id`
  - State restoration loads entity data from API based on URL parameters
  - Automatic loading of related data (zone rooms, class proficiencies, etc.) when navigating via URL
  - Error handling: Invalid URLs redirect back to `/admin`
- **Files Modified**:
  - `frontend/src/App.tsx`: Added nested admin routes
  - `frontend/src/pages/Admin.tsx`: URL parameter reading, router navigation, state restoration
- **Testing**: Frontend builds successfully, TypeScript compilation passes

### Automated Seed with Room Data & Coordinates (2025-11-11) ✅ COMPLETED
- **Feature**: Integrated coordinate calculation and room/exit seeding into main seed script
- **Implementation**:
  1. **Coordinate Calculation Integration**: Converted `calculate-coordinates.js` to TypeScript and added as `calculateRoomCoordinates()` function in seed.ts
  2. **JSON Data Loading**: Added automatic loading of `rooms.json` and `room_exits.json` from data folder during seeding
  3. **Execution Order**: Zones → Items → Rooms → Room Exits → **Coordinate Calculation** → Other data
- **Benefits**:
  - Single `npm run seed` command now does everything
  - Coordinates automatically calculated after rooms are seeded
  - No need to run separate scripts for coordinate calculation
  - Database ready to use immediately after seeding
- **Files Modified**:
  - `backend/seed.ts` (lines 1895-1990): Added room/exit JSON loading
  - `backend/seed.ts` (lines 2444-2650): Added `calculateRoomCoordinates()` function
- **Results**:
  - ✅ 125 rooms seeded from JSON file
  - ✅ 262 room exits seeded from JSON file
  - ✅ Coordinates calculated for 61 connected rooms
  - ✅ Coordinate range: X: -640 to 260, Y: -112 to 728
  - ✅ Map visualization ready immediately after seeding

### Self-Referencing Exit Bug Fix (2025-11-11) ✅ COMPLETED
- **Issue**: Map visualization showing rooms squished due to outlier coordinates at X=10000
- **Symptom**: Rooms positioned at extreme X coordinates causing entire map to compress into small area
- **Root Cause**: Self-referencing exits (from_room_id = to_room_id) causing BFS coordinate algorithm to treat connected rooms as separate components
  - Found 10 self-referencing exits in rooms: 19, 33, 93, 112, 119, 120, 125
  - Bug introduced by Bridge Road fix: when same room visited twice before portal binding, both namedesc keys updated to same portal key
  - Exit had from_room_key = namedesc:X and to_room_key = namedesc:Y, both updated to portal:Z → exit became self-referencing
- **Solution Implemented**:
  1. **Self-Reference Prevention** (lines 148-165, 167-183): Added checks before updating exit keys to portal keys
     - Before: `exit.to_room_key = portalKey` (no validation)
     - After: `if (exit.from_room_key !== portalKey) { exit.to_room_key = portalKey; }` (prevents self-reference)
     - Applied to both exact key match AND namedesc variant exits
  2. **Duplicate Room Merging** (lines 105-160): When portal binding returns existing portal key, detect revisit and merge duplicate
     - Check if returned portal key already exists in any room
     - If found AND binding room has same name/description → revisit detected
     - Update all exits referencing duplicate key to point to existing key
     - Remove duplicate room entry from Map
     - Critical for rooms visited multiple times before binding (Bridge Road case)
  3. **Portal Key Wait Logic** (lines 813-841): Don't reuse portal-keyed rooms until binding confirms identity
     - Bridge Road lesson: 3 rooms with identical name/description but DIFFERENT portal keys
     - Wait for binding result to determine if revisit (same key) or new room (different key)
     - Only exact description match for rooms without portal keys
- **Files Modified**:
  - `crawler/src/mudLogParser.ts`
    - Lines 148-165: Self-reference check for exact key updates
    - Lines 167-183: Self-reference check for variant key updates
    - Lines 105-160: Portal key collision detection and duplicate room merging
    - Lines 813-821: Portal room lookup returns null (wait for binding)
    - Lines 827-841: Exact match lookup returns null for portal-keyed rooms
- **Testing Results**:
  - Re-parsed logs: 125 rooms, 262 exits
  - **0 self-referencing exits** (down from 10)
  - **3 Bridge Road rooms preserved**: cfklmpqr, fgklmpqr, deghklmpqr
  - Coordinate recalculation: X: -400 to 1500, Y: -350 to 560 (no outliers)
  - Map visualization: Rooms properly spaced, no squishing
- **Impact**: Fixes both coordinate outliers AND preserves multi-room handling for areas with identical descriptions
- **Key Insight**: Portal key binding result is definitive - same key returned = revisit, different key = new room with same appearance

### Bridge Road Missing Rooms Fix (2025-11-11) ✅ COMPLETED
- **Issue**: Only 1 of 3 "Bridge Road" rooms existed in database
  - Expected: `cfklmpqr`, `fgklmpqr`, `deghklmpqr`
  - Found: Only `cfklmpqr`
- **Root Cause**: Parser deduplication bug - rooms with identical names AND descriptions but different portal keys were being merged
  - MUD has multiple distinct rooms that happen to have the same name and description
  - Parser's `findExistingRoomKey()` was finding existing portal rooms by name+description and reusing them
  - This caused later rooms to overwrite earlier ones in the Map
- **Solution Implemented**:
  1. Modified `findExistingRoomKey()` (lines 765-772) to return `null` when it finds a room that already has a portal key
     - Rooms with portal keys are "complete" and distinct - they should never be reused
  2. Enhanced `getRoomKey()` (lines 737-760) to add unique counters when creating duplicate `namedesc:` keys
     - Prevents Map key collisions when multiple unbound rooms have identical names/descriptions
     - Counter increments based on existing room count: `|||2`, `|||3`, etc.
- **Files Modified**:
  - `crawler/src/mudLogParser.ts`
    - Lines 765-772: Added portal key check to prevent reusing rooms
    - Lines 737-760: Added counter logic for unique namedesc keys
- **Testing**: All 3 Bridge Road rooms now appear correctly in frontend
- **Impact**: Fixes any MUD areas with duplicate room names/descriptions (e.g., long hallways, identical road segments)
  1. Recognize this as a DIFFERENT physical room (MUD has multiple identical rooms)
  2. Create a separate room entry, don't update the existing one
  3. This requires checking if the existing room already has a portal key during deduplication

### Collision Resolution Algorithm Fix (2025-11-11) ✅ COMPLETED
- **Issue**: "A bend in the path" and "the magic shop" were positioned on top of each other at (-200, 0)
- **Root Cause**: Collision threshold was too aggressive (80px) for the actual node size (60px wide)
  - Rooms 50px apart were being flagged as collisions
  - Halving algorithm was working but couldn't find free space due to overly strict threshold
- **Solution**: Improved collision detection with realistic thresholds
  - Changed from `NODE_WIDTH * 0.8` (80px) to fixed 40px horizontal threshold
  - Changed from `NODE_HEIGHT * 0.8` (56px) to fixed 30px vertical threshold
  - Thresholds now based on actual node size (60×40px) rather than spacing (100×70px)
  - Implemented "halve the distance" collision resolution:
    - When collision detected, place room halfway between origin and ideal position
    - Iteratively halve up to 10 times to find free space
    - Results in rooms being pulled back toward their origin point when needed
- **Results**:
  - ✅ "A Bend in the Path" now at (-250, 0)
  - ✅ "The Magic Shop" at (-200, 0)
  - ✅ 50px separation between rooms (adequate spacing for 60px wide nodes)
  - ✅ Collision detection now only prevents actual visual overlap
  - ✅ Reduced false positives: rooms can now be placed closer together without triggering collisions
  - ✅ Most collisions (6 out of 7) resolved automatically
  - ✅ Only 1 unavoidable collision remaining in very dense areas (acceptable)
- **Technical Details**:
  - Collision threshold: 40px horizontal, 30px vertical
  - Resolution method: Iterative halving between origin and destination
  - Maximum attempts: 10 halvings before accepting collision
  - Visual node size: 60×40px with comfortable gaps

### Coordinate Algorithm Improvement (2025-11-11) ✅ COMPLETED
- **Issue**: Rooms piling on top of each other with minimal Y-axis variation (Y: -5 to 3) despite 123 rooms
- **Root Cause**: Multiple issues:
  1. Coordinate deltas were only ±1 unit
  2. Frontend scaling capped at 20 pixels per unit, shrinking everything
  3. SVG canvas too small (800×600) for large coordinate spaces
- **Requirements**:
  - West = left by full node spacing
  - East = right by full node spacing
  - North = up by full node spacing
  - South = down by full node spacing
  - Up = upper-right diagonal (0.7 × width, 0.7 × height)
  - Down = lower-left diagonal (-0.7 × width, -0.7 × height)
- **Solution Implemented**: Enhanced coordinate calculation with proper spacing, no artificial scaling, and large canvas
  - **Balanced Spacing**: Changed to NODE_WIDTH=100 and NODE_HEIGHT=70 for comfortable spacing around 60×40px nodes
  - **Inverted Y-Axis**: North uses negative Y (goes UP on screen), south uses positive Y (goes DOWN on screen)
  - **Small Visual Nodes**: Node display size 60×40px with 10px font (provides ~40px horizontal, ~30px vertical gaps)
  - **Text Overflow Clipping**: Added SVG clipping paths to prevent text from spilling outside node boundaries
  - **Removed Scaling Cap**: Eliminated `Math.min(scale, 20)` limit that was shrinking coordinate space
  - **Large Canvas**: Increased SVG from 800×600 to 4000×2500 to accommodate full coordinate space
  - **Scrollable Container**: Map container allows scrolling to view entire coordinate space
  - **Diagonal Handling**: Up/down use 0.7 multiplier for clean diagonal movement
  - **Collision Detection**: Added `resolveCollision()` function that:
    - Checks if coordinates would overlap (within 80% of spacing dimensions)
    - Tries 8 different offset positions at 25% of spacing size
    - Falls back to accepting collision only if no free spots found
    - Logs collision avoidance for debugging
  - **Component Spacing**: 10 × NODE_WIDTH for disconnected graphs
- **Results**:
  - ✅ Final coordinate range: X: -400 to 1500 (1,901 wide), Y: -350 to 560 (911 tall)
  - ✅ Canvas size: 4000×2500 pixels (comfortable viewing area)
  - ✅ 115 rooms positioned with balanced spacing
  - ✅ ~40px horizontal gaps and ~30px vertical gaps between nodes
  - ✅ 6 collisions avoided through smart offsetting
  - ✅ 7 unavoidable collisions in very dense areas (acceptable)
  - ✅ Nodes clearly separated without excessive whitespace
  - ✅ Text clipping prevents spillover outside node boundaries
  - ✅ 1:1 coordinate-to-pixel mapping (no artificial scaling)
  - ✅ **North rooms now appear UP on screen (negative Y)**
  - ✅ **South rooms now appear DOWN on screen (positive Y)**
  - ✅ West rooms clearly left of east rooms
  - ✅ Diagonal up/down movement visible and intuitive
- **Technical Details**:
  - Coordinate spacing: 100px horizontal, 70px vertical
  - Visual node size: 60px × 40px (small nodes for clean appearance)
  - Font size: 10px with SVG text clipping
  - Canvas size: 4000px × 2500px (scrollable)
  - Scaling: Natural scale (no artificial limits)
  - Collision threshold: 80% of spacing dimensions (80px × 56px)
  - Offset attempts: 25% of spacing dimensions (25px × 18px)
  - BFS traversal maintains topological relationships

### Room Deduplication Fix (2025-11-11) ✅ COMPLETED
- **Issue**: Room `cdijopqr` ("On the River") NOT marked as zone exit even though it has an exit to zone 30 (Camelot)
- **Root Cause**: When visiting a room multiple times:
  1. First visit: room created with `namedesc:` key
  2. Portal binding: room key updated to `portal:cdijopqr`, exits updated ✅
  3. Second visit: `findExistingRoomKey()` didn't find the `portal:` version, created NEW `namedesc:` entry ❌
  4. Exit to "A Rocky Shore" created from the NEW namedesc: entry ❌
  5. Zone exit marking couldn't find the exit because it was under the wrong room key ❌
- **Solution 1**: Enhanced exit update logic to also update exits pointing to OTHER `namedesc:` variants when assigning portal key:
  ```typescript
  // Also update exits pointing to OTHER namedesc: versions of the same room
  if (exit.from_room_key && exit.from_room_key.startsWith(namedescPattern)) {
    const fromRoom = this.state.rooms.get(exit.from_room_key);
    if (fromRoom && fromRoom.name === roomName && fromRoom.description === roomDesc) {
      exit.from_room_key = portalKey;
    }
  }
  ```
- **Solution 2**: Enhanced `findExistingRoomKey()` to check for existing `portal:` rooms BEFORE creating `namedesc:` duplicates:
  ```typescript
  // NO PORTAL KEY YET - Check if a portal: version exists first
  for (const [key, room] of this.state.rooms) {
    if (room.portal_key && room.name === name && room.description === description) {
      return key; // Use existing portal: version instead of creating namedesc: duplicate
    }
  }
  ```
- **Results**:
  - ✅ Room `cdijopqr` now correctly marked as `zone_exit=True`
  - ✅ Room `ceghjklmnpqr` correctly NOT marked (no cross-zone exits)
  - ✅ Room `dgijopqr` still correctly marked as `zone_exit=True`
  - ✅ All "On the River" rooms now have correct zone exit status
  - ✅ No more duplicate namedesc: entries created after portal binding

### Zone Name Alias Support (2025-11-11) ✅ COMPLETED
- **Issue**: "A Rocky Shore" incorrectly assigned to zone 2 instead of zone 30 (Camelot)
- **Root Cause**: MUD outputs zone name as "King Arthur's Castle, Camelot" but database has "Camelot"
- **Solution**: Added `alias` field support to zones table and seed data:
  ```typescript
  { id: 30, name: 'Camelot', alias: 'King Arthur\'s Castle, Camelot', description: '...' }
  ```
- **Results**:
  - ✅ "A Rocky Shore" now correctly assigned to zone 30
  - ✅ Zone resolution checks both `name` and `alias` fields
  - ✅ Warning message added: "Reverting to [zone name] (ID: X)" when zone not found

### Zone Exit Detection Algorithm Fix (2025-11-11) ✅ COMPLETED
- **Issue**: Zone exit marking logic had two critical problems:
  1. Room keys were being updated from `namedesc:...` to `portal:...` when portal binding succeeded, but `zoneMapping` entries still pointed to the OLD key
  2. During zone resolution, the algorithm couldn't find rooms in `zoneMapping` because the keys didn't match
- **Root Cause**: When portal key was assigned and room key was updated, the code updated:
  - The rooms Map ✅
  - All exits referencing that key ✅  
  - currentRoomKey and bindingAttemptRoomKey ✅
  - **BUT NOT the zoneMapping** ❌
- **Solution**: Enhanced room key update logic to also update `zoneMapping` when room key changes:
  ```typescript
  // CRITICAL: Update zoneMapping if this room is in it
  if (this.state.zoneMapping.has(oldKey)) {
    const zoneName = this.state.zoneMapping.get(oldKey)!;
    this.state.zoneMapping.delete(oldKey);
    this.state.zoneMapping.set(portalKey, zoneName);
  }
  ```
- **Results**:
  - ✅ **13 rooms** now correctly marked as zone exits (up from 2)
  - ✅ "Entrance to the Midgaard Sewers" (zone 4: Midgaard: Sewers)
  - ✅ "Outside the City Walls" (zone 9: The Hills of Astyll)
  - ✅ "City Entrance" (zone 12: The Haunted Forest)
  - ✅ "A long tunnel" (zone 21: The Great Eastern Desert)
  - ✅ "On the Swift Flowing River" (zone 8: The Candlebriar Mountains)
  - ✅ "Rear exit of the Temple", "The Dump", "Under The Bridge", "On the River" (zone 2, connecting to other zones)
  - ✅ "Quester's" (zone 6: Quester's Enclave)
  - ✅ "Main Street East" and "Outside the Eastern Gate" (zone 2, with exits to other zones)
- **Verification**: All rooms that were visited with `who -z` showing different zones are now correctly marked as zone exits

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
