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

### 📊 Complete Data Processing Workflow
**IMPORTANT**: JSON files in `data/` are the SOURCE OF TRUTH for seeding. After making database changes, you MUST export back to JSON.

```powershell
# 1. Seed database from JSON files (zones + existing rooms)
cd scripts
npm run seed

# 2. Parse new exploration log (adds/updates rooms in database)
npm run parse-logs "../scripts/sessions/Exploration - Forest of Haon-Dor.txt" --zone-id 19

# 3. Calculate coordinates for the zone
npm run calculate-coordinates 19

# 4. Export database back to JSON files (CRITICAL - preserves changes for next seed)
npx tsx export-via-api.ts
```

**Why Step 4 is Critical**: 
- The seed script reads from `data/rooms_for_zone_*.json` and `data/room_exits_for_zone_*.json`
- If you don't export, your database changes will be LOST on next seed
- JSON files = persistent storage, Database = working copy

### 🔄 Export Database to JSON (After ANY Database Changes)
```powershell
cd scripts
npx tsx export-via-api.ts
```

**This exports via API**:
- `GET /api/zones` - Get all zones
- `GET /api/rooms?zone_id=X` - Get rooms for each zone → `rooms_for_zone_X.json`
- `GET /api/room_exits?zone_id=X` - Get exits for each zone → `room_exits_for_zone_X.json`

**When to use**:
- ✅ After parsing new exploration logs
- ✅ After manually fixing room assignments
- ✅ After marking zone exits
- ✅ After calculating coordinates
- ✅ Before committing changes to git

### Test Zone Alias System
```powershell
cd scripts
# Test Juris zone alias detection
npm run seed
npm run parse-logs "../scripts/sessions/Exploration - Haunted Forest.txt" --zone-id 12
npx tsx query-db.ts "SELECT r.portal_key, r.name, r.zone_id, z.name as zone_name FROM rooms r JOIN zones z ON r.zone_id = z.id WHERE r.name LIKE '%juris%' OR r.portal_key IN ('cdefimopq', 'dghklopq')"
```

**Expected**: Juris rooms in zone 47, zone exits marked
**Success Indicators**: 
- "The West Gate of Juris" (cdefimopq) in zone 47 ✅
- "Outside the West Gates of Juris" (dghklopq) in zone 12 ✅
- Zone exits between zones 12 ↔ 47 established ✅

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

### Data Files (SOURCE OF TRUTH)
- **Room Data**: `data/rooms_for_zone_X.json` (all room properties including zone_exit flag)
- **Exit Data**: `data/room_exits_for_zone_X.json` (all exits including is_zone_exit flag)
- **Database**: `data/mud-data.db` (working copy, regenerated from JSON on seed)
- **Export Script**: `scripts/export-via-api.ts` (exports database → JSON via API)

### API Endpoints (Backend on localhost:3002)
- **GET /api/zones** - List all zones
- **GET /api/rooms?zone_id=X** - Get all rooms in zone X
- **GET /api/room_exits?zone_id=X** - Get all exits for rooms in zone X
- **GET /api/rooms?portal_key=KEY** - Find room by portal key

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
- **API Reference**: `docs/technical/BACKEND_API.md`

## 🎯 Next Steps (Priority Order)

1. **HIGH**: Monitor zone detection accuracy in future explorations
2. **MEDIUM**: Add aliases for other zones with naming variations
3. **LOW**: Consider automated alias discovery from exploration logs

## ⚠️ Critical Reminders

- **Always use PowerShell `;` separator** (not `&&`)
- **ALWAYS export to JSON after database changes** - `npx tsx export-via-api.ts`
- **JSON files are the source of truth** - database is just working copy
- **Use API for data access** - Backend API on `http://localhost:3002/api`
- **Update DEVELOPMENT_STATUS.md after EVERY change**
- **Test zone aliases with full pipeline**
- **Add zone aliases to seed.ts for new zone variations**

### 📁 Data Storage Architecture
```
data/
  ├── rooms_for_zone_2.json      ← SOURCE OF TRUTH (seed reads from here)
  ├── room_exits_for_zone_2.json ← SOURCE OF TRUTH (seed reads from here)
  └── mud-data.db                ← WORKING COPY (export back to JSON)
```

**Flow**: JSON → Database (seed) → Database (parse/edit) → JSON (export) → Git commit

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