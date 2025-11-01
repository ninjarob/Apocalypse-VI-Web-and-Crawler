// Shared TypeScript types across all projects

export interface RoomObject {
  id: number;
  room_id: number;
  name: string;
  description?: string;
  keywords?: string;
  is_interactive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RoomExit {
  id: number;
  from_room_id: number;
  to_room_id?: number;
  direction: string;
  description?: string;
  exit_description?: string;
  door_name?: string;
  door_description?: string;
  look_description?: string;
  is_door?: boolean;
  is_locked?: boolean;
  key_vnum?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Room {
  id: number;  // Changed from string to match database
  name: string;
  description: string;
  exits: Exit[];
  npcs: string[];
  items: string[];
  roomObjects?: RoomObject[];
  roomExits?: RoomExit[];
  coordinates?: { x: number; y: number; z: number };
  area?: string;
  visitCount: number;
  firstVisited?: Date;
  lastVisited?: Date;
  rawText?: string;
}

export interface Exit {
  direction: string;
  destination?: string;
  locked?: boolean;
  hidden?: boolean;
}

export interface NPC {
  id: number;  // Changed from string to match database
  name: string;
  description: string;
  location?: string;
  dialogue?: string[];
  hostile?: boolean;
  level?: number;
  race?: string;
  class?: string;
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Item {
  id: number;  // Changed from string to match database
  name: string;
  description: string;
  type?: string;
  location?: string;
  properties?: Record<string, any>;
  stats?: ItemStats;
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemStats {
  damage?: string;
  armor?: number;
  weight?: number;
  value?: number;
  level?: number;
}

export interface Spell {
  id: number;  // Changed from string to match database
  name: string;
  description: string;
  manaCost?: number;
  level?: number;
  type?: string;
  effects?: string[];
  rawText?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attack {
  id: number;  // Changed from string to match database
  name: string;
  description: string;
  damage?: string;
  type?: string;
  requirements?: string[];
  rawText?: string;
}

export interface PlayerAction {
  id: number;
  name: string;
  type: 'command' | 'social' | 'emote' | 'spell' | 'skill' | 'other';
  category?: string;
  description?: string;
  syntax?: string;
  examples?: string;
  requirements?: string;
  levelRequired?: number;
  relatedActions?: string;
  documented: boolean;
  discovered?: string;
  lastTested?: string;
  timesUsed: number;
  successCount: number;
  failCount: number;
  testResults?: Array<{
    command_result: string;
    tested_by_character: string;
    tested_at: string;
    character_class: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Abilities {
  id: number;
  name: string;
  short_name?: string;
  description: string;
}

export interface SavingThrow {
  id: number;
  name: string;
  description: string;
}

export interface SpellModifier {
  id: number;
  name: string;
  description: string;
}

export interface ElementalResistance {
  id: number;
  name: string;
  description: string;
}

export interface PhysicalResistance {
  id: number;
  name: string;
  description: string;
}

export interface Stats {
  rooms: number;
  npcs: number;
  items: number;
  spells: number;
  attacks: number;
  abilities?: number;
  races?: number;
  zones?: number;
  commands?: number;
  total: number;
}

export interface CrawlerStatus {
  status: string;
  timestamp: Date;
  roomsDiscovered: number;
  npcsDiscovered: number;
  itemsDiscovered: number;
}

export interface Race {
  id: number;  // Changed from string to match database
  name: string;
  description?: string;
  stats?: Record<string, any>;
  abilities?: string[];
  requirements?: string[];
  helpText?: string;
  discovered?: string;
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  stats?: Record<string, any>;
  abilities?: string[];
  requirements?: string[];
  startingEquipment?: string[];
  helpText?: string;
  discovered?: Date;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  type?: string;
  requirements?: string[];
  effects?: string[];
  manaCost?: number;
  cooldown?: number;
  helpText?: string;
  discovered?: Date;
}

export interface CommandKnowledge {
  command: string;           // Base command (e.g., "look", "examine")
  variations: string[];       // Tested variations (e.g., ["look", "look north", "look at fountain"])
  successCount: number;       // How many times it worked
  failureCount: number;       // How many times it failed
  lastUsed: Date;            // When it was last used
  context: string;           // Where/when it's useful (e.g., "exploration", "combat", "inventory")
}

export interface CrawlerState {
  currentRoom: string;
  visitedRooms: Set<string>;
  commandHistory: string[];
  lastAction: string;
  timestamp: Date;
  explorationMode: 'breadth' | 'depth' | 'random';
  knownCommands: Map<string, CommandKnowledge>;  // Track discovered commands
  contextualActions: Set<string>;  // Actions that should be repeated in certain contexts
}

export interface ParsedResponse {
  type: 'room' | 'npc' | 'item' | 'combat' | 'dialogue' | 'error' | 'unknown';
  data: any;
  rawText: string;
}

export interface CrawlerConfig {
  mudHost: string;
  mudPort: number;
  username: string;
  password: string;
  aiProvider: 'openai' | 'anthropic';
  aiApiKey: string;
  maxActionsPerSession?: number;
  delayBetweenActions?: number;
}

export interface Lore {
  id: string;
  type: 'history' | 'myth' | 'prophecy' | 'current-events';
  content: string;
  significance: number; // 1-10
  relatedEntities?: string[];
  source?: string;
  verified?: boolean;
  tags?: string[];
  rawText?: string;
}

export interface Faction {
  id: string;
  name: string;
  type: 'guild' | 'kingdom' | 'clan' | 'order' | 'organization' | 'unknown';
  description?: string;
  alignment: 'good' | 'evil' | 'neutral' | 'unknown';
  leader?: string;
  headquarters?: string;
  memberRequirements?: string[];
  benefits?: string[];
  relationships?: Array<{
    factionId: string;
    factionName: string;
    type: 'ally' | 'enemy' | 'neutral' | 'rival' | 'trade-partner';
    strength: number; // -10 to +10
  }>;
  knownMembers?: string[];
  rawText?: string;
}

export interface Quest {
  id: string;
  name?: string;
  objective: string;
  questGiver?: string;
  location?: string;
  status: 'discovered' | 'active' | 'completed' | 'failed' | 'abandoned';
  steps?: Array<{
    description: string;
    completed: boolean;
    order: number;
  }>;
  rewards?: {
    experience?: number;
    gold?: number;
    items?: string[];
    other?: string[];
  };
  requirements?: {
    level?: number;
    items?: string[];
    previousQuests?: string[];
  };
  category?: string;
  partOfChain?: boolean;
  chainId?: string;
  relatedQuests?: string[];
  rawText?: string;
}

export interface Region {
  id: string;
  name: string;
  description?: string;
  type: 'city' | 'wilderness' | 'dungeon' | 'castle' | 'village' | 'other';
  levelRange?: {
    min?: number;
    max?: number;
  };
  climate?: string;
  features?: string[];
  dangers?: string[];
  connectedRegions?: Array<{
    regionId: string;
    regionName: string;
    pathDescription?: string;
  }>;
  rooms?: string[];
  dominantFaction?: string;
  resources?: string[];
  rawText?: string;
}

export interface Relationship {
  id: string;
  entity1: {
    id?: string;
    name: string;
    entityType: 'npc' | 'faction' | 'player';
  };
  entity2: {
    id?: string;
    name: string;
    entityType: 'npc' | 'faction' | 'player';
  };
  relationshipType: 'family' | 'friend' | 'enemy' | 'rival' | 'lover' | 'master-servant' | 'ally' | 'neutral' | 'other';
  description?: string;
  strength?: number; // -10 to +10
  mutual?: boolean;
  notes?: string[];
  rawText?: string;
}

export interface HelpEntry {
  id: number;
  name: string;
  variations?: string[];
  helpText: string;
  createdAt?: string;
  updatedAt?: string;
}
