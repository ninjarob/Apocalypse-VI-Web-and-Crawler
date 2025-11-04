import { CrawlerTask, TaskConfig } from './TaskManager';
import { CrawlerState } from '../../../shared/types';
import { TextParser } from '../parser';
import logger from '../logger';

/**
 * LearnGameTask - Iteratively improve AI's game knowledge
 * 
 * This task:
 * 1. Explores the game world
 * 2. Learns from experiences
 * 3. Updates knowledge base regularly
 * 4. Improves AI decision-making over time
 */
export class LearnGameTask implements CrawlerTask {
  name = 'Learn Game';
  description = 'Iteratively improve AI knowledge through exploration';

  private config: TaskConfig;
  private parser: TextParser;
  private state: CrawlerState;
  private visitedRooms: Set<string> = new Set();
  private actionCount: number = 0;
  private learningCycles: number = 0;

  constructor(config: TaskConfig) {
    this.config = config;
    this.parser = new TextParser();
    
    this.state = {
      currentRoom: 'Unknown',
      visitedRooms: new Set(),
      commandHistory: [],
      lastAction: '',
      timestamp: new Date(),
      explorationMode: 'breadth',
      knownCommands: new Map(),
      contextualActions: new Set(['look', 'examine', 'inventory', 'score'])
    };
  }

  async run(): Promise<void> {
    logger.info('🎓 Starting game learning mode...');
    
    try {
      // Step 1: Get initial state
      logger.info('Step 1: Getting initial game state...');
      await this.delay(2000);
      const initialResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
      logger.info('✓ Initial state received');

      // Parse initial room
      const parsed = this.parser.parse(initialResponse);
      if (parsed.type === 'room' && parsed.data.name) {
        this.state.currentRoom = parsed.data.name;
        this.visitedRooms.add(parsed.data.name);
      }

      // Step 2: Learning loop
      logger.info('Step 2: Starting exploration and learning...');
      logger.info(`Will perform ${this.config.maxActions} actions`);

      while (this.actionCount < this.config.maxActions && this.config.mudClient.isConnected()) {
        try {
          // Get current game state
          const currentResponse = this.config.mudClient.getBuffer();
          
          // Parse the response
          const parsed = this.parser.parse(currentResponse);
          
          // Update state
          if (parsed.type === 'room' && parsed.data.name) {
            this.state.currentRoom = parsed.data.name;
            this.visitedRooms.add(parsed.data.name);
          }
          
          // Ask AI for next action with knowledge
          const nextCommand = await this.config.aiAgent.decideNextAction(
            currentResponse,
            this.state,
            Array.from(this.visitedRooms),
            this.config.knowledgeManager.getKnowledgeSummary()
          );
          
          // Execute command
          logger.info(`Action [${this.actionCount + 1}/${this.config.maxActions}]: ${nextCommand}`);
          await this.config.mudClient.send(nextCommand);
          this.state.commandHistory.push(nextCommand);
          this.state.lastAction = nextCommand;
          this.state.timestamp = new Date();
          
          this.actionCount++;
          
          // Wait for response
          await this.delay(1500);
          
          // Periodic knowledge updates
          if (this.actionCount % 20 === 0) {
            await this.updateKnowledgeBase();
            this.learningCycles++;
          }
          
          // Update crawler status
          await this.config.api.updateCrawlerStatus(
            `Learning: ${this.state.currentRoom} | Actions: ${this.actionCount}/${this.config.maxActions} | Cycles: ${this.learningCycles}`
          );
          
          // Delay between actions
          await this.delay(this.config.delayBetweenActions);
          
        } catch (error) {
          logger.error('Learning loop error:', error);
          await this.delay(3000);
        }
      }

      // Final knowledge update
      logger.info('');
      logger.info('📝 Performing final knowledge update...');
      await this.updateKnowledgeBase();

      logger.info('');
      logger.info(`✅ Learning complete!`);
      logger.info(`   Actions taken: ${this.actionCount}`);
      logger.info(`   Rooms visited: ${this.visitedRooms.size}`);
      logger.info(`   Learning cycles: ${this.learningCycles + 1}`);

    } catch (error) {
      logger.error('❌ Learn game task failed:', error);
      throw error;
    }
  }

  /**
   * Update the AI's knowledge base with new discoveries
   */
  private async updateKnowledgeBase(): Promise<void> {
    try {
      logger.info('🧠 Updating knowledge base...');
      
      // Get current game buffer for context
      const recentExperience = this.config.mudClient.getBuffer().slice(-2000);
      
      // Build recent discoveries summary
      const discoveries = `
Actions taken: ${this.actionCount}
Rooms visited: ${this.visitedRooms.size}
Current room: ${this.state.currentRoom}
Recent commands: ${this.state.commandHistory.slice(-10).join(', ')}

Recent game output:
${recentExperience}
`;

      // Get AI's knowledge update
      const currentKnowledge = this.config.knowledgeManager.getFullKnowledge();
      const updatedKnowledge = await this.config.aiAgent.updateKnowledgeBase(
        currentKnowledge,
        discoveries
      );
      
      // Save the updated knowledge
      await this.config.knowledgeManager.updateKnowledge(updatedKnowledge, this.actionCount);
      
      logger.info('✓ Knowledge base updated');
      
    } catch (error) {
      logger.error('Failed to update knowledge base:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up learn game task...');
  }
}
