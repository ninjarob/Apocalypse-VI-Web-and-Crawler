import axios from 'axios';
import { Room, NPC, Item, Spell, Attack, Lore, Faction, Quest, Region, Relationship } from '../../shared/types';
import logger from './logger';

export class BackendAPI {
  private baseUrl: string;
  private backendAvailable: boolean = true;
  private lastWarningTime: number = 0;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private logBackendError(context: string, error: any): void {
    // Only log connection errors once every 5 minutes to avoid spam
    if (error.code === 'ECONNREFUSED' && !this.backendAvailable) {
      const now = Date.now();
      if (now - this.lastWarningTime > 300000) { // 5 minutes
        logger.warn('Backend API not available (will retry silently)');
        this.lastWarningTime = now;
      }
      return;
    }
    
    if (error.code === 'ECONNREFUSED') {
      this.backendAvailable = false;
      this.lastWarningTime = Date.now();
      logger.warn('Backend API not available - continuing without database');
    } else {
      logger.error(`Failed to ${context}:`, error.message);
    }
  }

  async saveRoom(room: Partial<Room>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/rooms`, room);
      logger.info(`Saved room: ${room.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save room', error);
    }
  }

  async saveNPC(npc: Partial<NPC>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/npcs`, npc);
      logger.info(`Saved NPC: ${npc.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save NPC', error);
    }
  }

  async saveItem(item: Partial<Item>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/items`, item);
      logger.info(`Saved item: ${item.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save item', error);
    }
  }

  async saveSpell(spell: Partial<Spell>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/spells`, spell);
      logger.info(`Saved spell: ${spell.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save spell', error);
    }
  }

  async getRoomByName(name: string): Promise<Room | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/rooms/by-name/${encodeURIComponent(name)}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getAllRooms(): Promise<Room[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/rooms`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError('get rooms', error);
      return [];
    }
  }

  async updateCrawlerStatus(status: string): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/crawler/status`, { status, timestamp: new Date() });
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('update crawler status', error);
    }
  }

  async savePlayerAction(action: {
    name: string;
    type: string;
    syntax?: string;
    description?: string;
    category?: string;
    documented?: boolean;
    discovered?: Date;
    lastTested?: Date;
    successCount?: number;
    failCount?: number;
  }): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/player_actions`, action);
      logger.info(`Saved player action: ${action.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save player action', error);
    }
  }

  async updatePlayerAction(name: string, updates: any): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/player_actions/${encodeURIComponent(name)}`, updates);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('update player action', error);
    }
  }

  async getAllPlayerActions(type?: string): Promise<any[]> {
    try {
      const url = type ? `${this.baseUrl}/player_actions?type=${type}` : `${this.baseUrl}/player_actions`;
      const response = await axios.get(url);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError('get player actions', error);
      return [];
    }
  }

  // ===== Generic Entity Methods =====

  async saveEntity(type: string, entity: any): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/${type}`, entity);
      logger.info(`Saved ${type}: ${entity.name || entity.id}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError(`save ${type}`, error);
    }
  }

  async getEntity(type: string, id: string): Promise<any | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/${type}/${id}`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError(`get ${type}`, error);
      return null;
    }
  }

  async getAllEntities(type: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/${type}`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError(`get all ${type}`, error);
      return [];
    }
  }

  async updateEntity(type: string, id: string, updates: any): Promise<void> {
    try {
      await axios.put(`${this.baseUrl}/${type}/${id}`, updates);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError(`update ${type}`, error);
    }
  }

  async deleteEntity(type: string, id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/${type}/${id}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError(`delete ${type}`, error);
    }
  }

  // ===== Convenience Methods (use generic methods internally) =====

  async saveRace(race: {
    name: string;
    description?: string;
    stats?: Record<string, any>;
    abilities?: string[];
    requirements?: string[];
    helpText?: string;
    discovered?: Date;
  }): Promise<void> {
    return this.saveEntity('races', race);
  }

  async getAllRaces(): Promise<any[]> {
    return this.getAllEntities('races');
  }

  async saveClass(gameClass: {
    name: string;
    description?: string;
    stats?: Record<string, any>;
    abilities?: string[];
    requirements?: string[];
    startingEquipment?: string[];
    helpText?: string;
    discovered?: Date;
  }): Promise<void> {
    return this.saveEntity('classes', gameClass);
  }

  async getAllClasses(): Promise<any[]> {
    return this.getAllEntities('classes');
  }

  async saveSkill(skill: {
    name: string;
    description?: string;
    type?: string;
    requirements?: string[];
    effects?: string[];
    manaCost?: number;
    cooldown?: number;
    helpText?: string;
    discovered?: Date;
  }): Promise<void> {
    return this.saveEntity('skills', skill);
  }

  async getAllSkills(): Promise<any[]> {
    return this.getAllEntities('skills');
  }

  // ===== World Entity Methods =====

  async saveLore(lore: Partial<Lore>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/lore`, lore);
      logger.info(`Saved lore: ${lore.type} (${lore.significance}/10)`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save lore', error);
    }
  }

  async saveFaction(faction: Partial<Faction>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/factions`, faction);
      logger.info(`Saved faction: ${faction.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save faction', error);
    }
  }

  async saveQuest(quest: Partial<Quest>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/quests`, quest);
      logger.info(`Saved quest: ${quest.name || quest.objective}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save quest', error);
    }
  }

  async saveRegion(region: Partial<Region>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/regions`, region);
      logger.info(`Saved region: ${region.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save region', error);
    }
  }

  async saveRelationship(relationship: Partial<Relationship>): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/relationships`, relationship);
      logger.info(`Saved relationship: ${relationship.entity1?.name} <-> ${relationship.entity2?.name}`);
      this.backendAvailable = true;
    } catch (error) {
      this.logBackendError('save relationship', error);
    }
  }

  async getAllLore(): Promise<Lore[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/lore`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError('get lore', error);
      return [];
    }
  }

  async getAllFactions(): Promise<Faction[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/factions`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError('get factions', error);
      return [];
    }
  }

  async getAllQuests(): Promise<Quest[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/quests`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError('get quests', error);
      return [];
    }
  }

  async getAllRegions(): Promise<Region[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/regions`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError('get regions', error);
      return [];
    }
  }

  async getAllRelationships(): Promise<Relationship[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/relationships`);
      this.backendAvailable = true;
      return response.data;
    } catch (error) {
      this.logBackendError('get relationships', error);
      return [];
    }
  }
}
