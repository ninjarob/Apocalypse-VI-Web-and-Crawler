# NPC System Documentation

## Overview

The Apocalypse VI MUD NPC system provides comprehensive tracking of non-player characters, including their stats, equipment, spells, dialogue, movement patterns, and visibility states. This document outlines the complete NPC infrastructure.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Data Collection Methods](#data-collection-methods)
3. [Visibility System](#visibility-system)
4. [API Endpoints](#api-endpoints)
5. [Example NPCs](#example-npcs)

---

## Database Schema

### Core Tables

#### `npcs` (Main Table)

The primary NPC table stores all basic information and stats.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment primary key |
| `name` | TEXT | NPC name (e.g., "The Temple Guard") |
| `short_desc` | TEXT | Short description shown in room |
| `long_desc` | TEXT | Long description from examination |
| `description` | TEXT | Detailed description including race, gender, condition |
| `location` | TEXT | General location name |
| `room_id` | INTEGER FK | Current/spawn room ID |
| `zone_id` | INTEGER FK | Zone where NPC exists |

#### Stats Fields

**Note:** NPCs are templates with only maximum values. Current stats are tracked per-instance when spawned.

| Field | Type | Description |
|-------|------|-------------|
| `hp_max` | INTEGER | Maximum hit points |
| `mana_max` | INTEGER | Maximum mana |
| `moves_max` | INTEGER | Maximum movement points |
| `level` | INTEGER | NPC level |
| `experience_to_next_level` | INTEGER | XP to next level (TNL) |
| `alignment` | INTEGER | Alignment (-1000 evil to +1000 good) |

#### Combat Stats

| Field | Type | Description |
|-------|------|-------------|
| `attacks_per_round` | REAL | Attacks per round (e.g., 1.5, 2.0, 3.0) |
| `hit_ability` | INTEGER | To-hit modifier/ability |
| `damage_ability` | INTEGER | Damage modifier/ability |
| `magic_ability` | INTEGER | Magic power/resistance |
| `armor_class` | INTEGER | Defensive armor class |

#### Character Info

| Field | Type | Description |
|-------|------|-------------|
| `race` | TEXT | Race (Human, Dwarf, Elf, etc.) |
| `class` | TEXT | Class (Fighter, Mage, Cleric, etc.) |
| `gender` | TEXT | Gender (male, female, none) |
| `gold` | INTEGER | Gold carried |

#### Character State

| Field | Type | Description |
|-------|------|-------------|
| `position` | TEXT | Character position (standing, sitting, resting, sleeping, fighting) |

**Position System:**
- **standing** - Default position, can move and fight normally
- **sitting** - Faster HP/mana recovery, reduced defense
- **resting** - Fastest HP/mana recovery, cannot fight
- **sleeping** - Maximum recovery rate, helpless in combat
- **fighting** - In active combat

**Condition System (calculated from HP%):**
- **excellent** (100%)
- **scratched** (90-99%)
- **slight wounds** (75-89%)
- **quite a few wounds** (50-74%)
- **big nasty wounds** (30-49%)
- **pretty hurt** (15-29%)
- **awful** (<15%)

#### Behavior Flags

| Field | Type | Description |
|-------|------|-------------|
| `is_stationary` | INTEGER | 1 if NPC doesn't move, 0 if follows path |
| `is_aggressive` | INTEGER | 1 if attacks on sight |
| `aggro_level` | TEXT | Aggression trigger (e.g., "attacks_on_criminal_flag") |

#### Visibility Flags

| Field | Type | Description |
|-------|------|-------------|
| `is_invisible` | INTEGER | 1 if invisible (requires detect invisible) |
| `is_cloaked` | INTEGER | 1 if cloaked (requires bat sonar in darkness) |
| `is_hidden` | INTEGER | 1 if hidden (requires AOE attack to reveal) |

#### Data Collection Tracking

| Field | Type | Description |
|-------|------|-------------|
| `has_been_charmed` | INTEGER | 1 if ever charmed |
| `has_been_considered` | INTEGER | 1 if "consider" command used |
| `has_been_examined` | INTEGER | 1 if "look at" command used |
| `has_reported_stats` | INTEGER | 1 if "order report" command used |
| `has_been_in_group` | INTEGER | 1 if added to player group |

#### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `discovered` | INTEGER | 1 if NPC has been encountered |
| `rawText` | TEXT | Raw MUD text captured |
| `notes` | TEXT | Research notes about NPC |
| `createdAt` | DATETIME | Creation timestamp |
| `updatedAt` | DATETIME | Last update timestamp |

---

### Related Tables

#### `npc_equipment`

Tracks items equipped by NPCs (template definition).

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment primary key |
| `npc_id` | INTEGER FK | Reference to npcs table |
| `item_id` | INTEGER FK | Reference to items table |
| `wear_location_id` | INTEGER FK | Reference to wear_locations table |
| `quantity` | INTEGER | Number of items (for stackable items) |

**Note:** This is a template system. Each NPC defines what equipment they spawn with and where it's worn. Actual item and wear location details are retrieved via foreign key lookups.

#### `npc_spells`

Tracks spells and skills observed being used by NPCs.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment primary key |
| `npc_id` | INTEGER FK | Reference to npcs table |
| `spell_name` | TEXT | Name of spell/skill |
| `spell_type` | TEXT | Type (offensive, defensive, healing, buff, debuff) |
| `mana_cost` | INTEGER | Mana cost (if known) |
| `observed_count` | INTEGER | Number of times observed |
| `last_observed` | DATETIME | Last time spell was used |

#### `npc_dialogue`

Stores recorded NPC dialogue.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment primary key |
| `npc_id` | INTEGER FK | Reference to npcs table |
| `dialogue_text` | TEXT | What the NPC said |
| `dialogue_type` | TEXT | Type (greeting, quest, shop, idle, etc.) |
| `trigger_keyword` | TEXT | Keyword that triggered dialogue |
| `context` | TEXT | Context of dialogue |
| `recorded_at` | DATETIME | When dialogue was recorded |

#### `npc_paths`

Defines movement patterns for wandering NPCs.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment primary key |
| `npc_id` | INTEGER FK | Reference to npcs table |
| `room_id` | INTEGER FK | Room in path sequence |
| `sequence_order` | INTEGER | Order in path (1, 2, 3, etc.) |
| `direction_from_previous` | TEXT | Direction taken from previous room |
| `wait_time_seconds` | INTEGER | Time to wait in room |
| `notes` | TEXT | Notes about this path point |

#### `npc_spawn_info`

Tracks spawn locations and rates.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment primary key |
| `npc_id` | INTEGER FK | Reference to npcs table |
| `room_id` | INTEGER FK | Spawn room |
| `spawn_rate_minutes` | INTEGER | Respawn time in minutes |
| `max_instances` | INTEGER | Maximum concurrent instances |
| `last_observed_spawn` | DATETIME | Last observed spawn time |
| `spawn_conditions` | TEXT | Special spawn conditions |

#### `npc_flags`

Reference table of NPC flags and status effects.

| Field | Type | Description |
|-------|------|-------------|
| `id` | INTEGER PK | Auto-increment primary key |
| `name` | TEXT | Flag name (CHARMED, SLEEPING, BLINDED, etc.) |
| `description` | TEXT | Flag description |
| `category` | TEXT | Category (status, debuff, behavior, ability, immunity, special) |

**Seeded Flags:**
- **Status**: CHARMED, SLEEPING
- **Debuff**: BLINDED, SILENCED, POISONED, CURSED
- **Behavior**: AGGRESSIVE, SENTINEL, STAY_ZONE, WIMPY, MEMORY, ASSIST
- **Ability**: DETECT_INVISIBLE, DETECT_HIDDEN
- **Immunity**: NO_CHARM, NO_SLEEP
- **Special**: BOSS, UNIQUE

#### `npc_flag_instances`

Junction table linking NPCs to active flags.

| Field | Type | Description |
|-------|------|-------------|
| `npc_id` | INTEGER PK,FK | Reference to npcs table |
| `flag_id` | INTEGER PK,FK | Reference to npc_flags table |
| `active` | INTEGER | 1 if flag is currently active |

---

## Data Collection Methods

### 1. Room Entry (Basic Discovery)

When entering a room, NPCs are visible with their short description:

```
A Guard of the Temple stands here eyeing people entering the temple.
```

**Data Obtained:**
- Short description
- Visible status indicators (Charmed, Sleeping, etc.)

### 2. Look At / Examination

Using `look <npc>` or `examine <npc>` provides detailed information:

```
A big, strong, helpful, trustworthy guard.
The Temple Guard appears to be a male Human.
The Temple Guard is in excellent condition.
```

**Data Obtained:**
- Long description
- Race and gender
- Health condition

### 3. Consider Command

The `consider <npc>` command provides comparative stats:

```
Comparison         You   Opponent
--------------     ---   --------
Level          :    19   Greatly Inferior
Hit Points     :   169   Greatly Superior
Attacks/2rounds:     2   Higher
Hit Ability    :     4   Superior
Damage Ability :     1   Superior
Magic Ability  :    19   Extremely Inferior
```

**Data Obtained:**
- Relative level comparison
- Relative HP comparison
- Attacks per round comparison
- Combat ability comparisons

**Comparison Terms:**
- Extremely Inferior → Greatly Inferior → Inferior → Slightly Inferior → Equal
- Slightly Superior → Superior → Greatly Superior → Extremely Superior

### 4. Charm Spell + Report Command

Charm the NPC and use `order <npc> report`:

```
The Temple Guard reports: 276/276H, 100/100M, 100/100V, TNL: 1468750X
```

**Data Obtained:**
- Exact current/max HP
- Exact current/max Mana
- Exact current/max Movement
- Experience to next level (TNL)

**Limitations:**
- Only works if NPC can be charmed
- No-magic rooms prevent charm (e.g., Nodri's Shop)
- Some NPCs are immune to charm

### 5. Charm Spell + Group Command

Add charmed NPC to your group and use `group`:

```
Your group consists of:
  [197/197H 243/296M 134/134V] [19 Ma] Pouch (Head of group)
  [276/276H 100/100M 100/100V] [13 Fi] The Temple Guard
```

**Data Obtained:**
- Exact level
- Exact class
- Current/max stats (HP, Mana, Movement)

### 6. Combat Observation

During combat, observe attack patterns:

```
You miss THE TEMPLE GUARD with your hit.
The Temple Guard misses YOU with his hit.
The Temple Guard barely hits YOU.

You miss THE TEMPLE GUARD with your hit.
The Temple Guard hits YOU hard.
```

**Data Obtained:**
- Attacks per round (count attacks across multiple rounds)
- Spell casting (observe spell names and effects)
- Combat abilities and special attacks

### 7. Dialogue Interaction

Talk to NPCs using `say` or trigger keywords:

```
> say hello
The bard says, "Greetings, traveler! Would you like to hear a tale?"
```

**Data Obtained:**
- Dialogue text
- Quest information
- Lore and story

---

## Visibility System

### Visible NPCs (Default)

Normal NPCs are visible to all players without special abilities.

**Example:** Temple Guard, Mercenary, Nodri

### Invisible NPCs

Require `detect invisible` spell or ability.

**Example:** Wraith in Haunted Graveyard

```
> look
You don't see anything special.

> cast 'detect invisible'
You feel your eyes tingle.

> look
A translucent wraith floats here menacingly.
```

**Detection:** `is_invisible = 1`

### Cloaked NPCs

Require `bat sonar` in non-lit areas (darkness).

**Example:** Cloaked Rogue in Dark Alley

```
> look
[Dark Alley]
It's pitch black here.

> cast 'bat sonar'
You send out sonar waves.

> look
A cloaked figure lurks in the shadows.
```

**Detection:** `is_cloaked = 1`

### Hidden NPCs

Only revealed by:
1. Using AOE (Area of Effect) attack
2. Engaging in combat
3. Once revealed and name is known, can be targeted directly

**Example:** Hidden Assassin

```
> look
You sense someone hiding here.

> cast 'fireball'
You reveal a hidden assassin!
A hidden assassin attacks YOU!

> Now you can target: kill assassin
```

**Detection:** `is_hidden = 1`

---

## API Endpoints

### Get All NPCs

```
GET /api/npcs
```

**Query Parameters:**
- `zone_id` - Filter by zone
- `level_min` - Minimum level
- `level_max` - Maximum level
- `is_aggressive` - Filter by aggression (0 or 1)
- `is_stationary` - Filter by movement (0 or 1)
- `race` - Filter by race
- `class` - Filter by class

**Example:**
```bash
curl "http://localhost:3002/api/npcs?zone_id=2&level_min=10&level_max=20"
```

### Get Single NPC

```
GET /api/npcs/:id
```

**Example:**
```bash
curl "http://localhost:3002/api/npcs/1"
```

**Response includes:**
- Full NPC data
- Equipment (from `npc_equipment`)
- Spells (from `npc_spells`)
- Dialogue (from `npc_dialogue`)
- Path (from `npc_paths`)
- Flags (from `npc_flags` via `npc_flag_instances`)

### Create NPC

```
POST /api/npcs
Content-Type: application/json
```

**Example:**
```json
{
  "name": "A city guard",
  "short_desc": "A guard patrols here.",
  "level": 15,
  "race": "Human",
  "class": "Fighter",
  "hp_max": 200,
  "zone_id": 2,
  "is_aggressive": 0,
  "is_stationary": 0
}
```

### Update NPC

```
PUT /api/npcs/:id
Content-Type: application/json
```

**Example:**
```json
{
  "hp_current": 150,
  "mana_current": 80,
  "has_been_charmed": 1,
  "has_reported_stats": 1
}
```

### Delete NPC

```
DELETE /api/npcs/:id
```

### NPC Equipment Endpoints

```
GET /api/npc_equipment?npc_id=1
POST /api/npc_equipment
PUT /api/npc_equipment/:id
DELETE /api/npc_equipment/:id
```

### NPC Spells Endpoints

```
GET /api/npc_spells?npc_id=1
POST /api/npc_spells
PUT /api/npc_spells/:id
DELETE /api/npc_spells/:id
```

---

## Example NPCs

### 1. The Temple Guard (Fully Documented)

**Location:** The Temple of Midgaard (Zone 2)
**Level:** 13 Fighter

**Template Stats (Max Values):**
- HP Max: 276
- Mana Max: 100
- Moves Max: 100
- Attacks: 1.5 per round
- Alignment: 1000 (Good)
- Position: standing

**Data Collection:**
- ✅ Charmed
- ✅ Considered
- ✅ Examined
- ✅ Reported stats
- ✅ Added to group

**Equipment:**
- Wielded: Steel longsword
- Worn: Chainmail armor, wooden shield, leather boots

**Notes:** Standard city guard. Can be charmed for full stat reporting. Shows "Superior" combat abilities compared to level 19 player.

### 2. A Wraith (Invisible)

**Location:** Haunted Graveyard (Zone 12)
**Level:** 12 Necromancer

**Stats:**
- HP: 85/85
- Attacks: 2.0 per round
- Alignment: -1000 (Evil)

**Visibility:** Invisible - requires `detect invisible`

**Spells:**
- Life drain (offensive, 40 mana)
- Fear (debuff, 30 mana)

**Behavior:** Aggressive undead creature

### 3. Nodri (No-Magic Room)

**Location:** Nodri's Shop (Zone 2)
**Level:** 15 Merchant

**Stats:** Unknown - cannot charm in no-magic room

**Data Collection:**
- ❌ Cannot charm
- ✅ Considered
- ✅ Examined

**Notes:** Shopkeeper in no-magic zone. Stats can only be approximated through `consider` command.

### 4. A Hidden Assassin

**Location:** Thieves Guild (Zone 2)
**Level:** 14 Assassin

**Stats:**
- HP: 55/55
- Attacks: 3.0 per round (very fast)
- Alignment: -800 (Evil)

**Visibility:** Hidden - requires AOE attack to reveal

**Behavior:** Aggressive once revealed. High damage dealer.

**Equipment:**
- Wielded: Poisoned dagger
- Worn: Leather armor
- Inventory: Lockpicks

### 5. A Sleeping Dragon (Boss)

**Location:** Dragon Lair (Zone 19)
**Level:** 50 Dragon

**Stats:**
- HP: 2500/2500
- Mana: 500/500
- Attacks: 4.0 per round
- All combat stats: "Greatly Superior"

**Behavior:**
- Not aggressive while sleeping
- Becomes extremely aggressive if attacked

**Notes:** End-game boss. Requires organized raid to defeat.

---

## Best Practices

### Data Collection Priority

1. **First Encounter:** Record short_desc, location
2. **Safe Examination:** Use `look` and `consider` for basic info
3. **Charm If Possible:** Attempt charm for exact stats
4. **Group & Report:** Get precise level, class, and HP/Mana/Moves
5. **Combat Testing:** Observe attack patterns and spells
6. **Long-term Tracking:** Note spawn rates, paths, dialogue

### Visibility Testing Checklist

- [ ] Visible normally?
- [ ] Requires detect invisible?
- [ ] Requires bat sonar?
- [ ] Hidden until attacked?
- [ ] Can be targeted by name after reveal?

### Equipment Documentation

- [ ] What is wielded?
- [ ] What is worn?
- [ ] What is in inventory?
- [ ] Any special items?
- [ ] Item properties known?

### Spell/Skill Documentation

- [ ] What spells/skills used?
- [ ] Spell types (offensive, healing, buff, debuff)?
- [ ] Estimated mana costs?
- [ ] Frequency of use?

---

## Future Enhancements

### Planned Features

1. **AI-Assisted NPC Analysis**
   - Automated consider result parsing
   - Combat log analysis for attack patterns
   - Dialogue extraction and categorization

2. **NPC Relationship System**
   - Track NPC-to-NPC relationships
   - Faction affiliations
   - Assist patterns

3. **Advanced Path Mapping**
   - Automatic path detection via crawler
   - Path prediction algorithms
   - Zone-wide patrol patterns

4. **Combat AI Profiling**
   - Spell rotation analysis
   - Targeting preferences
   - Flee thresholds

5. **Drop Rate Tracking**
   - Loot table documentation
   - Gold ranges
   - Rare item drops

---

## Contributing

When documenting NPCs, please include:

1. **Comprehensive Notes:** Document how information was obtained
2. **Data Collection Flags:** Mark which methods were used
3. **Raw Text:** Include MUD output in `rawText` field
4. **Equipment Details:** Full item lists with slots
5. **Spell Observations:** Include combat logs showing spell use

For questions or contributions, see the main [Development Status](../development/DEVELOPMENT_STATUS.md) documentation.
