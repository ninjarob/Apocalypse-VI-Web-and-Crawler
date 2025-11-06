# Character Maintenance System

## Overview
The Character Maintenance system enables the crawler to autonomously manage character needs during long exploration sessions:
- **Mana Management**: Rest/wake cycle for spell casting
- **Hunger Management**: Eat bread when hungry
- **Thirst Management**: Drink from bladder or fountain when thirsty
- **Water Container**: Fill bladder at Market Square fountain

## Architecture

### CharacterMaintenance Class
Located in `crawler/src/CharacterMaintenance.ts`

**Core Responsibilities**:
1. Parse character stats from MUD responses
2. Track hunger, thirst, and mana levels
3. Execute maintenance actions (rest, eat, drink, fill)
4. Navigate to Market Square for fountain access

### Character Stats Format
```
< 197H 286M 134V >
  ^^^  ^^^  ^^^
  |    |    └── Vitality (movement points)
  |    └──────── Mana (spell casting points)
  └───────────── Health (hit points)

Additional status messages:
- "You are hungry."
- "You are thirsty."
```

## Configuration

```typescript
{
  minManaForRest: 20,           // Rest when mana < 20M
  targetManaAfterRest: 150,      // Wake when mana >= 150M
  hungerThreshold: 50,           // Check food/water every 50 commands
  marketSquareRoomName: 'Market Square',
  breadItemName: 'bread',
  bladderItemName: 'bladder'
}
```

## Maintenance Actions

### 1. Rest/Wake Cycle (Mana Restoration)
**Trigger**: Mana drops below `minManaForRest` (default: 20M)

**Process**:
1. Check current mana level
2. If mana < 20M: send `rest` command
3. Every 5 seconds: check mana with `score` command
4. When mana >= 150M: send `wake` then `stand`
5. Resume exploration

**MUD Commands**:
```
rest           # Sit down to regenerate mana
score          # Check current stats
wake           # Stop resting
stand          # Stand up to move/explore
```

### 2. Drink Water
**Trigger**: "You are thirsty" message detected

**Two modes**:
- **At Fountain**: `drink fountain` (unlimited water)
- **From Bladder**: `drink bladder` (limited capacity)

**MUD Commands**:
```
drink fountain    # At Market Square fountain
drink bladder     # From water container in inventory
```

### 3. Eat Bread
**Trigger**: "You are hungry" message detected

**MUD Commands**:
```
eat bread         # Consume bread from inventory
```

### 4. Fill Water Container
**Location**: Must be at Market Square fountain

**MUD Commands**:
```
fill bladder fountain    # Refill water container
```

## Integration with RoomGraphNavigationCrawler

### Main Exploration Loop Enhancement
```typescript
while (this.actionsUsed < this.maxActions) {
  // 1. Parse stats from recent MUD response
  const buffer = this.config.mudClient.getBuffer();
  this.maintenance.parseStats(buffer);

  // 2. Check maintenance needs
  const currentRoom = this.roomGraph.get(this.currentRoomId);
  const maintenancePerformed = await this.maintenance.checkAndMaintain(
    currentRoom.name,
    async () => this.navigateToMarketSquare()
  );

  // 3. Re-sync position if maintenance was performed
  if (maintenancePerformed) {
    await this.syncCurrentPosition();
  }

  // 4. Continue normal exploration...
}
```

### Navigation to Market Square
```typescript
private async navigateToMarketSquare(): Promise<boolean> {
  // 1. Find Market Square room ID in graph
  // 2. Calculate path using existing pathfinding (BFS)
  // 3. Navigate along path
  // 4. Verify arrival
}
```

## Maintenance Check Logic

### checkAndMaintain() Method Flow
```
1. Parse stats from MUD buffer
2. Check if mana < minManaForRest
   → YES: Rest until mana restored
   → NO: Continue to hunger/thirst check
3. Check if hungry or thirsty (or 50+ commands since last check)
   → NO: Skip maintenance
   → YES: Continue
4. If not at Market Square:
   → Navigate to Market Square
5. Perform fountain maintenance:
   - Drink from fountain (if thirsty)
   - Fill bladder
   - Eat bread (if hungry)
6. Resume exploration
```

## Usage Example

### Standalone Usage
```typescript
import { CharacterMaintenance } from './CharacterMaintenance';
import { MUDClient } from './mudClient';

const client = new MUDClient('host', 4000, 'username', 'password');
await client.connect();

const maintenance = new CharacterMaintenance(client, {
  minManaForRest: 20,
  targetManaAfterRest: 150
});

// Parse stats from response
const response = await client.sendAndWait('look', 1000);
const stats = maintenance.parseStats(response);
console.log(`Current mana: ${stats.mana}M`);

// Check needs
if (maintenance.needsRest()) {
  await maintenance.rest();
}

if (maintenance.needsWater()) {
  await maintenance.drink(true); // true = from fountain
}
```

### Integrated Usage (in RoomGraphNavigationCrawler)
The maintenance system is automatically integrated into the exploration loop. Just ensure:
1. Market Square is in the room graph
2. Character has bread in inventory
3. Character has bladder in inventory

## Benefits

### 1. Autonomous Operation
- No manual intervention needed for basic character needs
- Crawler can run for extended periods (hours)
- Prevents premature exploration termination due to resource depletion

### 2. Efficient Resource Management
- Rests only when necessary (< 20M mana)
- Checks food/water periodically (every 50 commands)
- Navigates to fountain efficiently using pathfinding

### 3. Graceful Handling
- Continues exploration if maintenance fails
- Re-syncs position after maintenance
- Logs all maintenance actions for debugging

## Error Handling

### Common Issues & Solutions

**Issue**: "You don't have any bread"
- **Detection**: Response matches `/you (don't have|do not have|have no)/i`
- **Solution**: Log warning, continue without eating
- **Future**: Add shopping functionality to buy more bread

**Issue**: Cannot rest here
- **Detection**: Response matches `/you (can't|cannot) rest/i`
- **Solution**: Try to navigate to safer area
- **Current**: Log warning and continue

**Issue**: Cannot find Market Square
- **Detection**: `marketSquareRoomId === -1`
- **Solution**: Skip fountain maintenance, continue exploration
- **Note**: Character can still drink from bladder if filled

**Issue**: Pathfinding to Market Square fails
- **Detection**: `findPathToRoom()` returns null or empty
- **Solution**: Log warning, continue without fountain maintenance
- **Fallback**: Use bladder for drinking

## Future Enhancements

### Planned Improvements
1. **Shopping System**: Automatically buy bread/bladder when inventory depleted
2. **Mana Rate Tracking**: Learn mana regeneration rate for better rest timing
3. **Multiple Fountains**: Support fountains in other zones
4. **Health Management**: Rest when health is low (combat recovery)
5. **Spell Buff Management**: Re-cast armor/protection spells periodically
6. **Bank Integration**: Deposit gold when inventory full
7. **Inn/Tavern Rest**: Use inn for faster mana regeneration

### Configuration Enhancements
1. **Per-Zone Settings**: Different maintenance locations per zone
2. **Dynamic Thresholds**: Adjust rest thresholds based on spell cost patterns
3. **Priority System**: Configure which needs are highest priority
4. **Fallback Locations**: Alternative maintenance locations if primary unavailable

## Testing Recommendations

### Unit Testing
```typescript
// Test stat parsing
const stats = maintenance.parseStats('< 50H 15M 100V >');
assert.equal(stats.health, 50);
assert.equal(stats.mana, 15);
assert.equal(stats.vitality, 100);

// Test need detection
assert.equal(maintenance.needsRest(), true); // mana < 20
```

### Integration Testing
1. Start crawler with low mana (< 20M)
2. Verify rest/wake cycle occurs
3. Verify crawler resumes exploration after rest
4. Test hunger/thirst detection with "You are hungry" injection
5. Verify navigation to Market Square works
6. Test fountain actions (drink, fill)

### Live Testing Checklist
- [ ] Crawler detects low mana and rests automatically
- [ ] Crawler wakes when mana restored
- [ ] Crawler detects hunger and navigates to Market Square
- [ ] Crawler drinks from fountain successfully
- [ ] Crawler fills bladder successfully
- [ ] Crawler eats bread successfully
- [ ] Crawler re-syncs position after maintenance
- [ ] Crawler continues exploration after maintenance
- [ ] Handles "no bread" error gracefully
- [ ] Handles "cannot find Market Square" gracefully

## Performance Considerations

### Action Budget Impact
Each maintenance action consumes actions from the budget:
- Rest cycle: ~12-60 actions (score checks every 5 seconds)
- Navigation to Market Square: ~5-15 actions (depending on distance)
- Fountain actions: ~3 actions (drink, fill, eat)
- **Total per maintenance**: ~20-78 actions

### Optimization Strategies
1. **Proactive Maintenance**: Rest when mana = 50M instead of 20M (less urgent)
2. **Batched Actions**: Check all needs at fountain in one visit
3. **Smart Timing**: Perform maintenance when already near Market Square
4. **Mana-Aware Planning**: Prefer low-mana exploration paths when mana < 50M

## Maintenance Logs

### Example Log Output
```
💧 Drinking water from fountain
   ✅ Drank water
💧 Filling bladder at fountain
   ✅ Filled bladder
🍞 Eating bread
   ✅ Ate bread
🔧 Performing maintenance at fountain
💤 Resting to restore mana (current: 15M, target: 150M)
   Resting...
   Mana: 25M / 150M
   Mana: 45M / 150M
   Mana: 75M / 150M
   Mana: 105M / 150M
   Mana: 135M / 150M
   Mana: 155M / 150M
✅ Mana restored! (15M → 155M)
```

## MUD-Specific Commands

### Character Status
```
score          # Full character stats
who -z         # Current zone/area
inventory      # List items in inventory
```

### Movement & Position
```
look           # Current room description
exits          # Available exits
```

### Rest & Recovery
```
rest           # Sit down to rest
wake           # Wake from resting
stand          # Stand up from sitting
sleep          # Sleep for faster regen (not implemented)
```

### Food & Water
```
eat <item>                # Eat food item
drink <container>         # Drink from container
drink <fountain>          # Drink from fountain
fill <container> <source> # Fill container from source
```

### Inventory Management
```
get <item>                # Pick up item
drop <item>               # Drop item
put <item> <container>    # Put item in container
```

## Conclusion
The Character Maintenance system transforms the crawler from a short-session tool into a long-running autonomous agent capable of extended exploration without human intervention. By automatically managing mana, hunger, and thirst, the crawler can focus on its primary mission: discovering and mapping the MUD world.
