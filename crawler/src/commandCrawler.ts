import dotenv from 'dotenv';
import { MUDClient } from './mudClient';
import { CommandDiscoveryAgent } from './commandDiscovery';
import { CommandLearningMode } from './commandLearningMode';
import logger from './logger';

dotenv.config();

/**
 * Command Discovery Crawler
 * 
 * This is a specialized crawler that focuses ONLY on discovering and documenting
 * all available commands in the MUD game.
 * 
 * Usage: node dist/commandCrawler.js
 */
class CommandCrawler {
  private mudClient: MUDClient;
  private discoveryAgent: CommandDiscoveryAgent;
  private learningMode: CommandLearningMode;

  constructor() {
    const mudHost = process.env.MUD_HOST || 'apocalypse6.com';
    const mudPort = parseInt(process.env.MUD_PORT || '6000');
    const username = process.env.MUD_USERNAME || 'Pocket';
    const password = process.env.MUD_PASSWORD || 'P0ck3t';
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002';
    const delayBetweenCommands = parseInt(process.env.DELAY_BETWEEN_COMMANDS_MS || '1500');

    this.mudClient = new MUDClient(mudHost, mudPort, username, password);
    this.discoveryAgent = new CommandDiscoveryAgent(backendUrl + '/api', ollamaUrl, ollamaModel);
    this.learningMode = new CommandLearningMode(
      this.mudClient,
      this.discoveryAgent,
      delayBetweenCommands
    );
  }

  async start(): Promise<void> {
    try {
      logger.info('='.repeat(60));
      logger.info('🤖 MUD COMMAND DISCOVERY CRAWLER');
      logger.info('='.repeat(60));
      logger.info('');
      logger.info('Goal: Discover and document ALL available commands');
      logger.info('');
      
      // Step 1: Connect to MUD
      logger.info('Connecting to MUD...');
      await this.mudClient.connect();
      logger.info('✓ Connected to MUD');
      
      // Wait for login to complete
      logger.info('Waiting for login to complete...');
      await this.delay(4000);
      
      // Get initial state
      const initialState = await this.mudClient.sendAndWait('look', 2000);
      logger.info('✓ Login successful, initial state received');
      logger.info('');
      
      // Step 2: Start command learning
      logger.info('Starting command discovery...');
      logger.info('');
      await this.learningMode.learn();
      
      // Step 3: Show statistics
      const stats = this.learningMode.getStats();
      logger.info('');
      logger.info('='.repeat(60));
      logger.info('📊 COMMAND DISCOVERY STATISTICS');
      logger.info('='.repeat(60));
      logger.info(`Total commands tested: ${stats.tested}`);
      logger.info(`Base command list: ${stats.total}`);
      logger.info('');
      logger.info('✅ Command discovery complete!');
      logger.info('View results at: http://localhost:5173/commands');
      logger.info('');
      
    } catch (error) {
      logger.error('Command crawler error:', error);
    } finally {
      // Disconnect
      logger.info('Disconnecting from MUD...');
      await this.mudClient.disconnect();
      logger.info('✓ Disconnected');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Start the command crawler
const crawler = new CommandCrawler();
crawler.start().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
