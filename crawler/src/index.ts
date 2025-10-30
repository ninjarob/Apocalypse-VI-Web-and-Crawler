import dotenv from 'dotenv';
import path from 'path';
import { MUDClient } from './mudClient';
import { AIAgent } from './aiAgent';
import { TextParser } from './parser';
import { BackendAPI } from './api';
import { CrawlerState } from '../../shared/types';
import logger from './logger';
import { LogArchiver } from './logArchiver';
import { KnowledgeManager } from './knowledgeManager';

// Load .env from the crawler directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

class MUDCrawler {
  private mudClient: MUDClient;
  private aiAgent: AIAgent;
  private parser: TextParser;
  private api: BackendAPI;
  private state: CrawlerState;
  private visitedRooms: Set<string> = new Set();
  private actionCount: number = 0;
  private maxActions: number;
  private delayBetweenActions: number;
  private singleTaskMode: boolean;
  private logArchiver: LogArchiver;
  private knowledgeManager: KnowledgeManager;
  private helpQueue: string[] = []; // Commands to look up help for

  constructor() {
    const host = process.env.MUD_HOST || 'apocalypse6.com';
    const port = parseInt(process.env.MUD_PORT || '6000');
    const username = process.env.MUD_USERNAME || '';
    const password = process.env.MUD_PASSWORD || '';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002/api';

    this.mudClient = new MUDClient(host, port, username, password);
    this.api = new BackendAPI(backendUrl);
    this.aiAgent = new AIAgent(ollamaUrl, ollamaModel, this.api);
    this.parser = new TextParser();
    
    this.maxActions = parseInt(process.env.MAX_ACTIONS_PER_SESSION || '1000');
    this.delayBetweenActions = parseInt(process.env.DELAY_BETWEEN_ACTIONS_MS || '2000');
    this.singleTaskMode = process.env.SINGLE_TASK_MODE === 'true';

    // Initialize log archiver
    this.logArchiver = new LogArchiver('logs', 'logs/archive', 60000); // Check every minute

    // Initialize knowledge manager
    this.knowledgeManager = new KnowledgeManager('ai-knowledge.md');

    this.state = {
      currentRoom: 'Unknown',
      visitedRooms: new Set(),
      commandHistory: [],
      lastAction: '',
      timestamp: new Date(),
      explorationMode: 'breadth',
      knownCommands: new Map(),
      contextualActions: new Set(['look', 'examine', 'inventory', 'score'])  // Commands that make sense to repeat
    };
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting MUD Crawler...');
      
      // Start log archiver
      this.logArchiver.start();
      logger.info('📁 Log archiver started');
      
      // Test Ollama connection first
      logger.info('Testing Ollama connection...');
      const ollamaReady = await this.aiAgent.testConnection();
      
      if (!ollamaReady) {
        logger.error('❌ Ollama is not ready!');
        logger.error('   1. Install: https://ollama.com/download');
        logger.error(`   2. Pull model: ollama pull ${process.env.OLLAMA_MODEL || 'llama3.2'}`);
        logger.error('   3. Start: ollama serve');
        return;
      }
      
      // Connect to MUD
      await this.mudClient.connect();
      
      logger.info('Waiting for initial game state...');
      await this.delay(3000);
      
      // Get initial state
      const initialResponse = await this.mudClient.sendAndWait('look', 2000);
      logger.info('Initial response received');
      
      // Start exploration loop
      await this.explore();
      
    } catch (error) {
      logger.error('Crawler error:', error);
    } finally {
      // Stop log archiver
      this.logArchiver.stop();
      logger.info('📁 Log archiver stopped');
      
      await this.mudClient.disconnect();
    }
  }

  private async explore(): Promise<void> {
    logger.info('Beginning exploration...');
    
    if (this.singleTaskMode) {
      logger.info('🎯 Single Task Mode: Running one AI decision then quitting');
    }
    
    while (this.actionCount < this.maxActions && this.mudClient.isConnected()) {
      try {
        // Get current game state
        const currentResponse = this.mudClient.getBuffer();
        
        // Parse the response
        const parsed = this.parser.parse(currentResponse);
        logger.info(`Parsed response type: ${parsed.type}`);
        
        // Save data based on type
        await this.saveData(parsed);
        
        // Update state
        if (parsed.type === 'room' && parsed.data.name) {
          this.state.currentRoom = parsed.data.name;
          this.visitedRooms.add(parsed.data.name);
        }
        
        // Ask AI for next action (pass knowledge)
        const nextCommand = await this.aiAgent.decideNextAction(
          currentResponse,
          this.state,
          Array.from(this.visitedRooms),
          this.knowledgeManager.getKnowledgeSummary()
        );
        
        // Execute command
        await this.executeCommand(nextCommand);
        
        // Increment action count
        this.actionCount++;
        
        // Check if it's time to update knowledge base
        if (this.knowledgeManager.shouldUpdate(this.actionCount)) {
          await this.updateKnowledgeBase();
        }
        
        // If single task mode, quit after one action
        if (this.singleTaskMode) {
          logger.info('✅ Single task completed. Sending quit command...');
          await this.delay(2000); // Wait for response
          await this.mudClient.send('quit');
          await this.delay(1000);
          logger.info('🏁 Exiting crawler');
          return; // Exit the function entirely
        }
        
        // Update crawler status
        await this.api.updateCrawlerStatus(
          `Exploring: ${this.state.currentRoom} | Actions: ${this.actionCount}/${this.maxActions}`
        );
        
        // Delay between actions
        await this.delay(this.delayBetweenActions);
        
      } catch (error) {
        logger.error('Exploration error:', error);
        await this.delay(5000); // Wait longer on error
      }
    }
    
    logger.info(`Exploration complete. Total actions: ${this.actionCount}`);
    logger.info(`Rooms visited: ${this.visitedRooms.size}`);
    
    // Final knowledge update at end of session
    logger.info('📝 Performing final knowledge base update...');
    await this.updateKnowledgeBase();
  }

  private async executeCommand(command: string): Promise<void> {
    // Sanitize command - remove backticks, quotes, leading '>' or other artifacts
    const sanitizedCommand = command
      .trim()
      .replace(/^[`'">\-]+|[`'"\-]+$/g, '') // Remove leading/trailing punctuation
      .replace(/^>\s*/, '') // Remove leading '>'
      .trim();
    
    logger.info(`Executing: ${sanitizedCommand}`);
    
    // Get response before command for comparison
    const beforeBuffer = this.mudClient.getBuffer();
    
    await this.mudClient.send(sanitizedCommand);
    this.state.commandHistory.push(sanitizedCommand);
    this.state.lastAction = sanitizedCommand;
    this.state.timestamp = new Date();
    
    // Wait for response
    await this.delay(1500);
    
    // Get response after command
    const afterBuffer = this.mudClient.getBuffer();
    const newContent = afterBuffer.slice(beforeBuffer.length);
    
    // Check if this is the "commands" command - capture the output
    if (sanitizedCommand.toLowerCase().trim() === 'commands') {
      logger.info('📋 Detected "commands" output - storing in knowledge base');
      this.knowledgeManager.setCommandsList(newContent);
      
      // Parse commands from output - split on multiple spaces and filter properly
      const lines = newContent.split('\n');
      const discoveredCommands: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip header lines, empty lines, or lines with game messages
        if (!trimmed || 
            trimmed.includes('---') || 
            trimmed.toLowerCase().includes('commands are available') ||
            trimmed.toLowerCase().includes('the following') ||
            /^(the|a|an)\s+\w+\s+(arrives|leaves|is)/i.test(trimmed) ||  // Skip "The Beggar arrives"
            /you are\s+\w+/i.test(trimmed)) {  // Skip "You are hungry"
          continue;
        }
        
        // Split on 2+ spaces (columnar format) and then on single spaces
        const tokens = trimmed.split(/\s{2,}/)
          .flatMap(segment => segment.split(/\s+/))
          .map(t => t.trim().toLowerCase())
          .filter(t => 
            t.length >= 2 && 
            t.length <= 20 && 
            /^[a-z0-9-]+$/.test(t) &&  // Only letters, numbers, hyphens
            !t.match(/^\d+$/)  // Skip pure numbers
          );
        
        discoveredCommands.push(...tokens);
      }
      
      // Deduplicate and save
      const uniqueCommands = [...new Set(discoveredCommands)];
      logger.info(`📋 Stored ${uniqueCommands.length} commands from game`);
      
      for (const cmdName of uniqueCommands) {
        await this.api.saveCommand({
          name: cmdName,
          discovered: new Date(),
          tested: false
        });
      }
      
      // Schedule help lookups for discovered commands (do a few at a time)
      this.queueHelpLookups(uniqueCommands.slice(0, 5)); // Start with first 5
    }
    
    // Check if this is a "help <command>" - capture command documentation
    const helpMatch = command.match(/^help\s+(.+)$/i);
    if (helpMatch) {
      const cmdName = helpMatch[1].trim().toLowerCase();
      await this.processHelpOutput(cmdName, newContent);
    }
    
    // Determine if command succeeded (simple heuristic)
    const success = this.determineCommandSuccess(beforeBuffer, afterBuffer, sanitizedCommand);
    
    // Track the command
    this.trackCommand(sanitizedCommand, success);
    
    // Record command test in knowledge manager
    this.knowledgeManager.recordCommandTest(sanitizedCommand, newContent, success);
    
    // Note: Command test results are tracked in knowledge manager and command history
    // Backend command table is for metadata (syntax, description, help text) only
    
    // Keep command history manageable
    if (this.state.commandHistory.length > 50) {
      this.state.commandHistory.shift();
    }
  }

  /**
   * Determine if a command succeeded based on the response
   */
  private determineCommandSuccess(before: string, after: string, command: string): boolean {
    const newContent = after.slice(before.length).toLowerCase();
    
    // Check for common error patterns
    const errorPatterns = [
      'huh?',
      'what?',
      'you can\'t',
      'you cannot',
      'you don\'t see',
      'you do not see',
      'invalid',
      'unknown command',
      'syntax error',
      'that doesn\'t make sense'
    ];
    
    for (const pattern of errorPatterns) {
      if (newContent.includes(pattern)) {
        return false;
      }
    }
    
    // If we got new content and no errors, consider it a success
    return newContent.length > 10;
  }

  private async saveData(parsed: any): Promise<void> {
    try {
      // Save primary entity type
      switch (parsed.type) {
        case 'room':
          await this.api.saveRoom({
            id: this.generateId(parsed.data.name),
            ...parsed.data,
            visitCount: 1,
            firstVisited: new Date(),
            lastVisited: new Date(),
            rawText: parsed.rawText
          });
          break;
          
        case 'npc':
          await this.api.saveNPC({
            id: this.generateId(parsed.data.name),
            ...parsed.data,
            location: this.state.currentRoom,
            rawText: parsed.rawText
          });
          break;
          
        case 'item':
          await this.api.saveItem({
            id: this.generateId(parsed.data.name),
            ...parsed.data,
            location: this.state.currentRoom,
            rawText: parsed.rawText
          });
          break;
      }

      // Extract and save world concepts from any response
      await this.extractAndSaveWorldConcepts(parsed.rawText);
      
    } catch (error) {
      logger.error('Error saving data:', error);
    }
  }

  /**
   * Extract world concepts (lore, factions, quests, relationships) from text
   */
  private async extractAndSaveWorldConcepts(text: string): Promise<void> {
    try {
      // Extract lore
      const lore = this.parser.extractLore(text);
      if (lore && lore.type) {
        logger.info(`📖 Discovered lore: ${lore.type} (significance: ${lore.significance})`);
        this.knowledgeManager.recordLoreFragment(lore.content, lore.type);
        // Could save to backend here if API endpoints exist
      }

      // Extract faction information
      const faction = this.parser.extractFaction(text);
      if (faction) {
        logger.info(`⚔️ Discovered faction: ${faction.name} (${faction.type})`);
        this.knowledgeManager.recordFaction(faction.name, text, faction.alignment);
        // Could save to backend here
      }

      // Extract quest information
      const quest = this.parser.extractQuest(text);
      if (quest && quest.isQuestStart) {
        logger.info(`📜 Discovered quest: ${quest.objective}`);
        this.knowledgeManager.recordQuest(quest.name || 'Unknown Quest', quest.objective || '');
        // Could save to backend here
      }

      // Extract NPC relationships
      const relationship = this.parser.extractRelationship(text);
      if (relationship) {
        logger.info(`👥 Discovered relationship: ${relationship.npc1} <-> ${relationship.npc2}`);
        this.knowledgeManager.recordRelationship(
          relationship.npc1,
          relationship.npc2,
          relationship.relationship
        );
        // Could save to backend here
      }

      // Extract geographic information
      const geography = this.parser.extractGeography(text);
      if (geography && (geography.regionName || geography.features.length > 0)) {
        logger.info(`🗺️ Discovered geographic info: ${geography.regionName || geography.features.join(', ')}`);
        if (geography.regionName) {
          this.knowledgeManager.recordRegion(
            geography.regionName,
            text,
            geography.features
          );
        }
        // Could save to backend here
      }

    } catch (error) {
      logger.error('Error extracting world concepts:', error);
    }
  }

  private generateId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  /**
   * Ask AI to update the knowledge base with recent discoveries
   */
  private async updateKnowledgeBase(): Promise<void> {
    logger.info('🧠 Requesting AI to update knowledge base...');
    
    try {
      // Gather recent discoveries
      const recentInfo = this.gatherRecentDiscoveries();
      
      // Ask AI to update the knowledge base
      const updatedKnowledge = await this.aiAgent.updateKnowledgeBase(
        this.knowledgeManager.getFullKnowledge(),
        recentInfo
      );
      
      // Save updated knowledge
      await this.knowledgeManager.updateKnowledge(updatedKnowledge, this.actionCount);
      
    } catch (error) {
      logger.error('Error updating knowledge base:', error);
    }
  }

  /**
   * Gather recent discoveries to help AI update knowledge
   */
  private gatherRecentDiscoveries(): string {
    const discoveries: string[] = [];
    
    // Available commands list
    const commandsList = this.knowledgeManager.getCommandsList();
    if (commandsList.length > 0) {
      discoveries.push(`Available commands from game (${commandsList.length} total):\n${commandsList.join(', ')}`);
    }
    
    // Commands tested with results
    const testedSummary = this.knowledgeManager.getTestedCommandsSummary();
    if (testedSummary) {
      discoveries.push(testedSummary);
    }
    
    // Recent commands learned (from state)
    const recentCommands = Array.from(this.state.knownCommands.values())
      .filter(cmd => cmd.successCount > 0)
      .map(cmd => `- ${cmd.command}: ${cmd.successCount} success, ${cmd.failureCount} failures`);
    
    if (recentCommands.length > 0) {
      discoveries.push('Commands tested (summary):\n' + recentCommands.join('\n'));
    }
    
    // Rooms visited
    if (this.visitedRooms.size > 0) {
      discoveries.push(`\nRooms explored: ${Array.from(this.visitedRooms).join(', ')}`);
    }
    
    // World context - what we've learned about the world
    const worldContext = this.knowledgeManager.getWorldContext();
    if (worldContext && worldContext.length > 50) {
      discoveries.push(`\n=== WORLD DISCOVERIES ===\n${worldContext}`);
    }
    
    // Current status
    discoveries.push(`\nCurrent location: ${this.state.currentRoom}`);
    discoveries.push(`Actions taken: ${this.actionCount}`);
    
    return discoveries.join('\n');
  }

  /**
   * Track a command that was executed
   * @param command The command that was executed
   * @param success Whether the command succeeded
   */
  private trackCommand(command: string, success: boolean): void {
    const baseCommand = command.split(' ')[0].toLowerCase();
    
    if (!this.state.knownCommands.has(baseCommand)) {
      this.state.knownCommands.set(baseCommand, {
        command: baseCommand,
        variations: [command],
        successCount: success ? 1 : 0,
        failureCount: success ? 0 : 1,
        lastUsed: new Date(),
        context: this.determineCommandContext(command)
      });
      logger.info(`📚 Learned new command: ${baseCommand}`);
    } else {
      const knowledge = this.state.knownCommands.get(baseCommand)!;
      
      // Add new variation if not seen before
      if (!knowledge.variations.includes(command)) {
        knowledge.variations.push(command);
      }
      
      // Update stats
      if (success) {
        knowledge.successCount++;
      } else {
        knowledge.failureCount++;
      }
      knowledge.lastUsed = new Date();
    }
  }

  /**
   * Determine the context where a command is useful
   */
  private determineCommandContext(command: string): string {
    const cmd = command.toLowerCase();
    
    if (cmd.match(/^(n|s|e|w|north|south|east|west|up|down|ne|nw|se|sw)/)) {
      return 'movement';
    } else if (cmd.match(/^(look|examine|inspect|search|l)/)) {
      return 'exploration';
    } else if (cmd.match(/^(attack|kill|hit|cast|flee)/)) {
      return 'combat';
    } else if (cmd.match(/^(get|take|drop|give|buy|sell)/)) {
      return 'inventory';
    } else if (cmd.match(/^(say|tell|ask|talk|whisper)/)) {
      return 'social';
    } else if (cmd.match(/^(help|who|score|inventory|stats)/)) {
      return 'information';
    }
    
    return 'general';
  }

  /**
   * Check if a command should be avoided (already tested recently)
   * @param command The command to check
   * @returns true if command should be skipped
   */
  private shouldSkipCommand(command: string): boolean {
    const baseCommand = command.split(' ')[0].toLowerCase();
    
    // Allow contextual actions (like 'look' when entering new room)
    if (this.state.contextualActions.has(baseCommand)) {
      return false;
    }
    
    // Check if we've used this exact command very recently (last 5 actions)
    const recentCommands = this.state.commandHistory.slice(-5);
    const timesUsedRecently = recentCommands.filter(cmd => 
      cmd.toLowerCase() === command.toLowerCase()
    ).length;
    
    if (timesUsedRecently >= 2) {
      return true;  // Used twice in last 5 commands - skip
    }
    
    // Check if command is well-explored
    const knowledge = this.state.knownCommands.get(baseCommand);
    if (knowledge) {
      const totalAttempts = knowledge.successCount + knowledge.failureCount;
      const hasEnoughData = totalAttempts >= 3;
      const recentlyUsed = (Date.now() - knowledge.lastUsed.getTime()) < 30000; // 30 seconds
      
      if (hasEnoughData && recentlyUsed) {
        return true;  // Well-explored and used recently - skip
      }
    }
    
    return false;
  }

  /**
   * Get summary of learned commands
   */
  getCommandSummary(): string {
    const commands = Array.from(this.state.knownCommands.values());
    const byContext = commands.reduce((acc, cmd) => {
      if (!acc[cmd.context]) acc[cmd.context] = [];
      acc[cmd.context].push(cmd.command);
      return acc;
    }, {} as Record<string, string[]>);
    
    let summary = `\n📚 Known Commands (${commands.length} total):\n`;
    Object.entries(byContext).forEach(([context, cmds]) => {
      summary += `  ${context}: ${cmds.join(', ')}\n`;
    });
    
    return summary;
  }

  /**
   * Queue commands to look up help for
   */
  private queueHelpLookups(commands: string[]): void {
    this.helpQueue.push(...commands);
    logger.info(`📚 Queued ${commands.length} commands for help lookup (${this.helpQueue.length} total in queue)`);
  }

  /**
   * Process help output for a command and update database/knowledge
   */
  private async processHelpOutput(cmdName: string, helpText: string): Promise<void> {
    logger.info(`📖 Processing help for: ${cmdName}`);
    
    // Parse help text to extract useful information
    const lines = helpText.split('\n').map(l => l.trim()).filter(l => l);
    
    // Extract syntax (usually first line after command name)
    let syntax = '';
    let description = '';
    const descriptionLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip "No help available" messages
      if (line.toLowerCase().includes('no help') || line.toLowerCase().includes('not found')) {
        logger.info(`No help available for: ${cmdName}`);
        return;
      }
      
      // Look for syntax patterns
      if (line.toLowerCase().includes('syntax:') || line.toLowerCase().includes('usage:')) {
        syntax = lines[i + 1] || line.replace(/syntax:|usage:/i, '').trim();
      } else if (i < 5 && line.includes(cmdName)) {
        // First few lines often contain syntax
        syntax = line;
      } else if (line.length > 20) {
        // Longer lines are likely description
        descriptionLines.push(line);
      }
    }
    
    description = descriptionLines.join(' ').substring(0, 500); // Limit to 500 chars
    
    // Update database
    await this.api.updateCommand(cmdName, {
      syntax: syntax || undefined,
      description: description || helpText.substring(0, 500),
      tested: true
    });
    
    // Update knowledge manager
    this.knowledgeManager.recordCommandHelp(cmdName, syntax, description);
    
    logger.info(`✅ Stored help for: ${cmdName}`);
  }

  /**
   * Check if we should inject a help command
   */
  private shouldInjectHelpCommand(): boolean {
    return this.helpQueue.length > 0 && Math.random() < 0.2; // 20% chance when queue has items
  }

  /**
   * Get next help command to execute
   */
  private getNextHelpCommand(): string | null {
    const cmd = this.helpQueue.shift();
    return cmd ? `help ${cmd}` : null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the crawler
const crawler = new MUDCrawler();
crawler.start().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
