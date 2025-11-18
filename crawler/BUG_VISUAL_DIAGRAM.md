# Parser Bug - Visual Flow Diagram

## Correct Behavior (Expected)

```
┌─────────────────────────────────────────────────────────────┐
│ ROOM: fghilnoq (An unnatural darkness)                      │
│ currentRoomKey = portal:fghilnoq                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Player types: s (south)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ROOM: cfhilnoq (A muddy corridor) [n, s]                    │
│ currentRoomKey = portal:cfhilnoq                            │
│ previousRoomKey = portal:fghilnoq                           │
│ EXIT CREATED: fghilnoq --[south]--> cfhilnoq  ✅            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Player types: s (south)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ROOM: dfgilnoq (A turn in the cave) [n, w]                  │
│ currentRoomKey = portal:dfgilnoq                            │
│ previousRoomKey = portal:cfhilnoq                           │
│ EXIT CREATED: cfhilnoq --[south]--> dfgilnoq  ✅            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Player types: w (west)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ROOM: lnoq (A muddy corridor) [e, w]                        │
│ currentRoomKey = portal:lnoq                                │
│ previousRoomKey = portal:dfgilnoq                           │
│ EXIT CREATED: dfgilnoq --[west]--> lnoq  ✅                 │
└─────────────────────────────────────────────────────────────┘
```

## Buggy Behavior (Actual)

```
┌─────────────────────────────────────────────────────────────┐
│ ROOM: fghilnoq (An unnatural darkness)                      │
│ currentRoomKey = portal:fghilnoq                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Player types: s (south)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ROOM: cfhilnoq (A muddy corridor) [n, s]                    │
│ currentRoomKey = portal:cfhilnoq                            │
│ previousRoomKey = portal:fghilnoq                           │
│ EXIT CREATED: fghilnoq --[south]--> cfhilnoq  ✅            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Player types: s (south)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ROOM: dfgilnoq (A turn in the cave) [n, w]                  │
│ currentRoomKey = portal:dfgilnoq  ✅                         │
│ previousRoomKey = portal:cfhilnoq                           │
│ EXIT CREATED: cfhilnoq --[south]--> dfgilnoq  ✅            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 💥 BUG TRIGGER: Between moves
                            │ NPC activity: Bols arrives/leaves
                            │ Parser processes "A muddy corridor"
                            │ Matches cfhilnoq via exit signature
                            ↓
                    ╔═══════════════════════╗
                    ║   INCORRECT UPDATE    ║
                    ║ currentRoomKey =      ║
                    ║ portal:cfhilnoq  ❌   ║
                    ║ (should stay dfgilnoq)║
                    ╚═══════════════════════╝
                            │
                            │ Player types: w (west)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ROOM: lnoq (A muddy corridor) [e, w]                        │
│ currentRoomKey = portal:lnoq                                │
│ previousRoomKey = portal:cfhilnoq  ❌ WRONG!                │
│ EXIT CREATED: cfhilnoq --[west]--> lnoq  ❌ SPURIOUS!       │
└─────────────────────────────────────────────────────────────┘
```

## The Problem in Three Steps

### Step 1: Correct State
```
Player is in dfgilnoq
currentRoomKey = portal:dfgilnoq  ✅
```

### Step 2: 💥 Bug Occurs
```
Between dfgilnoq and west move:
- NPC activity appears in log
- Parser sees "A muddy corridor" text
- Matches cfhilnoq (exits [n,s])
- Updates: currentRoomKey = portal:cfhilnoq  ❌
```

### Step 3: Wrong Exit Created
```
Player moves west to lnoq:
- previousRoomKey = portal:cfhilnoq  ❌
- Creates: cfhilnoq --[west]--> lnoq  ❌
```

## Room Relationships

```
      fghilnoq
   (Unnatural darkness)
      [n, s, w]
           │
           │ south
           ↓
      cfhilnoq ───────────────────┐
   (Muddy corridor)               │
      [n, s]                      │ west (SPURIOUS)
           │                      │
           │ south                ↓
           ↓                   lnoq
      dfgilnoq ─────west───► (Muddy corridor)
   (Turn in cave)              [e, w]
      [n, w]
```

## The Three Muddy Corridors

### cfhilnoq (Room 181) - THE BUGGY ROOM
- **Name**: "A muddy corridor"
- **Description**: "This corridor is filled with..."
- **Exits**: [north, south]
- **Problem**: Gets spurious west exit to lnoq

### dfgilnoq (Room 182)
- **Name**: "A turn in the cave"
- **Description**: "A sharp turn in the muddy corridor..."
- **Exits**: [north, west]
- **Note**: Called "muddy corridor" in description but name is different

### lnoq (Room 183)
- **Name**: "A muddy corridor"
- **Description**: "This is a long..."
- **Exits**: [east, west]
- **Note**: Destination of spurious exit

## Debug Log Evidence

### What Logs Show
```
Line 6905: Portal bound: dfgilnoq  ✅
Lines 6910-6930: [NPC activity - NO PLAYER MOVEMENT]
  - "Bols arrives from the north"
  - "Bols leaves north"
  - Spell casting output
  
🎯 PARSING ROOM: 'A muddy corridor' with exits [east,west]  ← This is correct for lnoq
🔍 CALLING findExistingRoomKey with exits: [north,south,west]  ← WRONG EXITS!
🔍 FIND RESULT: Found portal:cfhilnoq  ← WRONG MATCH!
🚶 Player moved to existing room - updating current room tracking
   currentRoomKey = portal:cfhilnoq  ❌

Line 6931: Player types: w (west)
   previousRoomKey = portal:cfhilnoq  ❌
   EXIT CREATED: cfhilnoq --[west]--> lnoq  ❌
```

## Why Fixes Failed

### Fix #1: Exact key matching for exit updates
- **Target**: Portal binding updates
- **Problem**: Bug doesn't happen during binding

### Fix #2: Track used namedesc keys
- **Target**: Key reuse prevention
- **Problem**: Not a key reuse issue

### Fix #3: Debug logging
- **Target**: Visibility into state
- **Result**: ✅ SUCCESS - revealed root cause

### Fix #4: Conditional binding update
- **Target**: currentRoomKey during portal binding
- **Problem**: Bug happens during room parse, not binding

### Fix #5: Only update currentRoomKey when lastDirection exists
- **Target**: Prevent updates from incidental room parses
- **Problem**: lastDirection DOES exist (from previous move)
- **Result**: Partially works but doesn't validate room match

## Fix #6 Strategy (Next Attempt)

### The Solution
Don't just check if movement occurred - validate the room we found is correct for that movement.

### Implementation
```typescript
if (lastDirection) {
  // Calculate what exit the found room should have
  const expectedExit = this.getOppositeDirection(lastDirection);
  
  // Validate: If we moved 'south', found room should have 'north' exit back
  if (existingRoom.exits && existingRoom.exits.includes(expectedExit)) {
    console.log(`  ✅ Exit validation passed`);
    this.state.currentRoom = existingRoom;
    this.state.currentRoomKey = existingRoomKey;
  } else {
    console.log(`  ❌ Exit validation FAILED - false match`);
    console.log(`     Expected ${expectedExit} exit, room has: [${existingRoom.exits?.join(', ')}]`);
    // Don't update currentRoomKey - this is a wrong match
  }
}
```

### Why This Should Work
When cfhilnoq gets matched between dfgilnoq and west move:
- lastDirection = "south" (from previous move cfhilnoq → dfgilnoq)
- expectedExit = "north" (reverse of south)
- cfhilnoq has exits [north, south] ✅ Includes north
- **Problem**: Validation would PASS! ❌

### Better Fix #6
Check if we're in the SAME room we just parsed:
```typescript
if (lastDirection && this.state.currentRoomKey !== existingRoomKey) {
  // Only update if we're moving to a DIFFERENT room
  // If same room key, this is incidental parse
}
```

This prevents the bug because:
- After dfgilnoq binding: currentRoomKey = portal:dfgilnoq
- cfhilnoq match returns: portal:cfhilnoq
- They're DIFFERENT, so... wait, this won't work either!

### Even Better Fix #6
The real issue is exits variable corruption. Need to investigate:
1. Why exits = [e,w] becomes [n,s,w]
2. Where exits variable gets modified
3. If findExistingRoomKey is getting stale data
