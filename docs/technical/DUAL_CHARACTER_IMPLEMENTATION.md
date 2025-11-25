# Dual-Character Implementation Guide

## Overview

Apocalypse VI MUD allows 2 concurrent characters per player. This document outlines how to implement dual-character gameplay in the AI crawler system.

## Architecture

### Current System (Single Character)
```typescript
class MudClient {
  // One connection, one character
  private client: Telnet;
  connect() → login() → send(command)
}

// Usage
const mud = new MudClient(host, port, username, password);
await mud.connect();
await mud.send("north");
```

### Proposed System (Dual Character)

#### Option 1: Dual MudClient Manager (Recommended)
```typescript
interface CharacterConfig {
  accountName: string;
  accountPassword: string;
  characterName: string;
  role: 'tank' | 'healer' | 'dps' | 'support';
}

class DualCharacterManager {
  private tank: MudClient;
  private healer: MudClient;
  private isGrouped: boolean = false;

  constructor(
    tankConfig: CharacterConfig,
    healerConfig: CharacterConfig
  ) {
    this.tank = new MudClient(
      MUD_HOST, MUD_PORT,
      tankConfig.accountName,
      tankConfig.accountPassword
    );
    this.healer = new MudClient(
      MUD_HOST, MUD_PORT,
      healerConfig.accountName,
      healerConfig.accountPassword
    );
  }

  async connect(): Promise<void> {
    // Connect both characters
    await Promise.all([
      this.tank.connect(),
      this.healer.connect()
    ]);
    
    // Wait for both to be ready
    await this.waitForBothReady();
    
    // Form group
    await this.formGroup();
  }

  async formGroup(): Promise<void> {
    // Tank invites healer
    await this.tank.send(`group ${healerConfig.characterName}`);
    await this.delay(1000);
    
    // Healer accepts
    await this.healer.send('group accept');
    await this.delay(1000);
    
    // Healer follows tank
    await this.healer.send(`follow ${tankConfig.characterName}`);
    
    this.isGrouped = true;
  }

  async move(direction: string): Promise<void> {
    // Only tank needs to move, healer follows
    await this.tank.send(direction);
    await this.delay(500); // Wait for movement to complete
  }

  async combat(target: string): Promise<void> {
    // Tank engages
    await this.tank.send(`kill ${target}`);
    await this.delay(500);
    
    // Monitor combat, healer casts heals as needed
    this.startCombatMonitoring();
  }

  private async startCombatMonitoring(): Promise<void> {
    // Parse tank HP from stat line
    const tankHP = this.parseTankHP();
    
    if (tankHP < 50) { // Threshold for healing
      await this.healer.send(`heal ${tankConfig.characterName}`);
    }
  }

  async sendToTank(command: string): Promise<void> {
    await this.tank.send(command);
  }

  async sendToHealer(command: string): Promise<void> {
    await this.healer.send(command);
  }

  async sendToBoth(command: string): Promise<void> {
    await Promise.all([
      this.tank.send(command),
      this.healer.send(command)
    ]);
  }

  async disconnect(): Promise<void> {
    await Promise.all([
      this.tank.disconnect(),
      this.healer.disconnect()
    ]);
  }
}
```

#### Option 2: Character Pool (For Testing Multiple Combinations)
```typescript
class CharacterPool {
  private characters: Map<string, MudClient> = new Map();
  
  async createDuo(
    combo: 'fighter-cleric' | 'berserker-druid' | 'ranger-cleric'
  ): Promise<DualCharacterManager> {
    const configs = this.getComboConfigs(combo);
    return new DualCharacterManager(configs.tank, configs.healer);
  }
  
  private getComboConfigs(combo: string): { 
    tank: CharacterConfig, 
    healer: CharacterConfig 
  } {
    switch(combo) {
      case 'fighter-cleric':
        return {
          tank: { 
            accountName: 'account1', 
            accountPassword: 'pass1',
            characterName: 'Tanker',
            role: 'tank'
          },
          healer: { 
            accountName: 'account2', 
            accountPassword: 'pass2',
            characterName: 'Healer',
            role: 'healer'
          }
        };
      // ... more combinations
    }
  }
}
```

## Implementation Steps

### Phase 1: Basic Dual Connection
1. **Modify MudClient**: Support multiple instances
2. **Test Concurrent Connections**: Verify server allows 2 connections
3. **Character Selection**: Both accounts must select/create characters
4. **Basic Commands**: Send commands to each character independently

### Phase 2: Group Coordination
1. **Grouping Commands**: Implement `group` and `follow`
2. **Movement Sync**: Leader moves, follower auto-follows
3. **Position Tracking**: Know where both characters are
4. **Communication**: Characters can see each other's actions

### Phase 3: Combat Coordination
1. **HP/Mana Parsing**: Monitor both characters' stats
2. **Combat Roles**: Tank engages, healer supports
3. **Healing Logic**: Healer casts heals when tank HP drops
4. **Buff Management**: Pre-combat buffs, mid-combat support
5. **Emergency Actions**: Flee if both characters in danger

### Phase 4: Strategic AI
1. **Combo Testing**: Try different race/class pairs
2. **Performance Metrics**: Track which duos work best
3. **Zone Optimization**: Match character combos to zones
4. **Knowledge Base**: Store successful duo strategies

## Database Schema Updates

### Characters Table
```sql
ALTER TABLE characters ADD COLUMN partner_character_id INT NULL;
ALTER TABLE characters ADD COLUMN party_role ENUM('tank', 'healer', 'dps', 'support') NULL;
ALTER TABLE characters ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;

-- Track character pairs
CREATE TABLE character_pairs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  character1_id INT NOT NULL,
  character2_id INT NOT NULL,
  combo_name VARCHAR(100), -- e.g., "fighter-cleric"
  effectiveness_rating INT, -- 1-10 based on performance
  zones_completed INT DEFAULT 0,
  deaths INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (character1_id) REFERENCES characters(id),
  FOREIGN KEY (character2_id) REFERENCES characters(id)
);

-- Track duo performance by zone
CREATE TABLE duo_zone_performance (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pair_id INT NOT NULL,
  zone_id INT NOT NULL,
  rooms_explored INT DEFAULT 0,
  mobs_killed INT DEFAULT 0,
  deaths INT DEFAULT 0,
  avg_combat_duration_seconds DECIMAL(10,2),
  success_rate DECIMAL(5,2), -- percentage
  notes TEXT,
  tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pair_id) REFERENCES character_pairs(id),
  FOREIGN KEY (zone_id) REFERENCES zones(id)
);
```

## Configuration

### Environment Variables
```bash
# Account 1 (Tank/DPS)
MUD_ACCOUNT1_USERNAME=account1
MUD_ACCOUNT1_PASSWORD=password1

# Account 2 (Healer/Support)
MUD_ACCOUNT2_USERNAME=account2
MUD_ACCOUNT2_PASSWORD=password2

# Character names (optional, can auto-select)
MUD_CHAR1_NAME=Tanker
MUD_CHAR2_NAME=Healer
```

### Config File (config/dual-character.json)
```json
{
  "dualCharacter": {
    "enabled": true,
    "defaultCombo": "fighter-cleric",
    "autoGroup": true,
    "autoFollow": true,
    "healThreshold": 60,
    "fleeThreshold": 30,
    "combosToTest": [
      "fighter-cleric",
      "berserker-druid",
      "ranger-cleric",
      "paladin-cleric",
      "magicuser-cleric"
    ]
  }
}
```

## Testing Strategy

### Manual Testing Checklist
- [ ] Connect two accounts simultaneously
- [ ] Both characters can login and select characters
- [ ] `group` command forms party
- [ ] `follow` command works (follower moves with leader)
- [ ] Combat: tank attacks, healer can target tank with heals
- [ ] Both characters see each other's actions
- [ ] Disconnecting one doesn't crash the other
- [ ] Can recreate connection after disconnect

### Automated Testing
```typescript
describe('DualCharacterManager', () => {
  it('should connect both characters', async () => {
    const manager = new DualCharacterManager(tankConfig, healerConfig);
    await manager.connect();
    expect(manager.isGrouped).toBe(true);
  });

  it('should move both characters together', async () => {
    await manager.move('north');
    // Verify both characters moved
  });

  it('should coordinate combat', async () => {
    await manager.combat('goblin');
    // Verify tank engaged, healer monitored
  });
});
```

## Example Usage

### Basic Dual-Character Exploration (Fighter + Cleric)
**Note**: Fighter + Cleric is the **simplest and most successful** duo for most situations.

```typescript
import { DualCharacterManager } from './DualCharacterManager';

async function exploreTogether() {
  // Fighter + Cleric: Recommended starting combination
  const manager = new DualCharacterManager(
    { 
      accountName: 'acct1', 
      accountPassword: 'pass1',
      characterName: 'Fighter',  // Fighter class - takes and deals damage
      role: 'tank'
    },
    { 
      accountName: 'acct2', 
      accountPassword: 'pass2',
      characterName: 'Cleric',   // Cleric class - heals and supports
      role: 'healer'
    }
  );

  // Connect and group
  await manager.connect();
  
  // Explore together (only tank moves, healer follows)
  await manager.move('north');
  await manager.move('east');
  
  // Combat with coordination
  await manager.combat('goblin');
  
  // Both characters look around
  await manager.sendToBoth('look');
  
  // Disconnect
  await manager.disconnect();
}
```

### Testing Multiple Combinations
```typescript
async function testAllCombos() {
  const pool = new CharacterPool();
  const combos = [
    'fighter-cleric',
    'berserker-druid',
    'ranger-cleric'
  ];

  for (const combo of combos) {
    console.log(`Testing ${combo}...`);
    const manager = await pool.createDuo(combo);
    
    await manager.connect();
    
    // Run standardized test (explore zone, fight mobs)
    const results = await runPerformanceTest(manager);
    
    // Store results
    await saveComboPerformance(combo, results);
    
    await manager.disconnect();
  }
}
```

## Performance Considerations

### Network Latency
- Two concurrent connections doubles network traffic
- Coordinate timing carefully (don't spam commands)
- Use delays between command sequences

### Buffer Management
- Each MudClient has its own buffer
- Parse stat lines independently for each character
- Cross-reference data (e.g., healer sees tank's HP in group display)

### Error Handling
- If one character disconnects, pause the other
- Automatic reconnection for both characters
- Save state before risky actions

## Future Enhancements

### Advanced Coordination
- **AI Decision Making**: Healer decides when to heal based on situation
- **Dynamic Roles**: Switch which character leads based on zone
- **Resource Pooling**: Trade items between characters
- **Buff Rotation**: Coordinate spell timings

### Multi-Character Testing
- **A/B Testing**: Compare combo effectiveness statistically
- **Meta-Game Analysis**: Which combos dominate which zones
- **Character Builds**: Optimal stat allocation for duos

### Player-Like Behavior
- **Realistic Delays**: Mimic human reaction times
- **Chat Between Characters**: Characters "talk" to each other
- **Rest Periods**: Simulate breaks between sessions

## References

- `crawler/src/mudClient.ts` - Base MudClient implementation
- `crawler/ai-knowledge.md` - Game knowledge including dual-character info
- `docs/game/character-creation.md` - Character creation guide
- `docs/game/game-mechanics.md` - Game mechanics including party commands
