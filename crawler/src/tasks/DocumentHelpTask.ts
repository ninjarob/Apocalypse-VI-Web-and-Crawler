import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';

/**
 * DocumentHelpTask - Document general help topics and game knowledge
 * 
 * This task:
 * 1. Explores general help topics (not tied to specific commands)
 * 2. Documents game lore, mechanics, rules
 * 3. Stores in a help/knowledge database
 * 
 * Note: May require backend updates to store general help text
 */
export class DocumentHelpTask implements CrawlerTask {
  name = 'Document General Help';
  description = 'Document general help topics and game knowledge';

  private config: TaskConfig;
  private helpTopics: string[] = [
    'help',
    'newbie',
    'getting started',
    'tutorial',
    'rules',
    'combat',
    'leveling',
    'classes',
    'races',
    'skills',
    'spells',
    'equipment',
    'stats',
    'attributes',
    'experience',
    'death',
    'commands',
    'communication',
    'groups',
    'guilds',
    'quests',
    'shops',
    'crafting',
    'magic',
    'world',
    'lore',
    'map',
    'areas'
  ];

  constructor(config: TaskConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    logger.info('📚 Starting general help documentation...');
    
    try {
      // Step 1: Get initial state
      logger.info('Step 1: Getting initial game state...');
      await this.delay(2000);
      await this.config.mudClient.sendAndWait('look', 2000);

      // Step 2: Try each help topic
      logger.info(`Step 2: Documenting ${this.helpTopics.length} help topics...`);
      let documented = 0;

      for (const topic of this.helpTopics) {
        try {
          documented++;
          logger.info(`[${documented}/${this.helpTopics.length}] Topic: ${topic}`);

          // Get help text for this topic
          const helpCommand = `help ${topic}`;
          const response = await this.config.mudClient.sendAndWait(helpCommand, 3000);
          
          // Check if we got useful help text
          if (this.isValidHelpText(response)) {
            await this.storeHelpTopic(topic, response);
            logger.info(`  ✓ Documented help topic`);
          } else {
            logger.info(`  ⚠️  No help available for this topic`);
          }

          // Delay between requests
          await this.delay(this.config.delayBetweenActions);

          // Every 5 topics, reset context
          if (documented % 5 === 0) {
            logger.info('  Resetting context...');
            await this.config.mudClient.sendAndWait('look', 1000);
            await this.delay(1000);
          }

        } catch (error) {
          logger.error(`  Error documenting topic "${topic}":`, error);
          await this.delay(2000);
        }

        // Check max actions limit
        if (documented >= this.config.maxActions) {
          logger.info(`⚠️  Reached max actions limit (${this.config.maxActions})`);
          break;
        }
      }

      logger.info('');
      logger.info(`✅ Documented ${documented} help topics`);

    } catch (error) {
      logger.error('❌ Document help task failed:', error);
      throw error;
    }
  }

  /**
   * Check if the response contains valid help text
   */
  private isValidHelpText(response: string): boolean {
    const lowerResponse = response.toLowerCase();
    
    // Check for common "no help" messages
    const noHelpIndicators = [
      'no help available',
      'help not found',
      'no such help topic',
      'unknown help',
      'huh?',
      "what?",
      "i don't understand"
    ];

    for (const indicator of noHelpIndicators) {
      if (lowerResponse.includes(indicator)) {
        return false;
      }
    }

    // Must have some content
    return response.trim().length > 20;
  }

  /**
   * Store help topic in knowledge base
   * For now, store in knowledge manager. Later, we can add backend support.
   */
  private async storeHelpTopic(topic: string, helpText: string): Promise<void> {
    try {
      // Update the knowledge manager with this help text
      this.config.knowledgeManager.addHelpTopic(topic, helpText);
      
      // TODO: Once backend supports general help storage, also save there
      // await this.config.api.saveHelpTopic({ topic, content: helpText });
      
    } catch (error) {
      logger.error(`  ⚠️  Could not store help topic:`, error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up document help task...');
    // Save the updated knowledge base
    this.config.knowledgeManager.forceSave();
  }
}
