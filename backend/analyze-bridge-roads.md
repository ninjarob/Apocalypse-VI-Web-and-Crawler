# Bridge Road Analysis

## Summary
There should be 3 "Bridge Road" rooms in Midgaard with different portal keys:

### 1. Bridge Road (`cfklmpqr`) ✅ IN DATABASE
- **ID**: 67
- **Description**: "The stone cobbled path leads to the Midgaard Bridge to the south. This bridge separates Northern and Southern Midgaard. People of all shapes, sizes, and races traverse this path."
- **Exits**: north, south
- **Status**: ✅ Present in database

### 2. Bridge Road (`fgklmpqr`) ❌ MISSING
- **Log Line**: 12455
- **Description**: Unknown (need to find full room description in log)
- **Context**: Between two Bridge Road segments
- **Look exits**: "Bridge Road continues to the north/south"
- **Status**: ❌ Portal key seen in log but room NOT in database

### 3. Bridge Road (`deghklmpqr`) ❌ MISSING  
- **Log Line**: 12573
- **Description**: Same as #1 - "The stone cobbled path leads to the Midgaard Bridge to the south..."
- **Exits**: 
  - north → Midgaard Bridge
  - south → Bridge Intersection
- **Status**: ❌ Portal key seen in log but room NOT in database

## Root Cause
The parser likely has a room deduplication bug where:
1. Rooms with the same name and same description are being treated as duplicates
2. When a portal key is assigned, it updates the existing room instead of recognizing it as a separate room
3. This causes rooms #2 and #3 to either:
   - Not be saved at all, OR
   - Overwrite room #1's data

## Investigation Needed
1. Check if rooms.json (the export) has all 3 rooms but database only has 1
2. Check parser logic for how it handles duplicate names with different portal keys
3. Look at the room deduplication logic in the parser

## Portal Keys Reference
- `cfklmpqr` - Present ✅
- `fgklmpqr` - Missing ❌
- `deghklmpqr` - Missing ❌
