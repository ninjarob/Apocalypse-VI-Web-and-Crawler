import sqlite3 from 'sqlite3';
import path from 'path';
import { promisify } from 'util';

let db: sqlite3.Database | null = null;

export async function initDatabase(): Promise<sqlite3.Database> {
  if (db) return db;

  const dbPath = path.resolve(__dirname, '../../mud-data.db');
  
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        console.error('Failed to connect to database:', err);
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
  if (!db) throw new Error('Database not initialized');

  const run = promisify(db.run.bind(db));

  const tables = [
    // Rooms table
    `CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      exits TEXT,
      npcs TEXT,
      items TEXT,
      coordinates TEXT,
      area TEXT,
      visitCount INTEGER DEFAULT 0,
      firstVisited TEXT,
      lastVisited TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // NPCs table
    `CREATE TABLE IF NOT EXISTS npcs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      location TEXT,
      dialogue TEXT,
      hostile INTEGER DEFAULT 0,
      level INTEGER,
      race TEXT,
      class TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Items table
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT,
      location TEXT,
      properties TEXT,
      stats TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
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

    // Commands table
    `CREATE TABLE IF NOT EXISTS commands (
      name TEXT PRIMARY KEY,
      syntax TEXT,
      description TEXT,
      category TEXT,
      aliases TEXT,
      examples TEXT,
      parameters TEXT,
      successPatterns TEXT,
      failurePatterns TEXT,
      requirements TEXT,
      tested INTEGER DEFAULT 0,
      workingStatus TEXT,
      testResults TEXT,
      usageCount INTEGER DEFAULT 0,
      lastUsed TEXT,
      discovered TEXT,
      rawText TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
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
}

export function getDatabase(): sqlite3.Database {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    return new Promise((resolve, reject) => {
      db!.close((err) => {
        if (err) reject(err);
        else {
          db = null;
          console.log('✓ Database connection closed');
          resolve();
        }
      });
    });
  }
}
