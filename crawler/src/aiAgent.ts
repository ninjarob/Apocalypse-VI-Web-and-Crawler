import axios from 'axios';
import { CrawlerState } from '../../shared/types';
import logger from './logger';
import { BackendAPI } from './api';

/**
 * AI Agent using Ollama (local, free AI models)
 * 
 * How it works:
 * 1. Ollama runs locally on your machine (http://localhost:11434)
 * 2. You download models once (e.g., llama3.2, mistral)
 * 3. Models respond to HTTP POST requests
 * 4. No API keys, no costs, no rate limits!
 */
export class AIAgent {
  private ollamaUrl: string;
  private model: string;
  private api: BackendAPI | null;

  constructor(ollamaUrl: string = 'http://localhost:11434', model: string = 'llama3.2:3b', api?: BackendAPI) {
    this.ollamaUrl = ollamaUrl;
    this.model = model;
    this.api = api || null;
    logger.info(`AI Agent initialized with Ollama model: ${model}`);
  }

  /**
   * Decide what command to execute next based on current game state
   */
  async decideNextAction(
    currentResponse: string,
    state: CrawlerState,
    visitedRooms: string[],
    knowledgeBase: string = ''
  ): Promise<string> {
    
    const prompt = this.buildPrompt(currentResponse, state, visitedRooms, knowledgeBase);
    
    try {
      let command = await this.getOllamaResponse(prompt);
      
      // Clean up the command - remove any explanatory text
      command = this.cleanCommand(command);
      
      // Check for ANY repetition in last 3 commands - force diversity
      const lastThree = state.commandHistory.slice(-3);
      const countInLastThree = lastThree.filter(c => c === command).length;
      
      if (countInLastThree >= 1) {
        logger.warn(`⚠️  AI chose "${command}" but it was used ${countInLastThree} time(s) in last 3 actions - forcing different action`);
        command = await this.chooseFallbackCommand(command, state);
      }
      
      logger.info(`AI decided: ${command}`);
      return command.trim();
      
    } catch (error) {
      logger.error('AI decision error:', error);
      return 'look'; // Fallback command
    }
  }

  /**
   * Choose a fallback command when AI repeats itself
   * Uses database of known working commands instead of hardcoded list
   */
  private async chooseFallbackCommand(repeatedCommand: string, state: CrawlerState): Promise<string> {
    const recentCommands = new Set(state.commandHistory.slice(-5));
    
    // Try to get successful player actions from database
    let knownCommands: string[] = [];
    
    if (this.api) {
      try {
        const playerActions = await this.api.getAllPlayerActions('command');
        // Filter for commands that have been tested and work
        knownCommands = playerActions
          .filter(action => action.successCount > 0)
          .map(action => action.name)
          .filter(name => !recentCommands.has(name)); // Exclude recently used
        
        logger.debug(`Found ${knownCommands.length} working commands from database`);
      } catch (error) {
        logger.debug('Could not fetch player actions from database, using defaults');
      }
    }
    
    // If we have known working commands from database, use them
    if (knownCommands.length > 0) {
      // Prioritize movement and exploration commands
      const movementCommands = knownCommands.filter(cmd => 
        ['north', 'south', 'east', 'west', 'up', 'down', 'ne', 'nw', 'se', 'sw'].includes(cmd)
      );
      const infoCommands = knownCommands.filter(cmd =>
        ['look', 'examine', 'inventory', 'who', 'score'].includes(cmd)
      );
      
      // Try movement first, then info commands, then any other working command
      const prioritized = [...movementCommands, ...infoCommands, ...knownCommands];
      
      for (const cmd of prioritized) {
        if (!recentCommands.has(cmd)) {
          logger.info(`Using database command as fallback: ${cmd}`);
          return cmd;
        }
      }
    }
    
    // Fallback to basic exploration commands if database unavailable
    const basicCommands = ['look', 'north', 'south', 'east', 'west', 'inventory', 'who', 'examine fountain'];
    
    for (const cmd of basicCommands) {
      if (!recentCommands.has(cmd)) {
        return cmd;
      }
    }
    
    // Last resort
    return 'look';
  }

  /**
   * Clean up AI response to extract just the command
   */
  private cleanCommand(response: string): string {
    let cmd = response.trim().toLowerCase();
    
    // Remove common sentence starters
    const removePrefixes = [
      "i'll ", "i will ", "let's ", "let me ", "let us ",
      "i should ", "i can ", "i'd like to ", "i want to ",
      "next, ", "first, ", "then, ", "now, ",
      "command: ", "response: ", "answer: "
    ];
    
    for (const prefix of removePrefixes) {
      if (cmd.startsWith(prefix)) {
        cmd = cmd.substring(prefix.length);
      }
    }
    
    // If there's a quote, extract what's in quotes
    const quoteMatch = cmd.match(/"([^"]+)"/);
    if (quoteMatch) {
      return quoteMatch[1];
    }
    
    // Take only the first line
    cmd = cmd.split('\n')[0];
    
    // Remove trailing punctuation
    cmd = cmd.replace(/[.!?,:;]+$/, '');
    
    // If it's still a sentence (contains multiple words with explanatory structure), take first 1-3 words
    if (cmd.split(' ').length > 3 && !cmd.match(/^(look|examine|ask|tell|say|talk)/)) {
      const words = cmd.split(' ');
      cmd = words.slice(0, Math.min(2, words.length)).join(' ');
    }
    
    return cmd;
  }

  private buildPrompt(
    currentResponse: string,
    state: CrawlerState,
    visitedRooms: string[],
    knowledgeBase: string = ''
  ): string {
    // Build known commands summary
    const knownCommands = Array.from(state.knownCommands.values());
    const commandsByContext = knownCommands.reduce((acc, cmd) => {
      if (!acc[cmd.context]) acc[cmd.context] = [];
      acc[cmd.context].push(`${cmd.command} (${cmd.successCount}✓/${cmd.failureCount}✗)`);
      return acc;
    }, {} as Record<string, string[]>);
    
    let commandKnowledge = '';
    if (knownCommands.length > 0) {
      commandKnowledge = '\n\nCOMMANDS YOU\'VE LEARNED:\n';
      Object.entries(commandsByContext).forEach(([context, cmds]) => {
        commandKnowledge += `${context}: ${cmds.join(', ')}\n`;
      });
      
      // List commands to AVOID (failed repeatedly)
      const failedCommands = knownCommands.filter(cmd => cmd.failureCount > 0 && cmd.successCount === 0);
      if (failedCommands.length > 0) {
        commandKnowledge += '\n❌ AVOID these commands (they failed):\n';
        failedCommands.forEach(cmd => {
          commandKnowledge += `- ${cmd.command}: Failed ${cmd.failureCount} time(s)\n`;
        });
      }
      
      commandKnowledge += '\n⚠️ Try NEW commands you haven\'t tested yet. Don\'t repeat failed commands.';
    }
    
    // Check for repeated commands
    const lastThreeCommands = state.commandHistory.slice(-3);
    let repetitionWarning = '';
    if (lastThreeCommands.length >= 2) {
      const lastCmd = lastThreeCommands[lastThreeCommands.length - 1];
      const secondLastCmd = lastThreeCommands[lastThreeCommands.length - 2];
      if (lastCmd === secondLastCmd) {
        repetitionWarning = `\n\n⚠️ WARNING: You just used "${lastCmd}" twice! Don't use it again. Try something different!`;
      }
    }
    
    // Add knowledge base if available - enhanced with world context
    let knowledgeSection = '';
    if (knowledgeBase.trim()) {
      knowledgeSection = `\n\n=== YOUR ACCUMULATED KNOWLEDGE ===\n${knowledgeBase}\n`;
      knowledgeSection += '\n💡 USE THIS KNOWLEDGE: When you see NPCs, items, or locations mentioned in your knowledge base, ';
      knowledgeSection += 'prioritize interacting with them. Build on what you already know!\n';
    }
    
    return `You are an autonomous AI agent exploring Apocalypse VI, a rich MUD (Multi-User Dungeon) game.
Your mission: Systematically explore and BUILD A COMPREHENSIVE DATABASE of the world - its rooms, NPCs, items, 
factions, quests, lore, and relationships. You are creating an encyclopedia of this world!

CURRENT GAME OUTPUT:
${currentResponse}

YOUR STATE:
- Current Room: ${state.currentRoom}
- Visited Rooms: ${visitedRooms.length}
- Last Action: ${state.lastAction}
- Recent Commands: ${state.commandHistory.slice(-5).join(', ')}${commandKnowledge}${repetitionWarning}${knowledgeSection}

WORLD UNDERSTANDING PRIORITIES:
1. **Lore & Story**: When NPCs speak or signs/books are mentioned, READ THEM! Extract history, myths, prophecies.
2. **Factions & Politics**: Note mentions of guilds, kingdoms, orders. Who's allied? Who's at war?
3. **Quests**: When NPCs say "I need..." or "Could you...", that's likely a quest! Document it.
4. **Relationships**: If text mentions "X is the brother of Y" or "hates/loves/serves", that's world knowledge!
5. **Geography**: Note region names, climate descriptions, dangerous areas, connected territories.
6. **Deep Interaction**: Don't just "look" - talk to NPCs ("ask X about Y"), examine objects thoroughly.

EXPLORATION STRATEGY:
1. First session: Use "commands" ONCE to discover available commands
2. In each NEW room:
   - "look" to get full description
   - "look at [objects]" mentioned in the description (altars, fountains, signs, etc.)
   - "examine [items]" you see
3. When you encounter NPCs:
   - "ask [npc] about [topic]" - try: themselves, the area, local factions, quests, rumors
   - "talk to [npc]" or just their name might trigger dialogue
4. When you see readable items (books, signs, scrolls):
   - "read [item]" - these often contain critical lore!
5. Systematic exploration:
   - Try all cardinal directions: north, south, east, west, up, down
   - Map out connections between rooms
   - Return to areas with unexplored exits
6. Build knowledge over time:
   - Connect dots: If you learned about "Guild of Light" in one room, ask NPCs about it elsewhere
   - Follow quest chains: Complete objectives, return to quest givers
   - Test relationships: See how NPCs react to faction names or each other

CONTEXTUAL AWARENESS:
- If your knowledge mentions a specific NPC, seek them out and ask questions
- If you learned about a quest, prioritize completing its objectives
- If factions are at war, that affects how you should interact
- Use accumulated lore to ask better questions and make smarter choices

RULES:
- Respond with ONLY a single command (no explanations)
- Examples: "look", "north", "ask guard about guild", "read book", "examine altar"
- NEVER write sentences like "I'll..." or "Let's..."
- Prioritize DEPTH over breadth: Interact thoroughly before moving on
- Don't repeat commands used in last 3 actions
- When stuck, try "help [topic]" or explore a different direction
- Be contextually aware: Use your world knowledge to guide decisions

Your goal is to understand this world deeply, not just map it. Every NPC has a story, every room has lore.
Ask questions, read everything, document relationships. Build the ultimate world database!

COMMAND ONLY (no explanation):`;
  }

  /**
   * Call Ollama API to get AI response
   * 
   * Ollama API format:
   * POST http://localhost:11434/api/generate
   * Body: { model: "llama3.2", prompt: "your prompt", stream: false }
   * Response: { response: "AI's answer" }
   */
  private async getOllamaResponse(prompt: string, options?: { num_predict?: number }): Promise<string> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,  // Get complete response at once (not streaming)
        options: {
          temperature: 0.7,  // Creativity level (0-1, higher = more creative)
          num_predict: options?.num_predict || 50,   // Max tokens to generate
          stop: options?.num_predict ? [] : ['\n', '.', '!', '?']  // Stop at punctuation for commands only
        }
      }, {
        timeout: 30000  // 30 second timeout
      });

      // Ollama returns: { response: "the command" }
      const command = response.data.response || 'look';
      
      // Clean up the response (remove any extra text) only if short response
      if (!options?.num_predict || options.num_predict <= 50) {
        return command.split('\n')[0].trim().toLowerCase();
      }
      
      return command.trim();
      
    } catch (error: any) {
      if (error.code === 'ECONNREFUSED') {
        logger.error('Cannot connect to Ollama. Is it running? Start with: ollama serve');
        throw new Error('Ollama not running');
      }
      logger.error('Ollama API error:', error.message);
      throw error;
    }
  }

  /**
   * Analyze text to extract structured information using AI
   * 
   * This is more complex - asks AI to parse game text into structured JSON
   */
  async analyzeText(text: string, category: 'room' | 'npc' | 'item' | 'spell'): Promise<any> {
    const prompt = `Extract structured information from this MUD ${category} description.
Return ONLY a JSON object with relevant fields. No other text.

TEXT:
${text}

${this.getCategorySchema(category)}

JSON:`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,  // Lower temp for structured output
          num_predict: 500
        }
      });
      
      // Try to parse JSON from response
      const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {};
    } catch (error) {
      logger.error('AI analysis error:', error);
      return {};
    }
  }

  private getCategorySchema(category: string): string {
    const schemas = {
      room: `Return JSON with: name, description, exits (array), npcs (array), items (array), area`,
      npc: `Return JSON with: name, description, hostile (boolean), level, race, class`,
      item: `Return JSON with: name, description, type, weight, value, damage, armor`,
      spell: `Return JSON with: name, description, manaCost, level, type, effects (array)`
    };
    return schemas[category as keyof typeof schemas] || '';
  }

  /**
   * Test if Ollama is running and model is available
   */
  async testConnection(): Promise<boolean> {
    try {
      // Check if Ollama is running
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      
      // Check if our model is downloaded
      const models = response.data.models || [];
      const hasModel = models.some((m: any) => m.name.includes(this.model));
      
      if (!hasModel) {
        logger.warn(`Model ${this.model} not found. Download with: ollama pull ${this.model}`);
        return false;
      }
      
      logger.info(`✓ Ollama connected, model ${this.model} ready`);
      return true;
    } catch (error) {
      logger.error('Cannot connect to Ollama. Make sure it is running.');
      return false;
    }
  }

  /**
   * Extract significant keywords/objects from text that would be worth examining
   */
  async extractKeywords(text: string, maxItems: number = 3): Promise<string[]> {
    const prompt = `You are analyzing a room description from a MUD (text-based RPG) game. Your task is to identify ${maxItems} objects or features in this room that would be most interesting or useful to examine with a "look" command.

Room Description:
${text}

Instructions:
- Focus on tangible objects, architectural features, or interactive elements
- Prioritize items that might contain information, be valuable, or have special properties
- Avoid generic words like "room", "area", "place", "ground", "wall", "floor", "ceiling"
- Return only single words or short phrases (1-3 words max)
- If there are no interesting objects, return an empty list
- Be selective - only the most significant items

Return your answer as a simple comma-separated list of ${maxItems} items maximum. Example: "fountain, altar, sign"

Items:`;

    try {
      const response = await this.getOllamaResponse(prompt, { num_predict: 100 });

      // Parse the response - extract comma-separated items
      const items = response
        .split(',')
        .map(item => item.trim().toLowerCase())
        .filter(item => item.length > 0 && item.length <= 20) // Reasonable length limits
        .slice(0, maxItems); // Limit to requested number

      return items;

    } catch (error) {
      logger.error('AI keyword extraction failed:', error);
      return []; // Return empty array on failure
    }
  }

  /**
   * Ask AI to update the knowledge base with recent discoveries
   */
  async updateKnowledgeBase(currentKnowledge: string, recentDiscoveries: string): Promise<string> {
    const prompt = `You are maintaining a knowledge base for exploring a MUD game.

CURRENT KNOWLEDGE BASE:
${currentKnowledge}

RECENT DISCOVERIES FROM THIS SESSION:
${recentDiscoveries}

Update the knowledge base by:
1. Adding new commands to "Discovered Commands" section
2. Adding new rooms/locations to "Map & Navigation" section
3. Adding NPCs to "NPCs & Interactions" section
4. Adding items to "Items & Equipment" section
5. Adding any important lessons to "Lessons Learned" section
6. Keep existing information, just add/update with new discoveries
7. Maintain the same markdown structure

Return the COMPLETE updated knowledge base (all sections):`;

    try {
      const updated = await this.getOllamaResponse(prompt, { num_predict: 2000 });
      return updated;
    } catch (error) {
      logger.error('Error updating knowledge base with AI:', error);
      return currentKnowledge; // Return unchanged if error
    }
  }
}
