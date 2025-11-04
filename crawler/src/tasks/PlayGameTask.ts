import { CrawlerTask, TaskConfig } from './TaskManager';
import { CrawlerState } from '../../../shared/types';
import { TextParser } from '../parser';
import logger from '../logger';

/**
 * PlayGameTask - Autonomously play the game
 * 
 * This task:
 * 1. Uses current AI knowledge to play the game
 * 2. Explores, completes quests, fights, levels up
 * 3. Makes decisions like a player would
 * 4. Does NOT focus on learning, just playing
 */
export class PlayGameTask implements CrawlerTask {
  name = 'Play Game';
  description = 'Play the game autonomously using current knowledge';

  private config: TaskConfig;
  private parser: TextParser;
  private state: CrawlerState;
  private visitedRooms: Set<string> = new Set();
  private actionCount: number = 0;
  private achievements: string[] = [];

  constructor(config: TaskConfig) {
    this.config = config;
    this.parser = new TextParser();
    
    this.state = {
      currentRoom: 'Unknown',
      visitedRooms: new Set(),
      commandHistory: [],
      lastAction: '',
      timestamp: new Date(),
      explorationMode: 'breadth', // Use breadth-first for general gameplay
      knownCommands: new Map(),
      contextualActions: new Set(['look', 'examine', 'inventory', 'score'])
    };
  }

  async run(): Promise<void> {
    logger.info('🎮 Starting game play mode...');
    logger.info('The AI will play the game using its current knowledge');
    
    try {
      // Step 1: Get initial state and check character
      logger.info('Step 1: Checking character status...');
      await this.delay(2000);
      
      const scoreResponse = await this.config.mudClient.sendAndWait('score', this.config.delayBetweenActions);
      logger.info('Character status:');
      logger.info(scoreResponse.slice(0, 300));
      
      await this.delay(1000);
      const lookResponse = await this.config.mudClient.sendAndWait('look', this.config.delayBetweenActions);
      
      // Parse initial room
      const parsed = this.parser.parse(lookResponse);
      if (parsed.type === 'room' && parsed.data.name) {
        this.state.currentRoom = parsed.data.name;
        this.visitedRooms.add(parsed.data.name);
      }

      // Step 2: Game play loop
      logger.info('');
      logger.info('Step 2: Starting gameplay...');
      logger.info(`Will play for ${this.config.maxActions} actions`);
      logger.info('');

      while (this.actionCount < this.config.maxActions && this.config.mudClient.isConnected()) {
        try {
          // Get current game state
          const currentResponse = this.config.mudClient.getBuffer();
          
          // Parse the response
          const parsed = this.parser.parse(currentResponse);
          
          // Update state
          if (parsed.type === 'room' && parsed.data.name) {
            this.state.currentRoom = parsed.data.name;
            
            // Check if this is a new room
            if (!this.visitedRooms.has(parsed.data.name)) {
              this.visitedRooms.add(parsed.data.name);
              logger.info(`🗺️  Discovered new room: ${parsed.data.name}`);
              this.achievements.push(`Discovered ${parsed.data.name}`);
            }
          }
          
          // Check for achievements in the response
          this.detectAchievements(currentResponse);
          
          // Ask AI for next action with full knowledge context
          const nextCommand = await this.config.aiAgent.decideNextAction(
            currentResponse,
            this.state,
            Array.from(this.visitedRooms),
            this.config.knowledgeManager.getKnowledgeSummary()
          );
          
          // Execute command
          logger.info(`[${this.actionCount + 1}/${this.config.maxActions}] ${this.state.currentRoom}: ${nextCommand}`);
          await this.config.mudClient.send(nextCommand);
          this.state.commandHistory.push(nextCommand);
          this.state.lastAction = nextCommand;
          this.state.timestamp = new Date();
          
          this.actionCount++;
          
          // Wait for response
          await this.delay(1500);
          
          // Update crawler status
          if (this.actionCount % 5 === 0) {
            await this.config.api.updateCrawlerStatus(
              `Playing: ${this.state.currentRoom} | Actions: ${this.actionCount}/${this.config.maxActions} | Rooms: ${this.visitedRooms.size}`
            );
          }
          
          // Delay between actions
          await this.delay(this.config.delayBetweenActions);
          
        } catch (error) {
          logger.error('Gameplay loop error:', error);
          await this.delay(3000);
        }
      }

      // Summary
      logger.info('');
      logger.info('='.repeat(70));
      logger.info('🎮 GAME SESSION SUMMARY');
      logger.info('='.repeat(70));
      logger.info(`Actions taken: ${this.actionCount}`);
      logger.info(`Rooms explored: ${this.visitedRooms.size}`);
      logger.info(`Achievements: ${this.achievements.length}`);
      
      if (this.achievements.length > 0) {
        logger.info('');
        logger.info('🏆 Achievements:');
        this.achievements.slice(0, 10).forEach(a => logger.info(`   - ${a}`));
        if (this.achievements.length > 10) {
          logger.info(`   ... and ${this.achievements.length - 10} more`);
        }
      }
      
      logger.info('='.repeat(70));

    } catch (error) {
      logger.error('❌ Play game task failed:', error);
      throw error;
    }
  }

  /**
   * Detect achievements or significant events from game output
   */
  private detectAchievements(response: string): void {
    const lower = response.toLowerCase();
    
    // Level up
    if (lower.includes('level up') || lower.includes('gained a level')) {
      const achievement = 'Leveled up!';
      if (!this.achievements.includes(achievement)) {
        this.achievements.push(achievement);
        logger.info(`🎉 ${achievement}`);
      }
    }
    
    // Quest completed
    if (lower.includes('quest complete') || lower.includes('completed quest')) {
      const achievement = 'Completed a quest';
      if (!this.achievements.includes(achievement)) {
        this.achievements.push(achievement);
        logger.info(`🎉 ${achievement}`);
      }
    }
    
    // Killed enemy
    if (lower.includes('you killed') || lower.includes('is dead')) {
      const match = response.match(/(?:killed|defeated)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i);
      if (match) {
        const achievement = `Defeated ${match[1]}`;
        if (!this.achievements.includes(achievement)) {
          this.achievements.push(achievement);
          logger.info(`⚔️  ${achievement}`);
        }
      }
    }
    
    // Found item
    if (lower.includes('you get') || lower.includes('you take') || lower.includes('you found')) {
      const match = response.match(/(?:get|take|found)\s+(?:a|an|the)\s+(\w+(?:\s+\w+)?)/i);
      if (match) {
        const achievement = `Acquired ${match[1]}`;
        if (!this.achievements.includes(achievement)) {
          this.achievements.push(achievement);
          logger.info(`💎 ${achievement}`);
        }
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up play game task...');
  }
}
