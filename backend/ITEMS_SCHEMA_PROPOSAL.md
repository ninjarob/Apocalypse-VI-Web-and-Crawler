# Comprehensive Item System Database Schema

## Overview
This schema properly normalizes the complex item data from Apocalypse VI MUD, supporting all item types (WEAPON, ARMOR, FOOD, LIGHT, SCROLL, POTION, etc.) and their type-specific attributes.

## Core Tables

### 1. items (Main Item Table)
```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  vnum INTEGER UNIQUE,                    -- MUD virtual number (if available)
  type_id INTEGER NOT NULL,               -- FK to item_types
  material_id INTEGER,                    -- FK to item_materials
  min_level INTEGER DEFAULT 0,
  size_id INTEGER,                        -- FK to item_sizes
  weight INTEGER,
  value INTEGER,                          -- Gold value
  rent INTEGER,                           -- Rent cost
  location TEXT,                          -- Where found/dropped (room, NPC, etc.)
  description TEXT,                       -- Short description
  long_description TEXT,                  -- Detailed examine text
  rawText TEXT,                           -- Raw MUD output
  identified BOOLEAN DEFAULT 0,           -- Whether fully identified
  createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
  updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (type_id) REFERENCES item_types(id),
  FOREIGN KEY (material_id) REFERENCES item_materials(id),
  FOREIGN KEY (size_id) REFERENCES item_sizes(id)
);
```

### 2. item_types (Reference Table)
```sql
CREATE TABLE item_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,              -- WEAPON, ARMOR, FOOD, LIGHT, SCROLL, etc.
  description TEXT
);

-- Seed data
INSERT INTO item_types (name, description) VALUES
  ('WEAPON', 'Melee or ranged weapons'),
  ('ARMOR', 'Protective equipment'),
  ('FOOD', 'Consumable food items'),
  ('DRINK', 'Consumable beverages'),
  ('LIGHT', 'Light sources'),
  ('SCROLL', 'Magic scrolls with spell effects'),
  ('POTION', 'Magic potions with spell effects'),
  ('WAND', 'Magical wands with charges'),
  ('STAFF', 'Magical staffs with charges'),
  ('CONTAINER', 'Bags, chests, containers'),
  ('KEY', 'Keys for locked doors/containers'),
  ('TREASURE', 'Valuable items with no use'),
  ('BOAT', 'Water traversal items'),
  ('FOUNTAIN', 'Drinkable fountains'),
  ('OTHER', 'Miscellaneous items');
```

### 3. item_materials (Reference Table)
```sql
CREATE TABLE item_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,              -- gold, silver, iron, leather, etc.
  description TEXT
);

-- Common materials from MUD
INSERT INTO item_materials (name) VALUES
  ('gold'), ('silver'), ('iron'), ('steel'), ('bronze'), ('copper'),
  ('leather'), ('cloth'), ('wood'), ('stone'), ('bone'), ('glass'),
  ('paper'), ('organic'), ('magical'), ('adamantite'), ('mithril'),
  ('dragonscale'), ('unknown');
```

### 4. item_sizes (Reference Table)
```sql
CREATE TABLE item_sizes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,              -- special, tiny, small, normal, large, huge
  description TEXT,
  size_modifier INTEGER                   -- For encumbrance calculations
);

INSERT INTO item_sizes (name, size_modifier) VALUES
  ('special', 0),
  ('tiny', 1),
  ('small', 2),
  ('normal', 3),
  ('medium', 4),
  ('large', 5),
  ('huge', 6),
  ('gigantic', 7);
```

### 5. item_flags (Reference Table)
```sql
CREATE TABLE item_flags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,              -- MAGIC, UNIQUE, UNBREAKABLE, etc.
  description TEXT,
  flag_type TEXT                          -- 'positive', 'negative', 'restriction'
);

-- Common flags from identify output
INSERT INTO item_flags (name, description, flag_type) VALUES
  ('MAGIC', 'Item is magical', 'positive'),
  ('UNIQUE', 'Only one can exist per player', 'restriction'),
  ('UNBREAKABLE', 'Cannot be damaged', 'positive'),
  ('!DONATE', 'Cannot be donated', 'restriction'),
  ('!SELL', 'Cannot be sold to shops', 'restriction'),
  ('!DROP', 'Cannot be dropped', 'restriction'),
  ('CURSED', 'Item is cursed', 'negative'),
  ('INVISIBLE', 'Item is invisible', 'positive'),
  ('GLOW', 'Item glows', 'positive'),
  ('HUM', 'Item hums', 'positive'),
  ('MAIN_HAND_WPN', 'Main hand weapon only', 'restriction'),
  ('OFF_HAND_WPN', 'Off hand weapon only', 'restriction'),
  ('TWO_HAND_WPN', 'Two-handed weapon', 'restriction');
```

### 6. item_flag_instances (Junction Table)
```sql
CREATE TABLE item_flag_instances (
  item_id TEXT NOT NULL,
  flag_id INTEGER NOT NULL,
  PRIMARY KEY (item_id, flag_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (flag_id) REFERENCES item_flags(id)
);
```

### 7. wear_locations (Reference Table)
```sql
CREATE TABLE wear_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,              -- FINGER, NECK, WIELD, BODY, etc.
  description TEXT,
  slot_limit INTEGER DEFAULT 1            -- How many items can be worn here
);

INSERT INTO wear_locations (name, description, slot_limit) VALUES
  ('TAKE', 'Can be picked up', 99),
  ('FINGER', 'Finger slot (rings)', 2),
  ('NECK', 'Neck slot (amulets)', 1),
  ('BODY', 'Body/chest slot', 1),
  ('HEAD', 'Head slot (helmets)', 1),
  ('LEGS', 'Leg slot (pants)', 1),
  ('FEET', 'Feet slot (boots)', 1),
  ('HANDS', 'Hand slot (gloves)', 1),
  ('ARMS', 'Arm slot (bracers)', 1),
  ('SHIELD', 'Shield slot', 1),
  ('ABOUT', 'About body (cloaks)', 1),
  ('WAIST', 'Waist slot (belts)', 1),
  ('WRIST', 'Wrist slot (bracelets)', 2),
  ('WIELD', 'Wielded weapon slot', 1),
  ('HOLD', 'Held item slot', 1),
  ('FACE', 'Face slot (masks)', 1),
  ('EAR', 'Ear slot (earrings)', 2),
  ('BACK', 'Back slot', 1);
```

### 8. item_wear_locations (Junction Table)
```sql
CREATE TABLE item_wear_locations (
  item_id TEXT NOT NULL,
  location_id INTEGER NOT NULL,
  PRIMARY KEY (item_id, location_id),
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES wear_locations(id)
);
```

### 9. stat_types (Reference Table)
```sql
CREATE TABLE stat_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,              -- MAXHIT, HITROLL, DAMROLL, STR, DEX, etc.
  description TEXT,
  stat_category TEXT                      -- 'combat', 'attribute', 'resistance', 'save'
);

INSERT INTO stat_types (name, description, stat_category) VALUES
  ('MAXHIT', 'Maximum hit points', 'combat'),
  ('MAXMANA', 'Maximum mana', 'combat'),
  ('MAXMOVE', 'Maximum movement', 'combat'),
  ('HITROLL', 'To-hit bonus', 'combat'),
  ('DAMROLL', 'Damage bonus', 'combat'),
  ('ARMOR', 'Armor class', 'combat'),
  ('STR', 'Strength modifier', 'attribute'),
  ('INT', 'Intelligence modifier', 'attribute'),
  ('WIS', 'Wisdom modifier', 'attribute'),
  ('DEX', 'Dexterity modifier', 'attribute'),
  ('CON', 'Constitution modifier', 'attribute'),
  ('CHA', 'Charisma modifier', 'attribute'),
  ('SAVING_PARA', 'Save vs paralysis', 'save'),
  ('SAVING_ROD', 'Save vs rods', 'save'),
  ('SAVING_PETRI', 'Save vs petrification', 'save'),
  ('SAVING_BREATH', 'Save vs breath', 'save'),
  ('SAVING_SPELL', 'Save vs spell', 'save');
```

### 10. item_stat_effects (Junction Table)
```sql
CREATE TABLE item_stat_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  stat_type_id INTEGER NOT NULL,
  modifier INTEGER NOT NULL,              -- +1, -2, etc.
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (stat_type_id) REFERENCES stat_types(id)
);
```

### 11. item_bindings (Reference Table)
```sql
CREATE TABLE item_bindings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,              -- NON-BINDING, BIND_ON_PICKUP, BIND_ON_EQUIP, BOUND
  description TEXT
);

INSERT INTO item_bindings (name, description) VALUES
  ('NON-BINDING', 'Item can be freely traded'),
  ('BIND_ON_PICKUP', 'Binds when picked up'),
  ('BIND_ON_EQUIP', 'Binds when equipped'),
  ('BOUND', 'Already bound to a character');
```

### 12. item_binding_instances (Track bound items)
```sql
CREATE TABLE item_binding_instances (
  item_id TEXT PRIMARY KEY,
  binding_type_id INTEGER NOT NULL,
  bound_to_character TEXT,                -- Character name or ID
  bound_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
  FOREIGN KEY (binding_type_id) REFERENCES item_bindings(id)
);
```

### 13. item_restrictions (Class/Race restrictions)
```sql
CREATE TABLE item_restrictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  restriction_type TEXT NOT NULL,         -- 'class' or 'race'
  restriction_value TEXT NOT NULL,        -- Class name or race name
  is_allowed BOOLEAN DEFAULT 1,           -- 1 = allowed, 0 = forbidden
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

## Type-Specific Tables

### 14. item_weapons (Weapon-specific data)
```sql
CREATE TABLE item_weapons (
  item_id TEXT PRIMARY KEY,
  damage_dice TEXT,                       -- e.g., '2D4'
  average_damage REAL,                    -- e.g., 5.0
  damage_type TEXT,                       -- slash, pierce, bludgeon
  weapon_skill TEXT,                      -- 'slash attack', 'pierce attack', etc.
  hand_requirement TEXT,                  -- 'one-hand', 'two-hand', 'main-hand', 'off-hand'
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### 15. item_armor (Armor-specific data)
```sql
CREATE TABLE item_armor (
  item_id TEXT PRIMARY KEY,
  armor_points INTEGER,                   -- AP value
  armor_type TEXT,                        -- light, medium, heavy
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### 16. item_lights (Light source-specific data)
```sql
CREATE TABLE item_lights (
  item_id TEXT PRIMARY KEY,
  light_intensity INTEGER,                -- How much light it provides
  hours_remaining INTEGER,                -- Duration left
  max_hours INTEGER,                      -- Maximum duration
  refillable BOOLEAN DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### 17. item_containers (Container-specific data)
```sql
CREATE TABLE item_containers (
  item_id TEXT PRIMARY KEY,
  max_weight INTEGER,                     -- Weight capacity
  max_items INTEGER,                      -- Item count capacity
  container_flags TEXT,                   -- CLOSEABLE, LOCKABLE, etc.
  key_vnum INTEGER,                       -- Key required to open
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### 18. item_consumables (Food/Drink/Potion data)
```sql
CREATE TABLE item_consumables (
  item_id TEXT PRIMARY KEY,
  consumable_type TEXT,                   -- 'food', 'drink', 'potion'
  hunger_restored INTEGER,                -- For food
  thirst_restored INTEGER,                -- For drink
  duration_hours INTEGER,                 -- How long effects last
  poisoned BOOLEAN DEFAULT 0,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### 19. item_spell_effects (For scrolls, potions, wands, staves)
```sql
CREATE TABLE item_spell_effects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  spell_name TEXT NOT NULL,               -- 'word of recall', 'cure light wounds', etc.
  spell_level INTEGER,                    -- Level at which spell is cast
  charges_current INTEGER,                -- For wands/staves (current charges)
  charges_max INTEGER,                    -- For wands/staves (max charges)
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### 20. item_granted_abilities (Special abilities granted)
```sql
CREATE TABLE item_granted_abilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL,
  ability_name TEXT NOT NULL,             -- 'infravision', 'detect magic', 'fly', etc.
  ability_description TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

### 21. item_customizations (Custom enhancements)
```sql
CREATE TABLE item_customizations (
  item_id TEXT PRIMARY KEY,
  is_customizable BOOLEAN DEFAULT 1,
  custom_name TEXT,
  custom_description TEXT,
  customized_by TEXT,                     -- Character who customized
  customized_at TEXT,
  FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
```

## Migration Strategy

1. **Phase 1**: Create all reference tables (types, materials, sizes, flags, wear_locations, stat_types, bindings)
2. **Phase 2**: Migrate existing items table to new structure
3. **Phase 3**: Create junction tables and populate from existing data
4. **Phase 4**: Create type-specific tables
5. **Phase 5**: Update backend services to support new schema
6. **Phase 6**: Update frontend to display rich item data

## Example Queries

### Get full item details with all metadata:
```sql
SELECT 
  i.*,
  it.name as type_name,
  im.name as material_name,
  isz.name as size_name,
  GROUP_CONCAT(DISTINCT wl.name) as wear_locations,
  GROUP_CONCAT(DISTINCT if.name) as flags,
  GROUP_CONCAT(DISTINCT st.name || ':' || ise.modifier) as stat_effects
FROM items i
LEFT JOIN item_types it ON i.type_id = it.id
LEFT JOIN item_materials im ON i.material_id = im.id
LEFT JOIN item_sizes isz ON i.size_id = isz.id
LEFT JOIN item_wear_locations iwl ON i.id = iwl.item_id
LEFT JOIN wear_locations wl ON iwl.location_id = wl.id
LEFT JOIN item_flag_instances ifi ON i.id = ifi.item_id
LEFT JOIN item_flags if ON ifi.flag_id = if.id
LEFT JOIN item_stat_effects ise ON i.id = ise.item_id
LEFT JOIN stat_types st ON ise.stat_type_id = st.id
WHERE i.id = ?
GROUP BY i.id;
```

### Get weapon details:
```sql
SELECT i.*, iw.*, it.name as type_name
FROM items i
JOIN item_weapons iw ON i.id = iw.item_id
JOIN item_types it ON i.type_id = it.id
WHERE i.id = ?;
```

## Benefits of This Schema

1. ✅ **Normalized**: No data duplication, easy to maintain
2. ✅ **Extensible**: Easy to add new item types, flags, stats
3. ✅ **Performant**: Indexed foreign keys for fast queries
4. ✅ **Flexible**: Type-specific tables only store relevant data
5. ✅ **Accurate**: Matches MUD item system exactly
6. ✅ **Queryable**: Can filter/search by any attribute
7. ✅ **Future-proof**: Supports custom items, crafting, upgrades
