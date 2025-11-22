# AI Agent Quick Reference

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