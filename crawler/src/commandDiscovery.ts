import axios from 'axios';
import logger from './logger';

/**
 * CommandDiscoveryAgent - Systematically discovers and documents MUD commands
 * 
 * This agent's job:
 * 1. Start with common MUD commands
 * 2. Parse "help" output to discover more commands
 * 3. Test each command with various syntaxes
 * 4. Document what works, what fails, and why
 * 5. Build a comprehensive command database
 */
export class CommandDiscoveryAgent {
  private ollamaUrl: string;
  private model: string;
  private backendUrl: string;
  
  // Common MUD commands to test
  private commonCommands = [
    // Information
    'help', 'commands', 'score', 'stats', 'status', 'who', 'time', 'weather',
    'inventory', 'inv', 'equipment', 'eq', 'affects', 'skills', 'spells',
    
    // Navigation
    'north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd',
    'look', 'l', 'exits', 'scan', 'search',
    
    // Interaction
    'say', 'tell', 'whisper', 'shout', 'emote', 'talk', 'ask', 'answer',
    'get', 'take', 'drop', 'give', 'put', 'wear', 'remove', 'wield', 'hold',
    'eat', 'drink', 'use', 'open', 'close', 'lock', 'unlock',
    
    // Combat
    'kill', 'attack', 'hit', 'flee', 'cast', 'backstab', 'bash', 'kick',
    
    // Social
    'follow', 'group', 'split', 'consider', 'compare',
    
    // Advanced
    'practice', 'train', 'buy', 'sell', 'list', 'value', 'repair',
    'save', 'quit', 'sleep', 'rest', 'stand', 'sit',
  ];

  constructor(
    backendUrl: string = 'http://localhost:3000',
    ollamaUrl: string = 'http://localhost:11434',
    model: string = 'llama3.2:3b'
  ) {
    this.backendUrl = backendUrl;
    this.ollamaUrl = ollamaUrl;
    this.model = model;
  }

  /**
   * Parse "help" command output to discover additional commands
   */
  async parseHelpOutput(helpText: string): Promise<string[]> {
    const prompt = `Extract ALL command names from this MUD help text.
Return ONLY a comma-separated list of command names, nothing else.

HELP TEXT:
${helpText}

Commands:`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.2,
          num_predict: 200
        }
      });

      const commandText = response.data.response || '';
      const commands = commandText
        .split(/[,\s\n]+/)
        .map((cmd: string) => cmd.trim().toLowerCase())
        .filter((cmd: string) => cmd.length > 0 && cmd.length < 20);

      logger.info(`Discovered ${commands.length} commands from help text`);
      return commands;

    } catch (error) {
      logger.error('Error parsing help text:', error);
      return [];
    }
  }

  /**
   * Analyze command output to determine if it succeeded or failed
   */
  async analyzeCommandResult(command: string, output: string): Promise<{
    success: boolean;
    category: string;
    description: string;
    requiresArguments: boolean;
    errorMessage?: string;
  }> {
    const prompt = `Analyze this MUD command result and determine if the command worked.

COMMAND: ${command}
OUTPUT:
${output}

Respond with JSON only:
{
  "success": true/false,
  "category": "navigation|combat|interaction|information|inventory|social|system",
  "description": "brief description of what the command does",
  "requiresArguments": true/false,
  "errorMessage": "error message if failed, or null"
}`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 150
        }
      });

      const jsonMatch = response.data.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback: simple pattern matching
      return this.simpleFallbackAnalysis(command, output);

    } catch (error) {
      logger.error('Error analyzing command result:', error);
      return this.simpleFallbackAnalysis(command, output);
    }
  }

  /**
   * Simple fallback analysis using pattern matching
   */
  private simpleFallbackAnalysis(command: string, output: string): any {
    const lowerOutput = output.toLowerCase();
    
    const failurePatterns = [
      'huh?', 'what?', 'you can\'t', 'invalid', 'unknown command',
      'not found', 'don\'t understand', 'bad command', 'syntax error',
      'you need', 'you must', 'requires'
    ];

    const requiresArgsPatterns = [
      'syntax:', 'usage:', 'requires', 'specify', 'who?', 'what?', 'where?'
    ];

    const success = !failurePatterns.some(pattern => lowerOutput.includes(pattern));
    const requiresArguments = requiresArgsPatterns.some(pattern => lowerOutput.includes(pattern));

    return {
      success,
      category: this.guessCategory(command),
      description: `Command: ${command}`,
      requiresArguments,
      errorMessage: success ? null : 'Command failed or not recognized'
    };
  }

  /**
   * Guess command category based on name
   */
  private guessCategory(command: string): string {
    const categories: Record<string, string[]> = {
      navigation: ['north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd', 'go', 'enter', 'leave'],
      information: ['look', 'examine', 'score', 'stats', 'who', 'help', 'commands', 'time', 'weather', 'scan', 'search'],
      inventory: ['inventory', 'inv', 'get', 'take', 'drop', 'give', 'equipment', 'eq', 'wear', 'remove', 'wield', 'hold'],
      combat: ['kill', 'attack', 'hit', 'flee', 'cast', 'fight', 'bash', 'kick', 'backstab'],
      interaction: ['say', 'tell', 'talk', 'ask', 'whisper', 'shout', 'emote', 'give'],
      social: ['follow', 'group', 'split', 'bow', 'wave', 'smile', 'nod'],
      system: ['save', 'quit', 'sleep', 'rest', 'stand', 'sit', 'practice', 'train']
    };

    for (const [category, commands] of Object.entries(categories)) {
      if (commands.includes(command.toLowerCase())) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Test a command and save results to database
   */
  async testAndDocumentCommand(command: string, output: string): Promise<void> {
    const analysis = await this.analyzeCommandResult(command, output);

    const commandData = {
      name: command,
      category: analysis.category,
      description: analysis.description,
      tested: true,
      workingStatus: analysis.success ? 'working' : (analysis.requiresArguments ? 'requires-args' : 'failed'),
      testResults: [{
        input: command,
        output: output.substring(0, 500), // Limit size
        timestamp: new Date(),
        success: analysis.success
      }],
      successPatterns: analysis.success ? [output.substring(0, 100)] : [],
      failurePatterns: !analysis.success && analysis.errorMessage ? [analysis.errorMessage] : [],
      discovered: new Date()
    };

    try {
      // Save to backend
      await axios.post(`${this.backendUrl}/api/commands`, commandData);
      logger.info(`✓ Documented command: ${command} (${analysis.category})`);
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Command already exists, update it
        await axios.put(`${this.backendUrl}/api/commands/${command}`, commandData);
        logger.info(`✓ Updated command: ${command}`);
      } else {
        logger.error(`Error saving command ${command}:`, error.message);
      }
    }
  }

  /**
   * Get list of commands to test (combines common + discovered)
   */
  getCommandsToTest(): string[] {
    return [...this.commonCommands];
  }

  /**
   * Generate variations of a command to test different syntaxes
   */
  generateCommandVariations(command: string): string[] {
    const variations: string[] = [command];

    // Add common variations
    const testTargets = ['sword', 'guard', 'potion', 'door'];
    const testDirections = ['north', 'south'];

    // Commands that typically take a target
    if (['look', 'examine', 'get', 'take', 'drop', 'kill', 'attack', 'give', 'talk'].includes(command)) {
      testTargets.forEach(target => {
        variations.push(`${command} ${target}`);
        variations.push(`${command} at ${target}`);
      });
    }

    // Commands that take direction
    if (['go', 'move', 'run'].includes(command)) {
      testDirections.forEach(dir => variations.push(`${command} ${dir}`));
    }

    // Commands that take text
    if (['say', 'shout', 'whisper', 'emote'].includes(command)) {
      variations.push(`${command} hello`);
    }

    return variations;
  }
}
