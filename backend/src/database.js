const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = process.env.DB_FILE || './mud_data.db';

// Create database connection
const db = new sqlite3.Database(DB_FILE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✓ Connected to SQLite database');
    initializeTables();
  }
});

// Initialize database tables
function initializeTables() {
  // Rooms table
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    exits TEXT,
    npcs TEXT,
    items TEXT,
    coordinates TEXT,
    area TEXT,
    visitCount INTEGER DEFAULT 0,
    firstVisited DATETIME,
    lastVisited DATETIME,
    rawText TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // NPCs table
  db.run(`CREATE TABLE IF NOT EXISTS npcs (
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

  // Items table
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    location TEXT,
    properties TEXT,
    stats TEXT,
    rawText TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Spells table
  db.run(`CREATE TABLE IF NOT EXISTS spells (
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
  db.run(`CREATE TABLE IF NOT EXISTS attacks (
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

  // Commands table - Document all MUD commands discovered
  db.run(`CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    description TEXT,
    syntax TEXT,
    examples TEXT,
    requirements TEXT,
    levelRequired INTEGER,
    relatedCommands TEXT,
    documented INTEGER DEFAULT 0,
    rawHelpText TEXT,
    discovered DATETIME,
    lastTested DATETIME,
    timesUsed INTEGER DEFAULT 0,
    successCount INTEGER DEFAULT 0,
    failCount INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Command usage log - Track what commands AI tries with context
  db.run(`CREATE TABLE IF NOT EXISTS command_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commandName TEXT NOT NULL,
    fullCommand TEXT,
    roomLocation TEXT,
    context TEXT,
    success INTEGER,
    response TEXT,
    errorMessage TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (commandName) REFERENCES commands(name)
  )`);

  // Exploration queue - Commands/areas AI wants to explore
  db.run(`CREATE TABLE IF NOT EXISTS exploration_queue (
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

  // Crawler status table
  db.run(`CREATE TABLE IF NOT EXISTS crawler_status (
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

  // Races table - Playable races in the game
  db.run(`CREATE TABLE IF NOT EXISTS races (
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

  // Classes table - Playable classes in the game
  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    stats TEXT,
    abilities TEXT,
    requirements TEXT,
    startingEquipment TEXT,
    helpText TEXT,
    discovered DATETIME,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Skills table - Skills/abilities in the game
  db.run(`CREATE TABLE IF NOT EXISTS skills (
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

  // Abilities table - Simple abilities/powers
  db.run(`CREATE TABLE IF NOT EXISTS abilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    short_name TEXT,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Ability Scores table - Maps score values to effects for each ability
  db.run(`CREATE TABLE IF NOT EXISTS ability_scores (
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
  db.run(`CREATE TABLE IF NOT EXISTS saving_throws (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Spell Modifiers table
  db.run(`CREATE TABLE IF NOT EXISTS spell_modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Elemental Resistances table
  db.run(`CREATE TABLE IF NOT EXISTS elemental_resistances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Physical Resistances table
  db.run(`CREATE TABLE IF NOT EXISTS physical_resistances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating tables:', err.message);
    } else {
      console.log('✓ Database tables ready');
    }
  });
}

// Helper function to serialize arrays/objects to JSON
function serialize(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

// Helper function to deserialize JSON to arrays/objects
function deserialize(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
}

module.exports = { db, serialize, deserialize };
