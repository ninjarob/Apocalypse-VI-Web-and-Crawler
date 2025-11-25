import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';

// Handle both CommonJS (__dirname) and dev mode (tsx) environments
const getDatabasePath = () => {
  // Option 1: Use environment variable if set
  if (process.env.DB_PATH) {
    return process.env.DB_PATH;
  }

  // Option 2: Use __dirname if available (compiled code)
  if (typeof __dirname !== 'undefined') {
    // When compiled: dist/src/database.js -> ../../../data/mud-data.db
    return path.resolve(__dirname, '../../../data/mud-data.db');
  }

  // Option 3: Search upwards from cwd to find data directory
  let currentDir = process.cwd();
  for (let i = 0; i < 3; i++) {
    const testPath = path.join(currentDir, 'data', 'mud-data.db');
    if (fs.existsSync(testPath)) {
      return testPath;
    }
    currentDir = path.dirname(currentDir);
  }

  // Fallback: assume data is one level up from backend
  return path.join(process.cwd(), '..', 'data', 'mud-data.db');
};

let db: sqlite3.Database | null = null;

export async function initDatabase(): Promise<sqlite3.Database> {
  if (db) {return db;}

  // Database location: data/mud-data.db (at project root level)
  const dbPath = getDatabasePath();

  console.log(`[Database] Attempting to connect to: ${dbPath}`);

  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Failed to connect to database:', err);
        console.error('Database path was:', dbPath);
        reject(err);
      } else {
        console.log(`✓ Connected to SQLite database at ${dbPath}`);
        try {
          await createTables();
          resolve(db!);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

async function createTables() {
  if (!db) {throw new Error('Database not initialized');}

  const run = promisify(db.run.bind(db));

  const tables = [
    // Rooms table
    `CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER,
      vnum INTEGER UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      exits TEXT,
      npcs TEXT,
      items TEXT,
      area TEXT,
      flags TEXT,
      terrain TEXT,
      portal_key TEXT,
      greater_binding_key TEXT,
      zone_exit INTEGER DEFAULT 0,
      visitCount INTEGER DEFAULT 0,
      firstVisited TEXT,
      lastVisited TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
    )`,

    // ===== NPC SYSTEM TABLES =====
    
    // NPCs table (Main Table)
    `CREATE TABLE IF NOT EXISTS npcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_desc TEXT,
      long_desc TEXT,
      description TEXT,
      location TEXT,
      room_id INTEGER,
      zone_id INTEGER,
      
      -- Stats
      hp_max INTEGER,
      mana_max INTEGER,
      moves_max INTEGER,
      level INTEGER,
      experience_to_next_level INTEGER,
      alignment INTEGER,
      
      -- Combat Stats
      attacks_per_round REAL,
      hit_ability INTEGER,
      damage_ability INTEGER,
      magic_ability INTEGER,
      armor_class INTEGER,
      
      -- Character Info
      race TEXT,
      class TEXT,
      gender TEXT,
      
      -- Wealth
      gold INTEGER DEFAULT 0,
      
      -- Behavior
      is_stationary INTEGER DEFAULT 1,
      is_aggressive INTEGER DEFAULT 0,
      aggro_level TEXT,
      
      -- Visibility
      is_invisible INTEGER DEFAULT 0,
      is_cloaked INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      
      -- Position (universal character state)
      position TEXT DEFAULT 'standing',
      
      -- Data Collection Info
      has_been_charmed INTEGER DEFAULT 0,
      has_been_considered INTEGER DEFAULT 0,
      has_been_examined INTEGER DEFAULT 0,
      has_reported_stats INTEGER DEFAULT 0,
      has_been_in_group INTEGER DEFAULT 0,
      
      -- Metadata
      discovered INTEGER DEFAULT 0,
      rawText TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
      FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE SET NULL
    )`,
    
    // NPC Flags (Reference Table)
    `CREATE TABLE IF NOT EXISTS npc_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      category TEXT
    )`,
    
    // NPC Flag Instances (Junction Table)
    `CREATE TABLE IF NOT EXISTS npc_flag_instances (
      npc_id INTEGER NOT NULL,
      flag_id INTEGER NOT NULL,
      active INTEGER DEFAULT 1,
      PRIMARY KEY (npc_id, flag_id),
      FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
      FOREIGN KEY (flag_id) REFERENCES npc_flags(id)
    )`,
    
    // NPC Equipment (Templates - defines default equipment placement)
    `CREATE TABLE IF NOT EXISTS npc_equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      wear_location_id INTEGER NOT NULL,
      quantity INTEGER DEFAULT 1,
      FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (wear_location_id) REFERENCES wear_locations(id)
    )`,
    
    // NPC Spells/Skills
    `CREATE TABLE IF NOT EXISTS npc_spells (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id INTEGER NOT NULL,
      spell_name TEXT NOT NULL,
      spell_type TEXT,
      mana_cost INTEGER,
      observed_count INTEGER DEFAULT 1,
      last_observed TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE
    )`,
    
    // NPC Dialogue
    `CREATE TABLE IF NOT EXISTS npc_dialogue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id INTEGER NOT NULL,
      dialogue_text TEXT NOT NULL,
      dialogue_type TEXT,
      trigger_keyword TEXT,
      context TEXT,
      recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE
    )`,
    
    // NPC Paths (Movement Patterns)
    `CREATE TABLE IF NOT EXISTS npc_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      sequence_order INTEGER NOT NULL,
      direction_from_previous TEXT,
      wait_time_seconds INTEGER,
      notes TEXT,
      FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )`,
    
    // NPC Spawn Info
    `CREATE TABLE IF NOT EXISTS npc_spawn_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      npc_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      spawn_rate_minutes INTEGER,
      max_instances INTEGER DEFAULT 1,
      last_observed_spawn TEXT,
      spawn_conditions TEXT,
      FOREIGN KEY (npc_id) REFERENCES npcs(id) ON DELETE CASCADE,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )`,

    // ===== ITEM SYSTEM TABLES =====
    
    // Item Types (Reference Table)
    `CREATE TABLE IF NOT EXISTS item_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    )`,

    // Item Materials (Reference Table)
    `CREATE TABLE IF NOT EXISTS item_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    )`,

    // Item Sizes (Reference Table)
    `CREATE TABLE IF NOT EXISTS item_sizes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      size_modifier INTEGER
    )`,

    // Item Flags (Reference Table)
    `CREATE TABLE IF NOT EXISTS item_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      flag_type TEXT
    )`,

    // Wear Locations (Reference Table)
    `CREATE TABLE IF NOT EXISTS wear_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      slot_limit INTEGER DEFAULT 1
    )`,

    // Stat Types (Reference Table)
    `CREATE TABLE IF NOT EXISTS stat_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      stat_category TEXT
    )`,

    // Item Bindings (Reference Table)
    `CREATE TABLE IF NOT EXISTS item_bindings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    )`,

    // Items (Main Table)
    `CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    )`,

    // Item Flag Instances (Junction Table)
    `CREATE TABLE IF NOT EXISTS item_flag_instances (
      item_id INTEGER NOT NULL,
      flag_id INTEGER NOT NULL,
      PRIMARY KEY (item_id, flag_id),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (flag_id) REFERENCES item_flags(id)
    )`,

    // Item Wear Locations (Junction Table)
    `CREATE TABLE IF NOT EXISTS item_wear_locations (
      item_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      PRIMARY KEY (item_id, location_id),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES wear_locations(id)
    )`,

    // Item Stat Effects (Junction Table)
    `CREATE TABLE IF NOT EXISTS item_stat_effects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      stat_type_id INTEGER NOT NULL,
      modifier INTEGER NOT NULL,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (stat_type_id) REFERENCES stat_types(id)
    )`,

    // Item Binding Instances
    `CREATE TABLE IF NOT EXISTS item_binding_instances (
      item_id INTEGER PRIMARY KEY,
      binding_type_id INTEGER NOT NULL,
      bound_to_character TEXT,
      bound_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (binding_type_id) REFERENCES item_bindings(id)
    )`,

    // Item Restrictions (Class/Race)
    `CREATE TABLE IF NOT EXISTS item_restrictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      restriction_type TEXT NOT NULL,
      restriction_value TEXT NOT NULL,
      is_allowed INTEGER DEFAULT 1,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Weapons (Type-Specific)
    `CREATE TABLE IF NOT EXISTS item_weapons (
      item_id INTEGER PRIMARY KEY,
      damage_dice TEXT,
      average_damage REAL,
      damage_type TEXT,
      weapon_skill TEXT,
      hand_requirement TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Armor (Type-Specific)
    `CREATE TABLE IF NOT EXISTS item_armor (
      item_id INTEGER PRIMARY KEY,
      armor_points INTEGER,
      armor_type TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Lights (Type-Specific)
    `CREATE TABLE IF NOT EXISTS item_lights (
      item_id INTEGER PRIMARY KEY,
      light_intensity INTEGER,
      hours_remaining INTEGER,
      max_hours INTEGER,
      refillable INTEGER DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Containers (Type-Specific)
    `CREATE TABLE IF NOT EXISTS item_containers (
      item_id INTEGER PRIMARY KEY,
      max_weight INTEGER,
      max_items INTEGER,
      container_flags TEXT,
      key_vnum INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Consumables (Type-Specific)
    `CREATE TABLE IF NOT EXISTS item_consumables (
      item_id INTEGER PRIMARY KEY,
      consumable_type TEXT,
      hunger_restored INTEGER,
      thirst_restored INTEGER,
      duration_hours INTEGER,
      poisoned INTEGER DEFAULT 0,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Spell Effects
    `CREATE TABLE IF NOT EXISTS item_spell_effects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      spell_name TEXT NOT NULL,
      spell_level INTEGER,
      charges_current INTEGER,
      charges_max INTEGER,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Granted Abilities
    `CREATE TABLE IF NOT EXISTS item_granted_abilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      ability_name TEXT NOT NULL,
      ability_description TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Item Customizations
    `CREATE TABLE IF NOT EXISTS item_customizations (
      item_id INTEGER PRIMARY KEY,
      is_customizable INTEGER DEFAULT 1,
      custom_name TEXT,
      custom_description TEXT,
      customized_by TEXT,
      customized_at TEXT,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )`,

    // Spells table
    `CREATE TABLE IF NOT EXISTS spells (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      manaCost INTEGER,
      level INTEGER,
      type TEXT,
      effects TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Attacks table
    `CREATE TABLE IF NOT EXISTS attacks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      damage TEXT,
      type TEXT,
      requirements TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Player Actions table
    `CREATE TABLE IF NOT EXISTS player_actions (
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
      discovered TEXT,
      lastTested TEXT,
      timesUsed INTEGER DEFAULT 0,
      successCount INTEGER DEFAULT 0,
      failCount INTEGER DEFAULT 0,
      testResults TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Races table
    `CREATE TABLE IF NOT EXISTS races (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      stats TEXT,
      abilities TEXT,
      requirements TEXT,
      helpText TEXT,
      discovered TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Classes table
    `CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      class_group_id INTEGER,
      description TEXT,
      alignment_requirement TEXT,
      hp_regen INTEGER,
      mana_regen INTEGER,
      move_regen INTEGER,
      special_notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_group_id) REFERENCES class_groups(id)
    )`,

    // Class Groups table
    `CREATE TABLE IF NOT EXISTS class_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Class Proficiencies table
    `CREATE TABLE IF NOT EXISTS class_proficiencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      level_required INTEGER NOT NULL,
      is_skill INTEGER DEFAULT 0,
      prerequisite_id INTEGER,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (prerequisite_id) REFERENCES class_proficiencies(id)
    )`,

    // Class Perks table
    `CREATE TABLE IF NOT EXISTS class_perks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      description TEXT,
      effect TEXT,
      is_unique INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Class Perk Availability table
    `CREATE TABLE IF NOT EXISTS class_perk_availability (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER NOT NULL,
      perk_id INTEGER NOT NULL,
      min_level INTEGER,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (perk_id) REFERENCES class_perks(id)
    )`,

    // Skills table
    `CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      type TEXT,
      requirements TEXT,
      effects TEXT,
      manaCost INTEGER,
      cooldown INTEGER,
      helpText TEXT,
      discovered TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Abilities table
    `CREATE TABLE IF NOT EXISTS abilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      short_name TEXT,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Ability Scores table
    `CREATE TABLE IF NOT EXISTS ability_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ability_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      effects TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ability_id) REFERENCES abilities(id)
    )`,

    // Saving Throws table
    `CREATE TABLE IF NOT EXISTS saving_throws (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Spell Modifiers table
    `CREATE TABLE IF NOT EXISTS spell_modifiers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Elemental Resistances table
    `CREATE TABLE IF NOT EXISTS elemental_resistances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Physical Resistances table
    `CREATE TABLE IF NOT EXISTS physical_resistances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Zones table
    `CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      alias TEXT,
      description TEXT,
      author TEXT,
      difficulty INTEGER,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Zone Areas table
    `CREATE TABLE IF NOT EXISTS zone_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      min_level INTEGER,
      max_level INTEGER,
      recommended_class TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES zones(id)
    )`,

    // Zone Connections table
    `CREATE TABLE IF NOT EXISTS zone_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id INTEGER NOT NULL,
      connected_zone_id INTEGER NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (zone_id) REFERENCES zones(id),
      FOREIGN KEY (connected_zone_id) REFERENCES zones(id)
    )`,

    // Room Exits table
    `CREATE TABLE IF NOT EXISTS room_exits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_room_id TEXT NOT NULL,
      to_room_id TEXT,
      direction TEXT NOT NULL,
      description TEXT,
      exit_description TEXT,
      look_description TEXT,
      door_name TEXT,
      door_description TEXT,
      is_door INTEGER DEFAULT 0,
      is_locked INTEGER DEFAULT 0,
      is_zone_exit INTEGER DEFAULT 0,
      key_vnum INTEGER,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (to_room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      UNIQUE(from_room_id, direction)
    )`,

    // Crawler status table
    `CREATE TABLE IF NOT EXISTS crawler_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT,
      timestamp TEXT,
      roomsDiscovered INTEGER,
      npcsDiscovered INTEGER,
      itemsDiscovered INTEGER,
      commandsDiscovered INTEGER,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Lore table
    `CREATE TABLE IF NOT EXISTS lore (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      significance INTEGER DEFAULT 5,
      relatedEntities TEXT,
      source TEXT,
      verified INTEGER DEFAULT 0,
      tags TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Factions table
    `CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'unknown',
      description TEXT,
      alignment TEXT DEFAULT 'unknown',
      leader TEXT,
      headquarters TEXT,
      memberRequirements TEXT,
      benefits TEXT,
      relationships TEXT,
      knownMembers TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Quests table
    `CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY,
      name TEXT,
      objective TEXT NOT NULL,
      questGiver TEXT,
      location TEXT,
      status TEXT DEFAULT 'discovered',
      steps TEXT,
      rewards TEXT,
      requirements TEXT,
      category TEXT,
      partOfChain INTEGER DEFAULT 0,
      chainId TEXT,
      relatedQuests TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Regions table
    `CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT,
      levelRange TEXT,
      climate TEXT,
      features TEXT,
      dangers TEXT,
      connectedRegions TEXT,
      rooms TEXT,
      dominantFaction TEXT,
      resources TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Relationships table
    `CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      entity1 TEXT NOT NULL,
      entity2 TEXT NOT NULL,
      relationshipType TEXT NOT NULL,
      description TEXT,
      strength INTEGER,
      mutual INTEGER DEFAULT 0,
      notes TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  for (const sql of tables) {
    await run(sql);
  }

  console.log('✓ Database tables created/verified');

  // Seed reference tables with initial data
  await seedReferenceTablesIfEmpty();
}



async function seedReferenceTablesIfEmpty(): Promise<void> {
  if (!db) return;

  const run = (sql: string, params: any[] = []): Promise<void> => {
    return new Promise((resolve, reject) => {
      db!.run(sql, params, (err: Error | null) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  const get = (sql: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
      db!.get(sql, params, (err: Error | null, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  // Check if reference tables are empty and seed them
  
  // Seed item_types
  const typeCount: any = await get('SELECT COUNT(*) as count FROM item_types');
  if (typeCount.count === 0) {
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
    for (const [name, desc] of itemTypes) {
      await run('INSERT INTO item_types (name, description) VALUES (?, ?)', [name, desc]);
    }
    console.log('✓ Seeded item_types');
  }

  // Seed item_materials
  const materialCount: any = await get('SELECT COUNT(*) as count FROM item_materials');
  if (materialCount.count === 0) {
    const materials = ['gold', 'silver', 'iron', 'steel', 'bronze', 'copper', 'leather', 
                       'cloth', 'wood', 'stone', 'bone', 'glass', 'paper', 'organic', 
                       'magical', 'adamantite', 'mithril', 'dragonscale', 'unknown'];
    for (const material of materials) {
      await run('INSERT INTO item_materials (name) VALUES (?)', [material]);
    }
    console.log('✓ Seeded item_materials');
  }

  // Seed item_sizes
  const sizeCount: any = await get('SELECT COUNT(*) as count FROM item_sizes');
  if (sizeCount.count === 0) {
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
    for (const [name, modifier] of sizes) {
      await run('INSERT INTO item_sizes (name, size_modifier) VALUES (?, ?)', [name, modifier]);
    }
    console.log('✓ Seeded item_sizes');
  }

  // Seed item_flags
  const flagCount: any = await get('SELECT COUNT(*) as count FROM item_flags');
  if (flagCount.count === 0) {
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
    for (const [name, desc, type] of flags) {
      await run('INSERT INTO item_flags (name, description, flag_type) VALUES (?, ?, ?)', [name, desc, type]);
    }
    console.log('✓ Seeded item_flags');
  }

  // Seed wear_locations
  const locationCount: any = await get('SELECT COUNT(*) as count FROM wear_locations');
  if (locationCount.count === 0) {
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
    for (const [name, desc, limit] of locations) {
      await run('INSERT INTO wear_locations (name, description, slot_limit) VALUES (?, ?, ?)', [name, desc, limit]);
    }
    console.log('✓ Seeded wear_locations');
  }

  // Seed stat_types
  const statCount: any = await get('SELECT COUNT(*) as count FROM stat_types');
  if (statCount.count === 0) {
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
    for (const [name, desc, category] of stats) {
      await run('INSERT INTO stat_types (name, description, stat_category) VALUES (?, ?, ?)', [name, desc, category]);
    }
    console.log('✓ Seeded stat_types');
  }

  // Seed item_bindings
  const bindingCount: any = await get('SELECT COUNT(*) as count FROM item_bindings');
  if (bindingCount.count === 0) {
    const bindings = [
      ['NON-BINDING', 'Item can be freely traded'],
      ['BIND_ON_PICKUP', 'Binds when picked up'],
      ['BIND_ON_EQUIP', 'Binds when equipped'],
      ['BOUND', 'Already bound to a character']
    ];
    for (const [name, desc] of bindings) {
      await run('INSERT INTO item_bindings (name, description) VALUES (?, ?)', [name, desc]);
    }
    console.log('✓ Seeded item_bindings');
  }
}

export function getDatabase(): sqlite3.Database {
  if (!db) {throw new Error('Database not initialized. Call initDatabase() first.');}
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    return new Promise((resolve, reject) => {
      db!.close((err) => {
        if (err) {reject(err);}
        else {
          db = null;
          console.log('✓ Database connection closed');
          resolve();
        }
      });
    });
  }
}
