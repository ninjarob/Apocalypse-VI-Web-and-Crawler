import axios from 'axios';
import type {
  Room,
  NPC,
  Item,
  Spell,
  Race,
  Abilities,
  SavingThrow,
  SpellModifier,
  ElementalResistance,
  PhysicalResistance,
  Stats,
  CrawlerStatus
} from '@shared/types';

const API_BASE = '/api';

// Re-export types for convenience
export type {
  Room,
  NPC,
  Item,
  Spell,
  Race,
  Abilities,
  SavingThrow,
  SpellModifier,
  ElementalResistance,
  PhysicalResistance,
  Stats,
  CrawlerStatus
};

export const api = {
  // Generic entity methods
  async getAll<T>(endpoint: string, filters?: Record<string, any>): Promise<T[]> {
    let url = `${API_BASE}/${endpoint}`;
    if (filters) {
      const queryParams = Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      if (queryParams) {
        url += `?${queryParams}`;
      }
    }
    const response = await axios.get<T[]>(url);
    return response.data;
  },

  async getById<T>(endpoint: string, id: string | number): Promise<T> {
    const response = await axios.get<T>(`${API_BASE}/${endpoint}/${id}`);
    return response.data;
  },

  async create<T>(endpoint: string, data: Partial<T>): Promise<T> {
    const response = await axios.post<T>(`${API_BASE}/${endpoint}`, data);
    return response.data;
  },

  async update<T>(endpoint: string, id: string | number, data: Partial<T>): Promise<T> {
    const response = await axios.put<T>(`${API_BASE}/${endpoint}/${id}`, data);
    return response.data;
  },

  async delete(endpoint: string, id: string | number): Promise<void> {
    await axios.delete(`${API_BASE}/${endpoint}/${id}`);
  },

  // Legacy generic methods (kept for backwards compatibility)
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

  deleteRaw: async (path: string): Promise<any> => {
    const response = await axios.delete(`${API_BASE}${path}`);
    return response.data;
  },

  // Stats
  getStats: async (): Promise<Stats> => {
    const response = await axios.get<Stats>(`${API_BASE}/stats`);
    return response.data;
  },

  // Crawler Status
  getCrawlerStatus: async (): Promise<CrawlerStatus> => {
    const response = await axios.get<CrawlerStatus>(`${API_BASE}/crawler/status`);
    return response.data;
  }
};
