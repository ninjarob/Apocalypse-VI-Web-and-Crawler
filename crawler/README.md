# Crawler - Documentation Index

## 🚨 ACTIVE BUG INVESTIGATION

**Status**: Parser bug under investigation - spurious exit from cfhilnoq to lnoq

### 📚 Investigation Documents (Read in Order)

1. **`BUG_INVESTIGATION_CHECKLIST.md`** ⚡ **START HERE**
   - Quick checklist with copy-paste ready commands
   - Testing workflow
   - Success criteria
   - Next fix attempts with code examples

2. **`BUG_VISUAL_DIAGRAM.md`**
   - Visual flow diagrams comparing correct vs buggy behavior
   - The three muddy corridors explained
   - Debug log evidence
   - Why previous fixes failed

3. **`PARSER_BUG_INVESTIGATION.md`**
   - Comprehensive analysis of the bug
   - All 5 attempted fixes with detailed rationale
   - Root cause timeline
   - Outstanding mysteries
   - Test commands and queries

4. **`../SESSION_HANDOFF.md`**
   - Latest session summary
   - What was accomplished
   - Key achievements and findings
   - Context for next session

---

## 🧪 Quick Test Commands

### Verify Bug Status (Copy-Paste Ready)
```powershell
# Full test cycle
cd "c:\work\other\Apocalypse VI MUD\backend" ; npm run seed ; cd ..\crawler ; npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9 ; cd ..\backend ; node query-db.js "SELECT r.id, r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```

### Expected Results

**Bug Fixed**:
```
exits: 'north, south'
```
✅ Only 2 exits

**Bug Still Present**:
```
exits: 'north, south, west'
```
❌ 3 exits (west is spurious)

---

## 📂 Other Crawler Files

### Core Files
- **`src/mudLogParser.ts`** - Main parser (lines 695-722 have latest fix attempt)
- **`src/index.ts`** - Entry point
- **`parse-logs.ts`** - CLI for parsing session logs

### AI & Knowledge
- **`ai-knowledge.md`** - AI agent's knowledge base
- **`ai-knowledge-template.md`** - Template for new knowledge
- **`src/aiAgent.ts`** - AI decision making
- **`src/knowledgeManager.ts`** - Knowledge persistence

### Utilities
- **`src/logger.ts`** - Logging system
- **`src/enhancedLogger.ts`** - Advanced logging
- **`src/parser.ts`** - MUD output parsing
- **`src/directionHelper.ts`** - Direction utilities

### Session Logs
- **`sessions/Exploration - Astyll Hills.txt`** - Test log with bug (line 6931)
- **`sessions/Exploration - Northern Midgaard City.txt`** - Other exploration

### Tasks
- **`src/tasks/`** - Task-based automation system

---

## 🔧 Modified During Investigation

**Primary**: `src/mudLogParser.ts` (~1447 lines after modifications)

**Key Modifications**:
- Lines 48-49, 67: `usedNamedescKeys` tracking (Fix #2)
- Lines 180-193: Portal binding conditional (Fix #4)
- Lines 187-216: Portal binding debug logs (Fix #3)
- **Lines 695-722**: Conditional currentRoomKey update (Fix #5) - CURRENT STATE
- Lines 735-753: Exit creation debug logs (Fix #3)
- Lines 777-790: Parse completion summary (Fix #3)
- Lines 782-802: getRoomKey with tracking (Fix #2)
- Lines 895-917: Exit signature matching logs (Fix #3)

**⚠️ DO NOT REMOVE DEBUG LOGS** - They are essential for continued investigation!

---

## 📖 Related Documentation

- **`../docs/development/DEVELOPMENT_STATUS.md`** - Project-wide status
- **`../docs/technical/QUICK_REFERENCE.md`** - Common commands
- **`CRAWLER_TASKS.md`** - Task system documentation
- **`LOG_PARSER_README.md`** - Log parser details
- **`MAINTENANCE_SYSTEM.md`** - Character maintenance

---

**Last Updated**: 2025-11-17  
**Next Steps**: Apply Fix #6 (exit validation) or investigate exits variable corruption
