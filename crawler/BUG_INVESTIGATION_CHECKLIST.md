# Parser Bug Investigation - Quick Checklist

## 🎯 Before Starting Work

- [ ] Read `SESSION_HANDOFF.md` for overview
- [ ] Review `crawler/BUG_VISUAL_DIAGRAM.md` to visualize the bug
- [ ] Understand the root cause from `crawler/PARSER_BUG_INVESTIGATION.md`
- [ ] Check current state of `crawler/src/mudLogParser.ts` (lines 695-722)

## 🧪 Testing Workflow

### 1. Clean Database
```powershell
cd backend
npm run seed
```
**Expected Output**: 
```
✅ Database seeding complete!
📊 Seeded 125 rooms, 262 exits
```

### 2. Parse Astyll Hills
```powershell
cd ../crawler
npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9
```
**Expected Output**: 
```
🏠 Rooms saved! 105 saved, 0 failed
🚪 Exits saved! 221 saved, 113 skipped  (or similar)
```

### 3. Verify Bug Status
```powershell
cd ../backend
node query-db.js "SELECT r.id, r.name, r.portal_key, GROUP_CONCAT(re.direction || ' -> ' || t.name, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id LEFT JOIN rooms t ON re.to_room_id = t.id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```

**Bug Fixed If**:
```json
{
  "id": 181,
  "name": "A muddy corridor",
  "portal_key": "cfhilnoq",
  "exits": "north -> An unnatural darkness, south -> A turn in the cave"
}
```
✅ Only 2 exits (north, south)

**Bug Still Present If**:
```json
{
  "id": 181,
  "name": "A muddy corridor",
  "portal_key": "cfhilnoq",
  "exits": "north -> <any room>, south -> A turn in the cave, west -> A muddy corridor"
}
```
❌ 3 exits (includes west)

### 4. Check Debug Logs (Optional)
```powershell
# From root directory
Select-String -Path "crawler\parse-output.txt" -Pattern "MUDDY EXIT CREATED"
Select-String -Path "crawler\parse-output.txt" -Pattern "No movement - room parse is incidental"
```

### 5. Check All Muddy Corridors
```powershell
node query-db.js "SELECT r.id, r.name, r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.name = 'A muddy corridor' AND r.zone_id = 9 GROUP BY r.id"
```

**Expected**: 2 rooms with name "A muddy corridor"
- cfhilnoq: exits "north, south"
- lnoq: exits "east, west"

**Also Check**: dfgilnoq (name is "A turn in the cave" but description mentions muddy corridor)

## 🔍 Investigation Checklist

### Understanding the Bug
- [ ] Can explain why cfhilnoq gets spurious west exit
- [ ] Understand the movement sequence: fghilnoq → cfhilnoq → dfgilnoq → lnoq
- [ ] Know that bug happens between dfgilnoq binding and west move
- [ ] Understand that currentRoomKey incorrectly set to cfhilnoq

### Review Previous Fixes
- [ ] Fix #1: Exact key matching (failed - wrong target)
- [ ] Fix #2: usedNamedescKeys tracking (failed - not a reuse issue)
- [ ] Fix #3: Debug logging (SUCCESS - revealed root cause)
- [ ] Fix #4: Binding conditional (failed - bug not in binding)
- [ ] Fix #5: lastDirection check (partial - doesn't validate match)

### Key Questions to Answer
- [ ] WHY is "A muddy corridor" parsed when player hasn't moved?
- [ ] WHY do exits change from [e,w] to [n,s,w]?
- [ ] WHAT triggers room parsing without player movement?
- [ ] WHEN should lastDirection be reset?

## 🛠️ Next Fix Attempt (Fix #6)

### Option A: Exit Validation (Recommended)
**Goal**: Validate room has reverse exit before updating currentRoomKey

**Location**: Lines 695-722 of `crawler/src/mudLogParser.ts`

**Code** (replace existing if/else):
```typescript
if (lastDirection) {
  const expectedExit = this.getOppositeDirection(lastDirection);
  
  if (existingRoom.exits && existingRoom.exits.includes(expectedExit)) {
    console.log(`  ✅ Exit validation passed - room has ${expectedExit} exit`);
    this.state.currentRoom = existingRoom;
    this.state.currentRoomKey = existingRoomKey;
  } else {
    console.log(`  ❌ Exit validation FAILED - room missing ${expectedExit} exit`);
    console.log(`     Expected: [${expectedExit}], Room has: [${existingRoom.exits?.join(', ')}]`);
    console.log(`     Keeping currentRoomKey=${this.state.currentRoomKey}`);
  }
} else {
  console.log(`  ⏸️  No movement - room parse is incidental`);
}
```

**Need Helper Method**:
```typescript
private getOppositeDirection(direction: string): string {
  const opposites: Record<string, string> = {
    'north': 'south', 'south': 'north',
    'east': 'west', 'west': 'east',
    'up': 'down', 'down': 'up'
  };
  return opposites[direction] || direction;
}
```

### Option B: Exits Variable Investigation (Also Important)
**Goal**: Find where exits variable gets corrupted

**Add Logging**:
```typescript
// Around line 628 where exits is declared
let exits: string[] = [];
console.log(`📦 exits DECLARED at line ${lineNumber}`);

// After exit parsing loop (around line 644)
console.log(`📦 exits POPULATED: [${exits.join(', ')}]`);

// Before findExistingRoomKey call (around line 690)
console.log(`📦 exits BEFORE LOOKUP: [${exits.join(', ')}]`);
console.log(`📦 exits reference: ${exits}`);
```

### Option C: lastDirection Lifecycle Tracking
**Goal**: Understand when lastDirection is set/reset

**Add Logging**:
```typescript
// Wherever lastDirection is set
console.log(`🔄 lastDirection SET TO: '${direction}' (was: '${this.state.lastDirection}')`);
this.state.lastDirection = direction;

// At start of parseRoomBlock
console.log(`🎬 ROOM PARSE - lastDirection=${this.state.lastDirection}, currentRoomKey=${this.state.currentRoomKey}`);
```

## ✅ Success Criteria

### Bug Fixed
- [ ] cfhilnoq has exactly 2 exits (north, south)
- [ ] No west exit from cfhilnoq to lnoq
- [ ] All 3 muddy corridors have correct exits
- [ ] Parse completes with 221-222 exits (verify exact count)
- [ ] No "MUDDY EXIT CREATED: WEST from portal:cfhilnoq" in debug logs

### Verification Tests
- [ ] Reseed database
- [ ] Parse Astyll Hills
- [ ] Query cfhilnoq exits
- [ ] Query all muddy corridors
- [ ] Check debug logs for spurious exits
- [ ] Run parse 2-3 times to ensure consistency

### Documentation Updates (After Fix)
- [ ] Update `PARSER_BUG_INVESTIGATION.md` with successful fix
- [ ] Update `DEVELOPMENT_STATUS.md` - change status to RESOLVED
- [ ] Update `QUICK_REFERENCE.md` - remove bug investigation workflow
- [ ] Create summary of what worked in `SESSION_HANDOFF.md` or new doc
- [ ] Remove or archive `BUG_VISUAL_DIAGRAM.md` (or mark as resolved)

## 🚀 Quick Start Command Sequence

**Copy-paste ready** (Windows PowerShell):
```powershell
# Full test cycle
cd "c:\work\other\Apocalypse VI MUD\backend" ; npm run seed ; cd ..\crawler ; npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9 ; cd ..\backend ; node query-db.js "SELECT r.id, r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```

**Individual commands**:
```powershell
# 1. Clean database
cd "c:\work\other\Apocalypse VI MUD\backend"
npm run seed

# 2. Parse
cd ..\crawler
npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9

# 3. Verify
cd ..\backend
node query-db.js "SELECT r.id, r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```

## 📊 Known State

### Database After Seeding
- 125 rooms
- 262 exits
- Clean slate

### After Parsing Astyll Hills (with bug)
- 105 new rooms saved
- 221 exits saved (after Fix #5)
- Bug present: cfhilnoq has 3 exits including spurious west

### Portal Keys Involved
- `cfhilnoq` (181) - THE BUGGY ROOM
- `dfgilnoq` (182) - A turn in the cave
- `lnoq` (183) - Destination of spurious exit
- `fghilnoq` (180) - An unnatural darkness

### Log File Key Lines
- Line 6845: Move south from cfhilnoq to dfgilnoq
- Line 6905: Bind portal dfgilnoq
- Lines 6910-6930: NPC activity (bug trigger window)
- Line 6931: Move west from dfgilnoq to lnoq (spurious exit created)

---

**Last Updated**: 2025-11-17  
**Status**: Ready for fresh investigation with complete context
