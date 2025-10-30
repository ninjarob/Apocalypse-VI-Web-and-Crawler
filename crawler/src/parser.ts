import { ParsedResponse } from '../../shared/types';
import logger from './logger';

export class TextParser {
  
  /**
   * Parse MUD response text and identify what type of content it is
   */
  parse(text: string): ParsedResponse {
    const cleanText = this.cleanText(text);
    
    // Check for inventory first (before other checks)
    if (this.isInventory(cleanText)) {
      return {
        type: 'unknown', // Treat inventory as unknown to avoid saving it
        data: { message: 'Inventory listing' },
        rawText: text
      };
    }
    
    // Try to identify the type of response
    if (this.isRoomDescription(cleanText)) {
      return {
        type: 'room',
        data: this.parseRoom(cleanText),
        rawText: text
      };
    } else if (this.isNPCDescription(cleanText)) {
      return {
        type: 'npc',
        data: this.parseNPC(cleanText),
        rawText: text
      };
    } else if (this.isItemDescription(cleanText)) {
      return {
        type: 'item',
        data: this.parseItem(cleanText),
        rawText: text
      };
    } else if (this.isCombat(cleanText)) {
      return {
        type: 'combat',
        data: { message: cleanText },
        rawText: text
      };
    } else if (this.isError(cleanText)) {
      return {
        type: 'error',
        data: { message: cleanText },
        rawText: text
      };
    }
    
    return {
      type: 'unknown',
      data: { message: cleanText },
      rawText: text
    };
  }

  /**
   * Clean ANSI codes and extra whitespace
   */
  private cleanText(text: string): string {
    // Remove ANSI escape codes
    let cleaned = text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  /**
   * Check if text is inventory output
   */
  private isInventory(text: string): boolean {
    return /you are carrying/i.test(text) || 
           /inventory/i.test(text) && /you have/i.test(text);
  }

  /**
   * Check if text looks like a room description
   */
  private isRoomDescription(text: string): boolean {
    // Room descriptions typically have exits
    return /\[exits?:/i.test(text) || /obvious exits/i.test(text);
  }

  /**
   * Parse room information
   */
  private parseRoom(text: string): any {
    const cleanedText = this.cleanText(text);
    const lines = cleanedText.split(/[\r\n]+/).filter(line => line.trim());
    
    // First non-empty line is usually the room name (extract just that, not the description)
    let roomName = 'Unknown Room';
    if (lines.length > 0) {
      // Remove common prefixes and get just the room name
      roomName = lines[0]
        .replace(/^You are (in|at|on|standing on|standing in)\s+/i, '')
        .replace(/\s*<.*>.*$/, '') // Remove status line
        .replace(/\[EXITS:.*\]/i, '') // Remove exits from name
        .trim();
      
      // If name is too long (likely includes description), take first sentence
      if (roomName.length > 100) {
        const firstSentence = roomName.match(/^([^.!?]+)/);
        if (firstSentence) {
          roomName = firstSentence[1].trim();
        }
      }
    }
    
    // Find description (text between name and exits/status)
    let description = cleanedText;
    const statusMatch = cleanedText.match(/< \d+H \d+M \d+V/);
    if (statusMatch) {
      // Remove everything from status line onwards
      description = cleanedText.substring(0, statusMatch.index).trim();
    }
    
    // Find exits
    const exits: string[] = [];
    const exitPattern = /\[EXITS?:\s*([^\]]+)\]/i;
    const exitMatch = text.match(exitPattern);
    if (exitMatch) {
      const exitStr = exitMatch[1];
      const exitChars = exitStr.trim().split(/\s+/);
      // Map single letters to full directions
      const dirMap: {[key: string]: string} = {
        'n': 'north', 's': 'south', 'e': 'east', 'w': 'west',
        'u': 'up', 'd': 'down', 'ne': 'northeast', 'nw': 'northwest',
        'se': 'southeast', 'sw': 'southwest'
      };
      exits.push(...exitChars.map(e => dirMap[e.toLowerCase()] || e));
    }
    
    // Find NPCs (characters) - look for patterns like "A guard is standing here"
    const npcs: string[] = [];
    const npcPatterns = [
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+is\s+(?:standing|sitting|here)/gi,
      /You see\s+([^.]+)(?:\.|$)/gi
    ];
    
    for (const pattern of npcPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        npcs.push(match[1].trim());
      }
    }
    
    return {
      name: roomName,
      description: description,
      exits: exits.map(e => ({ direction: e })),
      npcs,
      items: []
    };
  }

  /**
   * Check if text looks like an NPC description
   */
  private isNPCDescription(text: string): boolean {
    return /(?:looks? like|appears? to be|wearing|carrying)/i.test(text);
  }

  /**
   * Parse NPC information
   */
  private parseNPC(text: string): any {
    const lines = text.split(/[\r\n]+/).filter(line => line.trim());
    const name = lines[0] || 'Unknown NPC';
    
    return {
      name,
      description: text,
      hostile: /hostile|aggressive|attacks/i.test(text)
    };
  }

  /**
   * Check if text looks like an item description
   */
  private isItemDescription(text: string): boolean {
    return /(?:weapon|armor|damage|weight|made of)/i.test(text);
  }

  /**
   * Parse item information
   */
  private parseItem(text: string): any {
    const lines = text.split(/[\r\n]+/).filter(line => line.trim());
    const name = lines[0] || 'Unknown Item';
    
    // Extract stats
    const stats: any = {};
    
    const damageMatch = text.match(/damage[:\s]+([0-9d+-]+)/i);
    if (damageMatch) stats.damage = damageMatch[1];
    
    const armorMatch = text.match(/armor[:\s]+(\d+)/i);
    if (armorMatch) stats.armor = parseInt(armorMatch[1]);
    
    const weightMatch = text.match(/weight[:\s]+(\d+)/i);
    if (weightMatch) stats.weight = parseInt(weightMatch[1]);
    
    return {
      name,
      description: text,
      stats
    };
  }

  /**
   * Check if text indicates combat
   */
  private isCombat(text: string): boolean {
    return /(?:hit|miss|damage|attack|defend|die)/i.test(text);
  }

  /**
   * Check if text is an error message
   */
  private isError(text: string): boolean {
    return /(?:huh|what|don't understand|invalid|can't|cannot)/i.test(text);
  }

  /**
   * Extract all mentioned entities from text
   */
  extractEntities(text: string): { npcs: string[], items: string[], locations: string[] } {
    const npcs: string[] = [];
    const items: string[] = [];
    const locations: string[] = [];
    
    // This is a basic implementation - can be enhanced with AI
    const capitalizedWords = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    
    for (const word of capitalizedWords) {
      // Simple heuristic - can be improved
      if (/(?:sword|shield|armor|helm|weapon|potion)/i.test(word)) {
        items.push(word);
      } else {
        npcs.push(word);
      }
    }
    
    return { npcs, items, locations };
  }

  /**
   * Extract lore and story elements from text
   */
  extractLore(text: string): {
    type: 'history' | 'myth' | 'prophecy' | 'current-events' | null;
    content: string;
    significance: number; // 1-10 importance rating
  } | null {
    const lowerText = text.toLowerCase();
    
    // Patterns indicating historical lore
    const historyPatterns = [
      /(?:long ago|ancient|centuries|years ago|in the past|once upon)/i,
      /(?:was built|was founded|fell|rose|conquered|defeated)/i,
      /(?:war|battle|siege) (?:of|at|in)/i
    ];
    
    // Patterns indicating mythology
    const mythPatterns = [
      /(?:legend|myth|tale|story) (?:tells|says|speaks of)/i,
      /(?:gods?|goddess|deity|divine|celestial)/i,
      /(?:blessed|cursed|enchanted) by/i
    ];
    
    // Patterns indicating prophecy
    const prophecyPatterns = [
      /(?:prophecy|foretold|predicted|foreseen)/i,
      /(?:will come|shall return|destined to)/i,
      /(?:chosen one|hero|savior)/i
    ];
    
    // Patterns indicating current events
    const currentPatterns = [
      /(?:currently|now|recently|today)/i,
      /(?:threatens|attacks|invades|occupies)/i,
      /(?:war rages|conflict|uprising|rebellion)/i
    ];
    
    // Check each category
    for (const pattern of historyPatterns) {
      if (pattern.test(text) && text.length > 50) {
        return { type: 'history', content: text, significance: 7 };
      }
    }
    
    for (const pattern of mythPatterns) {
      if (pattern.test(text) && text.length > 50) {
        return { type: 'myth', content: text, significance: 8 };
      }
    }
    
    for (const pattern of prophecyPatterns) {
      if (pattern.test(text) && text.length > 50) {
        return { type: 'prophecy', content: text, significance: 9 };
      }
    }
    
    for (const pattern of currentPatterns) {
      if (pattern.test(text) && text.length > 40) {
        return { type: 'current-events', content: text, significance: 6 };
      }
    }
    
    return null;
  }

  /**
   * Extract faction/organization information
   */
  extractFaction(text: string): {
    name: string;
    type: 'guild' | 'kingdom' | 'clan' | 'order' | 'organization';
    alignment?: 'good' | 'evil' | 'neutral';
    relationships?: string[];
  } | null {
    const factionKeywords = [
      { pattern: /(?:guild of|guild|order of|order)\s+([A-Z][a-z\s]+)/i, type: 'guild' as const },
      { pattern: /(?:kingdom of|kingdom)\s+([A-Z][a-z\s]+)/i, type: 'kingdom' as const },
      { pattern: /(?:clan|tribe)\s+([A-Z][a-z\s]+)/i, type: 'clan' as const },
      { pattern: /(?:brotherhood|sisterhood|society)\s+of\s+([A-Z][a-z\s]+)/i, type: 'order' as const }
    ];
    
    for (const { pattern, type } of factionKeywords) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].trim();
        
        // Try to determine alignment
        let alignment: 'good' | 'evil' | 'neutral' | undefined;
        if (/(?:holy|righteous|noble|just|light)/i.test(text)) alignment = 'good';
        if (/(?:dark|evil|corrupt|shadow|chaos)/i.test(text)) alignment = 'evil';
        
        return { name, type, alignment };
      }
    }
    
    return null;
  }

  /**
   * Extract quest information from text
   */
  extractQuest(text: string): {
    name?: string;
    objective?: string;
    questGiver?: string;
    reward?: string;
    isQuestStart: boolean;
  } | null {
    const questPatterns = [
      /(?:quest|mission|task):\s*([^.!?]+)/i,
      /(?:bring me|find|retrieve|collect|slay|kill|defeat)\s+([^.!?]+)/i,
      /(?:reward|payment|compensation):\s*([^.!?]+)/i,
      /(?:i need you to|could you|would you)\s+([^.!?]+)/i
    ];
    
    let isQuestStart = false;
    let objective = '';
    let reward = '';
    
    for (const pattern of questPatterns) {
      const match = text.match(pattern);
      if (match) {
        isQuestStart = true;
        if (pattern.toString().includes('reward')) {
          reward = match[1];
        } else {
          objective = match[1];
        }
      }
    }
    
    if (isQuestStart) {
      return { objective, reward, isQuestStart };
    }
    
    return null;
  }

  /**
   * Extract NPC relationship information
   */
  extractRelationship(text: string): {
    npc1: string;
    npc2: string;
    relationship: string;
  } | null {
    const relationshipPatterns = [
      /([A-Z][a-z]+)\s+(?:is|was)\s+(?:the|a|an)?\s*(?:son|daughter|brother|sister|father|mother|wife|husband|friend|enemy|rival)\s+of\s+([A-Z][a-z]+)/i,
      /([A-Z][a-z]+)\s+(?:loves|hates|fears|respects|serves|betrayed)\s+([A-Z][a-z]+)/i,
      /([A-Z][a-z]+)\s+and\s+([A-Z][a-z]+)\s+(?:are|were)\s+(allies|enemies|friends|rivals)/i
    ];
    
    for (const pattern of relationshipPatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          npc1: match[1],
          npc2: match[2],
          relationship: match[3] || match[0].match(/(?:is|was)\s+(?:the\s+)?([a-z]+)/i)?.[1] || 'related'
        };
      }
    }
    
    return null;
  }

  /**
   * Extract geographic/area information
   */
  extractGeography(text: string): {
    regionName?: string;
    features: string[];
    climate?: string;
    dangers?: string[];
  } | null {
    const geographyPatterns = [
      /(?:region|land|territory|realm|province)\s+(?:of|called)?\s*([A-Z][a-z\s]+)/i,
      /(?:mountains?|forest|desert|swamp|ocean|sea|river|lake|valley|hills?)\s+(?:of|called)?\s*([A-Z][a-z\s]+)?/i
    ];
    
    const features: string[] = [];
    let regionName: string | undefined;
    
    for (const pattern of geographyPatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[0].includes('region') || match[0].includes('land')) {
          regionName = match[1];
        } else {
          features.push(match[0]);
        }
      }
    }
    
    if (features.length > 0 || regionName) {
      return { regionName, features };
    }
    
    return null;
  }
}
