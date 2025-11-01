import { CrawlerTask, TaskConfig } from './TaskManager';
import { CommandDiscoveryAgent } from '../commandDiscovery';
import logger from '../logger';

/**
 * DocumentActionsTask - Systematically discover and document player actions
 * 
 * This task:
 * 1. Gets list of available commands from the game
 * 2. For each command, runs "help <command>" to get documentation
 * 3. Tests the command to see if it works
 * 4. Stores command info in the database
 */
export class DocumentActionsTask implements CrawlerTask {
  name = 'Document Player Actions';
  description = 'Discover and document all player commands with help text';

  private config: TaskConfig;
  private discoveryAgent: CommandDiscoveryAgent;
  private testedCommands: Set<string> = new Set();
  private existingActionsCache: Map<string, any> = new Map();

  constructor(config: TaskConfig) {
    this.config = config;
    const backendUrl = process.env.BACKEND_URL?.replace('/api', '') || 'http://localhost:3002';
    this.discoveryAgent = new CommandDiscoveryAgent(
      backendUrl,
      process.env.OLLAMA_URL || 'http://localhost:11434',
      process.env.OLLAMA_MODEL || 'llama3.2:3b'
    );
  }

  /**
   * Load existing player actions into cache to avoid repeated API calls
   */
  private async loadExistingActionsCache(): Promise<void> {
    try {
      const existingActions = await this.config.api.getAllPlayerActions();
      this.existingActionsCache.clear();
      
      for (const action of existingActions) {
        this.existingActionsCache.set(action.name, action);
      }
    } catch (error) {
      logger.warn('⚠️  Could not load existing actions cache, will process all commands:', error);
    }
  }

  /**
   * Check if a command is already fully documented
   */
  private isCommandFullyDocumented(command: string): boolean {
    const existingAction = this.existingActionsCache.get(command);
    if (!existingAction) return false;
    
    // Consider it fully documented if it has description/help text and at least one test result
    return existingAction.description && 
           existingAction.description.trim().length > 0 && 
           existingAction.testResults && 
           existingAction.testResults.length > 0;
  }

  async run(): Promise<void> {
    logger.info('📋 Starting player action documentation...');
    
    try {
      // Step 1: Get initial state
      logger.info('Step 1: Getting initial game state...');
      await this.delay(2000);
      const lookResponse = await this.config.mudClient.sendAndWait('look', 2000);
      logger.info('✓ Initial state received');

      // Step 2: Cache existing actions to avoid repeated API calls
      logger.info('Step 2: Loading existing player actions cache...');
      await this.loadExistingActionsCache();
      logger.info(`✓ Loaded ${this.existingActionsCache.size} existing actions`);

      // Step 3: Get list of commands
      logger.info('Step 3: Requesting command list...');
      const commandsResponse = await this.config.mudClient.sendAndWait('commands', 3000);
      logger.info(`✓ Commands list received (${commandsResponse.length} chars)`);
      
      // Parse commands from the response
      const commands = this.parseCommandsList(commandsResponse);
      logger.info(`✓ Parsed ${commands.length} commands from output`);

      // Step 4: Get help for each command (skip already documented ones)
      logger.info('Step 4: Getting help text for each command...');
      let processed = 0;
      let skipped = 0;
      
      for (const command of commands) {
        // Skip if already fully documented
        if (this.isCommandFullyDocumented(command)) {
          skipped++;
          logger.info(`[${processed + skipped}/${commands.length}] Skipping already documented: ${command}`);
          continue;
        }

        if (this.testedCommands.has(command)) {
          continue;
        }

        try {
          processed++;
          logger.info(`[${processed + skipped}/${commands.length}] Processing: ${command}`);
          
          // Get help text (handle pagination)
          const helpResponse = await this.getFullHelpText(command);
          
          // Test the command with multiple variations
          logger.info(`  Testing command execution...`);
          const testResults = await this.testCommandVariations(command, helpResponse);
          
          // Analyze the results (use the first test result for analysis)
          const firstTest = testResults[0] || { output: 'No test results', success: false };
          const analysis = await this.discoveryAgent.analyzeCommandResult(command, firstTest.output);
          
          // Store in database
          await this.storeCommandData(command, helpResponse, testResults, analysis);
          
          this.testedCommands.add(command);
          
          // Delay between commands
          await this.delay(this.config.delayBetweenActions);
          
          // Every 10 commands, reset context
          if (processed % 10 === 0) {
            logger.info('  Resetting context...');
            await this.config.mudClient.sendAndWait('look', 1000);
            await this.delay(1000);
          }
          
        } catch (error) {
          logger.error(`  Error processing command "${command}":`, error);
          await this.delay(2000);
        }

        // Check max actions limit
        if (processed >= this.config.maxActions) {
          logger.info(`⚠️  Reached max actions limit (${this.config.maxActions})`);
          break;
        }
      }

      logger.info('');
      logger.info(`✅ Documented ${processed} player actions (${skipped} already documented)`);
      logger.info(`📊 View results at: http://localhost:5173/admin (Player Actions section)`);

    } catch (error) {
      logger.error('❌ Document actions task failed:', error);
      throw error;
    }
  }

  /**
   * Parse commands list from game output
   */
  private parseCommandsList(output: string): string[] {
    const lines = output.split('\n');
    const commands: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip header lines, empty lines, or game messages
      if (!trimmed || 
          trimmed.includes('---') || 
          trimmed.toLowerCase().includes('commands are available') ||
          trimmed.toLowerCase().includes('the following') ||
          trimmed.toLowerCase().includes('available commands') ||
          trimmed.toLowerCase().includes('type') ||
          /^(the|a|an)\s+\w+\s+(arrives|leaves|is)/i.test(trimmed) ||
          /you are\s+\w+/i.test(trimmed)) {
        continue;
      }
      
      // Skip lines that look like status messages or prompts
      if (trimmed.includes('<') && trimmed.includes('>') && /\d+H\s+\d+M\s+\d+V/.test(trimmed)) {
        continue; // Character status line
      }
      
      // Split on multiple spaces (columnar format) and then on single spaces
      const tokens = trimmed.split(/\s{2,}/)
        .flatMap(segment => segment.split(/\s+/))
        .map(t => t.trim().toLowerCase())
        .filter(t => 
          t.length >= 2 && 
          t.length <= 20 && 
          /^[a-z0-9-]+$/.test(t) &&
          !t.match(/^\d+$/) &&
          !t.includes('command') && // Skip words containing "command"
          !t.includes('type') &&     // Skip words containing "type"
          !t.includes('help') &&     // Skip "help" if it's not a command
          !t.includes('quit') &&     // Skip "quit" if it's not a command
          !t.includes('exit')        // Skip "exit" if it's not a command
        );
      
      commands.push(...tokens);
    }

    // Remove duplicates and filter out obviously invalid commands
    const filteredCommands = [...new Set(commands)]
      .flatMap(cmd => this.splitCombinedCommands(cmd)) // Split combined commands
      .filter(cmd => {
        // Skip commands that are too long (likely combined words that couldn't be split)
        if (cmd.length > 15) return false;
        
        // Skip obviously invalid commands
        return cmd.length >= 2 && 
               cmd.length <= 20 && 
               /^[a-z0-9-]+$/.test(cmd) &&
               !cmd.match(/^\d+$/) &&
               !cmd.includes('command') && // Skip words containing "command"
               !cmd.includes('type') &&     // Skip words containing "type"
               !cmd.includes('help') &&     // Skip "help" if it's not a command
               !cmd.includes('quit') &&     // Skip "quit" if it's not a command
               !cmd.includes('exit');       // Skip "exit" if it's not a command
      });

    return filteredCommands;
  }

  /**
   * Attempt to split combined commands using pattern matching
   */
  private splitCombinedCommands(token: string): string[] {
    // If token is short enough, assume it's not combined
    if (token.length <= 15) {
      return [token];
    }

    const results: string[] = [];
    const commonWords = [
      'kick', 'palm', 'fist', 'wind', 'fire', 'ice', 'earth', 'lightning', 'thought', 'mind', 'shield',
      'rush', 'strike', 'blast', 'wave', 'orb', 'second', 'third', 'rampage', 'sell', 'punch',
      'assassinate', 'attributes', 'backstab', 'bash', 'berserk', 'bite', 'bleed', 'blind',
      'cast', 'charge', 'choke', 'claw', 'cleave', 'crush', 'cure', 'curse', 'dance', 'death',
      'defend', 'disarm', 'dodge', 'drain', 'drink', 'drop', 'dual', 'eat', 'enchant', 'flee',
      'focus', 'forge', 'gaze', 'grab', 'guard', 'hack', 'heal', 'hide', 'hunt', 'ignite',
      'impale', 'kick', 'kill', 'leap', 'light', 'lock', 'loot', 'magic', 'maul', 'meditate',
      'mend', 'missile', 'mount', 'move', 'murder', 'open', 'parry', 'pierce', 'poison',
      'pray', 'pummel', 'punch', 'rage', 'raise', 'ravage', 'rend', 'rescue', 'rest',
      'retreat', 'rip', 'roar', 'scan', 'scorch', 'scribe', 'search', 'shadow', 'shatter',
      'shock', 'shout', 'slam', 'slash', 'sleep', 'slice', 'smash', 'smite', 'snare',
      'sneak', 'sniff', 'snipe', 'soothe', 'spark', 'spear', 'spell', 'spin', 'spirit',
      'stab', 'steal', 'sting', 'stomp', 'storm', 'strike', 'stun', 'summon', 'sunder',
      'swipe', 'tail', 'tame', 'taunt', 'teleport', 'thrash', 'throw', 'thrust', 'toss',
      'track', 'trap', 'trip', 'turn', 'twist', 'unleash', 'vanish', 'vigor', 'vomit',
      'wail', 'walk', 'ward', 'warp', 'weave', 'whirl', 'whisper', 'wield', 'wound'
    ];

    // Try to find splits where both parts are valid commands
    for (let i = 2; i < token.length - 2; i++) {
      const part1 = token.substring(0, i);
      const part2 = token.substring(i);

      if (commonWords.includes(part1) && commonWords.includes(part2)) {
        results.push(part1, part2);
        return results; // Return immediately if we find a good split
      }
    }

    // If no perfect split found, try partial matches (prefix/suffix)
    for (let i = 3; i < token.length - 3; i++) {
      const part1 = token.substring(0, i);
      const part2 = token.substring(i);

      // Check if part1 ends with a common word ending and part2 starts with a common word beginning
      const part1EndsWith = commonWords.find(word => part1.endsWith(word));
      const part2StartsWith = commonWords.find(word => part2.startsWith(word));

      if (part1EndsWith && part2StartsWith && part1EndsWith !== part2StartsWith) {
        results.push(part1EndsWith, part2StartsWith);
        // Continue looking for more splits in the remaining parts
        const remaining1 = part1.substring(0, part1.length - part1EndsWith.length);
        const remaining2 = part2.substring(part2StartsWith.length);

        if (remaining1.length >= 3) {
          results.unshift(...this.splitCombinedCommands(remaining1));
        }
        if (remaining2.length >= 3) {
          results.push(...this.splitCombinedCommands(remaining2));
        }
        return results;
      }
    }

    // If still no split found, try to split on common patterns
    const patterns = [
      /(.+?)(kick|palm|fist|wind|fire|ice|earth|lightning|thought|mind|shield)(.+)/,
      /(.+)(rush|strike|blast|wave|orb|second|third|rampage|sell)$/
    ];

    for (const pattern of patterns) {
      const match = token.match(pattern);
      if (match) {
        const parts = match.slice(1).filter(p => p.length >= 2);
        if (parts.length >= 2) {
          // Recursively split any remaining combined parts
          const splitParts = parts.flatMap(part => this.splitCombinedCommands(part));
          results.push(...splitParts);
          return results;
        }
      }
    }

    // If no split found, return the original token
    return [token];
  }

  /**
   * Test command with multiple variations based on usage patterns
   */
  private async testCommandVariations(command: string, helpText: string): Promise<Array<{command: string, output: string, success: boolean}>> {
    const testResults: Array<{command: string, output: string, success: boolean}> = [];
    
    // Always test the basic command first
    try {
      const output = await this.config.mudClient.sendAndWait(command, 2000);
      const success = this.determineTestSuccess(output);
      testResults.push({ command, output, success });
    } catch (error) {
      logger.warn(`  Basic test failed for ${command}:`, error);
      testResults.push({ command, output: 'Command failed to execute', success: false });
    }

    // Generate additional test variations based on usage patterns
    const variations = this.generateTestVariations(command, helpText);
    
    for (const variation of variations.slice(0, 3)) { // Limit to 3 additional tests
      try {
        await this.delay(500); // Small delay between tests
        const output = await this.config.mudClient.sendAndWait(variation, 2000);
        const success = this.determineTestSuccess(output);
        testResults.push({ command: variation, output, success });
      } catch (error) {
        logger.warn(`  Variation test failed for ${variation}:`, error);
        testResults.push({ command: variation, output: 'Command variation failed to execute', success: false });
      }
    }

    return testResults;
  }

  /**
   * Generate test variations based on command usage patterns
   */
  private generateTestVariations(baseCommand: string, helpText: string): string[] {
    const variations: string[] = [];
    
    // Extract usage patterns from help text
    const usagePatterns = this.extractUsagePatterns(baseCommand, helpText);
    
    for (const pattern of usagePatterns) {
      // Replace placeholders with test values
      let variation = pattern;
      
      // Replace common placeholders
      variation = variation.replace(/<victim>/gi, 'testvictim');
      variation = variation.replace(/<target>/gi, 'testtarget');
      variation = variation.replace(/<person>/gi, 'testperson');
      variation = variation.replace(/<item>/gi, 'testitem');
      variation = variation.replace(/<direction>/gi, 'north');
      variation = variation.replace(/<door name>/gi, 'testdoor');
      variation = variation.replace(/<message>/gi, 'test message');
      variation = variation.replace(/<alias name>/gi, 'testalias');
      variation = variation.replace(/<command>/gi, 'look');
      
      // Replace numeric ranges with test values
      variation = variation.replace(/\d+-\d+/g, '1');
      
      // Only add if it's different from the base command
      if (variation !== baseCommand && variation.includes(baseCommand)) {
        variations.push(variation);
      }
    }
    
    return variations;
  }

  /**
   * Extract usage patterns from help text
   */
  private extractUsagePatterns(baseCommand: string, helpText: string): string[] {
    const patterns: string[] = [];
    const lines = helpText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for usage/syntax lines
      if (trimmed.toLowerCase().includes('usage:') || 
          trimmed.toLowerCase().includes('syntax:')) {
        const pattern = trimmed.split(':')[1]?.trim();
        if (pattern) {
          // Split on commas or pipes for multiple patterns
          const subPatterns = pattern.split(/\s*\|\s*|\s*,\s*/);
          patterns.push(...subPatterns.map(p => p.trim()));
        }
      }
      
      // Look for example lines
      if (trimmed.toLowerCase().includes('example') || 
          trimmed.startsWith('>') || 
          trimmed.startsWith(baseCommand + ' ')) {
        const example = trimmed.replace(/^>\s*/, '').replace(/^example:?\s*/i, '').trim();
        if (example && example !== baseCommand) {
          patterns.push(example);
        }
      }
    }
    
    return [...new Set(patterns)]; // Remove duplicates
  }

  /**
   * Determine if a test was successful based on output
   */
  private determineTestSuccess(output: string): boolean {
    const lowerOutput = output.toLowerCase();
    
    // Success indicators
    if (lowerOutput.includes('ok') || 
        lowerOutput.includes('done') || 
        lowerOutput.includes('success') ||
        lowerOutput.includes('enabled') ||
        lowerOutput.includes('disabled') ||
        lowerOutput.includes('set to') ||
        lowerOutput.includes('you ') ||
        lowerOutput.includes('your ')) {
      return true;
    }
    
    // Failure indicators
    if (lowerOutput.includes('you have no idea') ||
        lowerOutput.includes('you cannot') ||
        lowerOutput.includes('sorry') ||
        lowerOutput.includes('failed') ||
        lowerOutput.includes('error') ||
        lowerOutput.includes('unknown') ||
        lowerOutput.includes('invalid')) {
      return false;
    }
    
    // Default to success if we can't determine
    return true;
  }

  /**
   * Store command data in database (player_actions table)
   */
  private async storeCommandData(
    command: string,
    helpText: string,
    testResults: Array<{command: string, output: string, success: boolean}>,
    analysis: any
  ): Promise<void> {
    try {
      // Check if command already exists using cache
      const existingAction = this.existingActionsCache.get(command);

      // Extract examples from help text if available
      const examples = this.extractExamples(helpText);
      
      // Convert test results to the expected format
      const formattedTestResults = testResults.map(result => ({
        command_result: this.filterCommandOutput(result.output),
        tested_by_character: this.config.characterName,
        tested_at: new Date().toISOString(),
        character_class: this.config.characterClass
      }));

      // Calculate success/fail counts from all tests
      const successCount = testResults.filter(r => r.success).length;
      const failCount = testResults.filter(r => !r.success).length;

      if (existingAction) {
        // Update existing action - append to testResults array
        const updatedTestResults = [...(existingAction.testResults || []), ...formattedTestResults];
        
        const updateData: any = {
          lastTested: new Date().toISOString(),
          successCount: (existingAction.successCount || 0) + successCount,
          failCount: (existingAction.failCount || 0) + failCount,
          testResults: updatedTestResults
        };

        // Always update help text and other fields when we get fresh help text
        updateData.description = this.cleanHelpText(helpText);
        updateData.syntax = this.extractSyntax(helpText);
        updateData.examples = examples;
        updateData.category = analysis.category || existingAction.category || 'unknown';
        updateData.documented = true;

        await this.config.api.updatePlayerAction(command, updateData);
        
        // Update cache
        this.existingActionsCache.set(command, {
          ...existingAction,
          ...updateData,
          testResults: updatedTestResults
        });
        
        logger.info(`  ✓ Updated existing player action: ${command} (${updatedTestResults.length} test results)`);
      } else {
        // Create new action
        const playerActionData = {
          name: command,
          type: 'command',
          category: analysis.category || 'unknown',
          description: this.cleanHelpText(helpText), // Use help text as description
          syntax: this.extractSyntax(helpText),
          examples: examples,
          documented: true,
          discovered: new Date().toISOString(),
          lastTested: new Date().toISOString(),
          successCount: successCount,
          failCount: failCount,
          testResults: formattedTestResults
        };

        // Save to player_actions table using generic entity API
        await this.config.api.saveEntity('player_actions', playerActionData);
        
        // Add to cache
        this.existingActionsCache.set(command, playerActionData);
        
        logger.info(`  ✓ Created new player action: ${command} (${formattedTestResults.length} test results)`);
      }
    } catch (error) {
      logger.error(`  ⚠️  Could not store to player_actions table:`, error);
    }
  }

  /**
   * Get full help text, handling pagination by sending newlines
   */
  private async getFullHelpText(command: string): Promise<string> {
    const helpCommand = `help ${command}`;
    let fullResponse = '';
    let pageCount = 0;
    const maxPages = 10; // Prevent infinite loops

    while (pageCount < maxPages) {
      const response = pageCount === 0 
        ? await this.config.mudClient.sendAndWait(helpCommand, 2000)
        : await this.config.mudClient.sendAndWait('', 2000); // Send newline for next page
      
      fullResponse += response;
      pageCount++;

      // Check if pagination prompt is present
      if (!response.includes('Return to continue')) {
        break; // No more pages
      }

      logger.info(`  Got page ${pageCount}, continuing pagination...`);
    }

    if (pageCount >= maxPages) {
      logger.warn(`  ⚠️  Reached max pages (${maxPages}) for help ${command}, may be truncated`);
    }

    return fullResponse;
  }

  /**
   * Extract syntax from help text
   */
  private extractSyntax(helpText: string): string {
    const lines = helpText.split('\n');
    for (const line of lines) {
      if (line.toLowerCase().includes('syntax:') || line.toLowerCase().includes('usage:')) {
        return line.split(':')[1]?.trim() || '';
      }
    }
    return '';
  }

  /**
   * Extract examples from help text
   */
  private extractExamples(helpText: string): string {
    const lines = helpText.split('\n');
    const examples: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('example') || 
          (trimmed.startsWith('>') && trimmed.length > 3)) {
        // Extract the command part after '>'
        const example = trimmed.replace(/^>\s*/, '').trim();
        if (example) {
          examples.push(example);
        }
      }
    }
    
    return examples.join('; ');
  }

  /**
   * Clean help text for storage (remove pagination prompts, extra whitespace)
   */
  private cleanHelpText(helpText: string): string {
    let cleaned = helpText;

    // Remove ANSI color codes (Unicode escape)
    cleaned = cleaned.replace(/\u001b\[[0-9;]*[mG]/g, '');

    // Normalize line endings
    cleaned = cleaned.replace(/\r\n/g, '\n');

    // Split into lines for better processing
    const lines = cleaned.split('\n');
    const filteredLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) continue;

      // Skip status lines (character stats like "< 88H 134M 143V 5138X 901SP >")
      if (/^<\s*\d+H\s+\d+M\s+\d+V\s+\d+X\s+\d+SP\s*>$/.test(trimmed)) continue;

      // Skip hunger/thirst messages
      if (/^(You are (hungry|thirsty)\.)$/.test(trimmed)) continue;

      // Skip weather/time messages
      if (/^(The sky|It is now|The sun|The moon|The weather)/i.test(trimmed)) continue;

      // Skip random NPC/player events
      if (/^(Someone|A|An)\s+\w+\s+(arrives|leaves|gives|greetings|nods|waves|smiles)/i.test(trimmed)) continue;
      if (/^\w+\s+(arrives|leaves|gives|greetings|nods|waves|smiles)/i.test(trimmed)) continue;

      // Skip pagination prompts
      if (/\[.*?(Return to continue|quit|refresh|back|page number).*?\]/i.test(trimmed)) continue;
      if (/\[.*?\]/.test(trimmed) && trimmed.length < 50) continue; // Skip short bracketed content

      // Skip system messages
      if (/(Press enter|Make your choice|Enter the game)/i.test(trimmed)) continue;

      // Keep the line if it passes all filters
      filteredLines.push(line);
    }

    // Join back and clean up
    let result = filteredLines.join('\n');

    // Remove excessive whitespace
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    return result;
  }

  /**
   * Filter command output to remove unwanted artifacts
   * - ANSI color codes
   * - Random events/messages
   * - Status updates
   * - System prompts
   */
  private filterCommandOutput(output: string): string {
    let filtered = output;

    // Remove ANSI color codes (escape sequences) - do this first on the entire text
    filtered = filtered.replace(/\x1B\[[0-9;]*[mG]/g, '');

    // Remove pagination prompts and system messages from anywhere in the text
    filtered = filtered.replace(/\[.*?(Return to continue|quit|refresh|back|page number).*?\]/gi, '');
    filtered = filtered.replace(/Valid commands while paging are.*?\./gi, '');
    filtered = filtered.replace(/\[.*?\]/g, ''); // Remove any remaining bracketed content

    // Split into lines for better processing
    const lines = filtered.split('\n');
    const filteredLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) continue;

      // Skip status lines (character stats like "< 88H 134M 143V 5138X 901SP >")
      if (/^<\s*\d+H\s+\d+M\s+\d+V\s+\d+X\s+\d+SP\s*>$/.test(trimmed)) continue;

      // Skip hunger/thirst messages
      if (/^(You are (hungry|thirsty)\.)$/.test(trimmed)) continue;

      // Skip weather/time messages
      if (/^(The sky|It is now|The sun|The moon|The weather)/i.test(trimmed)) continue;

      // Skip random NPC/player events
      if (/^(Someone|A|An)\s+\w+\s+(arrives|leaves|gives|greetings|nods|waves|smiles)/i.test(trimmed)) continue;
      if (/^\w+\s+(arrives|leaves|gives|greetings|nods|waves|smiles)/i.test(trimmed)) continue;
      if (/^\w+\s+gives?\s+you/i.test(trimmed)) continue; // Nodri gives you...
      if (/^\w+\s+greets?\s+you/i.test(trimmed)) continue; // Nodri greets you...

      // Skip generic game messages that aren't command responses
      if (/^(Welcome|Goodbye|Thanks for playing|Please come again)/i.test(trimmed)) continue;

      // Skip system messages and prompts (additional patterns)
      if (/(Press enter|Make your choice|Enter the game)/i.test(trimmed)) continue;

      // Keep the line if it passes all filters
      filteredLines.push(line);
    }

    // Join back and clean up
    let result = filteredLines.join('\n');

    // Remove excessive whitespace
    result = result.replace(/\n{3,}/g, '\n\n').trim();

    // If result is empty or too short, return a generic message
    if (!result || result.length < 3) {
      return 'Command executed successfully (no output)';
    }

    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up document actions task...');
  }
}
