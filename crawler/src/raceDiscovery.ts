import { MUDClient } from './mudClient';
import { BackendAPI } from './api';
import { Race } from '../../shared/types';

export class RaceDiscovery {
  private mudClient: MUDClient;
  private api: BackendAPI;

  constructor(mudClient: MUDClient, api: BackendAPI) {
    this.mudClient = mudClient;
    this.api = api;
  }

  /**
   * Discover all races in the game
   * 1. Execute "help races" to get the list
   * 2. Parse the list of race names
   * 3. For each race, execute "help <race>" to get details
   * 4. Save each race to the database
   */
  async discoverRaces(): Promise<void> {
    console.log('\n=== Starting Race Discovery Mode ===\n');

    try {
      // Step 1: Get the list of races
      console.log('Executing: help races');
      const raceListResponse = await this.mudClient.sendAndWait('help races', 1500);
      console.log('Response received, parsing race list...\n');

      // Step 2: Parse race names from the response
      const raceNames = this.parseRaceList(raceListResponse);
      console.log(`Found ${raceNames.length} races: ${raceNames.join(', ')}\n`);

      if (raceNames.length === 0) {
        console.log('No races found in the help text. Response was:');
        console.log(raceListResponse);
        return;
      }

      // Step 3: Get details for each race
      for (const raceName of raceNames) {
        await this.discoverRace(raceName);
        // Small delay to avoid flooding the server
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log(`\n=== Race Discovery Complete: ${raceNames.length} races discovered ===\n`);
    } catch (error) {
      console.error('Error during race discovery:', error);
      throw error;
    }
  }

  /**
   * Parse the race list from "help races" command output
   * The format may vary, but typically lists race names
   */
  private parseRaceList(response: string): string[] {
    const races: string[] = [];
    const lines = response.split(/\r?\n/);

    // Look for lines containing race names (usually comma-separated, all caps)
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and headers
      if (!trimmed || /^(RACES|See Also|Help)/i.test(trimmed)) {
        continue;
      }

      // Look for comma-separated race names (typically uppercase)
      // Pattern: "The races are DWARF, ELF, GNOME, ..." or "MINOTAUR, PIXIE, and TRITON"
      const racePattern = /\b[A-Z][A-Z-]+\b/g;
      const matches = trimmed.match(racePattern);
      
      if (matches) {
        for (const match of matches) {
          // Filter out common words that aren't race names
          if (match.length >= 3 && 
              !['THE', 'ARE', 'AND', 'EACH', 'RACE', 'HOLDS', 'THAT', 'SET', 'THEM', 'FROM', 'OTHERS', 'DIFFERENT', 'POWERS', 'APART'].includes(match)) {
            races.push(match);
          }
        }
      }
    }

    // Remove duplicates and return
    return Array.from(new Set(races));
  }

  /**
   * Discover details about a specific race
   */
  private async discoverRace(raceName: string): Promise<void> {
    console.log(`\n--- Discovering race: ${raceName} ---`);
    
    try {
      // Get race details
      const command = `help ${raceName.toLowerCase()}`;
      console.log(`Executing: ${command}`);
      const response = await this.mudClient.sendAndWait(command, 1500);

      // Parse the race information
      const race = this.parseRaceDetails(raceName, response);

      // Save to database
      console.log(`Saving ${raceName} to database...`);
      await this.api.saveRace(race);
      console.log(`✓ ${raceName} saved successfully`);

    } catch (error) {
      console.error(`Error discovering race ${raceName}:`, error);
    }
  }

  /**
   * Parse race details from "help <race>" command output
   */
  private parseRaceDetails(raceName: string, response: string): { 
    name: string; 
    helpText?: string; 
    discovered?: string;
    description?: string;
    stats?: Record<string, any>;
    abilities?: string[];
    requirements?: string[];
  } {
    const race: {
      name: string;
      helpText?: string;
      discovered?: string;
      description?: string;
      stats?: Record<string, any>;
      abilities?: string[];
      requirements?: string[];
    } = {
      name: raceName,
      helpText: response,
      discovered: new Date().toISOString()
    };

    const lines = response.split(/\r?\n/);
    let currentSection = '';
    let descriptionLines: string[] = [];
    let statsLines: string[] = [];
    let abilitiesLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect sections
      if (/^(description|about|overview):/i.test(trimmed)) {
        currentSection = 'description';
        continue;
      } else if (/^(stats|statistics|attributes|modifiers?):/i.test(trimmed)) {
        currentSection = 'stats';
        continue;
      } else if (/^(abilities|racial abilities|special abilities|traits):/i.test(trimmed)) {
        currentSection = 'abilities';
        continue;
      } else if (/^(requirements|restrictions):/i.test(trimmed)) {
        currentSection = 'requirements';
        continue;
      }

      // Collect content based on section
      if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('==')) {
        if (currentSection === 'description') {
          descriptionLines.push(trimmed);
        } else if (currentSection === 'stats') {
          statsLines.push(trimmed);
        } else if (currentSection === 'abilities') {
          abilitiesLines.push(trimmed);
        }
        // For the first few lines before any section header, assume it's description
        else if (descriptionLines.length === 0 && !currentSection) {
          descriptionLines.push(trimmed);
        }
      }
    }

    // Set description
    if (descriptionLines.length > 0) {
      race.description = descriptionLines.join(' ');
    }

    // Parse stats if found
    if (statsLines.length > 0) {
      race.stats = this.parseStats(statsLines);
    }

    // Parse abilities if found
    if (abilitiesLines.length > 0) {
      race.abilities = abilitiesLines;
    }

    return race;
  }

  /**
   * Parse stat modifiers from text
   * Common formats:
   * - "Strength: +2, Dexterity: -1"
   * - "STR +2, DEX -1, CON +1"
   * - "+2 Strength, -1 Dexterity"
   */
  private parseStats(statsLines: string[]): Record<string, any> {
    const stats: Record<string, any> = {};
    const text = statsLines.join(' ');

    // Try to find stat patterns
    const patterns = [
      /([A-Za-z]+):\s*([+-]?\d+)/g,
      /([A-Z]{3})\s+([+-]?\d+)/g,
      /([+-]?\d+)\s+([A-Za-z]+)/g
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const [_, nameOrValue, valueOrName] = match;
        
        // Determine which is stat name and which is value
        if (/[A-Za-z]/.test(nameOrValue) && /^[+-]?\d+$/.test(valueOrName)) {
          stats[nameOrValue.toLowerCase()] = parseInt(valueOrName);
        } else if (/^[+-]?\d+$/.test(nameOrValue) && /[A-Za-z]/.test(valueOrName)) {
          stats[valueOrName.toLowerCase()] = parseInt(nameOrValue);
        }
      }
    }

    // If we found stats, return them; otherwise return the raw text
    return Object.keys(stats).length > 0 ? stats : { raw: text };
  }
}
