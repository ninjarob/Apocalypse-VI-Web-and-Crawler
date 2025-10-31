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

  constructor(config: TaskConfig) {
    this.config = config;
    const backendUrl = process.env.BACKEND_URL?.replace('/api', '') || 'http://localhost:3002';
    this.discoveryAgent = new CommandDiscoveryAgent(
      backendUrl,
      process.env.OLLAMA_URL || 'http://localhost:11434',
      process.env.OLLAMA_MODEL || 'llama3.2:3b'
    );
  }

  async run(): Promise<void> {
    logger.info('📋 Starting player action documentation...');
    
    try {
      // Step 1: Get initial state
      logger.info('Step 1: Getting initial game state...');
      await this.delay(2000);
      const lookResponse = await this.config.mudClient.sendAndWait('look', 2000);
      logger.info('✓ Initial state received');

      // Step 2: Get list of commands
      logger.info('Step 2: Requesting command list...');
      const commandsResponse = await this.config.mudClient.sendAndWait('commands', 3000);
      logger.info(`✓ Commands list received (${commandsResponse.length} chars)`);
      
      // Parse commands from the response
      const commands = this.parseCommandsList(commandsResponse);
      logger.info(`✓ Parsed ${commands.length} commands from output`);

      // Step 3: Get help for each command
      logger.info('Step 3: Getting help text for each command...');
      let processed = 0;
      
      for (const command of commands) {
        if (this.testedCommands.has(command)) {
          continue;
        }

        try {
          processed++;
          logger.info(`[${processed}/${commands.length}] Processing: ${command}`);
          
          // Get help text (handle pagination)
          const helpResponse = await this.getFullHelpText(command);
          
          // Test the command
          logger.info(`  Testing command execution...`);
          const testResponse = await this.config.mudClient.sendAndWait(command, 2000);
          
          // Analyze the results
          const analysis = await this.discoveryAgent.analyzeCommandResult(command, testResponse);
          
          // Store in database
          await this.storeCommandData(command, helpResponse, testResponse, analysis);
          
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
      logger.info(`✅ Documented ${processed} player actions`);
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
          /^(the|a|an)\s+\w+\s+(arrives|leaves|is)/i.test(trimmed) ||
          /you are\s+\w+/i.test(trimmed)) {
        continue;
      }
      
      // Split on multiple spaces (columnar format) and then on single spaces
      const tokens = trimmed.split(/\s{2,}/)
        .flatMap(segment => segment.split(/\s+/))
        .map(t => t.trim().toLowerCase())
        .filter(t => 
          t.length >= 2 && 
          t.length <= 20 && 
          /^[a-z0-9-]+$/.test(t) &&
          !t.match(/^\d+$/)
        );
      
      commands.push(...tokens);
    }

    // Deduplicate
    return [...new Set(commands)];
  }

  /**
   * Store command data in database (player_actions table)
   */
  private async storeCommandData(
    command: string,
    helpText: string,
    testOutput: string,
    analysis: any
  ): Promise<void> {
    try {
      const playerActionData = {
        name: command,
        type: 'command',
        category: analysis.category || 'unknown',
        description: analysis.description || helpText.slice(0, 200),
        syntax: this.extractSyntax(helpText),
        documented: true,
        discovered: new Date().toISOString(),
        lastTested: new Date().toISOString(),
        successCount: analysis.success ? 1 : 0,
        failCount: analysis.success ? 0 : 1,
        testResults: [{
          command_result: testOutput,
          tested_by_character: this.config.characterName,
          tested_at: new Date().toISOString(),
          character_class: this.config.characterClass
        }]
      };

      // Save to player_actions table using generic entity API
      await this.config.api.saveEntity('player_actions', playerActionData);
      logger.info(`  ✓ Saved to player_actions table`);
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up document actions task...');
  }
}
