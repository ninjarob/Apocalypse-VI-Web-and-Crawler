import fs from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Manages persistent AI knowledge across sessions
 * The AI reads and updates this knowledge base over time
 */
export class KnowledgeManager {
  private knowledgeFile: string;
  private knowledge: string;
  private lastUpdateAction: number = 0;
  private readonly updateInterval: number = 50; // Update every 50 actions
  private commandsList: string[] = []; // Store commands from "commands" output
  private commandDetails: Map<string, { tested: boolean; result: string; category?: string }> = new Map();

  constructor(filePath: string = 'ai-knowledge.md') {
    // Store in crawler root directory
    this.knowledgeFile = path.resolve(process.cwd(), filePath);
    this.knowledge = this.loadKnowledge();
  }

  /**
   * Load existing knowledge or create initial template
   */
  private loadKnowledge(): string {
    try {
      if (fs.existsSync(this.knowledgeFile)) {
        const content = fs.readFileSync(this.knowledgeFile, 'utf-8');
        logger.info(`📚 Loaded AI knowledge base from ${this.knowledgeFile}`);
        return content;
      } else {
        const initialKnowledge = this.createInitialKnowledge();
        this.saveKnowledge(initialKnowledge);
        logger.info(`📝 Created new AI knowledge base at ${this.knowledgeFile}`);
        return initialKnowledge;
      }
    } catch (error) {
      logger.error('Error loading knowledge base:', error);
      return this.createInitialKnowledge();
    }
  }

  /**
   * Create initial knowledge template
   */
  private createInitialKnowledge(): string {
    const now = new Date().toISOString().split('T')[0];
    const templatePath = path.resolve(__dirname, '../../ai-knowledge-template.md');
    
    try {
      // Try to load the template file
      if (fs.existsSync(templatePath)) {
        let template = fs.readFileSync(templatePath, 'utf-8');
        // Replace the date placeholder
        template = template.replace('{DATE}', now);
        return template;
      }
    } catch (error) {
      logger.warn('Could not load template file, using fallback template');
    }
    
    // Fallback to minimal template if file not found
    return `# MUD AI Knowledge Base - Apocalypse VI World
Last Updated: ${now}
Total Sessions: 1

## Priority Commands to Try First
- commands: Lists all available game commands (DO THIS FIRST!)
- help: Shows help information
- look: Examine current location
- inventory: Check what you're carrying

## World Lore & Story
(Discovered lore will be documented here)

## Geographic Regions & Areas
(Regions and their features will be mapped here)

## Factions & Organizations
(Guilds, kingdoms, and their relationships)

## Discovered Commands
(Will be populated as you explore)

## Map & Navigation
(Rooms and connections will be documented here)

## NPCs & Character Interactions
(NPCs and how to interact with them)

## Items & Equipment
(Items found and their properties)

## Quests & Storylines
(Active and completed quests)

## Combat & Mechanics
(Combat strategies and game mechanics)

## Lessons Learned
(Important discoveries and what NOT to do)

---
*This knowledge base grows as you explore!*
`;
  }

  /**
   * Get current knowledge for AI prompt
   */
  getKnowledge(): string {
    return this.knowledge;
  }

  /**
   * Check if it's time to update knowledge
   */
  shouldUpdate(currentAction: number): boolean {
    return currentAction - this.lastUpdateAction >= this.updateInterval;
  }

  /**
   * Update knowledge with AI's new discoveries
   */
  async updateKnowledge(newKnowledge: string, currentAction: number): Promise<void> {
    try {
      this.knowledge = this.appendUpdateTimestamp(newKnowledge);
      this.saveKnowledge(this.knowledge);
      this.lastUpdateAction = currentAction;
      logger.info(`📝 AI knowledge base updated at action ${currentAction}`);
    } catch (error) {
      logger.error('Error updating knowledge base:', error);
    }
  }

  /**
   * Save knowledge to file
   */
  private saveKnowledge(content: string): void {
    try {
      fs.writeFileSync(this.knowledgeFile, content, 'utf-8');
    } catch (error) {
      logger.error('Error saving knowledge base:', error);
      throw error;
    }
  }

  /**
   * Append timestamp to knowledge update
   */
  private appendUpdateTimestamp(content: string): string {
    const now = new Date().toISOString().split('T')[0];
    // Update the "Last Updated" line
    return content.replace(
      /Last Updated: .*/,
      `Last Updated: ${now}`
    );
  }

  /**
   * Get a concise summary for AI prompts (to save tokens)
   */
  getKnowledgeSummary(): string {
    // Extract just the key sections, limited to ~500 tokens
    const lines = this.knowledge.split('\n');
    const summary: string[] = [];
    let inRelevantSection = false;
    let lineCount = 0;
    const maxLines = 30; // Limit summary size

    for (const line of lines) {
      // Include section headers and a few lines from each section
      if (line.startsWith('##')) {
        inRelevantSection = true;
        summary.push(line);
        lineCount++;
      } else if (inRelevantSection && line.trim() && lineCount < maxLines) {
        summary.push(line);
        lineCount++;
      }
      
      if (lineCount >= maxLines) break;
    }

    return summary.join('\n');
  }

  /**
   * Get full knowledge (for major updates)
   */
  getFullKnowledge(): string {
    return this.knowledge;
  }

  /**
   * Store the list of available commands from the "commands" command
   */
  setCommandsList(commandsOutput: string): void {
    // Parse commands from the output
    const lines = commandsOutput.split('\n');
    const commands: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines, headers, and separator lines
      if (!trimmed || trimmed.includes('---') || trimmed.includes('Commands:')) continue;
      
      // Extract command names (usually first word or phrase before spaces/descriptions)
      const match = trimmed.match(/^([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/);
      if (match) {
        commands.push(match[1].trim().toLowerCase());
      }
    }
    
    this.commandsList = [...new Set(commands)]; // Remove duplicates
    logger.info(`📋 Stored ${this.commandsList.length} commands from game`);
  }

  /**
   * Get the list of available commands
   */
  getCommandsList(): string[] {
    return this.commandsList;
  }

  /**
   * Record a command test result
   */
  recordCommandTest(command: string, output: string, success: boolean): void {
    const category = this.categorizeCommand(command);
    this.commandDetails.set(command, {
      tested: true,
      result: output.substring(0, 200), // Store first 200 chars
      category
    });
    logger.info(`✅ Recorded test for command: ${command} (${success ? 'success' : 'failed'})`);
  }

  /**
   * Record help documentation for a command
   */
  recordCommandHelp(cmdName: string, syntax: string, description: string): void {
    const existing = this.commandDetails.get(cmdName) || { tested: false, result: '', category: this.categorizeCommand(cmdName) };
    this.commandDetails.set(cmdName, {
      ...existing,
      result: `Syntax: ${syntax}\nDescription: ${description}`.substring(0, 300)
    });
    logger.info(`📖 Recorded help for command: ${cmdName}`);
  }

  /**
   * Categorize a command based on its name
   */
  private categorizeCommand(command: string): string {
    const cmd = command.toLowerCase();
    
    if (['north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd'].includes(cmd)) {
      return 'navigation';
    } else if (['look', 'examine', 'inspect', 'search', 'read'].includes(cmd)) {
      return 'observation';
    } else if (['inventory', 'get', 'take', 'drop', 'put', 'wear', 'remove', 'wield'].includes(cmd)) {
      return 'inventory';
    } else if (['say', 'tell', 'ask', 'talk', 'whisper', 'shout'].includes(cmd)) {
      return 'communication';
    } else if (['attack', 'kill', 'fight', 'flee', 'defend'].includes(cmd)) {
      return 'combat';
    } else if (['help', 'commands', 'who', 'score', 'stats', 'skills'].includes(cmd)) {
      return 'information';
    } else {
      return 'other';
    }
  }

  /**
   * Get tested commands summary
   */
  getTestedCommandsSummary(): string {
    if (this.commandDetails.size === 0) return '';
    
    const byCategory: Record<string, string[]> = {};
    
    for (const [cmd, details] of this.commandDetails.entries()) {
      const cat = details.category || 'other';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(`${cmd}: ${details.result.substring(0, 100)}`);
    }
    
    let summary = '\n## Command Test Results\n';
    for (const [category, commands] of Object.entries(byCategory)) {
      summary += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
      commands.forEach(cmd => summary += `- ${cmd}\n`);
    }
    
    return summary;
  }

  /**
   * Get all available commands for AI knowledge
   */
  getAvailableCommandsSection(): string {
    if (this.commandsList.length === 0) return '';
    
    return `\n## Available Game Commands\n(${this.commandsList.length} commands discovered)\n${this.commandsList.join(', ')}\n`;
  }

  /**
   * Extract and record lore/story elements from text
   */
  recordLoreFragment(text: string, category: 'history' | 'myth' | 'prophecy' | 'current-events'): void {
    // Update knowledge base with lore snippet
    const section = this.findSection('World Lore & Story');
    if (section) {
      logger.info(`📖 Recorded lore fragment: ${text.substring(0, 50)}...`);
    }
  }

  /**
   * Record a geographic region or area
   */
  recordRegion(name: string, description: string, features: string[]): void {
    logger.info(`🗺️ Recorded region: ${name}`);
  }

  /**
   * Record a faction or organization
   */
  recordFaction(name: string, description: string, alignment?: string, relationships?: Record<string, string>): void {
    logger.info(`⚔️ Recorded faction: ${name} (${alignment || 'unknown'})`);
  }

  /**
   * Record a quest or storyline
   */
  recordQuest(name: string, objective: string, questGiver?: string, rewards?: string[]): void {
    logger.info(`📜 Recorded quest: ${name}`);
  }

  /**
   * Record an NPC relationship
   */
  recordRelationship(npc1: string, npc2: string, relationship: string): void {
    logger.info(`👥 Recorded relationship: ${npc1} <-> ${npc2}: ${relationship}`);
  }

  /**
   * Find a section in the knowledge base by header
   */
  private findSection(sectionName: string): string | null {
    const lines = this.knowledge.split('\n');
    let inSection = false;
    const sectionLines: string[] = [];
    
    for (const line of lines) {
      if (line.includes(sectionName)) {
        inSection = true;
        continue;
      }
      if (inSection && line.startsWith('##')) {
        break; // Hit next section
      }
      if (inSection) {
        sectionLines.push(line);
      }
    }
    
    return sectionLines.length > 0 ? sectionLines.join('\n') : null;
  }

  /**
   * Get world context summary for AI prompts
   * Returns condensed world information relevant to decision-making
   */
  getWorldContext(): string {
    const sections = [
      'World Lore & Story',
      'Factions & Organizations',
      'Quests & Storylines',
      'Geographic Regions & Areas'
    ];
    
    let context = '\n=== WORLD CONTEXT ===\n';
    
    for (const section of sections) {
      const content = this.findSection(section);
      if (content && content.trim().length > 10) {
        context += `\n${section}:\n${content.substring(0, 300)}...\n`;
      }
    }
    
    return context;
  }

  /**
   * Update a specific section of the knowledge base
   */
  updateSection(sectionName: string, content: string): void {
    const lines = this.knowledge.split('\n');
    const newLines: string[] = [];
    let inTargetSection = false;
    let sectionDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we're entering the target section
      if (line.includes(sectionName) && line.startsWith('##')) {
        inTargetSection = true;
        sectionDepth = line.match(/^#+/)?.[0].length || 2;
        newLines.push(line);
        newLines.push(content);
        continue;
      }
      
      // Skip old content if we're in the target section
      if (inTargetSection) {
        // Check if we've hit another section of the same or higher level
        const headerMatch = line.match(/^#+/);
        if (headerMatch && headerMatch[0].length <= sectionDepth) {
          inTargetSection = false;
        } else {
          continue; // Skip old content
        }
      }
      
      newLines.push(line);
    }
    
    this.knowledge = newLines.join('\n');
    this.saveKnowledge(this.knowledge);
    logger.info(`📝 Updated section: ${sectionName}`);
  }

  /**
   * Add a help topic to the knowledge base
   */
  addHelpTopic(topic: string, helpText: string): void {
    // Create or update a help topics section
    const formattedEntry = `\n### ${topic}\n${helpText.trim()}\n`;
    
    // Check if we have a help topics section
    if (!this.knowledge.includes('## Help Topics')) {
      // Add new section before the Lessons Learned section
      this.knowledge = this.knowledge.replace(
        '## Lessons Learned',
        `## Help Topics\n${formattedEntry}\n## Lessons Learned`
      );
    } else {
      // Append to existing help topics section
      this.knowledge = this.knowledge.replace(
        '## Lessons Learned',
        `${formattedEntry}\n## Lessons Learned`
      );
    }
    
    this.saveKnowledge(this.knowledge);
    logger.info(`📚 Added help topic: ${topic}`);
  }

  /**
   * Force save the current knowledge base
   */
  forceSave(): void {
    this.saveKnowledge(this.knowledge);
  }
}
