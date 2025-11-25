# AI Agent Quick Reference

## 📝 Training Data Annotation Guidelines

### Creating High-Quality Training Logs

When playing manually to generate training data, use the `say` command to annotate your decision-making process:

**Standard Annotation Format:**
```
say [TRAINING] <CATEGORY>: <explanation>
```

**Annotation Categories:**

| Category | Use For | Example |
|----------|---------|----------|
| `STRATEGY` | High-level decisions | `say [TRAINING] STRATEGY: Exploring north wing before south to avoid backtracking` |
| `TIMING` | Waiting for mechanics | `say [TRAINING] TIMING: Waiting 3 ticks for mana regen (15/80 current)` |
| `DANGER` | Risk assessment | `say [TRAINING] DANGER: Mob is red con, too dangerous at current HP` |
| `RESOURCE` | HP/mana/move mgmt | `say [TRAINING] RESOURCE: HP at 40%, retreating to safe room` |
| `EXPLORATION` | Navigation strategy | `say [TRAINING] EXPLORATION: Dead end, marking room and backtracking` |
| `COMBAT` | Fighting tactics | `say [TRAINING] COMBAT: Bash on cooldown, using kick instead` |
| `OPTIMIZATION` | Efficiency patterns | `say [TRAINING] OPTIMIZATION: Recall is 1 tick vs 5 ticks walking` |
| `MISTAKE` | Anti-patterns | `say [TRAINING] MISTAKE: Should NOT engage multiple mobs at low HP` |

**Best Practices:**
- Annotate BEFORE taking action (captures intent)
- Include specific numbers (HP values, cooldowns, distances)
- Explain WHY, not just WHAT
- Mark mistakes explicitly (AI learns what NOT to do)
- Annotate waiting periods (teaches patience and timing)
- Note optimization opportunities

**Example Annotated Combat:**
```
say [TRAINING] STRATEGY: Engaging single goblin to test combat strength
kill goblin
say [TRAINING] COMBAT: Using bash to interrupt goblin's spellcasting
bash goblin
say [TRAINING] TIMING: Waiting for bash cooldown (5 seconds)
say [TRAINING] RESOURCE: HP at 65/80, safe to continue
say [TRAINING] OPTIMIZATION: Looting before next fight to avoid inventory full
get all corpse
```

**Parsing Training Annotations:**
```powershell
# Extract all training comments from logs
Select-String -Path "sessions/*.txt" -Pattern "say \[TRAINING\]" |
  ForEach-Object { $_.Line } |
  Out-File "training-annotations.txt"

# Count annotations by category
Select-String -Path "sessions/*.txt" -Pattern "\[TRAINING\] (\w+):" |
  ForEach-Object { $_.Matches.Groups[1].Value } |
  Group-Object |
  Sort-Object Count -Descending
```

## 🤖 Autonomous Character Management

### Dual-Character Gameplay (CRITICAL)

**Server Limit: 2 concurrent characters per player**

This is the **standard playstyle** for Apocalypse VI:
- Tank/DPS character (Fighter, Paladin, Berserker, Ranger)
- Healer/Support character (Cleric, Druid)

**AI Implementation:**
- Maintain TWO concurrent MudClient instances
- Coordinate commands between both characters
- Test different race/class combinations
- Document effectiveness of character pairs

**Recommended Dual-Character Combinations:**
1. **Fighter + Cleric** ⭐ **DEFAULT - Use this for initial testing**
   - Simplest and most successful duo in most situations
   - Fighter: Takes and deals damage (straightforward melee)
   - Cleric: Heals and supports (reliable healing)
   - Clear roles, easy coordination, high success rate

2. Berserker + Druid (high DPS + support - test after Fighter+Cleric works)
3. Ranger + Cleric (versatile DPS + healing)
4. Paladin + Cleric (very safe but slower)
5. Magic User + Cleric (risky, mana management challenges)

### Character Lifecycle Commands

**Test Dual-Character Connection:**
```powershell
# Test two concurrent MUD connections
# Terminal 1 (Account 1 - Tank)
telnet apocalypse6.furryfire.net 2003
# login → select/create fighter-type character

# Terminal 2 (Account 2 - Healer)  
telnet apocalypse6.furryfire.net 2003
# login → select/create healer-type character

# Coordinate: use 'follow' and 'group' commands
```

**Character Database Operations:**
```sql
-- View all AI-managed characters with tracking metadata
SELECT 
  id, name, race, class, level,
  purpose, specialization, is_active,
  created_at, last_played_at,
  session_count, areas_explored
FROM characters 
WHERE account_name = 'ai_agent'
ORDER BY last_played_at DESC;

-- Check active character
SELECT * FROM characters WHERE is_active = 1;

-- Find unused characters (7+ days inactive)
SELECT 
  name, purpose, 
  DATEDIFF(NOW(), last_played_at) as days_inactive
FROM characters
WHERE last_played_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY days_inactive DESC;

-- Character audit summary
SELECT 
  COUNT(*) as total_characters,
  SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
  SUM(CASE WHEN last_played_at < DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as stale_count,
  AVG(session_count) as avg_sessions,
  AVG(areas_explored) as avg_areas
FROM characters
WHERE account_name = 'ai_agent';

-- View character event audit trail
SELECT 
  ce.timestamp, ce.event_type, c.name, ce.details
FROM character_events ce
JOIN characters c ON ce.character_id = c.id
ORDER BY ce.timestamp DESC
LIMIT 50;
```

**Character Management Strategy:**
- Create specialized characters for different tasks
- **No Hard Limits**: Account allows unlimited characters
- **Responsible Stewardship**: Track and audit all characters carefully
- **Mandatory Logging**: Every character creation must include:
  - Clear purpose statement
  - Specialization tag
  - Creation timestamp
- **Regular Audits**: Weekly character roster review
- **Proactive Cleanup**: Delete unused/obsolete characters promptly
- **Audit Trail**: All creations and deletions logged with reasons
- **Human Review**: Export character list regularly for manual inspection
- **Cleanup Criteria**:
  - 7+ days inactive → Flag for review
  - 14+ days inactive → Recommend deletion
  - Failed experiment → Delete immediately
  - No clear purpose → Delete during audit

### Login Flow Patterns

**Pattern Detection:**
```
Connection prompt → Enter username → Enter password
→ Character list or "Create Character" prompt
→ Select character number OR type "create"
→ Enter game OR character creation sequence
```

**Character Creation Sequence:**
```
1. Enter character name (validation: unique, 3-12 chars)
2. Select race (number from list)
3. Select class (number from list)
4. Allocate bonus attributes (if applicable)
5. Confirm choices
6. Enter game world
```

**Character Deletion:**
```
At character select screen:
→ Type "delete <character_name>"
→ Confirm deletion
→ Character removed from account
```

## 🎯 Current Objectives & Context

### Primary Objective: Zone Exit Parser Improvements ✅ COMPLETED
**Issue**: Parser incorrectly assigning Juris rooms to Haunted Forest zone instead of Juris zone
**Root Cause**: Missing zone alias for "Juris, The City of Law" in seed.ts
**Status**: ✅ COMPLETED - Zone alias system implemented, automatic zone detection working
**Success Criteria**: Juris rooms automatically assigned to zone 47, zone exits properly marked

### Secondary Objectives
- Maintain data processing pipeline integrity
- Preserve zone isolation in parsing
- Ensure coordinate calculation accuracy

## 🚀 Critical Commands (Copy-Paste Ready)

### Test Zone Alias System
```powershell
cd scripts
# Test Juris zone alias detection
npm run seed
npm run parse-logs "../scripts/sessions/Exploration - Haunted Forest.txt" --zone-id 12
npx tsx "c:\work\other\Apocalypse VI MUD\scripts\query-db.ts" "SELECT r.portal_key, r.name, r.zone_id, z.name as zone_name FROM rooms r JOIN zones z ON r.zone_id = z.id WHERE r.name LIKE '%juris%' OR r.portal_key IN ('cdefimopq', 'dghklopq')"
```

**Expected**: Juris rooms in zone 47, zone exits marked
**Success Indicators**: 
- "The West Gate of Juris" (cdefimopq) in zone 47 ✅
- "Outside the West Gates of Juris" (dghklopq) in zone 12 ✅
- Zone exits between zones 12 ↔ 47 established ✅

### Full Data Processing Pipeline
```powershell
# 1. Clean database with updated zone aliases
cd scripts
npm run seed

# 2. Parse exploration log (automatic zone detection)
npm run parse-logs "../scripts/sessions/Exploration - Haunted Forest.txt" --zone-id 12

# 3. Calculate coordinates
npm run calculate-coordinates 12
```

### Full Data Processing Pipeline
```powershell
# 1. Clean database
cd backend
npm run seed

# 2. Parse exploration log
cd ../crawler
npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9

# 3. Calculate coordinates
cd ../backend
node calculate-coordinates.js 9
```

### Start All Services
```powershell
.\start.ps1
```

## 📋 Context Preservation Checklist

### Before Starting Work
- [ ] Read current objective from top of DEVELOPMENT_STATUS.md
- [ ] Check SESSION_HANDOFF.md for latest session context
- [ ] Run zone alias test to confirm current state
- [ ] Review modified files list in SESSION_HANDOFF.md

### During Work
- [ ] Update DEVELOPMENT_STATUS.md immediately after changes
- [ ] Test changes with provided verification commands
- [ ] Document any new zone alias discoveries
- [ ] Preserve debug logging during zone detection testing

### After Completing Work
- [ ] Update SESSION_HANDOFF.md with session summary
- [ ] Include next steps and any unresolved zone issues
- [ ] List all modified files with line numbers
- [ ] Provide test commands for zone connectivity verification

## 🔍 Key Files & Locations

### Current Investigation Files
- **Zone Aliases**: `scripts/seed.ts` (zone definitions with aliases)
- **Parser Zone Detection**: `crawler/src/mudLogParser.ts` (zone change detection)
- **Test Data**: `scripts/sessions/Exploration - Haunted Forest.txt`
- **Zone Boundary Trigger**: Lines with "Juris, The City of Law" zone detection

### Documentation Files
- **Status**: `docs/development/DEVELOPMENT_STATUS.md`
- **Session Context**: `docs/development/SESSION_HANDOFF.md`
- **Zone System**: `docs/technical/QUICK_REFERENCE.md` (Zone Alias System section)
- **Quick Commands**: `docs/technical/QUICK_REFERENCE.md`

## 🎯 Next Steps (Priority Order)

1. **HIGH**: Monitor zone detection accuracy in future explorations
2. **MEDIUM**: Add aliases for other zones with naming variations
3. **LOW**: Consider automated alias discovery from exploration logs

## ⚠️ Critical Reminders

- **Always use PowerShell `;` separator** (not `&&`)
- **Never use direct database access** - use API endpoints
- **Update DEVELOPMENT_STATUS.md after EVERY change**
- **Test zone aliases with full pipeline**
- **Add zone aliases to seed.ts for new zone variations**

## 📊 Current System State

- **Database**: SQLite with zone aliases for improved detection
- **Parser**: Zone isolation working with alias-based detection
- **Coordinates**: BFS-based calculation with collision resolution
- **AI Integration**: Ollama with llama3.2:3b model

## 🔗 Quick Links

- [Zone Alias System](QUICK_REFERENCE.md#zone-alias-system-automatic-zone-detection)
- [Session Handoff](SESSION_HANDOFF.md)
- [Full Quick Reference](../technical/QUICK_REFERENCE.md)
- [Development Status](DEVELOPMENT_STATUS.md)