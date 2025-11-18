# Parser Bug Investigation - Spurious Exit (cfhilnoq → lnoq)

## 🔴 CRITICAL BUG STATUS: UNRESOLVED
**Last Updated**: 2025-11-17  
**Investigation Sessions**: 1  
**Attempted Fixes**: 5 (all failed)  
**Root Cause**: Identified but not fully understood

---

## ⚡ TL;DR - Start Here

### The Bug in One Sentence
Room `cfhilnoq` (id 181) gets an incorrect west exit to `lnoq` (id 183) because `currentRoomKey` is wrongly set to cfhilnoq when the player is actually in dfgilnoq, causing the next movement (west to lnoq) to create a spurious exit from the wrong room.

### What We Know
1. ✅ **Root cause mechanism**: currentRoomKey incorrectly updated between dfgilnoq binding and west move
2. ✅ **When it happens**: Between lines 6910-6930 of Astyll Hills log (NPC activity, no player movement)
3. ✅ **Debug infrastructure**: Excellent - extensive logging reveals state at each step
4. ✅ **Partial fix working**: Fix #5 prevents some cases but not this specific bug

### What We Need to Find
1. ❌ **WHY** parser processes "A muddy corridor" when player hasn't moved from dfgilnoq
2. ❌ **WHY** exits variable shows [e,w] then becomes [n,s,w] before findExistingRoomKey call
3. ❌ **WHAT** triggers room parsing without player movement

### Next Fix to Try (Fix #6)
Add exit validation BEFORE setting currentRoomKey:
```typescript
if (lastDirection) {
  const expectedExit = this.getOppositeDirection(lastDirection);
  if (existingRoom.exits && existingRoom.exits.includes(expectedExit)) {
    // Update currentRoomKey - room is validated
  } else {
    // Don't update - this is a false match
  }
}
```

**Location to modify**: Lines 695-722 of `crawler/src/mudLogParser.ts`

### Test Commands
```powershell
cd backend ; npm run seed ; cd ../crawler
npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9
cd ../backend ; node query-db.js "SELECT r.id, r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```

Expected: `exits: 'north, south'`  
Bug present: `exits: 'north, south, west'`

---

## The Bug

### Symptom
Room `cfhilnoq` (id 181, "A muddy corridor") has a spurious **west exit to lnoq** (id 183, "A muddy corridor").

**Expected Exits**:
- North → fghilnoq (id 180, "An unnatural darkness")
- South → dfgilnoq (id 182, "A turn in the cave")

**Actual Exits** (BUG):
- North → fghilnoq OR cfgiklnoq (varies by test) ⚠️
- South → dfgilnoq ✅
- **West → lnoq** ❌ **SPURIOUS EXIT**

### Context
There are THREE "A muddy corridor" rooms in Astyll Hills zone:
1. **cfhilnoq** (id 181): Exits [north, south] - THE BUGGY ROOM
2. **dfgilnoq** (id 182, "A turn in the cave"): Exits [north, west] 
3. **lnoq** (id 183): Exits [east, west]

**Correct Movement Sequence**:
```
cfhilnoq --[south]--> dfgilnoq --[west]--> lnoq
```

**What Parser Creates** (BUG):
```
cfhilnoq --[south]--> dfgilnoq --[west]--> lnoq
cfhilnoq --[WEST]--X--X--X--X--X--X--X--> lnoq  ❌ SPURIOUS!
```

---

## Root Cause Analysis

### Timeline of Events (from debug logs)

1. **Player in cfhilnoq** ✅
   - Room parsed correctly
   - currentRoomKey = `portal:cfhilnoq`
   - Exits: [north, south]

2. **Player moves SOUTH to dfgilnoq** ✅
   - Movement detected: direction = "south"
   - New room: "A turn in the cave" (description: "A sharp turn in the muddy corridor...")
   - Exits: [north, west]
   - Portal bound: `portal:dfgilnoq`
   - previousRoomKey = cfhilnoq
   - Exit created: cfhilnoq --[south]--> dfgilnoq ✅ CORRECT
   - currentRoomKey updated to `portal:dfgilnoq` ✅

3. **💥 BUG TRIGGER: Between dfgilnoq binding and west move** ❌
   - Log shows NPC activity: "Bols arrives from the north", "Bols leaves north", spell casting
   - Parser processes "A muddy corridor" with exits [north, south]
   - This description matches cfhilnoq (not current room!)
   - Exit signature matching: [n,s] matches cfhilnoq in database
   - **CRITICAL ERROR**: currentRoomKey updated to `portal:cfhilnoq` 
   - **Should remain**: `portal:dfgilnoq`

4. **Player moves WEST to lnoq** ❌
   - Movement detected: direction = "west"
   - New room: "A muddy corridor" with exits [east, west]
   - Portal bound: `portal:lnoq`
   - **previousRoomKey captured as**: cfhilnoq ❌ (should be dfgilnoq)
   - Exit created: **cfhilnoq --[west]--> lnoq** ❌ SPURIOUS!

### The Mystery

**Critical Unanswered Question**:  
WHY does parser process "A muddy corridor" with [north, south] exits when player hasn't moved from dfgilnoq?

**Possible Explanations**:
1. NPC movement text ("Bols arrives from the north") triggers room parse
2. Look/exits command output appears in log between movements
3. Other player movement broadcast visible to our player
4. Parser too eager - processes text that resembles room description but isn't
5. lastDirection variable persists incorrectly across room parses
6. exits variable gets corrupted or uses stale data

**Evidence**:
- Log lines 6910-6930 show NO player movement commands (no 'w', 'e', 'n', 's' input)
- Only NPC activity visible in log
- Debug logs show: "PARSING ROOM: 'A muddy corridor' with exits [east,west]"
- But also: "CALLING findExistingRoomKey with exits: [north,south,west]"
- **This proves exits variable changes between room parse and findExistingRoomKey call!**

---

## Attempted Fixes

### Fix #1: Exact Key Matching for Exit Updates (FAILED)
**Location**: Lines 187-202 of mudLogParser.ts  
**Rationale**: Portal binding was updating exits from ANY room with matching name, not just the specific room being bound  
**Implementation**: Only update exits where `oldKey === from_room_key` exactly  
**Result**: ❌ West exit persisted - bug occurs elsewhere, not in binding logic  

### Fix #2: Track Used Namedesc Keys (FAILED)
**Location**: Lines 48-49, 67, 782-802 of mudLogParser.ts  
**Rationale**: When cfhilnoq upgrades from namedesc: to portal:, old namedesc: key freed and lnoq might reuse it, causing confusion  
**Implementation**: Added `usedNamedescKeys` Set to ParserState, track all namedesc: keys ever used, append counter to generate unique keys  
**Result**: ❌ West exit persisted - not a key reuse issue  

### Fix #3: Comprehensive Debug Logging (SUCCESS - REVEALED ROOT CAUSE)
**Location**: Lines 677, 681-683, 690, 692, 695-722, 735-753, 777-790, 895-917  
**Rationale**: Need visibility into parser state at each step to identify exact moment bug occurs  
**Implementation**: 
- Added "🎯 PARSING ROOM" logs showing room name and exits
- Added "📍 PREVIOUS ROOM CAPTURE" showing previousRoomKey setting
- Added "🔍 CALLING findExistingRoomKey" showing exits parameter
- Added "🔍 FIND RESULT" showing lookup result
- Added "MUDDY EXIT CREATED" markers during movement parsing
- Added "MUDDY EXIT UPDATE" markers during portal binding
- Added "MUDDY CORRIDOR EXIT SUMMARY" at parse completion
- Added exit signature comparison logs with "🐛 COMPARING" messages

**Result**: ✅ **Successfully revealed root cause mechanism** - doesn't fix bug but provides foundation for solution  

**Key Findings**:
```
# When parsing lnoq (which HAS exits [e,w]):
🎯 PARSING ROOM: 'A muddy corridor' with exits [east,west]  ✅ CORRECT

# But then immediately after:
🔍 CALLING findExistingRoomKey with exits: [north,south,west]  ❌ WRONG EXITS!
```

This proves `exits` variable is incorrect when passed to findExistingRoomKey!

### Fix #4: Conditional currentRoomKey Update During Binding (FAILED)
**Location**: Lines 180-193 of mudLogParser.ts  
**Rationale**: Debug logs showed currentRoomKey being overwritten during portal binding even after player moved away  
**Implementation**: Only update `this.state.currentRoomKey = portalKey` if `this.state.currentRoomKey === oldKey`  
**Result**: ❌ West exit persisted - bug doesn't occur during binding, happens during room parse  

### Fix #5: Only Update currentRoomKey When Player Moves (PARTIAL SUCCESS)
**Location**: Lines 695-722 of mudLogParser.ts  
**Rationale**: If parser processes room without player movement (NPC activity, look command), shouldn't update currentRoomKey  
**Implementation**:
```typescript
if (lastDirection) {
  console.log(`  🚶 Player moved ${lastDirection} to existing room - updating current room tracking`);
  this.state.currentRoom = existingRoom;
  this.state.currentRoomKey = existingRoomKey;
} else {
  console.log(`  ⏸️  No movement - room parse is incidental, keeping currentRoomKey=${this.state.currentRoomKey}`);
  // Don't update currentRoomKey - this is just a room description that appeared without movement
}
```

**Result**: ⚠️ **Partially working** but west exit persists  

**Why It Works Sometimes**:
- Debug logs show "⏸️  No movement - room parse is incidental" appearing 2 times
- Successfully prevents currentRoomKey update in some cases
- Proves concept is sound

**Why It Fails for cfhilnoq Bug**:
- When cfhilnoq gets matched, `lastDirection` EXISTS (from previous movement)
- Condition `if (lastDirection)` evaluates to true
- currentRoomKey update happens
- Need to validate the room MATCHES the direction traveled, not just that movement occurred

**Side Effect**:
- North exit from cfhilnoq now shows "A dark alcove" instead of "An unnatural darkness"
- May be preventing some correct updates

---

## Key Evidence from Debug Logs

### Log File Locations (Astyll Hills.txt)
- **Line 5872**: First visit to cfhilnoq [n, s]
- **Line 5923**: Bind portal cfhilnoq
- **Line 6845**: Move south from cfhilnoq to dfgilnoq [n, w]
- **Line 6905**: Bind portal dfgilnoq  
- **Lines 6910-6930**: Bols arrives/leaves, spell casting (**NO PLAYER MOVEMENT**)
- **Line 6931**: Move west from dfgilnoq to lnoq [e, w] ← **SPURIOUS EXIT CREATED HERE**
- **Line 6984**: Bind portal lnoq

### Terminal Output Excerpts

**After Fix #5 - Bug Still Present**:
```bash
> node query-db.js "SELECT r.id, r.name, r.portal_key, GROUP_CONCAT(re.direction || ' -> ' || t.name, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id LEFT JOIN rooms t ON re.to_room_id = t.id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"

{
  id: 181,
  name: 'A muddy corridor',
  portal_key: 'cfhilnoq',
  exits: 'north -> A dark alcove, south -> A turn in the cave, west -> A muddy corridor'
}
```
**Analysis**: West exit to "A muddy corridor" (lnoq) is WRONG ❌

**Exit Count Changed**:
- Before Fix #5: 222 exits saved
- After Fix #5: 221 exits saved (one fewer)
- But the WRONG exit persists!

**Fix #5 Working Examples**:
```
⏸️  No movement - room parse is incidental, keeping currentRoomKey=portal:cfgiklnoq...
⏸️  No movement - room parse is incidental, keeping currentRoomKey=portal:cfgiklnoq...
```
Shows Fix #5 prevents some incorrect updates successfully.

---

## Next Steps for Fresh Investigation

### 1. Track lastDirection Variable Lifecycle ⚡ HIGH PRIORITY
**Goal**: Understand when lastDirection is set and when it should be reset

**Questions to Answer**:
- Is lastDirection reset after each room parse?
- Could lastDirection from "south" (cfhilnoq→dfgilnoq) persist when cfhilnoq gets re-matched?
- Should lastDirection be cleared when finding existing room vs new room?

**Implementation**:
```typescript
// Add logging in parseLogFile() or handleMovement()
console.log(`🔄 lastDirection SET TO: ${direction} (previous value: ${this.state.lastDirection})`);
console.log(`🔄 lastDirection RESET (was: ${this.state.lastDirection})`);
```

### 2. Trace exits Variable Corruption ⚡ HIGH PRIORITY
**Goal**: Understand why exits changes between room parse and findExistingRoomKey call

**Evidence**:
```
PARSING ROOM: 'A muddy corridor' with exits [east,west]
CALLING findExistingRoomKey with exits: [north,south,west]
```

**Questions to Answer**:
- Where is `exits` variable declared and populated?
- Is exits modified between room parse and findExistingRoomKey call?
- Could exits be using stale data from previous room parse?
- Are there multiple exit parsing locations that could interfere?

**Implementation**:
```typescript
// In parseRoomBlock() around line 628
let exits: string[] = [];
console.log(`📦 exits DECLARED: []`);

// After exit parsing loop
console.log(`📦 exits POPULATED: [${exits.join(', ')}]`);

// Before findExistingRoomKey call
console.log(`📦 exits BEFORE LOOKUP: [${exits.join(', ')}]`);
```

### 3. Identify Room Parse Triggers ⚡ MEDIUM PRIORITY
**Goal**: Understand what causes parser to process room when player hasn't moved

**Candidates**:
- NPC movement broadcasts: "Bols arrives from the north"
- Look command output
- Exits command output
- Room description appearing in say/chat
- Other player movement visible to our player

**Implementation**:
```typescript
// At start of parseRoomBlock()
console.log(`🎬 ROOM PARSE TRIGGERED`);
console.log(`   Line: ${currentLineNumber}`);
console.log(`   Line Text: ${currentLine}`);
console.log(`   lastDirection: ${this.state.lastDirection}`);
console.log(`   currentRoomKey: ${this.state.currentRoomKey}`);
```

### 4. Validate Exits Before Setting currentRoomKey ⚡ HIGH PRIORITY
**Goal**: Even when lastDirection exists, verify room's exits match before updating currentRoomKey

**Current Logic** (Fix #5):
```typescript
if (lastDirection) {
  // Update currentRoomKey - assumes room is correct because movement happened
}
```

**Proposed Logic** (Fix #6):
```typescript
if (lastDirection) {
  // Verify exits match what we expect for the room we found
  const expectedExit = this.getOppositeDirection(lastDirection);
  
  if (existingRoom.exits && existingRoom.exits.includes(expectedExit)) {
    console.log(`  ✅ Exit validation passed - room has ${expectedExit} exit (reverse of ${lastDirection})`);
    this.state.currentRoom = existingRoom;
    this.state.currentRoomKey = existingRoomKey;
  } else {
    console.log(`  ❌ Exit validation FAILED - room missing ${expectedExit} exit`);
    console.log(`     This is likely a false match - keeping currentRoomKey=${this.state.currentRoomKey}`);
  }
}
```

### 5. Consider Room Signature Beyond Exits 🔵 LOW PRIORITY
**Goal**: Add additional matching criteria to prevent false positives

**Options**:
- Hash of room description
- First N words of description
- Combination: exits + description hash + name
- Zone ID validation

**Implementation**:
```typescript
interface RoomSignature {
  name: string;
  exits: string[];
  descriptionHash: string; // MD5/SHA of first 100 chars
  zoneId?: number;
}
```

---

## Debug Infrastructure (KEEP THESE)

### Critical Debug Logs Added
All debug logs should be PRESERVED for continued investigation:

**Line 677**: Room parse initiation
```typescript
console.log(`🎯 PARSING ROOM: '${name}' with exits [${exits.join(', ')}]`);
```

**Line 681**: Previous room tracking
```typescript
console.log(`📍 PREVIOUS ROOM CAPTURE: previousRoomKey will be set to currentRoomKey = ${this.state.currentRoomKey}...`);
```

**Line 690**: Room lookup call
```typescript
console.log(`🔍 CALLING findExistingRoomKey with name="${name}", exits=[${exits.join(', ')}], zoneId=${zoneId}`);
```

**Line 692**: Room lookup result
```typescript
console.log(`🔍 FIND RESULT: ${existingRoomKey ? `Found ${existingRoomKey}` : 'Not found'}`);
```

**Lines 695-722**: Current room update logic (Fix #5)
```typescript
if (lastDirection) {
  console.log(`  🚶 Player moved ${lastDirection} to existing room - updating current room tracking`);
  // Update currentRoomKey
} else {
  console.log(`  ⏸️  No movement - room parse is incidental, keeping currentRoomKey=${this.state.currentRoomKey}`);
  // Don't update
}
```

**Lines 735-753**: Exit creation tracking
```typescript
if (name === 'A muddy corridor') {
  console.log(`\n🚪 MUDDY EXIT CREATED: ${direction} from ${this.state.currentRoomKey}... to ${roomKey}...`);
}
```

**Lines 187-216**: Portal binding updates
```typescript
if (oldRoom.name === 'A muddy corridor') {
  console.log(`\n🔗 BINDING MUDDY CORRIDOR: ${portalKey}`);
  console.log(`   Updating exits pointing to old key: ${oldKey}`);
}
```

**Lines 777-790**: Parse completion summary
```typescript
const muddyRooms = this.state.rooms.filter(r => r.name === 'A muddy corridor');
console.log(`\n📊 MUDDY CORRIDOR EXIT SUMMARY (${muddyRooms.length} rooms):`);
for (const room of muddyRooms) {
  // Show all exits from muddy corridors
}
```

---

## Test Commands

### Clean Database and Parse
```powershell
# Terminal 1: Clean database
npm run seed

# Terminal 2: Parse with debug output
npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9
```

### Verify Bug Status
```powershell
# Check cfhilnoq exits
node query-db.js "SELECT r.id, r.name, r.portal_key, GROUP_CONCAT(re.direction || ' -> ' || t.name, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id LEFT JOIN rooms t ON re.to_room_id = t.id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"

# Expected: 2 exits (north, south)
# Bug Present: 3 exits (north, south, west)

# Check all muddy corridors
node query-db.js "SELECT r.id, r.name, r.portal_key, r.description, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.name = 'A muddy corridor' AND r.zone_id = 9 GROUP BY r.id"
```

### Search Debug Logs
```powershell
# Check if Fix #5 is working
Select-String -Path "crawler\sessions\Exploration - Astyll Hills.txt" -Pattern "No movement - room parse is incidental"

# Find when cfhilnoq is set as currentRoomKey
Select-String -Path "crawler\parse-output.txt" -Pattern "CURRENT ROOM KEY UPDATED TO: portal:cfhilnoq"

# Find muddy exit creations
Select-String -Path "crawler\parse-output.txt" -Pattern "MUDDY EXIT CREATED"
```

---

## Files Modified

**Main File**: `crawler/src/mudLogParser.ts` (~1447 lines after modifications)

**Key Modifications**:
- Lines 48-49: Added usedNamedescKeys to ParserState interface (Fix #2)
- Line 67: Initialize usedNamedescKeys as empty Set (Fix #2)
- Lines 180-193: Conditional currentRoomKey update during portal binding (Fix #4)
- Lines 187-216: Portal binding update logic with muddy corridor debug logs (Fix #3)
- Lines 695-722: Conditional currentRoomKey update for existing rooms (Fix #5) ⚡ CURRENT STATE
- Lines 735-753: Exit creation debug logging (Fix #3)
- Lines 777-790: Parse completion muddy corridor summary (Fix #3)
- Lines 782-802: getRoomKey() with usedNamedescKeys tracking (Fix #2)
- Lines 895-917: Exit signature matching debug logs (Fix #3)

---

## Summary

**What We Know**:
1. ✅ Root cause mechanism identified: currentRoomKey incorrectly set to cfhilnoq
2. ✅ Timing identified: Between dfgilnoq binding and west move to lnoq
3. ✅ Debug infrastructure excellent - provides detailed state tracking
4. ✅ Fix #5 partially works - prevents some incorrect updates

**What We Don't Know**:
1. ❌ WHY parser processes "A muddy corridor" when player hasn't moved
2. ❌ WHY exits variable changes between parse and findExistingRoomKey call
3. ❌ HOW to prevent the specific cfhilnoq match when player is in dfgilnoq

**Recommended Next Fix Attempt (Fix #6)**:
Add exit validation BEFORE setting currentRoomKey - even when lastDirection exists, verify the found room has the reverse exit that would lead back to previous room.

**Confidence Level**: MEDIUM-HIGH  
We understand the mechanism well. Next fix should target validating the room match is correct, not just that movement occurred.
