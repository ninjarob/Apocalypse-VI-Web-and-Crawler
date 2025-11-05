import { MUDClient } from '../mudClient';
import { AIAgent } from '../aiAgent';
import { BackendAPI } from '../api';
import { KnowledgeManager } from '../knowledgeManager';
import logger from '../logger';

/**
 * Base Task interface - all crawler tasks implement this
 */
export interface CrawlerTask {
  name: string;
  description: string;
  run(): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * Task configuration passed to all tasks
 */
export interface TaskConfig {
  mudClient: MUDClient;
  aiAgent: AIAgent;
  api: BackendAPI;
  knowledgeManager: KnowledgeManager;
  delayBetweenActions: number;
  maxActions: number;
  characterName: string;
  characterClass: string;
  characterLevel: number;
}

/**
 * TaskManager - Manages different crawler task modes
 * 
 * Tasks:
 * - document-actions: Discover and document player actions (commands) with help text
 * - document-help: Document general help topics and game knowledge
 * - document-zone: Map all rooms in a zone with objects and exits
 * - learn-game: Iteratively improve the AI's game knowledge base
 * - play-game: Play the game using current knowledge
 */
export class TaskManager {
  private config: TaskConfig;
  private currentTask: CrawlerTask | null = null;

  constructor(config: TaskConfig) {
    this.config = config;
  }

  /**
   * Get available task types
   */
  static getAvailableTasks(): string[] {
    return [
      'document-actions',
      'document-help',
      'document-zone',
      'document-zone-new',
      'document-room',
      'learn-game',
      'play-game'
    ];
  }

  /**
   * Get task description
   */
  static getTaskDescription(taskType: string): string {
    const descriptions: Record<string, string> = {
      'document-actions': 'Systematically discover and document player actions (commands) with help text',
      'document-help': 'Document general help topics and non-action game knowledge',
      'document-zone': 'Map all rooms in a zone with objects, exits, and descriptions (old method)',
      'document-zone-new': 'New coordinate-based zone exploration starting from 0,0,0 with exit tracking',
      'document-room': 'Thoroughly document the current room and its features',
      'learn-game': 'Iteratively improve AI knowledge base through exploration and learning',
      'play-game': 'Play the game autonomously using current AI knowledge'
    };
    return descriptions[taskType] || 'Unknown task';
  }

  /**
   * Create and run a specific task
   */
  async runTask(taskType: string): Promise<void> {
    logger.info('='.repeat(70));
    logger.info(`🎯 Starting Task: ${taskType.toUpperCase()}`);
    logger.info(`📋 ${TaskManager.getTaskDescription(taskType)}`);
    logger.info('='.repeat(70));
    logger.info('');

    try {
      // Dynamically import the appropriate task class
      const task = await this.createTask(taskType);
      this.currentTask = task;

      // Run the task
      await task.run();

      logger.info('');
      logger.info('='.repeat(70));
      logger.info(`✅ Task Complete: ${taskType}`);
      logger.info('='.repeat(70));

    } catch (error) {
      logger.error(`❌ Task failed: ${taskType}`, error);
      throw error;
    } finally {
      if (this.currentTask) {
        await this.currentTask.cleanup();
        this.currentTask = null;
      }
    }
  }

  /**
   * Create a task instance based on type
   */
  private async createTask(taskType: string): Promise<CrawlerTask> {
    switch (taskType) {
      case 'document-actions': {
        const { DocumentActionsTask } = await import('./DocumentActionsTask');
        return new DocumentActionsTask(this.config);
      }
      case 'document-help': {
        const { DocumentHelpTask } = await import('./DocumentHelpTask');
        return new DocumentHelpTask(this.config);
      }
      case 'document-zone': {
        const { DocumentZoneTask } = await import('./DocumentZoneTask_OLD');
        return new DocumentZoneTask(this.config);
      }
      case 'document-zone-new': {
        const { CoordinateBasedZoneCrawler } = await import('./CoordinateBasedZoneCrawler');
        return new CoordinateBasedZoneCrawler(this.config);
      }
      case 'document-room': {
        const { DocumentRoomTask } = await import('./DocumentRoomTask');
        return new DocumentRoomTask(this.config);
      }
      case 'learn-game': {
        const { LearnGameTask } = await import('./LearnGameTask');
        return new LearnGameTask(this.config);
      }
      case 'play-game': {
        const { PlayGameTask } = await import('./PlayGameTask');
        return new PlayGameTask(this.config);
      }
      default:
        throw new Error(`Unknown task type: ${taskType}. Available: ${TaskManager.getAvailableTasks().join(', ')}`);
    }
  }

  /**
   * Utility: Delay helper
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
