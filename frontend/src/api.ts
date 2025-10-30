import axios from 'axios';

const API_BASE = '/api';

export interface Room {
  id: number;
  name: string;
  description: string;
  exits: Array<{ direction: string; destination?: string }>;
  npcs: string[];
  items: string[];
  visitCount: number;
  coordinates?: { x: number; y: number; z: number };
}

export interface NPC {
  id: number;
  name: string;
  description: string;
  location?: string;
  hostile?: boolean;
  level?: number;
  race?: string;
  class?: string;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  type?: string;
  stats?: {
    damage?: string;
    armor?: number;
    weight?: number;
    value?: number;
  };
}

export interface Spell {
  id: number;
  name: string;
  description: string;
  manaCost?: number;
  level?: number;
  type?: string;
}

export interface Command {
  id: number;
  name: string;
  category: string;
  description: string;
  syntax?: string;
  workingStatus: string;
  tested: boolean;
  aliases?: string[];
  examples?: string[];
  testResults?: Array<{
    input: string;
    output: string;
    success: boolean;
    timestamp: Date;
  }>;
  usageCount?: number;
  lastUsed?: Date;
  createdAt?: Date;
}

export interface Race {
  id: number;
  name: string;
  description?: string;
  stats?: Record<string, any>;
  abilities?: string[];
  requirements?: string[];
  helpText?: string;
  discovered?: string;
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
  commands: number;
  total: number;
}

export interface CrawlerStatus {
  status: string;
  timestamp: Date;
  roomsDiscovered: number;
  npcsDiscovered: number;
  itemsDiscovered: number;
}

export const api = {
  // Generic entity methods (for future use)
  get: async (path: string): Promise<any> => {
    const response = await axios.get(`${API_BASE}${path}`);
    return response.data;
  },

  post: async (path: string, data: any): Promise<any> => {
    const response = await axios.post(`${API_BASE}${path}`, data);
    return response.data;
  },

  put: async (path: string, data: any): Promise<any> => {
    const response = await axios.put(`${API_BASE}${path}`, data);
    return response.data;
  },

  delete: async (path: string): Promise<any> => {
    const response = await axios.delete(`${API_BASE}${path}`);
    return response.data;
  },

  // Stats
  getStats: async (): Promise<Stats> => {
    const response = await axios.get(`${API_BASE}/stats`);
    return response.data;
  },

  // Crawler Status
  getCrawlerStatus: async (): Promise<CrawlerStatus> => {
    const response = await axios.get(`${API_BASE}/crawler/status`);
    return response.data;
  }
};
