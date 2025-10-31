import dotenv from 'dotenv';
import path from 'path';
import { MUDClient } from './mudClient';
import { AIAgent } from './aiAgent';
import { BackendAPI } from './api';
import logger from './logger';
import { LogArchiver } from './logArchiver';
import { KnowledgeManager } from './knowledgeManager';
import { TaskManager } from './tasks/TaskManager';

// Load .env from crawler directory (one level up from src/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  const logArchiver = new LogArchiver('logs', 'logs/archive', 60000);
  let mudClient: MUDClient | null = null;

  try {
    const args = process.argv.slice(2);
    const taskArg = args.find(arg => arg.startsWith('--task='));
    const taskType = taskArg ? taskArg.split('=')[1] : null;

    if (!taskType) {
      showUsage();
      return;
    }

    const availableTasks = TaskManager.getAvailableTasks();
    if (!availableTasks.includes(taskType)) {
      logger.error('Unknown task: ' + taskType);
      showUsage();
      return;
    }

    logger.info('Initializing MUD Crawler...');

    const host = process.env.MUD_HOST || 'apocalypse6.com';
    const port = parseInt(process.env.MUD_PORT || '6000');
    const username = process.env.MUD_USERNAME || '';
    const password = process.env.MUD_PASSWORD || '';
    const characterClass = process.env.CHARACTER_CLASS || 'Unknown';
    const characterLevel = parseInt(process.env.CHARACTER_LEVEL || '1');
    
    logger.info(`Credentials: username="${username}", password="${password ? '***' : '(empty)'}"`);
    logger.info(`Character: class="${characterClass}", level=${characterLevel}`);
    
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3002/api';
    const maxActions = parseInt(process.env.MAX_ACTIONS_PER_SESSION || '1000');
    const delayBetweenActions = parseInt(process.env.DELAY_BETWEEN_ACTIONS_MS || '2000');

    mudClient = new MUDClient(host, port, username, password);
    const api = new BackendAPI(backendUrl);
    const aiAgent = new AIAgent(ollamaUrl, ollamaModel, api);
    const knowledgeManager = new KnowledgeManager('ai-knowledge.md');

    logArchiver.start();

    const ollamaReady = await aiAgent.testConnection();
    if (!ollamaReady) {
      logger.error('Ollama is not ready!');
      return;
    }

    await mudClient.connect();
    await delay(3000);

    const taskManager = new TaskManager({
      mudClient,
      aiAgent,
      api,
      knowledgeManager,
      delayBetweenActions,
      maxActions,
      characterName: username,
      characterClass,
      characterLevel
    });

    await taskManager.runTask(taskType);

  } catch (error) {
    logger.error('Crawler error:', error);
    process.exit(1);
  } finally {
    logArchiver.stop();
    if (mudClient) {
      await mudClient.disconnect();
    }
  }
}

function showUsage() {
  console.log('Usage: npm run crawl -- --task=<task-type>');
  console.log('Available: document-actions, document-help, learn-game, play-game');
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
