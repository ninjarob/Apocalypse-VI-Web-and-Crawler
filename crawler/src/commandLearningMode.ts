import { MUDClient } from './mudClient';
import { CommandDiscoveryAgent } from './commandDiscovery';
import logger from './logger';

/**
 * CommandLearningMode - Focused crawler mode for discovering and documenting commands
 * 
 * This mode:
 * 1. Logs into the MUD
 * 2. Runs "help" to get available commands
 * 3. Systematically tests each command
 * 4. Documents results in the database
 * 5. Tests variations and parameters
 */
export class CommandLearningMode {
  private mudClient: MUDClient;
  private discoveryAgent: CommandDiscoveryAgent;
  private testedCommands: Set<string> = new Set();
  private delayBetweenCommands: number;

  constructor(
    mudClient: MUDClient,
    discoveryAgent: CommandDiscoveryAgent,
    delayMs: number = 1500
  ) {
    this.mudClient = mudClient;
    this.discoveryAgent = discoveryAgent;
    this.delayBetweenCommands = delayMs;
  }

  /**
   * Main command learning loop
   */
  async learn(): Promise<void> {
    logger.info('🎓 Starting Command Learning Mode');
    
    try {
      // Step 1: Get help text to discover commands
      logger.info('Step 1: Requesting help text...');
      await this.delay(2000); // Wait for login to settle
      
      const helpResponse = await this.mudClient.sendAndWait('help', 3000);
      logger.info(`Help response received (${helpResponse.length} chars)`);
      
      // Step 2: Parse help to discover commands
      logger.info('Step 2: Parsing help text for commands...');
      const discoveredCommands = await this.discoveryAgent.parseHelpOutput(helpResponse);
      logger.info(`Discovered ${discoveredCommands.length} commands from help`);
      
      // Step 3: Get common commands
      const commonCommands = this.discoveryAgent.getCommandsToTest();
      
      // Combine and deduplicate
      const allCommands = [...new Set([...commonCommands, ...discoveredCommands])];
      logger.info(`Total commands to test: ${allCommands.length}`);
      
      // Step 4: Test each command systematically
      logger.info('Step 3: Testing commands...');
      let commandsTested = 0;
      
      for (const command of allCommands) {
        if (this.testedCommands.has(command)) {
          continue; // Skip already tested
        }
        
        try {
          logger.info(`Testing command [${commandsTested + 1}/${allCommands.length}]: ${command}`);
          await this.testCommand(command);
          this.testedCommands.add(command);
          commandsTested++;
          
          // Delay between commands to avoid flooding
          await this.delay(this.delayBetweenCommands);
          
          // Every 10 commands, do a "look" to reset context
          if (commandsTested % 10 === 0) {
            logger.info('Resetting context with "look"...');
            await this.mudClient.sendAndWait('look', 1000);
            await this.delay(1000);
          }
          
        } catch (error) {
          logger.error(`Error testing command "${command}":`, error);
          await this.delay(2000); // Wait longer on error
        }
      }
      
      logger.info(`✅ Command learning complete! Tested ${commandsTested} commands`);
      
      // Step 5: Test command variations for important commands
      await this.testCommandVariations();
      
    } catch (error) {
      logger.error('Command learning mode error:', error);
      throw error;
    }
  }

  /**
   * Test a single command and document the results
   */
  private async testCommand(command: string): Promise<void> {
    try {
      // Send command and wait for response
      const response = await this.mudClient.sendAndWait(command, 2000);
      
      // Log for debugging
      logger.debug(`Command: ${command}`);
      logger.debug(`Response: ${response.substring(0, 200)}...`);
      
      // Use AI to analyze and document the result
      await this.discoveryAgent.testAndDocumentCommand(command, response);
      
    } catch (error) {
      logger.error(`Failed to test command "${command}":`, error);
    }
  }

  /**
   * Test variations of important commands to understand parameters
   */
  private async testCommandVariations(): Promise<void> {
    logger.info('Step 4: Testing command variations...');
    
    const importantCommands = [
      'look', 'examine', 'get', 'drop', 'kill', 'say', 'tell', 'go'
    ];
    
    for (const baseCommand of importantCommands) {
      if (!this.testedCommands.has(baseCommand)) {
        continue; // Skip if base command wasn't found
      }
      
      const variations = this.discoveryAgent.generateCommandVariations(baseCommand);
      logger.info(`Testing ${variations.length} variations of "${baseCommand}"`);
      
      for (const variation of variations) {
        if (variation === baseCommand) {
          continue; // Already tested
        }
        
        try {
          logger.info(`  Testing variation: ${variation}`);
          await this.testCommand(variation);
          await this.delay(this.delayBetweenCommands);
          
        } catch (error) {
          logger.error(`Error testing variation "${variation}":`, error);
        }
      }
    }
    
    logger.info('✅ Command variation testing complete');
  }

  /**
   * Test specific command categories
   */
  async testCategory(category: 'navigation' | 'combat' | 'interaction' | 'information'): Promise<void> {
    logger.info(`Testing ${category} commands...`);
    
    const categoryCommands: Record<string, string[]> = {
      navigation: ['north', 'south', 'east', 'west', 'up', 'down', 'look', 'exits'],
      combat: ['kill', 'attack', 'flee', 'consider', 'cast'],
      interaction: ['say', 'tell', 'talk', 'ask', 'give', 'get', 'drop'],
      information: ['score', 'inventory', 'equipment', 'who', 'help', 'time']
    };
    
    const commands = categoryCommands[category] || [];
    
    for (const command of commands) {
      await this.testCommand(command);
      await this.delay(this.delayBetweenCommands);
    }
  }

  /**
   * Get statistics about learned commands
   */
  getStats(): { total: number; tested: number } {
    return {
      total: this.discoveryAgent.getCommandsToTest().length,
      tested: this.testedCommands.size
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
