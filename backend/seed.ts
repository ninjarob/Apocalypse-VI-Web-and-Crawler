import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

// Database location: data/mud-data.db at project root
// When running: backend/seed.ts -> ../data/mud-data.db
const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, '../data/mud-data.db');

console.log('🌱 Starting database seed...');
console.log(`📁 Database location: ${DB_FILE}`);

// Create fresh database connection
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  } else {
    console.log('✓ Connected to database');
    seedDatabase();
  }
});

function seedDatabase() {
  // Drop all tables first for a clean slate
  console.log('\n🗑️  Dropping existing tables...');

  const dropTables = [
    'DROP TABLE IF EXISTS command_usage',
    'DROP TABLE IF EXISTS exploration_queue',
    'DROP TABLE IF EXISTS crawler_status',
    'DROP TABLE IF EXISTS player_actions',
    'DROP TABLE IF EXISTS socials',
    'DROP TABLE IF EXISTS room_exits',
    'DROP TABLE IF EXISTS rooms',
    'DROP TABLE IF EXISTS npcs',
    // Drop item-related tables in correct order (child tables first)
    'DROP TABLE IF EXISTS item_customizations',
    'DROP TABLE IF EXISTS item_granted_abilities',
    'DROP TABLE IF EXISTS item_spell_effects',
    'DROP TABLE IF EXISTS item_consumables',
    'DROP TABLE IF EXISTS item_containers',
    'DROP TABLE IF EXISTS item_lights',
    'DROP TABLE IF EXISTS item_armor',
    'DROP TABLE IF EXISTS item_weapons',
    'DROP TABLE IF EXISTS item_restrictions',
    'DROP TABLE IF EXISTS item_binding_instances',
    'DROP TABLE IF EXISTS item_stat_effects',
    'DROP TABLE IF EXISTS item_wear_locations',
    'DROP TABLE IF EXISTS item_flag_instances',
    'DROP TABLE IF EXISTS items',
    'DROP TABLE IF EXISTS item_bindings',
    'DROP TABLE IF EXISTS stat_types',
    'DROP TABLE IF EXISTS wear_locations',
    'DROP TABLE IF EXISTS item_flags',
    'DROP TABLE IF EXISTS item_sizes',
    'DROP TABLE IF EXISTS item_materials',
    'DROP TABLE IF EXISTS item_types',
    'DROP TABLE IF EXISTS spells',
    'DROP TABLE IF EXISTS attacks',
    'DROP TABLE IF EXISTS class_perk_availability',
    'DROP TABLE IF EXISTS class_proficiencies',
    'DROP TABLE IF EXISTS class_perks',
    'DROP TABLE IF EXISTS classes',
    'DROP TABLE IF EXISTS class_groups',
    'DROP TABLE IF EXISTS zone_connections',
    'DROP TABLE IF EXISTS zone_areas',
    'DROP TABLE IF EXISTS zones',
    'DROP TABLE IF EXISTS races',
    'DROP TABLE IF EXISTS skills',
    'DROP TABLE IF EXISTS ability_scores',
    'DROP TABLE IF EXISTS abilities',
    'DROP TABLE IF EXISTS saving_throws',
    'DROP TABLE IF EXISTS spell_modifiers',
    'DROP TABLE IF EXISTS elemental_resistances',
    'DROP TABLE IF EXISTS physical_resistances'
  ];

  dropTables.forEach(sql => db.run(sql));

  console.log('✓ Tables dropped');
  console.log('\n📊 Creating tables...');

  createTables(() => {
    console.log('✓ Tables created');
    console.log('\n📊 Seeding reference tables...');
    seedReferenceTables(() => {
      console.log('✓ Reference tables seeded');
      console.log('\n🌱 Seeding data...');
      seedData();
    });
  });
}

function createTables(callback: () => void) {
  db.serialize(() => {
  // Rooms table
  db.run(`CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER,
    vnum INTEGER UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    exits TEXT,
    npcs TEXT,
    items TEXT,
    coordinates TEXT,
    area TEXT,
    flags TEXT,
    terrain TEXT,
    visitCount INTEGER DEFAULT 0,
    firstVisited DATETIME,
    lastVisited DATETIME,
    rawText TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
  )`);

  // Room exits table - defines directional connections between rooms
  db.run(`CREATE TABLE room_exits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_room_id INTEGER NOT NULL,
    to_room_id INTEGER,
    direction TEXT NOT NULL,
    description TEXT,
    door_name TEXT,
    is_door INTEGER DEFAULT 0,
    is_locked INTEGER DEFAULT 0,
    key_vnum INTEGER,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (to_room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE(from_room_id, direction)
  )`);

  // NPCs table
  db.run(`CREATE TABLE npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    dialogue TEXT,
    hostile INTEGER,
    level INTEGER,
    race TEXT,
    class TEXT,
    rawText TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Item Types (Reference Table)
  db.run(`CREATE TABLE item_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  )`);

  // Item Materials (Reference Table)
  db.run(`CREATE TABLE item_materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  )`);

  // Item Sizes (Reference Table)
  db.run(`CREATE TABLE item_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    size_modifier INTEGER
  )`);

  // Item Flags (Reference Table)
  db.run(`CREATE TABLE item_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    flag_type TEXT
  )`);

  // Wear Locations (Reference Table)
  db.run(`CREATE TABLE wear_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    slot_limit INTEGER DEFAULT 1
  )`);

  // Stat Types (Reference Table)
  db.run(`CREATE TABLE stat_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    stat_category TEXT
  )`);

  // Item Bindings (Reference Table)
  db.run(`CREATE TABLE item_bindings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT
  )`);

  // Items (Main Table)
  db.run(`CREATE TABLE items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    vnum INTEGER UNIQUE,
    type_id INTEGER NOT NULL,
    material_id INTEGER,
    min_level INTEGER DEFAULT 0,
    size_id INTEGER,
    weight INTEGER,
    value INTEGER,
    rent INTEGER,
    location TEXT,
    description TEXT,
    long_description TEXT,
    rawText TEXT,
    identified INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (type_id) REFERENCES item_types(id),
    FOREIGN KEY (material_id) REFERENCES item_materials(id),
    FOREIGN KEY (size_id) REFERENCES item_sizes(id)
  )`);

  // Item Flag Instances (Junction Table)
  db.run(`CREATE TABLE item_flag_instances (
    item_id TEXT NOT NULL,
    flag_id INTEGER NOT NULL,
    PRIMARY KEY (item_id, flag_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (flag_id) REFERENCES item_flags(id)
  )`);

  // Item Wear Locations (Junction Table)
  db.run(`CREATE TABLE item_wear_locations (
    item_id TEXT NOT NULL,
    location_id INTEGER NOT NULL,
    PRIMARY KEY (item_id, location_id),
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES wear_locations(id)
  )`);

  // Item Stat Effects (Junction Table)
  db.run(`CREATE TABLE item_stat_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    stat_type_id INTEGER NOT NULL,
    modifier INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (stat_type_id) REFERENCES stat_types(id)
  )`);

  // Item Binding Instances
  db.run(`CREATE TABLE item_binding_instances (
    item_id TEXT PRIMARY KEY,
    binding_type_id INTEGER NOT NULL,
    bound_to_character TEXT,
    bound_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    FOREIGN KEY (binding_type_id) REFERENCES item_bindings(id)
  )`);

  // Item Restrictions (Class/Race)
  db.run(`CREATE TABLE item_restrictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    restriction_type TEXT NOT NULL,
    restriction_value TEXT NOT NULL,
    is_allowed INTEGER DEFAULT 1,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Weapons (Type-Specific)
  db.run(`CREATE TABLE item_weapons (
    item_id TEXT PRIMARY KEY,
    damage_dice TEXT,
    average_damage REAL,
    damage_type TEXT,
    weapon_skill TEXT,
    hand_requirement TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Armor (Type-Specific)
  db.run(`CREATE TABLE item_armor (
    item_id TEXT PRIMARY KEY,
    armor_points INTEGER,
    armor_type TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Lights (Type-Specific)
  db.run(`CREATE TABLE item_lights (
    item_id TEXT PRIMARY KEY,
    light_intensity INTEGER,
    hours_remaining INTEGER,
    max_hours INTEGER,
    refillable INTEGER DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Containers (Type-Specific)
  db.run(`CREATE TABLE item_containers (
    item_id TEXT PRIMARY KEY,
    max_weight INTEGER,
    max_items INTEGER,
    container_flags TEXT,
    key_vnum INTEGER,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Consumables (Type-Specific)
  db.run(`CREATE TABLE item_consumables (
    item_id TEXT PRIMARY KEY,
    consumable_type TEXT,
    hunger_restored INTEGER,
    thirst_restored INTEGER,
    duration_hours INTEGER,
    poisoned INTEGER DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Spell Effects
  db.run(`CREATE TABLE item_spell_effects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    spell_name TEXT NOT NULL,
    spell_level INTEGER,
    charges_current INTEGER,
    charges_max INTEGER,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Granted Abilities
  db.run(`CREATE TABLE item_granted_abilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    ability_name TEXT NOT NULL,
    ability_description TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Item Customizations
  db.run(`CREATE TABLE item_customizations (
    item_id TEXT PRIMARY KEY,
    is_customizable INTEGER DEFAULT 1,
    custom_name TEXT,
    custom_description TEXT,
    customized_by TEXT,
    customized_at TEXT,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  )`);

  // Spells table
  db.run(`CREATE TABLE spells (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    manaCost INTEGER,
    level INTEGER,
    type TEXT,
    effects TEXT,
    rawText TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Attacks table
  db.run(`CREATE TABLE attacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    damage TEXT,
    type TEXT,
    requirements TEXT,
    rawText TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Player Actions table - unified table for all player input types
  db.run(`CREATE TABLE player_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    category TEXT,
    description TEXT,
    syntax TEXT,
    examples TEXT,
    requirements TEXT,
    levelRequired INTEGER,
    relatedActions TEXT,
    documented INTEGER DEFAULT 0,
    discovered DATETIME,
    lastTested DATETIME,
    timesUsed INTEGER DEFAULT 0,
    successCount INTEGER DEFAULT 0,
    failCount INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    CHECK(type IN ('command', 'social', 'emote', 'spell', 'skill', 'other'))
  )`);

  // Command usage log
  db.run(`CREATE TABLE command_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actionName TEXT NOT NULL,
    fullCommand TEXT,
    roomLocation TEXT,
    context TEXT,
    success INTEGER,
    response TEXT,
    errorMessage TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actionName) REFERENCES player_actions(name)
  )`);

  // Exploration queue
  db.run(`CREATE TABLE exploration_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    priority INTEGER DEFAULT 0,
    commandToTry TEXT,
    targetRoom TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    executedAt DATETIME
  )`);

  // Crawler status
  db.run(`CREATE TABLE crawler_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT,
    currentRoom TEXT,
    timestamp DATETIME,
    roomsDiscovered INTEGER DEFAULT 0,
    npcsDiscovered INTEGER DEFAULT 0,
    itemsDiscovered INTEGER DEFAULT 0,
    commandsDiscovered INTEGER DEFAULT 0,
    actionsCompleted INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Races table
  db.run(`CREATE TABLE races (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    stats TEXT,
    abilities TEXT,
    requirements TEXT,
    helpText TEXT,
    discovered DATETIME,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Skills table
  db.run(`CREATE TABLE skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    type TEXT,
    requirements TEXT,
    effects TEXT,
    manaCost INTEGER,
    cooldown INTEGER,
    helpText TEXT,
    discovered DATETIME,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Abilities table
  db.run(`CREATE TABLE abilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ability Scores table - Maps score values to effects for each ability
  db.run(`CREATE TABLE ability_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ability_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    effects TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ability_id) REFERENCES abilities(id) ON DELETE CASCADE,
    UNIQUE(ability_id, score)
  )`);

  // Saving Throws table
  db.run(`CREATE TABLE saving_throws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Spell Modifiers table
  db.run(`CREATE TABLE spell_modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Elemental Resistances table
  db.run(`CREATE TABLE elemental_resistances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Physical Resistances table
  db.run(`CREATE TABLE physical_resistances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Class Groups table
  db.run(`CREATE TABLE class_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Classes table (enhanced)
  db.run(`CREATE TABLE classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    class_group_id INTEGER,
    description TEXT,
    alignment_requirement TEXT,
    hp_regen INTEGER,
    mana_regen INTEGER,
    move_regen INTEGER,
    special_notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_group_id) REFERENCES class_groups(id) ON DELETE SET NULL
  )`);

  // Class Proficiencies table
  db.run(`CREATE TABLE class_proficiencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    level_required INTEGER NOT NULL,
    is_skill INTEGER DEFAULT 0,
    prerequisite_id INTEGER,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_id) REFERENCES class_proficiencies(id) ON DELETE SET NULL
  )`);

  // Class Perks table
  db.run(`CREATE TABLE class_perks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    effect TEXT,
    is_unique INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Class Perk Availability junction table
  db.run(`CREATE TABLE class_perk_availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    perk_id INTEGER NOT NULL,
    min_level INTEGER DEFAULT 1,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    FOREIGN KEY (perk_id) REFERENCES class_perks(id) ON DELETE CASCADE,
    UNIQUE(class_id, perk_id)
  )`);

  // Zones table
  db.run(`CREATE TABLE zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    author TEXT,
    difficulty INTEGER,
    notes TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Zone Areas table (sub-areas within zones)
  db.run(`CREATE TABLE zone_areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    min_level INTEGER,
    max_level INTEGER,
    recommended_class TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
  )`);

  // Zone Connections table (many-to-many for connected zones)
  db.run(`CREATE TABLE zone_connections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id INTEGER NOT NULL,
    connected_zone_id INTEGER NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    FOREIGN KEY (connected_zone_id) REFERENCES zones(id) ON DELETE CASCADE,
    UNIQUE(zone_id, connected_zone_id)
  )`, callback);
  });
}

function seedReferenceTables(callback: () => void) {
  db.serialize(() => {
    // Seed item_types
    const itemTypes = [
      ['WEAPON', 'Melee or ranged weapons'],
      ['ARMOR', 'Protective equipment'],
      ['FOOD', 'Consumable food items'],
      ['DRINK', 'Consumable beverages'],
      ['LIGHT', 'Light sources'],
      ['SCROLL', 'Magic scrolls with spell effects'],
      ['POTION', 'Magic potions with spell effects'],
      ['WAND', 'Magical wands with charges'],
      ['STAFF', 'Magical staffs with charges'],
      ['CONTAINER', 'Bags, chests, containers'],
      ['KEY', 'Keys for locked doors/containers'],
      ['TREASURE', 'Valuable items with no use'],
      ['BOAT', 'Water traversal items'],
      ['FOUNTAIN', 'Drinkable fountains'],
      ['OTHER', 'Miscellaneous items']
    ];
    const insertType = db.prepare('INSERT INTO item_types (name, description) VALUES (?, ?)');
    itemTypes.forEach(([name, desc]) => insertType.run(name, desc));
    insertType.finalize();

    // Seed item_materials
    const materials = ['gold', 'silver', 'iron', 'steel', 'bronze', 'copper', 'leather', 
                       'cloth', 'wood', 'stone', 'bone', 'glass', 'paper', 'organic', 
                       'magical', 'adamantite', 'mithril', 'dragonscale', 'unknown'];
    const insertMaterial = db.prepare('INSERT INTO item_materials (name) VALUES (?)');
    materials.forEach(material => insertMaterial.run(material));
    insertMaterial.finalize();

    // Seed item_sizes
    const sizes = [
      ['special', 0],
      ['tiny', 1],
      ['small', 2],
      ['normal', 3],
      ['medium', 4],
      ['large', 5],
      ['huge', 6],
      ['gigantic', 7]
    ];
    const insertSize = db.prepare('INSERT INTO item_sizes (name, size_modifier) VALUES (?, ?)');
    sizes.forEach(([name, modifier]) => insertSize.run(name, modifier));
    insertSize.finalize();

    // Seed item_flags
    const flags = [
      ['MAGIC', 'Item is magical', 'positive'],
      ['UNIQUE', 'Only one can exist per player', 'restriction'],
      ['UNBREAKABLE', 'Cannot be damaged', 'positive'],
      ['!DONATE', 'Cannot be donated', 'restriction'],
      ['!SELL', 'Cannot be sold to shops', 'restriction'],
      ['!DROP', 'Cannot be dropped', 'restriction'],
      ['CURSED', 'Item is cursed', 'negative'],
      ['INVISIBLE', 'Item is invisible', 'positive'],
      ['GLOW', 'Item glows', 'positive'],
      ['HUM', 'Item hums', 'positive'],
      ['MAIN_HAND_WPN', 'Main hand weapon only', 'restriction'],
      ['OFF_HAND_WPN', 'Off hand weapon only', 'restriction'],
      ['TWO_HAND_WPN', 'Two-handed weapon', 'restriction']
    ];
    const insertFlag = db.prepare('INSERT INTO item_flags (name, description, flag_type) VALUES (?, ?, ?)');
    flags.forEach(([name, desc, type]) => insertFlag.run(name, desc, type));
    insertFlag.finalize();

    // Seed wear_locations
    const locations = [
      ['TAKE', 'Can be picked up', 99],
      ['FINGER', 'Finger slot (rings)', 2],
      ['NECK', 'Neck slot (amulets)', 1],
      ['BODY', 'Body/chest slot', 1],
      ['HEAD', 'Head slot (helmets)', 1],
      ['LEGS', 'Leg slot (pants)', 1],
      ['FEET', 'Feet slot (boots)', 1],
      ['HANDS', 'Hand slot (gloves)', 1],
      ['ARMS', 'Arm slot (bracers)', 1],
      ['SHIELD', 'Shield slot', 1],
      ['ABOUT', 'About body (cloaks)', 1],
      ['WAIST', 'Waist slot (belts)', 1],
      ['WRIST', 'Wrist slot (bracelets)', 2],
      ['WIELD', 'Wielded weapon slot', 1],
      ['HOLD', 'Held item slot', 1],
      ['FACE', 'Face slot (masks)', 1],
      ['EAR', 'Ear slot (earrings)', 2],
      ['BACK', 'Back slot', 1]
    ];
    const insertLocation = db.prepare('INSERT INTO wear_locations (name, description, slot_limit) VALUES (?, ?, ?)');
    locations.forEach(([name, desc, limit]) => insertLocation.run(name, desc, limit));
    insertLocation.finalize();

    // Seed stat_types
    const stats = [
      ['MAXHIT', 'Maximum hit points', 'combat'],
      ['MAXMANA', 'Maximum mana', 'combat'],
      ['MAXMOVE', 'Maximum movement', 'combat'],
      ['HITROLL', 'To-hit bonus', 'combat'],
      ['DAMROLL', 'Damage bonus', 'combat'],
      ['ARMOR', 'Armor class', 'combat'],
      ['STR', 'Strength modifier', 'attribute'],
      ['INT', 'Intelligence modifier', 'attribute'],
      ['WIS', 'Wisdom modifier', 'attribute'],
      ['DEX', 'Dexterity modifier', 'attribute'],
      ['CON', 'Constitution modifier', 'attribute'],
      ['CHA', 'Charisma modifier', 'attribute'],
      ['SAVING_PARA', 'Save vs paralysis', 'save'],
      ['SAVING_ROD', 'Save vs rods', 'save'],
      ['SAVING_PETRI', 'Save vs petrification', 'save'],
      ['SAVING_BREATH', 'Save vs breath', 'save'],
      ['SAVING_SPELL', 'Save vs spell', 'save']
    ];
    const insertStat = db.prepare('INSERT INTO stat_types (name, description, stat_category) VALUES (?, ?, ?)');
    stats.forEach(([name, desc, category]) => insertStat.run(name, desc, category));
    insertStat.finalize();

    // Seed item_bindings
    const bindings = [
      ['NON-BINDING', 'Item can be freely traded'],
      ['BIND_ON_PICKUP', 'Binds when picked up'],
      ['BIND_ON_EQUIP', 'Binds when equipped'],
      ['BOUND', 'Already bound to a character']
    ];
    const insertBinding = db.prepare('INSERT INTO item_bindings (name, description) VALUES (?, ?)');
    bindings.forEach(([name, desc]) => insertBinding.run(name, desc));
    insertBinding.finalize(() => {
      callback();
    });
  });
}

function seedData() {
  let completed = 0;
  const totalTasks = 22; // abilities + races + strength_scores + int_scores + wis_scores + dex_scores + con_scores + cha_scores + saving_throws + spell_modifiers + elemental_resistances + physical_resistances + class_groups + classes + proficiencies + perks + zones + zone_areas + zone_connections + rooms + room_exits + player_actions

  const checkComplete = () => {
    completed++;
    if (completed === totalTasks) {
      console.log('\n✨ Database seeded successfully!');
      console.log('\n📈 Summary:');

      db.get('SELECT COUNT(*) as count FROM abilities', (err, row: any) => {
        if (!err) {console.log(`  - Abilities: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM ability_scores', (err, row: any) => {
        if (!err) {console.log(`  - Ability Scores: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM races', (err, row: any) => {
        if (!err) {console.log(`  - Races: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM saving_throws', (err, row: any) => {
        if (!err) {
          console.log(`  - Saving Throws: ${row.count}`);
        }
      });

      db.get('SELECT COUNT(*) as count FROM spell_modifiers', (err, row: any) => {
        if (!err) {
          console.log(`  - Spell Modifiers: ${row.count}`);
        }
      });

      db.get('SELECT COUNT(*) as count FROM elemental_resistances', (err, row: any) => {
        if (!err) {
          console.log(`  - Elemental Resistances: ${row.count}`);
        }
      });

      db.get('SELECT COUNT(*) as count FROM physical_resistances', (err, row: any) => {
        if (!err) {
          console.log(`  - Physical Resistances: ${row.count}`);
        }
      });

      db.get('SELECT COUNT(*) as count FROM class_groups', (err, row: any) => {
        if (!err) {console.log(`  - Class Groups: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM classes', (err, row: any) => {
        if (!err) {console.log(`  - Classes: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM class_proficiencies', (err, row: any) => {
        if (!err) {console.log(`  - Class Proficiencies: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM class_perks', (err, row: any) => {
        if (!err) {console.log(`  - Class Perks: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM zones', (err, row: any) => {
        if (!err) {console.log(`  - Zones: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM zone_areas', (err, row: any) => {
        if (!err) {console.log(`  - Zone Areas: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM zone_connections', (err, row: any) => {
        if (!err) {console.log(`  - Zone Connections: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM rooms', (err, row: any) => {
        if (!err) {console.log(`  - Rooms: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM room_exits', (err, row: any) => {
        if (!err) {console.log(`  - Room Exits: ${row.count}`);}
      });

      db.get('SELECT COUNT(*) as count FROM player_actions', (err, row: any) => {
        if (!err) {
          console.log(`  - Player Actions: ${row.count}`);
          db.close(() => {
            console.log('\n✓ Database connection closed');
            process.exit(0);
          });
        }
      });
    }
  };

  // Seed abilities
  const abilities = [
    { name: 'Strength', short_name: 'STR', description: 'Strength is an ability which directly translates into a characters ability to wield powerful weapons, deal physical damage, and carry the burden of heavy equipment or items in ones inventory. A hearty body also means a body which can recover quickly from injuries outside of combat.' },
    { name: 'Intelligence', short_name: 'INT', description: 'Intelligence is an ability score representing a character\'s memory, reasoning, and learning ability. The INT ability score dictates the beginning practice learned percent of a new spell or skill. It also applies a major mana bonus at higher ability scores, as well as an experience boost.' },
    { name: 'Wisdom', short_name: 'WIS', description: 'Wisdom is an ability score representing a composite of a character\'s intuition, judgment, common sense and willpower. Wisdom affects a character\'s rate of learning from active skill or spell usage, mana pool, and the rate of mana regeneration outside of combat.' },
    { name: 'Dexterity', short_name: 'DEX', description: 'Dexterity is an ability score representing a combination of a character\'s agility, reflexes, hand-eye coordination, balance, and reaction speed. Dexterity determines how many items you may carry, movement point total, armor point bonuses, and bonus hitroll.' },
    { name: 'Constitution', short_name: 'CON', description: 'Constitution is an ability score representing a combination of a character\'s general physique, hardiness, and state of health. Constitution affects hitpoint total, the ability to mitigate melee critical hit damage, and the rate in which a character regenerates movement points outside of combat.' },
    { name: 'Charisma', short_name: 'CHA', description: 'Charisma is an ability score representing a character\'s persuasiveness, personal magnetism, and ability to lead. This ability is important to those classes dealing with NPC\'s. Charisma affects how many charmies a player may lead and how aggressive mobiles are to players.<br><br><strong>Maximum Combined Level of Charmies:</strong><br>1. Base = Character Level<br>2a. Bonus = Total Levels Bonus (for non-necromancers)<br>2b. Bonus = Total Levels Bonus inverted (for necromancers)<br>3. Class Bonus = Necromancer +10, Mage +5, All Others 0<br>4. Total = Parts 1 + 2 + 3<br><br><em>Note: See help files on STAT NAT and STAT MAX to learn more about natural and maximum stat scores.</em>' }
  ];

  const insertAbility = db.prepare('INSERT INTO abilities (name, short_name, description) VALUES (?, ?, ?)');

  abilities.forEach(ability => {
    insertAbility.run(ability.name, ability.short_name, ability.description);
  });

  insertAbility.finalize(() => {
    console.log(`  ✓ Seeded ${abilities.length} abilities`);
    checkComplete();
  });

  // Seed races (just basic info, helpText can be added later via crawler)
  const races = [
    { name: 'DWARF', description: 'Short, stocky, and muscular. Fondness for beards, beer, and gold.' },
    { name: 'ELF', description: 'Almost as tall as Humans, very slender. Great love for nature, magic, and art.' },
    { name: 'GNOME', description: 'Kin to Dwarves but not as powerfully built. Lively and playful with keen sense of humor.' },
    { name: 'HALF-ELF', description: 'Uncommon result of union between human and elf. Often despised by both races.' },
    { name: 'HALF-GIANT', description: 'Result of union between Humans and Giants. Much taller and muscular than humans.' },
    { name: 'HALFLING', description: 'Short plump people that look like small Humans. Agile and known for lock picking.' },
    { name: 'HUMAN', description: 'Surprisingly adaptable to nearly all environmental conditions. Quick learners.' },
    { name: 'MINOTAUR', description: 'Large creatures with unnatural desire to feast upon flesh. Known for strength.' },
    { name: 'PIXIE', description: 'Small, winged kin of Elves. Great love of nature and practical jokes.' },
    { name: 'TRITON', description: 'Aquatic living humanoids. Excel in water environments.' },
    { name: 'ULDRA', description: 'Cousins to Dwarves and Gnomes who live in the tundra. Natural empathy for animals.' },
    { name: 'DRAGONBORN', description: 'Beings that can trace lineage to dragons. Natural ability to wage battle.' },
    { name: 'TROLL', description: 'Fearless creatures of darkness. Strength rivaled only by half-giants.' },
    { name: 'PLANEWALKER', description: 'Come from a dimension unlike our own. Especially proficient with magic.' },
    { name: 'TIEFLING', description: 'Infernal creatures born out of fires of hell. Resistant to fire, vulnerable to frost.' },
    { name: 'WEMIC', description: 'Half-lion, half-man creatures from open plains. Renowned for strength and speed.' },
    { name: 'LIZARDKIND', description: 'At home in swamps. Especially hardy creatures, some believe invulnerable.' }
  ];

  const insertRace = db.prepare('INSERT INTO races (name, description) VALUES (?, ?)');

  races.forEach(race => {
    insertRace.run(race.name, race.description);
  });

  insertRace.finalize(() => {
    console.log(`  ✓ Seeded ${races.length} races`);
    checkComplete();
  });

  // Seed saving throws
  const savingThrows = [
    { name: 'Para', description: 'Paralyzation, Poison, or Death Magic' },
    { name: 'Rod', description: 'Rod, Staff, or Wand' },
    { name: 'Petr', description: 'Petrification or Polymorph' },
    { name: 'Breath', description: 'Breath Weapon' },
    { name: 'Spell', description: 'Spell' }
  ];

  const insertSavingThrow = db.prepare('INSERT INTO saving_throws (name, description) VALUES (?, ?)');

  savingThrows.forEach(st => {
    insertSavingThrow.run(st.name, st.description);
  });

  insertSavingThrow.finalize(() => {
    console.log(`  ✓ Seeded ${savingThrows.length} saving throws`);
    checkComplete();
  });

  // Seed spell modifiers
  const spellModifiers = [
    { name: 'Fire', description: '' },
    { name: 'Elec', description: '' },
    { name: 'Sonc', description: '' },
    { name: 'Pois', description: '' },
    { name: 'Cold', description: '' },
    { name: 'Acid', description: '' },
    { name: 'Gas', description: '' },
    { name: 'Divn', description: '' },
    { name: 'Lght', description: '' },
    { name: 'Sumn', description: '' },
    { name: 'Life', description: '' },
    { name: 'Fear', description: '' },
    { name: 'Shdw', description: '' },
    { name: 'Heal', description: '' },
    { name: 'All-Spell Damage', description: '' },
    { name: 'Crit Damage', description: '' },
    { name: 'Crit Chance', description: '' }
  ];

  const insertSpellModifier = db.prepare('INSERT INTO spell_modifiers (name, description) VALUES (?, ?)');

  spellModifiers.forEach(sm => {
    insertSpellModifier.run(sm.name, sm.description);
  });

  insertSpellModifier.finalize(() => {
    console.log(`  ✓ Seeded ${spellModifiers.length} spell modifiers`);
    checkComplete();
  });

  // Seed elemental resistances
  const elementalResistances = [
    { name: 'Fire', description: '' },
    { name: 'Elec', description: '' },
    { name: 'Sonc', description: '' },
    { name: 'Pois', description: '' },
    { name: 'Cold', description: '' },
    { name: 'Acid', description: '' },
    { name: 'Gas', description: '' },
    { name: 'Lght', description: '' },
    { name: 'Sumn', description: '' },
    { name: 'Life', description: '' },
    { name: 'Fear', description: '' },
    { name: 'Shdw', description: '' },
    { name: 'Divn', description: '' }
  ];

  const insertElementalResistance = db.prepare('INSERT INTO elemental_resistances (name, description) VALUES (?, ?)');

  elementalResistances.forEach(er => {
    insertElementalResistance.run(er.name, er.description);
  });

  insertElementalResistance.finalize(() => {
    console.log(`  ✓ Seeded ${elementalResistances.length} elemental resistances`);
    checkComplete();
  });

  // Seed physical resistances
  const physicalResistances = [
    { name: 'Slsh', description: '' },
    { name: 'Pier', description: '' },
    { name: 'Blgn', description: '' },
    { name: 'Lgnd', description: '' }
  ];

  const insertPhysicalResistance = db.prepare('INSERT INTO physical_resistances (name, description) VALUES (?, ?)');

  physicalResistances.forEach(pr => {
    insertPhysicalResistance.run(pr.name, pr.description);
  });

  insertPhysicalResistance.finalize(() => {
    console.log(`  ✓ Seeded ${physicalResistances.length} physical resistances`);
    checkComplete();
  });

  // Seed class groups
  const classGroups = [
    { name: 'Warrior', description: 'The warrior group encompasses all those individuals who make their way through the world by their skill in arms.' },
    { name: 'Priest', description: 'The Priest group are the most devote followers of the gods. Receiving their powers from those they worship, they go throughout the realms spreading the following of their gods.' },
    { name: 'Wizard', description: 'The wizard group includes all those individuals who make learning and casting spells a way of life. Given to the massive times spent studying, they are usually weak of body and strength.' },
    { name: 'Rogue', description: 'The rogue group includes all those who feel that the world owes them their living. They get through life by doing as little as possible -- the less trouble maintaining their life style...all the better.' }
  ];

  const insertClassGroup = db.prepare('INSERT INTO class_groups (name, description) VALUES (?, ?)');

  classGroups.forEach(group => {
    insertClassGroup.run(group.name, group.description);
  });

  insertClassGroup.finalize(() => {
    console.log(`  ✓ Seeded ${classGroups.length} class groups`);
    checkComplete();
  });

  // Seed classes
  const classes = [
    { name: 'Anti-Paladin', class_group_id: 4, description: 'The Anti-Paladin represents everything that is mean, low and despicable in the human race. No act of treachery is too base, no deed of violence too vile. As the nemesis to Paladins, they gain magical abilities at high levels granted to them by dark and evil powers.', alignment_requirement: null, hp_regen: 5, mana_regen: 21, move_regen: 11, special_notes: 'Both ROGUE and WARRIOR' },
    { name: 'Bard', class_group_id: 4, description: 'Though a rogue, the bard is very different from a thief. They make their living by wooing audiences with their charisma, artistic ability, and magical pursuits of entertainment. The Bard is known as a \'Jack-Of-All-Trades\' knowing a little bit of everything.', alignment_requirement: null, hp_regen: 5, mana_regen: 21, move_regen: 11, special_notes: null },
    { name: 'Cleric', class_group_id: 2, description: 'Clerics are known for being healers, and thus are quite the necessity throughout the world. This class gives you the wisdom of peace and blessing, along with healing. However, it is possible to learn more violent spells, but this would mean walking a path where healing is no longer possible.', alignment_requirement: null, hp_regen: 5, mana_regen: 5, move_regen: 5, special_notes: 'Always restoration class. Attack speed capped at 1 attack, no bonus attacks. Sets tempo for game.' },
    { name: 'Druid', class_group_id: 2, description: 'Druids are priests of nature. Like Rangers, they are attune to nature and do all in their power to protect it. Given their specific aim, druids have control over the elements, plants, and animals.', alignment_requirement: null, hp_regen: 11, mana_regen: 21, move_regen: 5, special_notes: 'Battle Druid stats. Restoration Druid: hp_regen=11, mana_regen=5, move_regen=5, same restrictions as Cleric.' },
    { name: 'Fighter', class_group_id: 1, description: 'The most common of all warriors, fighters believe in only what their flesh and blood can provide. Having no magical abilities of their own, brute strength is their forte.', alignment_requirement: null, hp_regen: 5, mana_regen: 11, move_regen: 21, special_notes: null },
    { name: 'Magic User', class_group_id: 3, description: 'Mages are the most general of spellcasters. They study everything that magic has to offer, being able to produce powerful and violent magic.', alignment_requirement: null, hp_regen: 11, mana_regen: 21, move_regen: 5, special_notes: null },
    { name: 'Monk', class_group_id: 2, description: 'Monks are members of a priestly order seeking peace and enlightenment in a state of harmony with the passing world. Despite the misconception that monks are merely priests or warriors, they are by their very nature a martial order of transcendental holy warriors.', alignment_requirement: null, hp_regen: 5, mana_regen: 11, move_regen: 11, special_notes: 'Both PRIEST and WARRIOR. THAC0 and HP of ROGUE class. Unarmed damage: 1d4/8 levels, +1 dmg/4 levels. AP improvements by level. Weapon restrictions. 3 mana/level instead of 4.' },
    { name: 'Necromancer', class_group_id: 3, description: 'The Necromancer class is part of the WIZARD group. They dwell on perverting the life forces of others for their own personal ends. By their very nature, Necromancers can only be EVIL.', alignment_requirement: 'Evil', hp_regen: 5, mana_regen: 21, move_regen: 11, special_notes: 'Immune to charm, sleep, hold. Lose 1 CHA per 5 levels. Reversed CHA for charmies (up to 75 levels). +1 mana/level. Begin with negative plane attunement (+50 mana). Charmed mobiles never turn on master.' },
    { name: 'Paladin', class_group_id: 1, description: 'This is the most difficult of the classes to be. Paladins are the most holy and noble of warriors; truth and honor are the meat of their life. Pursuing the highest of all ideals, they gain magic from the gods of purity at high levels.', alignment_requirement: 'Good', hp_regen: 5, mana_regen: 21, move_regen: 11, special_notes: null },
    { name: 'Ranger', class_group_id: 1, description: 'The Ranger is a hunter and tracker who makes his way by not only his bow, but also, by his wits. The Ranger is an expert at woodsmanship and at high levels gains the abilities to cast spells dealing with nature.', alignment_requirement: null, hp_regen: 5, mana_regen: 21, move_regen: 5, special_notes: 'Eagle eye trait by default (scan +1 room)' },
    { name: 'Samurai', class_group_id: 1, description: 'Samurai are WARRIORS of honor from the oriental world who follow the code of the bushido or warrior. Because of these ideals, a samurai may only be GOOD. With the code of honor that the Samurai follow, cowardice in battle is dishonorable.', alignment_requirement: 'Good', hp_regen: 5, mana_regen: 21, move_regen: 11, special_notes: 'More HP and attacks than warriors. Cannot use WIMPY. Cannot be RESCUED. Immune to fear.' },
    { name: 'Thief', class_group_id: 4, description: 'The seediest of all Rogues -- cunning, nimbleness, and stealth are their hallmarks. With their very special qualities that no other class offers, they have been known even to make the richest of merchants and lowest of peasants squirm.', alignment_requirement: null, hp_regen: 5, mana_regen: 11, move_regen: 21, special_notes: null },
    { name: 'Berserker', class_group_id: 1, description: 'The berserker is fearless warrior that fuels his rage for battle by expending even his own blood when necessary. These characters gain an increased chance to damage their foes at the expense of their own safety.', alignment_requirement: null, hp_regen: 21, mana_regen: 11, move_regen: 5, special_notes: 'Cannot flee while raging. Only class that can dual-wield 1-handed weapons and magical weapons (innate).' },
    { name: 'Warlock', class_group_id: 3, description: 'The Warlock brings a lethal arsenal of channeling spells to the battle. Warlocks draw upon the power of darkness and an evil alignment is required in order to function properly.', alignment_requirement: 'Evil', hp_regen: 11, mana_regen: 21, move_regen: 5, special_notes: '+1 mana/level. Channeling spells: no initial cost, mana per hit. Cannot be silenced. Interrupted by bash/sweep/trip/shield rush.' }
  ];

  const insertClass = db.prepare('INSERT INTO classes (name, class_group_id, description, alignment_requirement, hp_regen, mana_regen, move_regen, special_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

  classes.forEach(cls => {
    insertClass.run(cls.name, cls.class_group_id, cls.description, cls.alignment_requirement, cls.hp_regen, cls.mana_regen, cls.move_regen, cls.special_notes);
  });

  insertClass.finalize(() => {
    console.log(`  ✓ Seeded ${classes.length} classes`);
    checkComplete();
  });

  // Seed class proficiencies from JSON file
  const profDataPath = path.resolve(__dirname, 'data', 'class-proficiencies.json');
  const profData = JSON.parse(fs.readFileSync(profDataPath, 'utf-8'));
  
  // Map class names to IDs
  const classNameToId: Record<string, number> = {
    'Anti-Paladin': 1,
    'Bard': 2,
    'Cleric': 3,
    'Druid': 4,
    'Fighter': 5,
    'Magic User': 6,
    'Monk': 7,
    'Necromancer': 8,
    'Paladin': 9,
    'Ranger': 10,
    'Samurai': 11,
    'Thief': 12,
    'Berserker': 13,
    'Warlock': 14
  };

  const proficiencies: Array<{
    class_id: number;
    name: string;
    level_required: number;
    is_skill: number;
    prerequisite_name?: string;
  }> = [];

  // Convert JSON data to proficiency records
  profData.proficiencies.forEach((classData: any) => {
    const classId = classNameToId[classData.className];
    if (!classId) {
      console.warn(`  ⚠️  Unknown class name: ${classData.className}`);
      return;
    }

    classData.proficiencies.forEach((prof: any) => {
      proficiencies.push({
        class_id: classId,
        name: prof.name,
        level_required: prof.level,
        is_skill: prof.isSkill ? 1 : 0,
        prerequisite_name: prof.prereq
      });
    });
  });

  const insertProficiency = db.prepare('INSERT INTO class_proficiencies (class_id, name, level_required, is_skill, prerequisite_id) VALUES (?, ?, ?, ?, ?)');

  proficiencies.forEach(prof => {
    insertProficiency.run(prof.class_id, prof.name, prof.level_required, prof.is_skill, null);
  });

  insertProficiency.finalize(() => {
    console.log(`  ✓ Seeded ${proficiencies.length} class proficiencies from JSON file`);

    // Now update prerequisites based on prerequisite_name
    let prerequisitesUpdated = 0;
    let prerequisitesRemaining = proficiencies.filter(p => p.prerequisite_name).length;

    if (prerequisitesRemaining === 0) {
      checkComplete();
      return;
    }

    proficiencies.forEach(prof => {
      if (prof.prerequisite_name) {
        db.get(
          'SELECT id FROM class_proficiencies WHERE class_id = ? AND name = ?',
          [prof.class_id, prof.prerequisite_name],
          (_err, prereqRow: any) => {
            if (prereqRow) {
              db.run(
                'UPDATE class_proficiencies SET prerequisite_id = ? WHERE class_id = ? AND name = ?',
                [prereqRow.id, prof.class_id, prof.name],
                () => {
                  prerequisitesUpdated++;
                  if (prerequisitesUpdated === prerequisitesRemaining) {
                    console.log(`  ✓ Updated ${prerequisitesUpdated} prerequisite relationships`);
                    checkComplete();
                  }
                }
              );
            } else {
              console.warn(`  ⚠️  Prerequisite not found: ${prof.prerequisite_name} for ${prof.name} (class ${prof.class_id})`);
              prerequisitesUpdated++;
              if (prerequisitesUpdated === prerequisitesRemaining) {
                console.log(`  ✓ Updated ${prerequisitesUpdated} prerequisite relationships`);
                checkComplete();
              }
            }
          }
        );
      }
    });
  });

  // Seed universal perks (shared across all classes)
  const perks = [
    // Weapon Prof perks (choose one)
    { name: 'Lumberjack', category: 'Weapon Prof', description: '+1/10 levels while using a slash weapon', effect: '+1 damage per 10 levels with slash weapons', is_unique: 1 },
    { name: 'Pugilist', category: 'Weapon Prof', description: '+1/10 levels while using a blunt weapon or bare-hands', effect: '+1 damage per 10 levels with blunt weapons or unarmed', is_unique: 1 },
    { name: 'Tentmaker', category: 'Weapon Prof', description: '+1/10 levels while using a piercing weapon', effect: '+1 damage per 10 levels with piercing weapons', is_unique: 1 },
    { name: 'Fletcher', category: 'Weapon Prof', description: '+1/10 levels while using a special weapon (bows/whips/etc)', effect: '+1 damage per 10 levels with special weapons', is_unique: 1 },

    // Universal perks (unlimited)
    { name: 'Pyromaniac', category: 'Universal', description: '+25 Fire Damage', effect: '+25 fire damage', is_unique: 0 },
    { name: 'Boreal Native', category: 'Universal', description: '+25 Frost Damage', effect: '+25 frost damage', is_unique: 0 },
    { name: 'Conduit', category: 'Universal', description: '+25 Electricity Damage', effect: '+25 electricity damage', is_unique: 0 },
    { name: 'Musician', category: 'Universal', description: '+25 Sonic Damage', effect: '+25 sonic damage', is_unique: 0 },
    { name: 'Favor', category: 'Universal', description: '+25 Divine Damage', effect: '+25 divine damage', is_unique: 0 },
    { name: 'Haunted', category: 'Universal', description: '+25 Shadow Damage', effect: '+25 shadow damage', is_unique: 0 },
    { name: 'Snake Handler', category: 'Universal', description: '+25 Poison Damage', effect: '+25 poison damage', is_unique: 0 },
    { name: 'Alchemist', category: 'Universal', description: '+25 Acid Damage', effect: '+25 acid damage', is_unique: 0 },
    { name: 'Prism Maker', category: 'Universal', description: '+25 Light Damage', effect: '+25 light damage', is_unique: 0 },
    { name: 'Tinkerer', category: 'Universal', description: '+7% Spell Crit Chance', effect: '+7% spell critical chance', is_unique: 0 },
    { name: 'Spiritualist', category: 'Universal', description: '5% increased chance of mana return on kill for casters', effect: '5% increased mana return chance on kill', is_unique: 0 },
    { name: 'Seer', category: 'Universal', description: '25% increased mana return total', effect: '+25% mana return', is_unique: 0 },
    { name: 'Glass Cannon', category: 'Universal', description: '+40 All-Spell damage, hp halved the moment you take it', effect: '+40 all-spell damage, -50% HP', is_unique: 0 },
    { name: 'Astrologist', category: 'Universal', description: 'Wands and Staves have a high chance to cast for free', effect: 'High chance for free wand/staff casts', is_unique: 0 },
    { name: 'Empowered', category: 'Universal', description: 'Instead of +1str per cast, your strength spell grants +3 strength per cast', effect: 'Strength spell gives +3 STR instead of +1', is_unique: 0 },
    { name: 'Fame/Infamy', category: 'Universal', description: 'Your charmed mobile\'s time duration is extended by a flat 15 ticks', effect: '+15 ticks to charm duration', is_unique: 0 },
    { name: 'Metabolic Boost', category: 'Universal', description: 'One bite of food will easily fill you up', effect: 'Single bite fills hunger', is_unique: 0 },
    { name: 'Guardian Spirit', category: 'Universal', description: 'Sanctuary, Fortress of Hate, and Consecration spell effects are extended by 4 hours', effect: '+4 hours to protection spell duration', is_unique: 0 },
    { name: 'Treasure Hunter', category: 'Universal', description: '1 additional rent slot is provided', effect: '+1 rent slot', is_unique: 0 },
    { name: 'Jeweler', category: 'Universal', description: 'Killing blows have an increased enchanting material drop rate', effect: 'Increased enchanting material drops', is_unique: 0 },
    { name: 'Perfectionist', category: 'Universal', description: '+4 Hitroll', effect: '+4 hitroll', is_unique: 0 },
    { name: 'Hoarder', category: 'Universal', description: 'You can carry even more stuff. +15 inventory slots', effect: '+15 inventory slots', is_unique: 0 },
    { name: 'Giant Slayer', category: 'Universal', description: 'Ignore the strength penalty when wielding a weapon which would otherwise be too heavy', effect: 'Ignore STR weapon weight requirements', is_unique: 0 },
    { name: 'Bountiful Wonder', category: 'Universal', description: 'Sustain lengths add 10, then doubles', effect: 'Sustain duration: +10 then x2', is_unique: 0 },
    { name: 'Nomad', category: 'Universal', description: 'Haste no longer affects food costs', effect: 'Haste doesn\'t increase hunger', is_unique: 0 },
    { name: 'Siege Captain', category: 'Universal', description: 'All resistance buffs cast on you will now last 50% longer', effect: '+50% resistance buff duration', is_unique: 0 },
    { name: 'Pack Mule', category: 'Universal', description: 'Your pack mule increases your carrying capacity by 50%', effect: '+50% carrying capacity', is_unique: 0 },

    // HMV perks (choose one)
    { name: 'Bodybuilder', category: 'HMV', description: '+50hp', effect: '+50 HP', is_unique: 1 },
    { name: 'Educated', category: 'HMV', description: '+40mana', effect: '+40 mana', is_unique: 1 },
    { name: 'Marathon Runner', category: 'HMV', description: '+40mv', effect: '+40 movement', is_unique: 1 },

    // Alignment perks (choose one) - Fighter
    { name: 'Chaotic Evil', category: 'Alignment', description: '-30 align/tick', effect: '-30 alignment per tick', is_unique: 1 },
    { name: 'Chaotic Neutral', category: 'Alignment', description: '-15/+15 align/tick movement towards neutrality', effect: 'Alignment moves toward neutral', is_unique: 1 },
    { name: 'Chaotic Good', category: 'Alignment', description: '+30 align/tick', effect: '+30 alignment per tick', is_unique: 1 },

    // Playstyle perks - Anti-Paladin
    { name: 'Netherdrake Symbiote', category: 'Playstyle', description: 'In dark conditions (-5 or below), backstab damage equals thief class', effect: 'Thief-level backstab in darkness', is_unique: 1 },
    { name: 'Frost Wyrm Symbiote', category: 'Playstyle', description: 'Glacial Fist and Shadow Flare: +15% crit chance. Shadow Flare: +25% crit damage', effect: 'Enhanced frost spell crits', is_unique: 1 },
    { name: 'Mana Wraith Symbiote', category: 'Playstyle', description: 'Fortress of Hate: -10% damage, maintains resistances, returns mana per round (cumulative)', effect: 'Fortress mana return', is_unique: 1 },
    { name: 'Plague Symbiote', category: 'Playstyle', description: 'Poison spell bypasses all elemental resistances and saving throws', effect: 'Poison ignores all defenses', is_unique: 1 },

    // Playstyle perks - Fighter
    { name: 'Defender', category: 'Playstyle', description: 'Shield specialization effectiveness doubled. Parry +3% success rate with shield', effect: '2x shield spec, +3% parry', is_unique: 1 },
    { name: 'Blademaster', category: 'Playstyle', description: 'While using slash weapons, critical hit damage +20%', effect: '+20% crit damage with slash', is_unique: 1 },
    { name: 'Blacksmith', category: 'Playstyle', description: 'While using bludgeon weapons, critical hit damage +20%', effect: '+20% crit damage with blunt', is_unique: 1 },
    { name: 'Mercenary', category: 'Playstyle', description: 'While using pierce weapons, critical hit damage +20%', effect: '+20% crit damage with pierce', is_unique: 1 },
    { name: 'Rune Knight', category: 'Playstyle', description: 'Combat summon restrictions removed. RES_SUMMON ignored. Can be summoned from no-summon rooms', effect: 'Always summonable', is_unique: 1 },
    { name: 'Bodyguard', category: 'Playstyle', description: 'Second Wind cooldowns halved (both success and failure)', effect: '50% Second Wind cooldown', is_unique: 1 },
    { name: 'Warlord', category: 'Playstyle', description: 'Taunt never fails on tauntable mobiles. Immune to Hamstring and Ensnare', effect: 'Perfect taunt, hamstring immunity', is_unique: 1 },

    // Playstyle perks - Cleric
    { name: 'Flamewarden', category: 'Playstyle', description: 'Flamestrike and Firestorm will certainly ignite an enemy in flames', effect: 'Guaranteed ignite on fire spells', is_unique: 1 },
    { name: 'Exorcist', category: 'Playstyle', description: 'Smite Good and Evil spells deal increased damage', effect: 'Enhanced smite damage', is_unique: 1 },
    { name: 'Spellbinder', category: 'Playstyle', description: 'Silence: 25% flat success rate, ignores level/saves. +6 ticks duration, -5 sav_spell, -2 INT debuff', effect: 'Powerful silence spell', is_unique: 1 },
    { name: 'Herbalist', category: 'Playstyle', description: 'Regeneration: +15 ticks, +2 CON. Aid: +INT bonus HP, +1 damroll', effect: 'Enhanced support spells', is_unique: 1 },
    { name: 'Cardinal', category: 'Playstyle', description: 'Sanctuary mana costs almost always returned. Requires 75%+ proficiency', effect: 'Free sanctuary (75%+ prof)', is_unique: 1 },
    { name: 'Divine Protection', category: 'Playstyle', description: 'Shield and Protection spells work on mobiles equal to your level', effect: 'Protection spells work on equal level', is_unique: 1 }
  ];

  const insertPerk = db.prepare('INSERT INTO class_perks (name, category, description, effect, is_unique) VALUES (?, ?, ?, ?, ?)');

  perks.forEach(perk => {
    insertPerk.run(perk.name, perk.category, perk.description, perk.effect, perk.is_unique);
  });

  insertPerk.finalize(() => {
    console.log(`  ✓ Seeded ${perks.length} class perks`);
    checkComplete();
  });

  // Seed zones
  const zones = [
    { id: 1, name: 'The Immortal Realm', description: 'High above the planes of reality, the dwelling place of the immortals has been seated beyond the reach of their creation. Those who find themselves within the bounds of their reality are offered rare glimpses into the inner workings of the known universe. Either a blessing or a curse depending upon the circumstances, all mortals reaching this lofty plane of existence will gaze in awe at sights and visions few mortals have or will ever see.', author: 'Sapphire', difficulty: 0, notes: null },
    { id: 2, name: 'Midgaard: City', description: 'The city of Midgaard is the center of economic trade, commerce, and travel throughout the imperial realm. Shops, guilds, inns and more line the various streets of the city, catering to citizens and adventurers alike. Although it is not the political capital of his majesty the emperor\'s kingdom, it has nonetheless stood as a pillar of the known world since the dawning of the current age.', author: 'Original DIKU Team, Pestilence, Nero', difficulty: 1, notes: null },
    { id: 3, name: 'Midgaard: Graveyard', description: 'Beyond Midgaard\'s southern gates lies the graveyard. For years the Gravekeeper has kept the place that honors Midgaard\'s fallen pristine. But now an evil lurks below the crypts, causing zombies to rise up to threaten and wreak havoc upon the beloved city.', author: 'Nero', difficulty: 1, notes: null },
    { id: 4, name: 'Midgaard: Sewers', description: 'Deep beneath the sleepless city of Midgaard lurks a world unseen by the eyes of most travelers. Here is where the thieves and murderers of Midgaard go to escape the eyes of the law, and where the rats which frequent the city by day and night call home.', author: 'Nero', difficulty: 2, notes: null },
    { id: 5, name: 'Training Grounds', description: 'The Training Grounds is an excellent place for adventurers to begin their quest towards becoming a legend within the realm.', author: 'Alucard, Nero', difficulty: 1, notes: null },
    { id: 6, name: 'Quester\'s Enclave', description: 'Set within the heart of Midgaard, the Quester\'s Enclave serves players who have distinguished themselves through the acquisition of quest points. Beyond this, quester\'s also hosts a variety of arena events which are typically opened for a limited time, or on a seasonal basis.', author: 'Sapphire', difficulty: 5, notes: null },
    { id: 7, name: 'The Great Ocean', description: 'Ages come and go, nations rise and fall, but the Great Ocean remains unchanged. Connecting the various port towns, rivers, and canals of the world, this vast body of water is of immense economic and strategic importance to the empire.', author: 'Sapphire', difficulty: 1, notes: null },
    { id: 8, name: 'The Candlebriar Mountains', description: 'Between Midgaard, Haon-Dor, and the Great Ocean lies a mysterious region of breathtaking beauty: the Candlebriar mountain range. Through these peaks pass adventurers and gypsies, either seeking a place of their own or passing from one side of the realm to the other. It is a relatively safe area to explore, though take heed of the stories that circulate about the highest peak.', author: 'Lestat, Nero, Sapphire', difficulty: 1, notes: null },
    { id: 9, name: 'The Hills of Astyll', description: 'The Hills of Astyll blanket the land north of Midgaard. They provide a buffer between the peaceful city and the harsh mountains farther to the north and east. Beware the rampaging raiders that have taken their home in the Hills, and of the various creatures lurking within the cave.', author: 'Finger, Sapphire', difficulty: 1, notes: null },
    { id: 10, name: 'The Shire', description: 'The Shire is north of Midgaard, beyond the Hills of Astyll. Here is where the quiet halfling folk call their home. While the Thain maintains the Shire to extend safety to all travelers and adventurers alike, most residents would rather see the quaint landscape of their village remain unvisited by the outside world.', author: 'Elflord, Nero, Sapphire', difficulty: 2, notes: null },
    { id: 11, name: 'The Dwarven Kingdom', description: 'Beyond the Hills of Astyll and Midgaard city, the Dwarves have carved out a kingdom for themselves upon the outskirts of the Mountain of Hate. Strange tales abound regarding the inner workings of the castle. Stories of intrigue, madness, and murder pass among travelers who have escaped the confines of the dwarven prisons.', author: 'Depeche, Jaana, Yor, Nero', difficulty: 2, notes: null },
    { id: 12, name: 'The Haunted Forest', description: 'Rumors run in numbers about the dark, oppressive woods to the East of Midgaard. Lumberjacks fear to enter, telling tales of a variety of wicked creatures that inhabit the dark woods. Some even go as far as to call the woods haunted.', author: 'Prometheus, Alucard, Nero', difficulty: 2, notes: null },
    { id: 13, name: 'Rome', description: 'The city of Rome, a place of grandeur, decadence, political conflict, and power. Home to citizens from across the face of the whole earth, it stands as a vassel state to the seat of his majesty the emperor.', author: 'Onivel, Destiny, Infinite', difficulty: 2, notes: null },
    { id: 14, name: 'Sanctuary of the Kris', description: 'It is rumored that a dark cult of assassins and thieves of the highest skill and the lowest moral character have invaded the fair city of Midgaard. This organization, known only as the Order of the Kris, is thought to exist in the very heart of the city.', author: 'Laern, Yor, Nero', difficulty: 3, notes: null },
    { id: 15, name: 'The Village of Bonne Terre', description: 'Bonne Terre is a thriving, prosperous community which lies in the shadows of a great estate. As a serfdom of craftsmen and peasant farmers, most citizens have secured their freedom through arduous labor over the course of a lifetime.', author: 'Casso, Bramble, Nero, Werm', difficulty: 3, notes: null },
    { id: 16, name: 'The Outskirts of Bonne Terre', description: 'Near Bonne Terre lies a land that few care to visit for seldom do any return. The villagers whisper of dangers in the forest and, in particular, across the waters to the northwest, dangers most are unwilling to discuss with outsiders.', author: 'Casso, Pesto, Nero', difficulty: 5, notes: null },
    { id: 17, name: 'Temple of Opulence', description: 'A new cult has formed within a major temple complex in Southern Midgaard. Practitioners and cultists referring to themselves as The Order are now beckoning all people from every nation in the world to come and pledge their lives in service to the temple.', author: 'Yor, Nero', difficulty: 3, notes: null },
    { id: 18, name: 'The Great Battle', description: 'North of Mortimer\'s Castle lies a great battle. A battle of Angel versus Demon. Good Versus Evil. One that will determine the fate of the realm. Which side do you choose?', author: 'Nero', difficulty: 3, notes: null },
    { id: 19, name: 'The Forest of Haon-Dor', description: 'To Forest of Haon-Dor may be found directly to the west of the City of Midgaard. Wolves, arachnids, and other foul creatures lurk beneath the thick canopy which prevents the sun from reaching the forest floor.', author: 'Quifael, Wolverine, Nero', difficulty: 3, notes: null },
    { id: 20, name: 'Heliopolis', description: 'Heliopolis, the Kingdom of the Sun, is an old city standing in the middle of the Great Eastern Desert. Travellers from far and wide make the difficult journey to Heliopolis to experience its unique culture.', author: 'Tyv, Nero', difficulty: 3, notes: null },
    { id: 21, name: 'The Great Eastern Desert', description: 'On the eastern side of the mountains, east of Midgaard, lies the Great Eastern Desert. Full of sand, dust, and scorpions, it is also rumoured to be home of the Darkside, a band of renegade mages.', author: 'Rorschach, ElfLord, Nero, Kelp', difficulty: 2, notes: null },
    { id: 22, name: 'The Crypt of Nyarlathotep', description: 'Nyarlathotep was an old Pharaoh of Heliopolis who lived a wicked life. He was buried in a crypt to the north of Helopolis, across the burning wastes. Before he died, He swore to return to Heliopolis and usurp the throne.', author: 'Tyv, Nero', difficulty: 5, notes: null },
    { id: 23, name: 'Darkrime Mountain', description: 'To the north of the City of Juris lies Darkrime Mountain, a towering peak engulfed in an eternal white glacier. Its wind-ravaged peak is all but unassailable.', author: 'Kelp', difficulty: 4, notes: null },
    { id: 24, name: 'The Kingdom of Arachnos', description: 'Deep within the murkey backwaters of the Sylvan swamp, Arachnos and his harem of devoted concubines have built a kingdom bent upon world conquest.', author: 'Mahatma, Sapphire', difficulty: 5, notes: null },
    { id: 25, name: 'The Frozen Wasteland of Fae\'Rune', description: 'Far north into the Great Ocean, beyond the Boreal Sea lies the Frozen Wastelands of Fae\'Rune. This tundra is home to the ferocious Yeti.', author: 'Nero', difficulty: 5, notes: null },
    { id: 26, name: 'Fae\'Rune', description: 'Past the Frozen Wastelands lies the heart of Fae\'Rune. Rumors are a hidden Pirate Alcove lies somewhere within the center of the continent, waiting for you to plunder the booty.', author: 'Nero', difficulty: 4, notes: null },
    { id: 27, name: 'The Cube', description: 'At the edge of the Great Eastern Desert, a dark cavern holds ancient secrets discovered by the Legendary Rhavin. It is here that Rhavin has begun to build a vast army of strange reptilian creatures.', author: 'Nero', difficulty: 5, notes: '[Group Raid Zone]' },
    { id: 28, name: 'Pixie Glade', description: 'After many years of being fed up with the Enfan\'s, the Pixies finally drove them away from Ershteep Road. They grew a glade atop the village ruins that lies north of the Haunted Forest.', author: 'Nero', difficulty: 2, notes: null },
    { id: 29, name: 'Nottingham', description: 'South of Midgaard\'s great river, bordering on Camelot, lies the infamous Shire of Nottingham. Ruled over by the wicked Prince John, the land has become a symbol of greed and oppression.', author: 'ElfLord, Nero', difficulty: 4, notes: null },
    { id: 30, name: 'Camelot', description: 'Beyond the river south of Midgaard lies the castle Camelot, home to King Arthur and the Knights of the Round Table. Troubadours and minstrels from across the realms have gathered to entertain at the great feast.', author: 'Wibble, Werm', difficulty: 3, notes: null },
    { id: 31, name: 'Mountain of Hate', description: 'Deep within the mountains north of the Dwarven Kingdom awaits an evil so dark and foul that even the dwarves fear venturing into its shadowy halls.', author: 'Yor, Nero', difficulty: 4, notes: null },
    { id: 32, name: 'The College of Wizardry', description: 'Out of the ashes of the High Tower of Sorcery, the emperor has established the College of Wizardry for the training of the order of imperial wizards.', author: 'Skylar, Balfazar, Sapphire', difficulty: 3, notes: null },
    { id: 33, name: 'Lord Vrolok\'s Estate', description: 'In the mountains north of the Astyll Hills, on a barren mountain, stands the house of Lord Vrolok. The denizens of his house are rumored to be Creatures of the Night.', author: 'Tyv, Werm', difficulty: 5, notes: null },
    { id: 34, name: 'The Lady\'s Manor', description: 'In the heart of the Haunted Forest lies a very dark and brooding manor. The horrors that happened behind those walls strikes fear even in the most bravest of souls.', author: 'Nero', difficulty: 3, notes: null },
    { id: 35, name: 'The Valley of Heroes', description: 'Long ago, a great battle took place north of the Fae\'Rune wastelands. The spirits of those who fought this decisive battle have been entombed in the ice for many ages.', author: 'Nero', difficulty: 4, notes: null },
    { id: 36, name: 'The Burning Talon', description: 'On the high seas of the Great Ocean sails a ghost ship which once struck fear into the hearts of all coastal cities. How she has risen from a watery grave is unknown.', author: 'Calaron, Lestat, Sapphire', difficulty: 3, notes: null },
    { id: 37, name: 'The Black Market', description: 'To the west of the Forest of Haon-Dor lies a den of thieves, pirates, and other men and women of ill repute. Within the walls of the coastal city, law and order ceases to exist.', author: 'Ratboy, Sapphire', difficulty: 3, notes: null },
    { id: 38, name: 'Pirate\'s Stronghold', description: 'The first pirate attack on the village Schilling was directed toward their protector, the retired warrior, Keefe. With Keefe slain, his stronghold was claimed by the Dread Pirate.', author: 'Ratboy, Werm', difficulty: 3, notes: null },
    { id: 39, name: 'Sylvan Swamp and City', description: 'West along the Black River lies the Great Sylvan Swamp. Dangerous beasts inhabit its muddy, murky depths. Beyond the swamp is rumored to be a great city built upon the ruins of an ancient civilization.', author: 'Trimethyltin, Sapphire', difficulty: 4, notes: null },
    { id: 40, name: 'The Canticle', description: 'North of the Shire lies the Canticle, a fortress which was once controlled by knights, paladins, mages, and clerics who fought in the imperial army.', author: 'Tiera, ElfLord, Sapphire', difficulty: 2, notes: null },
    { id: 41, name: 'Ashefall Fortress', description: 'Built upon the remains of a failed mining operation, the owners constructed a Fortress with a dungeon for hire beneath it. In recent days though, rumors of a revolt in Ashefall have begun to circulate.', author: 'SuperEgo, Werm', difficulty: 4, notes: null },
    { id: 42, name: 'Tuatha de Danaan', description: 'Long before the coming of man to the western world have dwelt the Tuatha de Danaan, the faerie folk, and their gods. Their mystical island is located somewhere in the midst of a great emerald sea.', author: 'Flea, Nero', difficulty: 3, notes: null },
    { id: 43, name: 'Temple of Mars', description: 'The Temple of Mars has been erected in dedication to the Roman god of war whom the citizens of Rome worship. Deep within the bowels of the temple lurks a mysterious force.', author: 'Flea, Nero', difficulty: 4, notes: null },
    { id: 44, name: 'Caves of the Goblin King', description: 'A devious tribe of goblins have gained a foothold near the base of the Mountain of Hate. After scouring the land for many generations, they have settled and fortified a local cave.', author: 'Shillan, Nero', difficulty: 2, notes: null },
    { id: 45, name: 'Imladris', description: 'Beyond the Shire and its Great East Road, through the nearly impenetrable forest of the elves is the elven haven known as Imladris. Great treasures must surely await those who would dare to lay siege.', author: 'Goodgulf, Nero', difficulty: 3, notes: null },
    { id: 46, name: 'The Vault', description: 'West of the city of Rome, the seventh imperial legion has entrenched themselves beyond the view of the outside world. Led by the mighty half-giant general Hadrian, they keep watch over a large cache of imperial riches.', author: 'Valeria, Sapphire', difficulty: 4, notes: null },
    { id: 47, name: 'Juris', description: 'Centuries ago, the city of Juris lay on a razor\'s edge between civilization and the vast, unexplored eastern frontier. After years of tragedy, the citizens established a system of justice unrivaled even in the imperial courts.', author: 'Ratboy, Sapphire', difficulty: 3, notes: null },
    { id: 48, name: 'Raddok', description: 'Raddok is built upon the precipice of the craggy cliffs which stand between the southern border of the imperial realm, and the great ocean. Led by the heroic king Avacee, Raddok has prospered.', author: 'Rodric, Rugose, Sapphire, Goldenwing', difficulty: 3, notes: null },
    { id: 49, name: 'Aurvuron', description: 'Long ago Aurvuron was a beacon of justice north east of the shire. Now the banner of the Scarlet Cloth and Ivory dagger waves above the city, grinding dreams to dust.', author: 'Varna, ElfLord, Wafer', difficulty: 2, notes: null },
    { id: 50, name: 'Aurvuron: The Gray Citadel', description: 'Floating on an invisible web above the city of Aurvuron is a monolith of stone and marble. Within its depths resides the Grey Mage, the preeminant sorcerer of Aurvuron.', author: 'Varna, ElfLord, Wafer', difficulty: 4, notes: null },
    { id: 51, name: 'The Caves of Fire', description: 'Beyond the City of Raddok, deep within the enchanted forest lies an underground fortress carved out of the very rocks. The Caves of Fire are home to the giant folk of the prime plane.', author: 'Rodric, Ferden, Lestat, Sapphire', difficulty: 4, notes: null },
    { id: 52, name: 'Thalos', description: 'The ancient city of Thalos, once a wealthy and prosperous city, has been deserted for centuries. Found in the suntouched land of the Great Eastern Desert, the ruins are now full of wild beasts.', author: 'Ericol, Rorschach, ElfLord, Kelp', difficulty: 3, notes: null },
    { id: 53, name: 'Harrington', description: 'Known to outsiders as the City of Mist, and to travelers as the Cursed City, Harrington is a village trapped within the clutches of evil. The undead and the damned are said to walk freely throughout the village.', author: 'Sapphire', difficulty: 3, notes: null },
    { id: 54, name: 'Mistaavi\'s Mansion', description: 'After accidentally unleashing demonic forces into his liege\'s castle many years ago, the wizard Mistaavi was banished by King Fredrick. In despair, Mistaavi fled into the northernmost part of the forest.', author: 'Lestat', difficulty: 4, notes: null },
    { id: 55, name: 'Nexus', description: 'The Nexus, an intersection of time and space through which you may see the world as it might have been, or may yet still one day be. Evil and good have been locked in an eternal struggle.', author: 'Slash, Sapphire', difficulty: 4, notes: null },
    { id: 56, name: 'Gardens of the Arcane', description: 'In the great hills of Astyll northeast of Midgaard, there lies the mysterious Gardens of the Arcane. Hack your way through a magical thicket to discover the ranger lodge of Haefenglade.', author: 'Weland, Werm', difficulty: 2, notes: null },
    { id: 57, name: 'The Keep of Mahn-Tor', description: 'Deep in the forest of Haon-Dor lies the icy keep of Mahn-Tor, powerful leader of the minotaurs. His keep lies near an ogre infested swamp, hidden by the vast powers of the Minotaur God.', author: 'Surge, Sethanon', difficulty: 3, notes: null },
    { id: 58, name: 'The Tombs of Tarin', description: 'Their lands overrun and their fabled city in the hands of Mahn-Tor the Minotaur Lord, the elves make a defiant stand against the Minotaurs and their god in the Tombs of Tarin.', author: 'Luf, Yor', difficulty: 2, notes: null },
    { id: 59, name: 'Gnomelight Village and Mines', description: 'High in the Candlebriar Mountain range, far to the north of any gypsy activity, there lives a village of gnomes. An ancient grudge with the ogres has come full circle.', author: 'Ergo', difficulty: 2, notes: null },
    { id: 60, name: 'The Forbidden Empire', description: 'Beyond the Great Western Ocean is rumored to exist a land of strange beauty and dangers. A replica of our own realms but where the gods twisted with grace to add a touch of the mysterious.', author: 'Slash, Sethanon, Sapphire', difficulty: 4, notes: null },
    { id: 61, name: 'King Fredrick\'s Forest', description: 'In far off Northern lands lies a forest of unimaginable size, ruled and guarded be the great King Fredrick IV and his sentries. The forest has become a busy crossroads.', author: 'Weland, Werm', difficulty: 2, notes: null },
    { id: 62, name: 'King Fredrick\'s Castle', description: 'Deep inside the forest to the north of Midgaard is the castle of King Fredrick and the city that he governs. It is a pleasant town to visit due to the well trained guards.', author: 'Weland, Werm', difficulty: 2, notes: null },
    { id: 63, name: 'Underworld', description: 'Deep down in the sewer runoff east of Midgaard where the Naga and chr-eff\'n reside there are rumors of villages. While there seems to be an overabundance of chr-eff\'n, the Naga are rapidly disappearing.', author: 'Isil, Ogre', difficulty: 5, notes: null },
    { id: 64, name: 'Mortimer\'s Mountain', description: 'In time long past, there once was a powerful lord named Mortimer. This kind and gentle man pursued the love of Threnody. Mortimer, enraged at the death of Threnody vowed to destroy Vrolok.', author: 'Ergo', difficulty: 4, notes: null },
    { id: 65, name: 'The Blightlands', description: 'Before it was called the Blightlands, this land west of the Great Ocean was home to many great kingdoms. Now, pestilence and disease have rendered the country into nothing but death and ruin.', author: 'Sapphire', difficulty: 3, notes: null },
    { id: 66, name: 'The Land of Nature\'s Descent', description: 'From beyond the seas and past glorious empires, a dark rumor grows. There is talk of a blight on the land, where nothing grows and all is dead.', author: 'Grindel, Kelp, Werm', difficulty: 4, notes: null },
    { id: 67, name: 'Plane of the All-Devourer', description: 'An army of darkness stands poised to destroy all reality. Led by the fearsome All-Devourer, this force has already laid waste to dozens of dimensions.', author: 'Grindel', difficulty: 5, notes: null },
    { id: 68, name: 'The Sylvan Jungle', description: 'The Sylvan Jungle is a large unsettled jungle east of the Sylvan City. Native plant, fungal, and animal life evolved to dominate the environment in a deep symbiotic relationship.', author: 'Nero', difficulty: 4, notes: null },
    { id: 69, name: 'Valley of the Kings', description: 'Alas, the tombs of the ancient Pharaohs have been discovered. However, it appears that what was thought to be a burial ground is truly an attempt to protect the people from Amun-Ra.', author: 'Gelb, Ehren', difficulty: 5, notes: null },
    { id: 70, name: 'Tales of Treasure', description: 'At the end of her mortal life, the legendary bard Valeria started singing what she called the Tales of Treasure. Somewhere in the Realms, someone still knows this song.', author: 'Kelp', difficulty: 3, notes: null },
    { id: 71, name: 'Caves of Ice', description: 'Deep within the mountains of the blighted land, the remains of the saviors of the first world age have gone undisturbed since time immemorial.', author: 'Sapphire', difficulty: 3, notes: '-Coming Soon-' },
    { id: 72, name: 'Mechandar: The Eternal Clock', description: 'Before the closing of the last age, Mechandar was errected by the leaders of the realm to stand as an eternal time clock for the entire world.', author: 'Sapphire', difficulty: 5, notes: '[Group Raid Zone] Minimum 3-4 damage dealers' },
    { id: 73, name: 'The Shadow Brotherhood', description: 'The Shadow Brotherhood is an ancient organization of highly trained assassins. Discovery of the possible Catacombs of the Shadow Brotherhood in Darkrime Mountain has been uncovered.', author: 'Nero', difficulty: 2, notes: null },
    { id: 74, name: 'The Duke and Duchess', description: 'Deep in the heart of the Great Ocean, a game of cat and mouse ensues. The Duke and Duchess is on a mission to hunt down the infamous Burning Talon pirate vessel.', author: 'Nero', difficulty: 1, notes: null }
  ];

  const insertZone = db.prepare('INSERT INTO zones (id, name, description, author, difficulty, notes) VALUES (?, ?, ?, ?, ?, ?)');

  zones.forEach(zone => {
    insertZone.run(zone.id, zone.name, zone.description, zone.author, zone.difficulty, zone.notes);
  });

  insertZone.finalize(() => {
    console.log(`  ✓ Seeded ${zones.length} zones`);
    checkComplete();
  });

  // Seed zone areas
  const zoneAreas = [
    // Zone 1 - The Immortal Realm
    { zone_id: 1, name: 'In the Light', min_level: 41, max_level: 46, recommended_class: 'All' },
    // Zone 2 - Midgaard: City
    { zone_id: 2, name: 'City', min_level: 1, max_level: 40, recommended_class: 'All' },
    // Zone 3 - Midgaard: Graveyard
    { zone_id: 3, name: 'Graveyard', min_level: 2, max_level: 5, recommended_class: 'All (Good Aligned)' },
    // Zone 4 - Midgaard: Sewers
    { zone_id: 4, name: 'Tunnels', min_level: 7, max_level: 12, recommended_class: 'All' },
    { zone_id: 4, name: 'Pools', min_level: 12, max_level: 15, recommended_class: 'All' },
    // Zone 5 - Training Grounds
    { zone_id: 5, name: 'General', min_level: 1, max_level: 5, recommended_class: 'All' },
    { zone_id: 5, name: 'Guildmaster', min_level: 5, max_level: 5, recommended_class: 'All' },
    // Zone 6 - Quester's Enclave
    { zone_id: 6, name: 'General', min_level: 40, max_level: 40, recommended_class: 'All' },
    { zone_id: 6, name: 'Arena Trials', min_level: null, max_level: null, recommended_class: 'All (Legendary)' },
    // Zone 7 - The Great Ocean
    { zone_id: 7, name: 'General', min_level: 1, max_level: 40, recommended_class: 'All' },
    // Zone 8 - The Candlebriar Mountains
    { zone_id: 8, name: 'Forest', min_level: 5, max_level: 10, recommended_class: 'All' },
    { zone_id: 8, name: 'Gypsies', min_level: 12, max_level: 20, recommended_class: 'All' },
    // Zone 9 - The Hills of Astyll
    { zone_id: 9, name: 'Grasslands', min_level: 5, max_level: 9, recommended_class: 'All' },
    { zone_id: 9, name: 'Cave', min_level: 8, max_level: 13, recommended_class: 'All' },
    // Zone 10 - The Shire
    { zone_id: 10, name: 'General', min_level: 5, max_level: 11, recommended_class: 'All' },
    { zone_id: 10, name: 'Bree', min_level: 10, max_level: 15, recommended_class: 'All' },
    { zone_id: 10, name: 'Noldo Band', min_level: 22, max_level: 28, recommended_class: 'All + Cleric' },
    { zone_id: 10, name: 'Bree Buildings', min_level: 25, max_level: 32, recommended_class: 'All' },
    // Zone 11 - The Dwarven Kingdom
    { zone_id: 11, name: 'Main Castle', min_level: 12, max_level: 18, recommended_class: 'All' },
    { zone_id: 11, name: 'The Caverns', min_level: 15, max_level: 24, recommended_class: 'All' },
    { zone_id: 11, name: 'Mithril Hall', min_level: 25, max_level: 32, recommended_class: 'All' },
    // Zone 12 - The Haunted Forest
    { zone_id: 12, name: 'Woods', min_level: 10, max_level: 20, recommended_class: 'All' },
    { zone_id: 12, name: 'Treehouse', min_level: 15, max_level: 22, recommended_class: 'All' },
    // Zone 13 - Rome
    { zone_id: 13, name: 'Streets', min_level: 10, max_level: 20, recommended_class: 'All' },
    { zone_id: 13, name: 'Forum', min_level: 15, max_level: 28, recommended_class: 'All' },
    // Zone 14 - Sanctuary of the Kris
    { zone_id: 14, name: 'General', min_level: 15, max_level: 28, recommended_class: 'All, Thief' },
    // Zone 15 - The Village of Bonne Terre
    { zone_id: 15, name: 'Village', min_level: 10, max_level: 21, recommended_class: 'All' },
    { zone_id: 15, name: 'Estate', min_level: 18, max_level: 25, recommended_class: 'All' },
    // Zone 16 - The Outskirts of Bonne Terre
    { zone_id: 16, name: 'North Forest', min_level: 20, max_level: 30, recommended_class: 'All' },
    { zone_id: 16, name: 'The Ruins', min_level: 32, max_level: 40, recommended_class: 'All' },
    // Zone 17 - Temple of Opulence
    { zone_id: 17, name: 'Temple', min_level: 20, max_level: 28, recommended_class: 'All' },
    // Zone 18 - The Great Battle
    { zone_id: 18, name: 'Battlefield', min_level: 20, max_level: 30, recommended_class: 'All' },
    // Zone 19 - The Forest of Haon-Dor
    { zone_id: 19, name: 'Forest', min_level: 15, max_level: 20, recommended_class: 'All' },
    { zone_id: 19, name: 'Druid Trails', min_level: 22, max_level: 27, recommended_class: 'All + Cleric' },
    { zone_id: 19, name: 'Spider Trails', min_level: 25, max_level: 30, recommended_class: 'All' },
    // Zone 20 - Heliopolis
    { zone_id: 20, name: 'City', min_level: 15, max_level: 28, recommended_class: 'All' },
    // Zone 21 - The Great Eastern Desert
    { zone_id: 21, name: 'Desert', min_level: 14, max_level: 20, recommended_class: 'All' },
    { zone_id: 21, name: 'Fortress of Darkside', min_level: 20, max_level: 30, recommended_class: 'All' },
    // Zone 22 - The Crypt of Nyarlathotep
    { zone_id: 22, name: 'Crypt', min_level: 25, max_level: 36, recommended_class: 'All' },
    // Zone 23 - Darkrime Mountain
    { zone_id: 23, name: 'Mountains', min_level: 22, max_level: 32, recommended_class: 'All' },
    { zone_id: 23, name: 'Peak', min_level: 32, max_level: 40, recommended_class: 'All' },
    // Zone 24 - The Kingdom of Arachnos
    { zone_id: 24, name: 'Kingdom', min_level: 30, max_level: 40, recommended_class: 'All' },
    // Zone 25 - The Frozen Wasteland of Fae'Rune
    { zone_id: 25, name: 'Tundra', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 26 - Fae'Rune
    { zone_id: 26, name: 'Mainland', min_level: 22, max_level: 32, recommended_class: 'All' },
    { zone_id: 26, name: 'Pirates Alcove', min_level: 30, max_level: 38, recommended_class: 'All' },
    // Zone 27 - The Cube
    { zone_id: 27, name: 'Lower', min_level: 35, max_level: 40, recommended_class: 'All' },
    { zone_id: 27, name: 'Upper', min_level: null, max_level: null, recommended_class: 'All (Legend I-III)' },
    // Zone 28 - Pixie Glade
    { zone_id: 28, name: 'Glade', min_level: 12, max_level: 20, recommended_class: 'All' },
    // Zone 29 - Nottingham
    { zone_id: 29, name: 'Forest', min_level: 25, max_level: 32, recommended_class: 'All' },
    { zone_id: 29, name: 'Shire', min_level: 28, max_level: 35, recommended_class: 'All' },
    // Zone 30 - Camelot
    { zone_id: 30, name: 'Castle', min_level: 20, max_level: 28, recommended_class: 'All' },
    // Zone 31 - Mountain of Hate
    { zone_id: 31, name: 'Mountains', min_level: 25, max_level: 35, recommended_class: 'All' },
    { zone_id: 31, name: 'Dungeon', min_level: 30, max_level: 40, recommended_class: 'All' },
    // Zone 32 - The College of Wizardry
    { zone_id: 32, name: 'College', min_level: 20, max_level: 30, recommended_class: 'All' },
    // Zone 33 - Lord Vrolok's Estate
    { zone_id: 33, name: 'Castle', min_level: 30, max_level: 40, recommended_class: 'All' },
    // Zone 34 - The Lady's Manor
    { zone_id: 34, name: 'Exterior', min_level: 15, max_level: 20, recommended_class: 'All' },
    { zone_id: 34, name: 'Manor', min_level: 20, max_level: 28, recommended_class: 'All' },
    // Zone 35 - The Valley of Heroes
    { zone_id: 35, name: 'Valley', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 36 - The Burning Talon
    { zone_id: 36, name: 'Ship', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 37 - The Black Market
    { zone_id: 37, name: 'City', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 38 - Pirate's Stronghold
    { zone_id: 38, name: 'Stronghold', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 39 - Sylvan Swamp and City
    { zone_id: 39, name: 'Swamp', min_level: 22, max_level: 30, recommended_class: 'All' },
    { zone_id: 39, name: 'City', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 40 - The Canticle
    { zone_id: 40, name: 'Fortress', min_level: 10, max_level: 18, recommended_class: 'All' },
    // Zone 41 - Ashefall Fortress
    { zone_id: 41, name: 'Fortress', min_level: 25, max_level: 35, recommended_class: 'All' },
    { zone_id: 41, name: 'Dungeon', min_level: 30, max_level: 40, recommended_class: 'All' },
    // Zone 42 - Tuatha de Danaan
    { zone_id: 42, name: 'Island', min_level: 20, max_level: 30, recommended_class: 'All' },
    // Zone 43 - Temple of Mars
    { zone_id: 43, name: 'Temple', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 44 - Caves of the Goblin King
    { zone_id: 44, name: 'Caves', min_level: 10, max_level: 18, recommended_class: 'All' },
    // Zone 45 - Imladris
    { zone_id: 45, name: 'Forest', min_level: 18, max_level: 25, recommended_class: 'All' },
    { zone_id: 45, name: 'City', min_level: 22, max_level: 30, recommended_class: 'All' },
    // Zone 46 - The Vault
    { zone_id: 46, name: 'Entrance', min_level: 25, max_level: 30, recommended_class: 'All' },
    { zone_id: 46, name: 'Vault', min_level: 30, max_level: 40, recommended_class: 'All' },
    // Zone 47 - Juris
    { zone_id: 47, name: 'City', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 48 - Raddok
    { zone_id: 48, name: 'City', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 49 - Aurvuron
    { zone_id: 49, name: 'City', min_level: 10, max_level: 20, recommended_class: 'All' },
    // Zone 50 - Aurvuron: The Gray Citadel
    { zone_id: 50, name: 'Citadel', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 51 - The Caves of Fire
    { zone_id: 51, name: 'Caves', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 52 - Thalos
    { zone_id: 52, name: 'Ruins', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 53 - Harrington
    { zone_id: 53, name: 'Village', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 54 - Mistaavi's Mansion
    { zone_id: 54, name: 'Mansion', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 55 - Nexus
    { zone_id: 55, name: 'General', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 56 - Gardens of the Arcane
    { zone_id: 56, name: 'Gardens', min_level: 10, max_level: 18, recommended_class: 'All' },
    // Zone 57 - The Keep of Mahn-Tor
    { zone_id: 57, name: 'Keep', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 58 - The Tombs of Tarin
    { zone_id: 58, name: 'Tombs', min_level: 10, max_level: 20, recommended_class: 'All' },
    // Zone 59 - Gnomelight Village and Mines
    { zone_id: 59, name: 'Village', min_level: 8, max_level: 15, recommended_class: 'All' },
    { zone_id: 59, name: 'Mines', min_level: 12, max_level: 20, recommended_class: 'All' },
    // Zone 60 - The Forbidden Empire
    { zone_id: 60, name: 'Empire', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 61 - King Fredrick's Forest
    { zone_id: 61, name: 'Forest', min_level: 10, max_level: 18, recommended_class: 'All' },
    // Zone 62 - King Fredrick's Castle
    { zone_id: 62, name: 'Castle', min_level: 10, max_level: 20, recommended_class: 'All' },
    // Zone 63 - Underworld
    { zone_id: 63, name: 'Underworld', min_level: 32, max_level: 40, recommended_class: 'All' },
    // Zone 64 - Mortimer's Mountain
    { zone_id: 64, name: 'Mountain', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 65 - The Blightlands
    { zone_id: 65, name: 'Wastelands', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 66 - The Land of Nature's Descent
    { zone_id: 66, name: 'General', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 67 - Plane of the All-Devourer
    { zone_id: 67, name: 'Plane', min_level: 35, max_level: 40, recommended_class: 'All' },
    // Zone 68 - The Sylvan Jungle
    { zone_id: 68, name: 'Jungle', min_level: 25, max_level: 35, recommended_class: 'All' },
    // Zone 69 - Valley of the Kings
    { zone_id: 69, name: 'Valley', min_level: 32, max_level: 40, recommended_class: 'All' },
    // Zone 70 - Tales of Treasure
    { zone_id: 70, name: 'Quest Area', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 71 - Caves of Ice
    { zone_id: 71, name: 'Caves', min_level: 18, max_level: 28, recommended_class: 'All' },
    // Zone 72 - Mechandar: The Eternal Clock
    { zone_id: 72, name: 'Lower', min_level: 35, max_level: 40, recommended_class: 'All' },
    { zone_id: 72, name: 'Upper', min_level: null, max_level: null, recommended_class: 'All (Legend IV-VI)' },
    // Zone 73 - The Shadow Brotherhood
    { zone_id: 73, name: 'Catacombs', min_level: 10, max_level: 20, recommended_class: 'All' },
    // Zone 74 - The Duke and Duchess
    { zone_id: 74, name: 'Ship', min_level: 5, max_level: 15, recommended_class: 'All' }
  ];

  const insertZoneArea = db.prepare('INSERT INTO zone_areas (zone_id, name, min_level, max_level, recommended_class) VALUES (?, ?, ?, ?, ?)');

  zoneAreas.forEach(area => {
    insertZoneArea.run(area.zone_id, area.name, area.min_level, area.max_level, area.recommended_class);
  });

  insertZoneArea.finalize(() => {
    console.log(`  ✓ Seeded ${zoneAreas.length} zone areas`);
    checkComplete();
  });

  // Seed zone connections
  const zoneConnections = [
    // Zone 2 - Midgaard: City (central hub)
    { zone_id: 2, connected_zone_id: 3 },
    { zone_id: 2, connected_zone_id: 4 },
    { zone_id: 2, connected_zone_id: 5 },
    { zone_id: 2, connected_zone_id: 6 },
    { zone_id: 2, connected_zone_id: 7 },
    { zone_id: 2, connected_zone_id: 8 },
    { zone_id: 2, connected_zone_id: 9 },
    { zone_id: 2, connected_zone_id: 12 },
    { zone_id: 2, connected_zone_id: 13 },
    { zone_id: 2, connected_zone_id: 14 },
    { zone_id: 2, connected_zone_id: 17 },
    { zone_id: 2, connected_zone_id: 21 },
    { zone_id: 2, connected_zone_id: 32 },
    // Zone 3 - Midgaard: Graveyard
    { zone_id: 3, connected_zone_id: 2 },
    { zone_id: 3, connected_zone_id: 5 },
    // Zone 4 - Midgaard: Sewers
    { zone_id: 4, connected_zone_id: 2 },
    { zone_id: 4, connected_zone_id: 63 },
    // Zone 5 - Training Grounds
    { zone_id: 5, connected_zone_id: 2 },
    { zone_id: 5, connected_zone_id: 3 },
    // Zone 6 - Quester's Enclave
    { zone_id: 6, connected_zone_id: 2 },
    // Zone 7 - The Great Ocean (connects to many zones - coastal access)
    { zone_id: 7, connected_zone_id: 2 },
    { zone_id: 7, connected_zone_id: 8 },
    { zone_id: 7, connected_zone_id: 19 },
    { zone_id: 7, connected_zone_id: 25 },
    { zone_id: 7, connected_zone_id: 26 },
    { zone_id: 7, connected_zone_id: 30 },
    { zone_id: 7, connected_zone_id: 36 },
    { zone_id: 7, connected_zone_id: 37 },
    { zone_id: 7, connected_zone_id: 38 },
    { zone_id: 7, connected_zone_id: 42 },
    { zone_id: 7, connected_zone_id: 48 },
    { zone_id: 7, connected_zone_id: 60 },
    { zone_id: 7, connected_zone_id: 65 },
    { zone_id: 7, connected_zone_id: 74 },
    // Zone 8 - The Candlebriar Mountains
    { zone_id: 8, connected_zone_id: 2 },
    { zone_id: 8, connected_zone_id: 7 },
    { zone_id: 8, connected_zone_id: 19 },
    { zone_id: 8, connected_zone_id: 48 },
    // Zone 9 - The Hills of Astyll
    { zone_id: 9, connected_zone_id: 2 },
    { zone_id: 9, connected_zone_id: 10 },
    { zone_id: 9, connected_zone_id: 11 },
    { zone_id: 9, connected_zone_id: 12 },
    { zone_id: 9, connected_zone_id: 31 },
    { zone_id: 9, connected_zone_id: 33 },
    { zone_id: 9, connected_zone_id: 40 },
    { zone_id: 9, connected_zone_id: 44 },
    { zone_id: 9, connected_zone_id: 49 },
    { zone_id: 9, connected_zone_id: 56 },
    { zone_id: 9, connected_zone_id: 61 },
    // Zone 10 - The Shire
    { zone_id: 10, connected_zone_id: 9 },
    { zone_id: 10, connected_zone_id: 40 },
    { zone_id: 10, connected_zone_id: 45 },
    { zone_id: 10, connected_zone_id: 49 },
    // Zone 11 - The Dwarven Kingdom
    { zone_id: 11, connected_zone_id: 9 },
    { zone_id: 11, connected_zone_id: 31 },
    // Zone 12 - The Haunted Forest
    { zone_id: 12, connected_zone_id: 2 },
    { zone_id: 12, connected_zone_id: 8 },
    { zone_id: 12, connected_zone_id: 9 },
    { zone_id: 12, connected_zone_id: 21 },
    { zone_id: 12, connected_zone_id: 28 },
    { zone_id: 12, connected_zone_id: 34 },
    // Zone 13 - Rome
    { zone_id: 13, connected_zone_id: 2 },
    { zone_id: 13, connected_zone_id: 43 },
    { zone_id: 13, connected_zone_id: 46 },
    // Zone 14 - Sanctuary of the Kris
    { zone_id: 14, connected_zone_id: 2 },
    // Zone 15 - The Village of Bonne Terre
    { zone_id: 15, connected_zone_id: 16 },
    { zone_id: 15, connected_zone_id: 29 },
    { zone_id: 15, connected_zone_id: 30 },
    // Zone 16 - The Outskirts of Bonne Terre
    { zone_id: 16, connected_zone_id: 15 },
    // Zone 17 - Temple of Opulence
    { zone_id: 17, connected_zone_id: 2 },
    // Zone 18 - The Great Battle
    { zone_id: 18, connected_zone_id: 33 },
    { zone_id: 18, connected_zone_id: 64 },
    // Zone 19 - The Forest of Haon-Dor
    { zone_id: 19, connected_zone_id: 7 },
    { zone_id: 19, connected_zone_id: 8 },
    { zone_id: 19, connected_zone_id: 37 },
    { zone_id: 19, connected_zone_id: 39 },
    { zone_id: 19, connected_zone_id: 48 },
    { zone_id: 19, connected_zone_id: 54 },
    { zone_id: 19, connected_zone_id: 57 },
    // Zone 20 - Heliopolis
    { zone_id: 20, connected_zone_id: 21 },
    { zone_id: 20, connected_zone_id: 22 },
    { zone_id: 20, connected_zone_id: 52 },
    { zone_id: 20, connected_zone_id: 69 },
    // Zone 21 - The Great Eastern Desert
    { zone_id: 21, connected_zone_id: 2 },
    { zone_id: 21, connected_zone_id: 12 },
    { zone_id: 21, connected_zone_id: 20 },
    { zone_id: 21, connected_zone_id: 27 },
    { zone_id: 21, connected_zone_id: 47 },
    { zone_id: 21, connected_zone_id: 52 },
    // Zone 22 - The Crypt of Nyarlathotep
    { zone_id: 22, connected_zone_id: 20 },
    // Zone 23 - Darkrime Mountain
    { zone_id: 23, connected_zone_id: 47 },
    { zone_id: 23, connected_zone_id: 73 },
    // Zone 24 - The Kingdom of Arachnos
    { zone_id: 24, connected_zone_id: 39 },
    { zone_id: 24, connected_zone_id: 68 },
    // Zone 25 - The Frozen Wasteland of Fae'Rune
    { zone_id: 25, connected_zone_id: 7 },
    { zone_id: 25, connected_zone_id: 26 },
    { zone_id: 25, connected_zone_id: 35 },
    // Zone 26 - Fae'Rune
    { zone_id: 26, connected_zone_id: 7 },
    { zone_id: 26, connected_zone_id: 25 },
    // Zone 27 - The Cube
    { zone_id: 27, connected_zone_id: 21 },
    // Zone 28 - Pixie Glade
    { zone_id: 28, connected_zone_id: 12 },
    // Zone 29 - Nottingham
    { zone_id: 29, connected_zone_id: 15 },
    { zone_id: 29, connected_zone_id: 30 },
    // Zone 30 - Camelot
    { zone_id: 30, connected_zone_id: 7 },
    { zone_id: 30, connected_zone_id: 15 },
    { zone_id: 30, connected_zone_id: 29 },
    // Zone 31 - Mountain of Hate
    { zone_id: 31, connected_zone_id: 9 },
    { zone_id: 31, connected_zone_id: 11 },
    { zone_id: 31, connected_zone_id: 44 },
    // Zone 32 - The College of Wizardry
    { zone_id: 32, connected_zone_id: 2 },
    // Zone 33 - Lord Vrolok's Estate
    { zone_id: 33, connected_zone_id: 9 },
    { zone_id: 33, connected_zone_id: 18 },
    { zone_id: 33, connected_zone_id: 64 },
    // Zone 34 - The Lady's Manor
    { zone_id: 34, connected_zone_id: 12 },
    // Zone 35 - The Valley of Heroes
    { zone_id: 35, connected_zone_id: 25 },
    // Zone 36 - The Burning Talon
    { zone_id: 36, connected_zone_id: 7 },
    { zone_id: 36, connected_zone_id: 74 },
    // Zone 37 - The Black Market
    { zone_id: 37, connected_zone_id: 7 },
    { zone_id: 37, connected_zone_id: 19 },
    { zone_id: 37, connected_zone_id: 38 },
    // Zone 38 - Pirate's Stronghold
    { zone_id: 38, connected_zone_id: 7 },
    { zone_id: 38, connected_zone_id: 37 },
    // Zone 39 - Sylvan Swamp and City
    { zone_id: 39, connected_zone_id: 19 },
    { zone_id: 39, connected_zone_id: 24 },
    { zone_id: 39, connected_zone_id: 68 },
    // Zone 40 - The Canticle
    { zone_id: 40, connected_zone_id: 9 },
    { zone_id: 40, connected_zone_id: 10 },
    // Zone 41 - Ashefall Fortress
    { zone_id: 41, connected_zone_id: 47 },
    // Zone 42 - Tuatha de Danaan
    { zone_id: 42, connected_zone_id: 7 },
    // Zone 43 - Temple of Mars
    { zone_id: 43, connected_zone_id: 13 },
    // Zone 44 - Caves of the Goblin King
    { zone_id: 44, connected_zone_id: 9 },
    { zone_id: 44, connected_zone_id: 31 },
    // Zone 45 - Imladris
    { zone_id: 45, connected_zone_id: 10 },
    // Zone 46 - The Vault
    { zone_id: 46, connected_zone_id: 13 },
    // Zone 47 - Juris
    { zone_id: 47, connected_zone_id: 21 },
    { zone_id: 47, connected_zone_id: 23 },
    { zone_id: 47, connected_zone_id: 41 },
    // Zone 48 - Raddok
    { zone_id: 48, connected_zone_id: 7 },
    { zone_id: 48, connected_zone_id: 8 },
    { zone_id: 48, connected_zone_id: 19 },
    { zone_id: 48, connected_zone_id: 51 },
    { zone_id: 48, connected_zone_id: 53 },
    // Zone 49 - Aurvuron
    { zone_id: 49, connected_zone_id: 9 },
    { zone_id: 49, connected_zone_id: 10 },
    { zone_id: 49, connected_zone_id: 45 },
    { zone_id: 49, connected_zone_id: 50 },
    // Zone 50 - Aurvuron: The Gray Citadel
    { zone_id: 50, connected_zone_id: 49 },
    // Zone 51 - The Caves of Fire
    { zone_id: 51, connected_zone_id: 48 },
    // Zone 52 - Thalos
    { zone_id: 52, connected_zone_id: 20 },
    { zone_id: 52, connected_zone_id: 21 },
    // Zone 53 - Harrington
    { zone_id: 53, connected_zone_id: 48 },
    { zone_id: 53, connected_zone_id: 61 },
    { zone_id: 53, connected_zone_id: 62 },
    // Zone 54 - Mistaavi's Mansion
    { zone_id: 54, connected_zone_id: 19 },
    { zone_id: 54, connected_zone_id: 61 },
    { zone_id: 54, connected_zone_id: 62 },
    // Zone 55 - Nexus
    { zone_id: 55, connected_zone_id: 65 },
    // Zone 56 - Gardens of the Arcane
    { zone_id: 56, connected_zone_id: 9 },
    // Zone 57 - The Keep of Mahn-Tor
    { zone_id: 57, connected_zone_id: 19 },
    { zone_id: 57, connected_zone_id: 58 },
    // Zone 58 - The Tombs of Tarin
    { zone_id: 58, connected_zone_id: 57 },
    { zone_id: 58, connected_zone_id: 59 },
    // Zone 59 - Gnomelight Village and Mines
    { zone_id: 59, connected_zone_id: 58 },
    // Zone 60 - The Forbidden Empire
    { zone_id: 60, connected_zone_id: 7 },
    // Zone 61 - King Fredrick's Forest
    { zone_id: 61, connected_zone_id: 9 },
    { zone_id: 61, connected_zone_id: 53 },
    { zone_id: 61, connected_zone_id: 54 },
    { zone_id: 61, connected_zone_id: 62 },
    // Zone 62 - King Fredrick's Castle
    { zone_id: 62, connected_zone_id: 53 },
    { zone_id: 62, connected_zone_id: 54 },
    { zone_id: 62, connected_zone_id: 61 },
    // Zone 63 - Underworld
    { zone_id: 63, connected_zone_id: 4 },
    // Zone 64 - Mortimer's Mountain
    { zone_id: 64, connected_zone_id: 18 },
    { zone_id: 64, connected_zone_id: 33 },
    // Zone 65 - The Blightlands
    { zone_id: 65, connected_zone_id: 7 },
    { zone_id: 65, connected_zone_id: 55 },
    { zone_id: 65, connected_zone_id: 66 },
    { zone_id: 65, connected_zone_id: 71 },
    // Zone 66 - The Land of Nature's Descent
    { zone_id: 66, connected_zone_id: 65 },
    { zone_id: 66, connected_zone_id: 67 },
    // Zone 67 - Plane of the All-Devourer
    { zone_id: 67, connected_zone_id: 66 },
    // Zone 68 - The Sylvan Jungle
    { zone_id: 68, connected_zone_id: 24 },
    { zone_id: 68, connected_zone_id: 39 },
    // Zone 69 - Valley of the Kings
    { zone_id: 69, connected_zone_id: 20 },
    // Zone 70 - Tales of Treasure (quest area - general access)
    { zone_id: 70, connected_zone_id: 2 },
    // Zone 71 - Caves of Ice
    { zone_id: 71, connected_zone_id: 65 },
    // Zone 72 - Mechandar: The Eternal Clock
    { zone_id: 72, connected_zone_id: 2 },
    // Zone 73 - The Shadow Brotherhood
    { zone_id: 73, connected_zone_id: 23 },
    // Zone 74 - The Duke and Duchess
    { zone_id: 74, connected_zone_id: 7 },
    { zone_id: 74, connected_zone_id: 36 }
  ];

  const insertZoneConnection = db.prepare('INSERT INTO zone_connections (zone_id, connected_zone_id) VALUES (?, ?)');

  zoneConnections.forEach(conn => {
    insertZoneConnection.run(conn.zone_id, conn.connected_zone_id);
  });

  insertZoneConnection.finalize(() => {
    console.log(`  ✓ Seeded ${zoneConnections.length} zone connections`);
    checkComplete();
  });

  // Seed sample rooms from Midgaard City
  const sampleRooms = [
    { id: 1, zone_id: 2, name: 'Market Square', description: 'You are standing on the Market Square, the famous Square of Midgaard. It is said that the North, East, South, and West all meet here. This square is the busiest in the realms for Midgaard is the center of the known civilization. People from all lands can be found wandering here. At the four corners can be found tall poles with magical lanterns, provided by the Mage\'s Guild, that glow with a bright light when it gets dark. A large fountain of an angel pouring water stands in the center of the square. Roads lead in every direction, north to the temple square, south to the bazaar, east and west bound is the main street.', terrain: 'city', flags: null },
    { id: 2, zone_id: 2, name: 'South Temple Street', description: 'The newly renovated Temple Street is wide and clean, with light colored bricks gleaming from being freshly washed. Nobles, common folk and adventurers alike move about in a steady stream as they make their way through town. The Market Square to the south is a common destination, which locals consider to be the heart of the city.', terrain: 'city', flags: null },
    { id: 3, zone_id: 2, name: 'North Temple Street', description: 'The historic Temple of Midgaard entrance is to the north and past that, the Grand Gates of Midgaard which controls passage into and out of the main city. To the west is a room housing the Social Boards while to the east is an entrance to the Old Grunting Boar Inn.', terrain: 'city', flags: null },
    { id: 4, zone_id: 2, name: 'Grand Gates of the Temple of Midgaard', description: 'You stand at the base of the huge mound upon which the Temple of Midgaard is built within the Grand Gates of the Temple. The gates are gargantuan in size and are made of solid gold with ancient designs of Gods, Giants, Warriors, and peasants. Steps hewn from huge marble blocks lead the way up the mound to the actual temple itself while south beyond the gates is what is commonly known as the Temple Square. Braziers of eternal flame built upon the posts of the foundation of the temple wall brightly light up the sky, even in the day.', terrain: 'city', flags: null },
    { id: 5, zone_id: 2, name: 'The Temple of Midgaard', description: 'Entering the great halls of the Temple of Midgaard is awe-inspiring, as you stand at an ornate entryway spanning nearly thirty feet across. Huge copper braziers at each temple corner bathes the cool, marble walls in a fiery glow. Elaborate tapestries bearing the crests and symbols of nobles who helped established the Temple long ago hang gracefully from the walls and ceilings. A set of large stone steps inside the temple lead up to an altar dedicated to the heroes and patrons of this age. The entire temple is elevated prominently above all the other buildings of Midgaard, reinforcing its position as the pinnacle landmark within the city.', terrain: 'inside', flags: null }
  ];

  const insertRoom = db.prepare('INSERT INTO rooms (id, zone_id, name, description, terrain, flags) VALUES (?, ?, ?, ?, ?, ?)');

  sampleRooms.forEach(room => {
    insertRoom.run(room.id, room.zone_id, room.name, room.description, room.terrain, room.flags);
  });

  insertRoom.finalize(() => {
    console.log(`  ✓ Seeded ${sampleRooms.length} sample rooms`);
    checkComplete();
  });

  // Seed room exits (directional connections between rooms)
  const roomExits = [
    // Market Square (1) exits
    { from_room_id: 1, to_room_id: 2, direction: 'north', description: 'You see the southern temple square.' },
    { from_room_id: 1, to_room_id: null, direction: 'south', description: 'You see the bazaar.' },
    { from_room_id: 1, to_room_id: null, direction: 'east', description: 'You see the main street.' },
    { from_room_id: 1, to_room_id: null, direction: 'west', description: 'You see the main street.' },
    // South Temple Street (2) exits
    { from_room_id: 2, to_room_id: 3, direction: 'north', description: null },
    { from_room_id: 2, to_room_id: 1, direction: 'south', description: null },
    // North Temple Street (3) exits
    { from_room_id: 3, to_room_id: 4, direction: 'north', description: null },
    { from_room_id: 3, to_room_id: 2, direction: 'south', description: null },
    { from_room_id: 3, to_room_id: null, direction: 'east', description: 'You see the Old Grunting Boar Inn entrance.' },
    { from_room_id: 3, to_room_id: null, direction: 'west', description: 'You see the Social Boards room.' },
    // Grand Gates (4) exits
    { from_room_id: 4, to_room_id: 5, direction: 'north', description: null },
    { from_room_id: 4, to_room_id: 3, direction: 'south', description: null },
    // Temple of Midgaard (5) exits
    { from_room_id: 5, to_room_id: null, direction: 'north', description: null },
    { from_room_id: 5, to_room_id: null, direction: 'east', description: null },
    { from_room_id: 5, to_room_id: 4, direction: 'south', description: null },
    { from_room_id: 5, to_room_id: null, direction: 'west', description: null },
    { from_room_id: 5, to_room_id: null, direction: 'down', description: null }
  ];

  const insertRoomExit = db.prepare('INSERT INTO room_exits (from_room_id, to_room_id, direction, description) VALUES (?, ?, ?, ?)');

  roomExits.forEach(exit => {
    insertRoomExit.run(exit.from_room_id, exit.to_room_id, exit.direction, exit.description);
  });

  insertRoomExit.finalize(() => {
    console.log(`  ✓ Seeded ${roomExits.length} room exits`);
    checkComplete();
  });

  // Seed sample player actions (will be populated by crawler)
  const sampleActions = [
    {
      name: 'who',
      type: 'command',
      category: 'information',
      description: `WHO
Usage: who [minlev[-maxlev]] [-n sname] [-s] [-o] [-q] [-r] [-z]

Lists the people currently in the game. Some people may be invisible.
Command-line options can be used to limit the listing. The parameters
can be specified on the command-line in any order.

minlev, maxlev : list only people whose level is at or above minlev, and
                 optionally, at or below maxlev
-n : list only people whose names or titles contain names
-s : list names in the short form (4 columns of names, without titles or flags)
-o : list only outlaws (i.e., people with a killer or thief flag)
-q : list only people who are on the Quest
-r : list only people who are in your room
-z : list only people in your zone

Examples:

  > who -c fc -s -l 20
  List, in short form, fighters and clerics at or above level 20

  > who 15-25 -o -z
  List all outlaws between levels 15 and 25 who are in your zone.`,
      syntax: 'who [minlev[-maxlev]] [-n sname] [-s] [-o] [-q] [-r] [-z]',
      examples: 'who -c fc -s -l 20\nList, in short form, fighters and clerics at or above level 20\n\nwho 15-25 -o -z\nList all outlaws between levels 15 and 25 who are in your zone.',
      documented: 1
    },
    {
      name: 'look',
      type: 'command',
      category: 'information',
      description: `LOOK
Usage: look
       look [in | at] [the] <item>
       look <direction>

Used for studying your surroundings. (Short usage: l)

Examples:

look (or l)
look at room  (l room) (check out room description if you are in brief mode)

> look AT the fountain  (l fountain)
> look IN the bag    (l bag)
> look to the south  (look south)

Note: If you LOOK AT CORPSE you will not see its inventory. To see what's 
inside a container (e.i. Corpse) use LOOK IN <OBJECT>, or EXAMINE CORPSE.

See Also:  EXAMINE READ SCAN`,
      syntax: 'look\nlook [in | at] [the] <item>\nlook <direction>',
      examples: 'look (or l)\nlook at room\nlook AT the fountain\nlook IN the bag\nlook to the south',
      documented: 1
    },
    {
      name: 'hug',
      type: 'social',
      category: 'social',
      description: 'A social action that displays a predefined message for hugging another player.',
      syntax: 'hug [target]',
      documented: 0
    }
  ];

  const insertAction = db.prepare('INSERT INTO player_actions (name, type, category, description, syntax, examples, documented) VALUES (?, ?, ?, ?, ?, ?, ?)');

  sampleActions.forEach(action => {
    insertAction.run(action.name, action.type, action.category, action.description, action.syntax, action.examples, action.documented);
  });

  insertAction.finalize(() => {
    console.log(`  ✓ Seeded ${sampleActions.length} sample player actions`);
    checkComplete();
  });

  // Seed ability scores for Strength (ability_id = 1)
  const strengthScores = [
    { score: 0, effects: { weight_capacity: 0, damage_bonus: -10, wield_weight: 0, hp_regen: 0 } },
    { score: 1, effects: { weight_capacity: 30, damage_bonus: -9, wield_weight: 1, hp_regen: 0 } },
    { score: 2, effects: { weight_capacity: 40, damage_bonus: -8, wield_weight: 2, hp_regen: 0 } },
    { score: 3, effects: { weight_capacity: 50, damage_bonus: -7, wield_weight: 3, hp_regen: 0 } },
    { score: 4, effects: { weight_capacity: 60, damage_bonus: -6, wield_weight: 4, hp_regen: 0 } },
    { score: 5, effects: { weight_capacity: 70, damage_bonus: -5, wield_weight: 5, hp_regen: 0 } },
    { score: 6, effects: { weight_capacity: 80, damage_bonus: -4, wield_weight: 6, hp_regen: 0 } },
    { score: 7, effects: { weight_capacity: 100, damage_bonus: -3, wield_weight: 7, hp_regen: 0 } },
    { score: 8, effects: { weight_capacity: 120, damage_bonus: -2, wield_weight: 8, hp_regen: 0 } },
    { score: 9, effects: { weight_capacity: 150, damage_bonus: -1, wield_weight: 9, hp_regen: 0 } },
    { score: 10, effects: { weight_capacity: 170, damage_bonus: 0, wield_weight: 10, hp_regen: 0 } },
    { score: 11, effects: { weight_capacity: 185, damage_bonus: 0, wield_weight: 11, hp_regen: 0 } },
    { score: 12, effects: { weight_capacity: 200, damage_bonus: 0, wield_weight: 12, hp_regen: 0 } },
    { score: 13, effects: { weight_capacity: 250, damage_bonus: 0, wield_weight: 13, hp_regen: 0 } },
    { score: 14, effects: { weight_capacity: 325, damage_bonus: 0, wield_weight: 14, hp_regen: 0 } },
    { score: 15, effects: { weight_capacity: 375, damage_bonus: 1, wield_weight: 15, hp_regen: 0 } },
    { score: 16, effects: { weight_capacity: 400, damage_bonus: 1, wield_weight: 17, hp_regen: 2 } },
    { score: 17, effects: { weight_capacity: 425, damage_bonus: 1, wield_weight: 22, hp_regen: 3 } },
    { score: 18, effects: { weight_capacity: 450, damage_bonus: 2, wield_weight: 30, hp_regen: 4 } },
    { score: 19, effects: { weight_capacity: 475, damage_bonus: 2, wield_weight: 31, hp_regen: 5 } },
    { score: 20, effects: { weight_capacity: 500, damage_bonus: 2, wield_weight: 32, hp_regen: 6 } },
    { score: 21, effects: { weight_capacity: 525, damage_bonus: 3, wield_weight: 34, hp_regen: 7 } },
    { score: 22, effects: { weight_capacity: 550, damage_bonus: 4, wield_weight: 36, hp_regen: 8 } },
    { score: 23, effects: { weight_capacity: 575, damage_bonus: 5, wield_weight: 38, hp_regen: 9 } },
    { score: 24, effects: { weight_capacity: 600, damage_bonus: 5, wield_weight: 40, hp_regen: 10 } },
    { score: 25, effects: { weight_capacity: 650, damage_bonus: 6, wield_weight: 42, hp_regen: 12 } }
  ];

  const insertAbilityScore = db.prepare('INSERT INTO ability_scores (ability_id, score, effects) VALUES (?, ?, ?)');

  strengthScores.forEach(item => {
    insertAbilityScore.run(1, item.score, JSON.stringify(item.effects));
  });

  insertAbilityScore.finalize(() => {
    console.log(`  ✓ Seeded ${strengthScores.length} ability scores for Strength`);
    checkComplete();
  });

  // Seed ability scores for Intelligence (ability_id = 2)
  const intScores = [
    { score: 0, effects: { practice_learn_pct: 1, mana_bonus: 0, exp_bonus: 0 } },
    { score: 1, effects: { practice_learn_pct: 1, mana_bonus: 0, exp_bonus: 0 } },
    { score: 2, effects: { practice_learn_pct: 2, mana_bonus: 0, exp_bonus: 0 } },
    { score: 3, effects: { practice_learn_pct: 3, mana_bonus: 0, exp_bonus: 0 } },
    { score: 4, effects: { practice_learn_pct: 4, mana_bonus: 0, exp_bonus: 0 } },
    { score: 5, effects: { practice_learn_pct: 5, mana_bonus: 0, exp_bonus: 0 } },
    { score: 6, effects: { practice_learn_pct: 6, mana_bonus: 0, exp_bonus: 0 } },
    { score: 7, effects: { practice_learn_pct: 7, mana_bonus: 0, exp_bonus: 0 } },
    { score: 8, effects: { practice_learn_pct: 8, mana_bonus: 0, exp_bonus: 0 } },
    { score: 9, effects: { practice_learn_pct: 9, mana_bonus: 0, exp_bonus: 0 } },
    { score: 10, effects: { practice_learn_pct: 10, mana_bonus: 0, exp_bonus: 0 } },
    { score: 11, effects: { practice_learn_pct: 11, mana_bonus: 0, exp_bonus: 0 } },
    { score: 12, effects: { practice_learn_pct: 12, mana_bonus: 0, exp_bonus: 0 } },
    { score: 13, effects: { practice_learn_pct: 13, mana_bonus: 0, exp_bonus: 0 } },
    { score: 14, effects: { practice_learn_pct: 14, mana_bonus: 0, exp_bonus: 0 } },
    { score: 15, effects: { practice_learn_pct: 15, mana_bonus: 0, exp_bonus: 0 } },
    { score: 16, effects: { practice_learn_pct: 16, mana_bonus: 2, exp_bonus: 2 } },
    { score: 17, effects: { practice_learn_pct: 17, mana_bonus: 2, exp_bonus: 4 } },
    { score: 18, effects: { practice_learn_pct: 19, mana_bonus: 2, exp_bonus: 6 } },
    { score: 19, effects: { practice_learn_pct: 21, mana_bonus: 3, exp_bonus: 8 } },
    { score: 20, effects: { practice_learn_pct: 23, mana_bonus: 3, exp_bonus: 10 } },
    { score: 21, effects: { practice_learn_pct: 25, mana_bonus: 3, exp_bonus: 12 } },
    { score: 22, effects: { practice_learn_pct: 27, mana_bonus: 4, exp_bonus: 14 } },
    { score: 23, effects: { practice_learn_pct: 29, mana_bonus: 4, exp_bonus: 18 } },
    { score: 24, effects: { practice_learn_pct: 32, mana_bonus: 4, exp_bonus: 22 } },
    { score: 25, effects: { practice_learn_pct: 35, mana_bonus: 5, exp_bonus: 25 } }
  ];

  const insertIntScore = db.prepare('INSERT INTO ability_scores (ability_id, score, effects) VALUES (?, ?, ?)');

  intScores.forEach(item => {
    insertIntScore.run(2, item.score, JSON.stringify(item.effects));
  });

  insertIntScore.finalize(() => {
    console.log(`  ✓ Seeded ${intScores.length} ability scores for Intelligence`);
    checkComplete();
  });

  // Seed ability scores for Wisdom (ability_id = 3)
  const wisScores = [
    { score: 0, effects: { skill_learn_pct: 1, mana_bonus: 0, mana_regen: 0 } },
    { score: 1, effects: { skill_learn_pct: 1, mana_bonus: 0, mana_regen: 0 } },
    { score: 2, effects: { skill_learn_pct: 1, mana_bonus: 0, mana_regen: 0 } },
    { score: 3, effects: { skill_learn_pct: 2, mana_bonus: 0, mana_regen: 0 } },
    { score: 4, effects: { skill_learn_pct: 2, mana_bonus: 0, mana_regen: 0 } },
    { score: 5, effects: { skill_learn_pct: 3, mana_bonus: 0, mana_regen: 0 } },
    { score: 6, effects: { skill_learn_pct: 3, mana_bonus: 0, mana_regen: 0 } },
    { score: 7, effects: { skill_learn_pct: 3, mana_bonus: 0, mana_regen: 0 } },
    { score: 8, effects: { skill_learn_pct: 3, mana_bonus: 0, mana_regen: 0 } },
    { score: 9, effects: { skill_learn_pct: 3, mana_bonus: 0, mana_regen: 0 } },
    { score: 10, effects: { skill_learn_pct: 4, mana_bonus: 0, mana_regen: 0 } },
    { score: 11, effects: { skill_learn_pct: 4, mana_bonus: 0, mana_regen: 0 } },
    { score: 12, effects: { skill_learn_pct: 4, mana_bonus: 0, mana_regen: 0 } },
    { score: 13, effects: { skill_learn_pct: 5, mana_bonus: 0, mana_regen: 0 } },
    { score: 14, effects: { skill_learn_pct: 5, mana_bonus: 0, mana_regen: 0 } },
    { score: 15, effects: { skill_learn_pct: 5, mana_bonus: 0, mana_regen: 0 } },
    { score: 16, effects: { skill_learn_pct: 6, mana_bonus: 1, mana_regen: 2 } },
    { score: 17, effects: { skill_learn_pct: 6, mana_bonus: 1, mana_regen: 3 } },
    { score: 18, effects: { skill_learn_pct: 7, mana_bonus: 1, mana_regen: 4 } },
    { score: 19, effects: { skill_learn_pct: 7, mana_bonus: 2, mana_regen: 5 } },
    { score: 20, effects: { skill_learn_pct: 8, mana_bonus: 2, mana_regen: 6 } },
    { score: 21, effects: { skill_learn_pct: 8, mana_bonus: 2, mana_regen: 7 } },
    { score: 22, effects: { skill_learn_pct: 9, mana_bonus: 3, mana_regen: 8 } },
    { score: 23, effects: { skill_learn_pct: 9, mana_bonus: 3, mana_regen: 9 } },
    { score: 24, effects: { skill_learn_pct: 10, mana_bonus: 3, mana_regen: 10 } },
    { score: 25, effects: { skill_learn_pct: 12, mana_bonus: 4, mana_regen: 12 } }
  ];

  const insertWisScore = db.prepare('INSERT INTO ability_scores (ability_id, score, effects) VALUES (?, ?, ?)');

  wisScores.forEach(item => {
    insertWisScore.run(3, item.score, JSON.stringify(item.effects));
  });

  insertWisScore.finalize(() => {
    console.log(`  ✓ Seeded ${wisScores.length} ability scores for Wisdom`);
    checkComplete();
  });

  // Seed ability scores for Dexterity (ability_id = 4)
  const dexScores = [
    { score: 0, effects: { items_carried: 5, move_bonus: -4, armor_bonus: 70, hit_bonus: -10 } },
    { score: 1, effects: { items_carried: 5, move_bonus: -3, armor_bonus: 60, hit_bonus: -9 } },
    { score: 2, effects: { items_carried: 7, move_bonus: -2, armor_bonus: 50, hit_bonus: -8 } },
    { score: 3, effects: { items_carried: 9, move_bonus: -2, armor_bonus: 40, hit_bonus: -7 } },
    { score: 4, effects: { items_carried: 11, move_bonus: -1, armor_bonus: 30, hit_bonus: -6 } },
    { score: 5, effects: { items_carried: 13, move_bonus: -1, armor_bonus: 20, hit_bonus: -5 } },
    { score: 6, effects: { items_carried: 15, move_bonus: 0, armor_bonus: 10, hit_bonus: -4 } },
    { score: 7, effects: { items_carried: 15, move_bonus: 0, armor_bonus: 0, hit_bonus: -3 } },
    { score: 8, effects: { items_carried: 16, move_bonus: 0, armor_bonus: 0, hit_bonus: -3 } },
    { score: 9, effects: { items_carried: 16, move_bonus: 0, armor_bonus: 0, hit_bonus: -3 } },
    { score: 10, effects: { items_carried: 17, move_bonus: 0, armor_bonus: 0, hit_bonus: -2 } },
    { score: 11, effects: { items_carried: 17, move_bonus: 0, armor_bonus: 0, hit_bonus: -2 } },
    { score: 12, effects: { items_carried: 17, move_bonus: 0, armor_bonus: 0, hit_bonus: -1 } },
    { score: 13, effects: { items_carried: 17, move_bonus: 0, armor_bonus: 0, hit_bonus: -1 } },
    { score: 14, effects: { items_carried: 17, move_bonus: 0, armor_bonus: 0, hit_bonus: 0 } },
    { score: 15, effects: { items_carried: 17, move_bonus: 0, armor_bonus: -10, hit_bonus: 0 } },
    { score: 16, effects: { items_carried: 18, move_bonus: 1, armor_bonus: -20, hit_bonus: 1 } },
    { score: 17, effects: { items_carried: 19, move_bonus: 2, armor_bonus: -30, hit_bonus: 1 } },
    { score: 18, effects: { items_carried: 20, move_bonus: 2, armor_bonus: -40, hit_bonus: 1 } },
    { score: 19, effects: { items_carried: 22, move_bonus: 3, armor_bonus: -50, hit_bonus: 2 } },
    { score: 20, effects: { items_carried: 24, move_bonus: 3, armor_bonus: -60, hit_bonus: 2 } },
    { score: 21, effects: { items_carried: 26, move_bonus: 4, armor_bonus: -70, hit_bonus: 2 } },
    { score: 22, effects: { items_carried: 28, move_bonus: 4, armor_bonus: -80, hit_bonus: 3 } },
    { score: 23, effects: { items_carried: 30, move_bonus: 4, armor_bonus: -80, hit_bonus: 3 } },
    { score: 24, effects: { items_carried: 35, move_bonus: 4, armor_bonus: -90, hit_bonus: 3 } },
    { score: 25, effects: { items_carried: 40, move_bonus: 5, armor_bonus: -100, hit_bonus: 4 } }
  ];

  const insertDexScore = db.prepare('INSERT INTO ability_scores (ability_id, score, effects) VALUES (?, ?, ?)');

  dexScores.forEach(item => {
    insertDexScore.run(4, item.score, JSON.stringify(item.effects));
  });

  insertDexScore.finalize(() => {
    console.log(`  ✓ Seeded ${dexScores.length} ability scores for Dexterity`);
    checkComplete();
  });

  // Seed ability scores for Constitution (ability_id = 5)
  const conScores = [
    { score: 0, effects: { hp_bonus: -4, critical_resist: 0, move_regen: 0 } },
    { score: 1, effects: { hp_bonus: -4, critical_resist: 0, move_regen: 0 } },
    { score: 2, effects: { hp_bonus: -3, critical_resist: 0, move_regen: 0 } },
    { score: 3, effects: { hp_bonus: -2, critical_resist: 0, move_regen: 0 } },
    { score: 4, effects: { hp_bonus: -1, critical_resist: 0, move_regen: 0 } },
    { score: 5, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 6, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 7, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 8, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 9, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 10, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 11, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 12, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 13, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 14, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 15, effects: { hp_bonus: 0, critical_resist: 0, move_regen: 0 } },
    { score: 16, effects: { hp_bonus: 1, critical_resist: 10, move_regen: 2 } },
    { score: 17, effects: { hp_bonus: 1, critical_resist: 15, move_regen: 3 } },
    { score: 18, effects: { hp_bonus: 2, critical_resist: 20, move_regen: 4 } },
    { score: 19, effects: { hp_bonus: 2, critical_resist: 25, move_regen: 5 } },
    { score: 20, effects: { hp_bonus: 3, critical_resist: 30, move_regen: 6 } },
    { score: 21, effects: { hp_bonus: 3, critical_resist: 35, move_regen: 7 } },
    { score: 22, effects: { hp_bonus: 4, critical_resist: 40, move_regen: 8 } },
    { score: 23, effects: { hp_bonus: 4, critical_resist: 50, move_regen: 9 } },
    { score: 24, effects: { hp_bonus: 5, critical_resist: 60, move_regen: 10 } },
    { score: 25, effects: { hp_bonus: 6, critical_resist: 75, move_regen: 12 } }
  ];

  const insertConScore = db.prepare('INSERT INTO ability_scores (ability_id, score, effects) VALUES (?, ?, ?)');

  conScores.forEach(item => {
    insertConScore.run(5, item.score, JSON.stringify(item.effects));
  });

  insertConScore.finalize(() => {
    console.log(`  ✓ Seeded ${conScores.length} ability scores for Constitution`);
    checkComplete();
  });

  // Seed ability scores for Charisma (ability_id = 6)
  // Note: Class-specific bonuses (Necromancer +10, Mage +5, Others 0) are applied in game logic
  // Necromancers also invert the total_levels_bonus (negative becomes positive)
  const chaScores = [
    { score: 0, effects: { total_levels_bonus: -12, mob_aggro: 90 } },
    { score: 1, effects: { total_levels_bonus: -11, mob_aggro: 75 } },
    { score: 2, effects: { total_levels_bonus: -10, mob_aggro: 60 } },
    { score: 3, effects: { total_levels_bonus: -9, mob_aggro: 45 } },
    { score: 4, effects: { total_levels_bonus: -8, mob_aggro: 30 } },
    { score: 5, effects: { total_levels_bonus: -7, mob_aggro: 25 } },
    { score: 6, effects: { total_levels_bonus: -6, mob_aggro: 20 } },
    { score: 7, effects: { total_levels_bonus: -5, mob_aggro: 15 } },
    { score: 8, effects: { total_levels_bonus: -4, mob_aggro: 10 } },
    { score: 9, effects: { total_levels_bonus: -3, mob_aggro: 5 } },
    { score: 10, effects: { total_levels_bonus: -2, mob_aggro: 0 } },
    { score: 11, effects: { total_levels_bonus: -1, mob_aggro: 0 } },
    { score: 12, effects: { total_levels_bonus: 0, mob_aggro: 0 } },
    { score: 13, effects: { total_levels_bonus: 1, mob_aggro: 0 } },
    { score: 14, effects: { total_levels_bonus: 3, mob_aggro: 0 } },
    { score: 15, effects: { total_levels_bonus: 5, mob_aggro: 0 } },
    { score: 16, effects: { total_levels_bonus: 6, mob_aggro: -5 } },
    { score: 17, effects: { total_levels_bonus: 7, mob_aggro: -10 } },
    { score: 18, effects: { total_levels_bonus: 8, mob_aggro: -15 } },
    { score: 19, effects: { total_levels_bonus: 9, mob_aggro: -20 } },
    { score: 20, effects: { total_levels_bonus: 10, mob_aggro: -25 } },
    { score: 21, effects: { total_levels_bonus: 11, mob_aggro: -30 } },
    { score: 22, effects: { total_levels_bonus: 12, mob_aggro: -45 } },
    { score: 23, effects: { total_levels_bonus: 13, mob_aggro: -60 } },
    { score: 24, effects: { total_levels_bonus: 14, mob_aggro: -70 } },
    { score: 25, effects: { total_levels_bonus: 15, mob_aggro: -85 } }
  ];

  const insertChaScore = db.prepare('INSERT INTO ability_scores (ability_id, score, effects) VALUES (?, ?, ?)');

  chaScores.forEach(item => {
    insertChaScore.run(6, item.score, JSON.stringify(item.effects));
  });

  insertChaScore.finalize(() => {
    console.log(`  ✓ Seeded ${chaScores.length} ability scores for Charisma`);
    seedItems();
  });
}

// Seed sample items with full metadata
function seedItems() {
  console.log('\n📦 Seeding Items...');

  // Helper to get IDs from reference tables
  function getItemTypeId(typeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM item_types WHERE name = ?', [typeName], (_err: any, row: any) => {
        if (row) resolve(row.id);
        else reject(new Error(`Type ${typeName} not found`));
      });
    });
  }

  function getMaterialId(materialName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM item_materials WHERE name = ?', [materialName], (_err: any, row: any) => {
        if (row) resolve(row.id);
        else reject(new Error(`Material ${materialName} not found`));
      });
    });
  }

  function getSizeId(sizeName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM item_sizes WHERE name = ?', [sizeName], (_err: any, row: any) => {
        if (row) resolve(row.id);
        else reject(new Error(`Size ${sizeName} not found`));
      });
    });
  }

  function getFlagId(flagName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM item_flags WHERE name = ?', [flagName], (_err: any, row: any) => {
        if (row) resolve(row.id);
        else reject(new Error(`Flag ${flagName} not found`));
      });
    });
  }

  function getWearLocationId(locationName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM wear_locations WHERE name = ?', [locationName], (_err: any, row: any) => {
        if (row) resolve(row.id);
        else reject(new Error(`Location ${locationName} not found`));
      });
    });
  }

  function getStatTypeId(statName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM stat_types WHERE name = ?', [statName], (_err: any, row: any) => {
        if (row) resolve(row.id);
        else reject(new Error(`Stat ${statName} not found`));
      });
    });
  }

  function getBindingTypeId(bindingName: string): Promise<number> {
    return new Promise((resolve, reject) => {
      db.get('SELECT id FROM item_bindings WHERE name = ?', [bindingName], (_err: any, row: any) => {
        if (row) resolve(row.id);
        else reject(new Error(`Binding ${bindingName} not found`));
      });
    });
  }

  // Seed the 6 example items
  async function seedExampleItems() {
    try {
      // 1. Quester's Ring
      const armorType = await getItemTypeId('ARMOR');
      const goldMaterial = await getMaterialId('gold');
      const specialSize = await getSizeId('special');

      db.run(
        `INSERT INTO items (id, name, type_id, material_id, min_level, size_id, weight, value, rent, identified, rawText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['questers-ring', "Quester's Ring", armorType, goldMaterial, 0, specialSize, 1, 0, 50, 1,
          "Name: 'Quester's Ring'\\nType: ARMOR, Material: gold\\nMin Level: 0, Size: special, Weight: 1\\nValue: 0, Rent: 50"]
      );

      // Add wear locations for ring
      const takeLoc = await getWearLocationId('TAKE');
      const fingerLoc = await getWearLocationId('FINGER');
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['questers-ring', takeLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['questers-ring', fingerLoc]);

      // Add flags
      const noDonateFlag = await getFlagId('!DONATE');
      const noSellFlag = await getFlagId('!SELL');
      const uniqueFlag = await getFlagId('UNIQUE');
      const unbreakableFlag = await getFlagId('UNBREAKABLE');
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['questers-ring', noDonateFlag]);
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['questers-ring', noSellFlag]);
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['questers-ring', uniqueFlag]);
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['questers-ring', unbreakableFlag]);

      // Add armor data
      db.run('INSERT INTO item_armor (item_id, armor_points) VALUES (?, ?)', ['questers-ring', 2]);

      // Add stat effects
      const maxhitStat = await getStatTypeId('MAXHIT');
      const hitrollStat = await getStatTypeId('HITROLL');
      db.run('INSERT INTO item_stat_effects (item_id, stat_type_id, modifier) VALUES (?, ?, ?)', ['questers-ring', maxhitStat, 1]);
      db.run('INSERT INTO item_stat_effects (item_id, stat_type_id, modifier) VALUES (?, ?, ?)', ['questers-ring', hitrollStat, 1]);

      // Add binding
      const boundBinding = await getBindingTypeId('BOUND');
      db.run('INSERT INTO item_binding_instances (item_id, binding_type_id, bound_to_character) VALUES (?, ?, ?)', ['questers-ring', boundBinding, 'pocket(869)']);

      // Add customization info
      db.run('INSERT INTO item_customizations (item_id, is_customizable) VALUES (?, ?)', ['questers-ring', 0]);

      // 2. Bread (FOOD)
      const foodType = await getItemTypeId('FOOD');
      const organicMaterial = await getMaterialId('organic');

      db.run(
        `INSERT INTO items (id, name, type_id, material_id, min_level, size_id, weight, value, rent, identified, rawText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['bread', 'a bread', foodType, organicMaterial, 0, specialSize, 1, 50, 2, 1,
          "Name: 'a bread'\\nType: FOOD, Material: organic\\nMin Level: 0, Size: special, Weight: 1\\nValue: 50, Rent: 2"]
      );

      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['bread', takeLoc]);
      db.run('INSERT INTO item_consumables (item_id, consumable_type, hunger_restored) VALUES (?, ?, ?)', ['bread', 'food', 4]);

      // 3. Silver Cutlass (WEAPON)
      const weaponType = await getItemTypeId('WEAPON');
      const silverMaterial = await getMaterialId('silver');
      const normalSize = await getSizeId('normal');

      db.run(
        `INSERT INTO items (id, name, type_id, material_id, min_level, size_id, weight, value, rent, identified, rawText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['silver-cutlass', 'a silver cutlass', weaponType, silverMaterial, 0, normalSize, 13, 1450, 125, 1,
          "Name: 'a silver cutlass'\\nType: WEAPON, Material: silver\\nMin Level: 0, Size: normal, Weight: 13\\nValue: 1450, Rent: 125"]
      );

      const wieldLoc = await getWearLocationId('WIELD');
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['silver-cutlass', takeLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['silver-cutlass', wieldLoc]);

      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['silver-cutlass', uniqueFlag]);
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['silver-cutlass', unbreakableFlag]);
      const mainHandFlag = await getFlagId('MAIN_HAND_WPN');
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['silver-cutlass', mainHandFlag]);

      db.run(
        'INSERT INTO item_weapons (item_id, damage_dice, average_damage, damage_type, weapon_skill, hand_requirement) VALUES (?, ?, ?, ?, ?, ?)',
        ['silver-cutlass', '2D4', 5.0, 'slash', 'slash attack', 'main-hand']
      );

      db.run('INSERT INTO item_stat_effects (item_id, stat_type_id, modifier) VALUES (?, ?, ?)', ['silver-cutlass', hitrollStat, 1]);

      const nonBindingBinding = await getBindingTypeId('NON-BINDING');
      db.run('INSERT INTO item_binding_instances (item_id, binding_type_id) VALUES (?, ?)', ['silver-cutlass', nonBindingBinding]);
      db.run('INSERT INTO item_customizations (item_id, is_customizable) VALUES (?, ?)', ['silver-cutlass', 0]);

      // 4. Lantern (LIGHT)
      const lightType = await getItemTypeId('LIGHT');
      const unknownMaterial = await getMaterialId('unknown');

      db.run(
        `INSERT INTO items (id, name, type_id, material_id, min_level, size_id, weight, value, rent, identified, rawText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['lantern', 'a lantern', lightType, unknownMaterial, 0, specialSize, 1, 50, 1, 1,
          "Name: 'a lantern'\\nType: LIGHT, Material: unknown\\nMin Level: 0, Size: special, Weight: 1\\nValue: 50, Rent: 1"]
      );

      // Multiple wear locations for lantern
      const bodyLoc = await getWearLocationId('BODY');
      const headLoc = await getWearLocationId('HEAD');
      const legsLoc = await getWearLocationId('LEGS');
      const armsLoc = await getWearLocationId('ARMS');
      const shieldLoc = await getWearLocationId('SHIELD');
      const aboutLoc = await getWearLocationId('ABOUT');
      const waistLoc = await getWearLocationId('WAIST');
      const wristLoc = await getWearLocationId('WRIST');

      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', takeLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', bodyLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', headLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', legsLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', armsLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', shieldLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', aboutLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', waistLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', wristLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['lantern', wieldLoc]);

      db.run('INSERT INTO item_lights (item_id, light_intensity, hours_remaining, max_hours) VALUES (?, ?, ?, ?)', ['lantern', 10, 64, 100]);
      db.run('INSERT INTO item_binding_instances (item_id, binding_type_id) VALUES (?, ?)', ['lantern', nonBindingBinding]);
      db.run('INSERT INTO item_customizations (item_id, is_customizable) VALUES (?, ?)', ['lantern', 0]);

      // 5. Scroll of Recall (SCROLL)
      const scrollType = await getItemTypeId('SCROLL');
      const paperMaterial = await getMaterialId('paper');

      db.run(
        `INSERT INTO items (id, name, type_id, material_id, min_level, size_id, weight, value, rent, identified, rawText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['scroll-recall', 'a scroll of recall', scrollType, paperMaterial, 0, specialSize, 4, 2800, 25, 1,
          "Name: 'a scroll of recall'\\nType: SCROLL, Material: paper\\nMin Level: 0, Size: special, Weight: 4\\nValue: 2800, Rent: 25"]
      );

      const holdLoc = await getWearLocationId('HOLD');
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['scroll-recall', takeLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['scroll-recall', holdLoc]);

      const magicFlag = await getFlagId('MAGIC');
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['scroll-recall', magicFlag]);

      db.run('INSERT INTO item_spell_effects (item_id, spell_name, spell_level) VALUES (?, ?, ?)', ['scroll-recall', 'word of recall', 12]);

      // 6. Quester's Medallion (ARMOR - NECK)
      db.run(
        `INSERT INTO items (id, name, type_id, material_id, min_level, size_id, weight, value, rent, identified, rawText)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['questers-medallion', "Quester's Medallion", armorType, goldMaterial, 0, specialSize, 3, 0, 50, 1,
          "Name: 'Quester's Medallion'\\nType: ARMOR, Material: gold\\nMin Level: 0, Size: special, Weight: 3\\nValue: 0, Rent: 50"]
      );

      const neckLoc = await getWearLocationId('NECK');
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['questers-medallion', takeLoc]);
      db.run('INSERT INTO item_wear_locations (item_id, location_id) VALUES (?, ?)', ['questers-medallion', neckLoc]);

      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['questers-medallion', noDonateFlag]);
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['questers-medallion', noSellFlag]);
      db.run('INSERT INTO item_flag_instances (item_id, flag_id) VALUES (?, ?)', ['questers-medallion', unbreakableFlag]);

      db.run('INSERT INTO item_armor (item_id, armor_points) VALUES (?, ?)', ['questers-medallion', 3]);

      db.run('INSERT INTO item_stat_effects (item_id, stat_type_id, modifier) VALUES (?, ?, ?)', ['questers-medallion', maxhitStat, 2]);
      db.run('INSERT INTO item_stat_effects (item_id, stat_type_id, modifier) VALUES (?, ?, ?)', ['questers-medallion', hitrollStat, 1]);

      db.run('INSERT INTO item_binding_instances (item_id, binding_type_id, bound_to_character) VALUES (?, ?, ?)', ['questers-medallion', boundBinding, 'pocket(869)']);
      db.run('INSERT INTO item_customizations (item_id, is_customizable) VALUES (?, ?)', ['questers-medallion', 0]);

      console.log('  ✓ Seeded 6 example items with full metadata');
      
      // Close database connection
      db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
          process.exit(1);
        } else {
          console.log('\n✅ Database seeding complete!');
          process.exit(0);
        }
      });
    } catch (error) {
      console.error('  ❌ Error seeding items:', error);
      process.exit(1);
    }
  }

  seedExampleItems();
}

// Handle errors
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
  process.exit(1);
});

