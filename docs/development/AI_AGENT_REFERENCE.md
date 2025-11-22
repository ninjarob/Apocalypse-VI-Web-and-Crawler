# AI Agent Quick Reference

## 🎯 Current Objectives & Context

### Primary Objective: Parser Bug Investigation
**Issue**: Room `cfhilnoq` has spurious west exit to `lnoq`  
**Root Cause**: currentRoomKey incorrectly updated during incidental room parsing  
**Status**: Investigation paused, ready for Fix #6 implementation  
**Success Criteria**: cfhilnoq shows only 'north, south' exits

### Secondary Objectives
- Maintain data processing pipeline integrity
- Preserve zone isolation in parsing
- Ensure coordinate calculation accuracy

## 🚀 Critical Commands (Copy-Paste Ready)

### Test Current Bug Status
```powershell
cd backend
npm run seed
cd ../crawler
npx tsx parse-logs.ts "sessions/Exploration - Astyll Hills.txt" --zone-id 9
cd ../backend
node query-db.js "SELECT r.portal_key, GROUP_CONCAT(re.direction, ', ') as exits FROM rooms r LEFT JOIN room_exits re ON r.id = re.from_room_id WHERE r.portal_key = 'cfhilnoq' GROUP BY r.id"
```

**Expected**: `cfhilnoq` exits = 'north, south'  
**Bug Present**: `cfhilnoq` exits = 'north, south, west' ❌

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
- [ ] Run bug status test to confirm current state
- [ ] Review modified files list in SESSION_HANDOFF.md

### During Work
- [ ] Update DEVELOPMENT_STATUS.md immediately after changes
- [ ] Test changes with provided verification commands
- [ ] Document any new findings or issues discovered
- [ ] Preserve debug logging (do not remove existing logs)

### After Completing Work
- [ ] Update SESSION_HANDOFF.md with session summary
- [ ] Include next steps and any unresolved issues
- [ ] List all modified files with line numbers
- [ ] Provide test commands for verification

## 🔍 Key Files & Locations

### Current Investigation Files
- **Parser**: `crawler/src/mudLogParser.ts` (lines 695-722: Fix #5)
- **Debug Logs**: Extensive logging added in Fix #3 (preserve all)
- **Test Data**: `crawler/sessions/Exploration - Astyll Hills.txt`
- **Bug Trigger**: Line 6931 (west movement from dfgilnoq to lnoq)

### Documentation Files
- **Status**: `docs/development/DEVELOPMENT_STATUS.md`
- **Session Context**: `docs/development/SESSION_HANDOFF.md`
- **Investigation Details**: `crawler/PARSER_BUG_INVESTIGATION.md`
- **Quick Commands**: `docs/technical/QUICK_REFERENCE.md`

## 🎯 Next Steps (Priority Order)

1. **HIGH**: Apply Fix #6 - Exit validation before currentRoomKey update
2. **HIGH**: Investigate exits variable corruption between parse and lookup
3. **MEDIUM**: Track lastDirection lifecycle and reset conditions
4. **LOW**: Remove debug logs after bug resolution

## ⚠️ Critical Reminders

- **Always use PowerShell `;` separator** (not `&&`)
- **Never use direct database access** - use API endpoints
- **Update DEVELOPMENT_STATUS.md after EVERY change**
- **Test parser changes with full pipeline**
- **Preserve all debug logging during investigation**

## 📊 Current System State

- **Database**: SQLite with 125 seed rooms + parsed exploration data
- **Parser**: Zone isolation working, exit creation has bug
- **Coordinates**: BFS-based calculation with collision resolution
- **AI Integration**: Ollama with llama3.2:3b model

## 🔗 Quick Links

- [Bug Investigation Details](PARSER_BUG_INVESTIGATION.md)
- [Session Handoff](SESSION_HANDOFF.md)
- [Full Quick Reference](../technical/QUICK_REFERENCE.md)
- [Development Status](DEVELOPMENT_STATUS.md)