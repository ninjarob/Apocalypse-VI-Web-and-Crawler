import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';

/**
 * DocumentHelpTask - Document general help topics and game knowledge
 * 
 * This task:
 * 1. Explores general help topics (not tied to specific commands)
 * 2. Documents game lore, mechanics, rules
 * 3. Stores in help_entries database table
 * 
 * Improvements from DocumentActionsTask:
 * - Caches existing help entries to avoid re-documenting
 * - Handles paginated help text properly
 * - Filters output to remove ANSI codes and system messages
 * - Uses generic entity API for help_entries table
 */
export class DocumentHelpTask implements CrawlerTask {
  name = 'Document General Help';
  description = 'Document general help topics and game knowledge';

  private config: TaskConfig;
  private documentedTopics: Set<string> = new Set();
  private existingEntriesCache: Map<string, any> = new Map();
  private existingCommandsCache: Set<string> = new Set();
  private helpTopicsQueue: string[] = [];
  private discoveredTopics: Set<string> = new Set();

  constructor(config: TaskConfig) {
    this.config = config;
  }

  /**
   * Load existing help entries into cache to avoid repeated API calls
   */
  private async loadExistingEntriesCache(): Promise<void> {
    try {
      const existingEntries = await this.config.api.getAllEntities('help_entries');
      this.existingEntriesCache.clear();
      
      for (const entry of existingEntries) {
        this.existingEntriesCache.set(entry.name.toLowerCase(), entry);
        
        // Also add variations to cache for quick lookup
        if (entry.variations && Array.isArray(entry.variations)) {
          for (const variation of entry.variations) {
            this.existingEntriesCache.set(variation.toLowerCase(), entry);
          }
        }
      }
      
      logger.info(`✓ Loaded ${existingEntries.length} existing help entries into cache`);
    } catch (error) {
      logger.warn('⚠️  Could not load existing help entries cache, will process all topics:', error);
    }
  }

  /**
   * Load existing player actions to avoid documenting command help
   */
  private async loadExistingCommandsCache(): Promise<void> {
    try {
      const existingActions = await this.config.api.getAllPlayerActions();
      this.existingCommandsCache.clear();
      
      for (const action of existingActions) {
        this.existingCommandsCache.add(action.name.toLowerCase());
      }
      
      logger.info(`✓ Loaded ${this.existingCommandsCache.size} existing commands to skip`);
    } catch (error) {
      logger.warn('⚠️  Could not load existing commands cache:', error);
    }
  }

  /**
   * Check if a topic is a command (should be skipped)
   */
  private isCommand(topic: string): boolean {
    return this.existingCommandsCache.has(topic.toLowerCase());
  }

  /**
   * Extract help references from help text
   * Looks for "See also:", "Related topics:", patterns and words in quotes
   */
  private extractHelpReferences(helpText: string): string[] {
    const references: string[] = [];
    const lines = helpText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      const lowerLine = trimmed.toLowerCase();
      
      // Look for reference indicators
      if (lowerLine.includes('see also:') || 
          lowerLine.includes('related:') ||
          lowerLine.includes('related topics:') ||
          lowerLine.includes('see:') ||
          lowerLine.includes('more info:') ||
          lowerLine.includes('type help')) {
        
        // Extract the terms after the colon or pattern
        let termsText = '';
        
        if (lowerLine.includes('type help')) {
          // Pattern like "type help <topic>"
          const match = trimmed.match(/type\s+help\s+([a-zA-Z0-9_\s-]+)/i);
          if (match && match[1]) {
            termsText = match[1];
          }
        } else {
          // Extract after colon
          const colonIndex = trimmed.indexOf(':');
          if (colonIndex > -1) {
            termsText = trimmed.substring(colonIndex + 1).trim();
          }
        }
        
        // Split on common delimiters
        const terms = termsText.split(/[,;]/)
          .map(t => t.trim())
          .filter(t => t.length > 0 && t.length < 50);
        references.push(...terms);
      }
      
      // Also look for quoted terms that might be help references
      const quotedMatches = trimmed.matchAll(/"([^"]+)"/g);
      for (const match of quotedMatches) {
        const quoted = match[1].trim();
        if (quoted.length > 2 && quoted.length < 50 && !quoted.includes(' ')) {
          references.push(quoted);
        }
      }
    }
    
    return [...new Set(references)]; // Remove duplicates
  }

  /**
   * Check if a help topic is already documented
   */
  private isTopicAlreadyDocumented(topic: string): boolean {
    return this.existingEntriesCache.has(topic.toLowerCase());
  }

  async run(): Promise<void> {
    logger.info('📚 Starting general help documentation...');
    
    try {
      // Step 1: Get initial state
      logger.info('Step 1: Getting initial game state...');
      await this.delay(2000);
      await this.config.mudClient.sendAndWait('look', 2000);
      logger.info('✓ Initial state received');

      // Step 2: Cache existing help entries to avoid repeated API calls
      logger.info('Step 2: Loading existing help entries cache...');
      await this.loadExistingEntriesCache();
      logger.info(`✓ Loaded ${this.existingEntriesCache.size} existing help entries`);

      // Step 3: Cache existing commands to avoid documenting command help
      logger.info('Step 3: Loading existing commands cache...');
      await this.loadExistingCommandsCache();
      logger.info(`✓ Loaded ${this.existingCommandsCache.size} commands to skip`);

      // Step 4: Start with base "help" to discover initial references
      logger.info('Step 4: Getting base help to discover references...');
      const baseHelpResponse = await this.getFullHelpText('help');
      
      // Extract references from base help
      const initialReferences = this.extractHelpReferences(baseHelpResponse);
      logger.info(`✓ Found ${initialReferences.length} initial help references`);
      
      // Add to queue (filtering out commands)
      for (const ref of initialReferences) {
        if (!this.isCommand(ref) && !this.discoveredTopics.has(ref.toLowerCase())) {
          this.helpTopicsQueue.push(ref);
          this.discoveredTopics.add(ref.toLowerCase());
        }
      }
      
      // Store the base help itself
      if (this.isValidHelpText(baseHelpResponse) && !this.isTopicAlreadyDocumented('help')) {
        await this.storeHelpEntry('help', baseHelpResponse);
        this.documentedTopics.add('help');
        logger.info('  ✓ Documented base help topic');
      }

      // Step 5: Process help topics queue
      logger.info(`Step 5: Processing discovered help topics...`);
      let processed = 0;
      let skipped = 0;

      while (this.helpTopicsQueue.length > 0) {
        const topic = this.helpTopicsQueue.shift()!;
        
        // Skip if already documented
        if (this.isTopicAlreadyDocumented(topic)) {
          skipped++;
          logger.info(`[${processed + skipped}/${this.discoveredTopics.size}] Skipping already documented: ${topic}`);
          continue;
        }

        // Skip if it's a command
        if (this.isCommand(topic)) {
          skipped++;
          logger.info(`[${processed + skipped}/${this.discoveredTopics.size}] Skipping command: ${topic}`);
          continue;
        }

        // Skip if already processed this session
        if (this.documentedTopics.has(topic)) {
          continue;
        }

        try {
          processed++;
          logger.info(`[${processed + skipped}/${this.discoveredTopics.size}] Processing: ${topic}`);

          // Get help text (handle pagination)
          const helpResponse = await this.getFullHelpText(topic);

          // Check if we got useful help text
          if (this.isValidHelpText(helpResponse)) {
            // Extract new references from this help text
            const newReferences = this.extractHelpReferences(helpResponse);
            
            // Add new references to queue (if not already discovered and not commands)
            let addedRefs = 0;
            for (const ref of newReferences) {
              if (!this.isCommand(ref) && !this.discoveredTopics.has(ref.toLowerCase())) {
                this.helpTopicsQueue.push(ref);
                this.discoveredTopics.add(ref.toLowerCase());
                addedRefs++;
              }
            }
            
            if (addedRefs > 0) {
              logger.info(`  Found ${addedRefs} new help reference(s) to explore`);
            }
            
            // Store in database
            await this.storeHelpEntry(topic, helpResponse);
            this.documentedTopics.add(topic);
            logger.info(`  ✓ Documented help topic (${this.helpTopicsQueue.length} remaining in queue)`);
          } else {
            logger.info(`  ⚠️  No help available for this topic`);
          }

          // Delay between topics
          await this.delay(this.config.delayBetweenActions);

          // Every 10 topics, reset context
          if (processed % 10 === 0) {
            logger.info('  Resetting context...');
            await this.config.mudClient.sendAndWait('look', 1000);
            await this.delay(1000);
          }

        } catch (error) {
          logger.error(`  Error processing topic "${topic}":`, error);
          await this.delay(2000);
        }

        // Check max actions limit
        if (processed >= this.config.maxActions) {
          logger.info(`⚠️  Reached max actions limit (${this.config.maxActions})`);
          break;
        }
      }

      logger.info('');
      logger.info(`✅ Documented ${processed} help topics (${skipped} skipped)`);
      logger.info(`📊 Discovered ${this.discoveredTopics.size} total help references`);
      logger.info(`📊 Queue remaining: ${this.helpTopicsQueue.length} topics`);
      logger.info(`📊 View results at: http://localhost:5173/admin (Help Entries section)`);

    } catch (error) {
      logger.error('❌ Document help task failed:', error);
      throw error;
    }
  }

  /**
   * Get full help text, handling pagination by sending newlines
   */
  private async getFullHelpText(topic: string): Promise<string> {
    const helpCommand = `help ${topic}`;
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
      logger.warn(`  ⚠️  Reached max pages (${maxPages}) for help ${topic}, may be truncated`);
    }

    return fullResponse;
  }

  /**
   * Check if the response contains valid help text
   */
  private isValidHelpText(response: string): boolean {
    const lowerResponse = response.toLowerCase();
    
    // Check for common "no help" messages - must check BEFORE filtering
    const noHelpIndicators = [
      'no help available',
      'help not found',
      'no such help topic',
      'unknown help',
      'huh?',
      "what?",
      "i don't understand",
      "there is no help",
      "sorry, no help",
      "there is currently no help",
      "no help on",
      "currently no help"
    ];

    for (const indicator of noHelpIndicators) {
      if (lowerResponse.includes(indicator)) {
        return false;
      }
    }

    // Filter the text to remove artifacts
    const filtered = this.filterHelpText(response);
    const cleanedText = filtered.trim();
    
    // Must be substantial (more than just a short error message)
    if (cleanedText.length < 30) {
      return false;
    }
    
    // Check if it's just a short redirect sentence
    if (cleanedText.length < 100) {
      const lowerCleaned = cleanedText.toLowerCase();
      if (lowerCleaned.includes('type the word') ||
          lowerCleaned.includes('see the guidelines') ||
          lowerCleaned.includes('refer to') ||
          lowerCleaned.includes('see also:') && cleanedText.split('\n').length <= 3) {
        // Short redirects are not useful standalone help
        return false;
      }
    }

    return true;
  }

  /**
   * Filter help text to remove unwanted artifacts
   * - ANSI color codes
   * - Random events/messages
   * - Status updates
   * - System prompts
   * - TIP messages
   * - Status bars
   */
  private filterHelpText(output: string): string {
    let filtered = output;

    // Remove ANSI color codes (escape sequences)
    filtered = filtered.replace(/\x1B\[[0-9;]*[mG]/g, '');

    // Remove pagination prompts and system messages
    filtered = filtered.replace(/\[.*?(Return to continue|quit|refresh|back|page number).*?\]/gi, '');
    filtered = filtered.replace(/Valid commands while paging are.*?\./gi, '');

    // Remove TIP messages (can span multiple lines)
    filtered = filtered.replace(/TIP:.*?(\n|$)/gi, '');

    // Normalize line endings
    filtered = filtered.replace(/\r\n/g, '\n');

    // Split into lines for better processing
    const lines = filtered.split('\n');
    const filteredLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) continue;

      // Skip status lines (character stats) - more comprehensive patterns
      if (/^<\s*\d+H.*?\d+SP\s*>$/.test(trimmed)) continue;
      if (/^<\s*\d+H\s+\d+M\s+\d+V/.test(trimmed)) continue;
      if (/^<\s*\d+H\s+\d+SP/.test(trimmed)) continue;

      // Skip hunger/thirst messages
      if (/^(You are (hungry|thirsty)\.)$/.test(trimmed)) continue;

      // Skip weather/time messages
      if (/^(The sky|It is now|The sun|The moon|The weather)/i.test(trimmed)) continue;

      // Skip random NPC/player events
      if (/^(Someone|A|An)\s+\w+\s+(arrives|leaves|gives|greetings|nods|waves|smiles)/i.test(trimmed)) continue;
      if (/^\w+\s+(arrives|leaves|gives|greetings|nods|waves|smiles)/i.test(trimmed)) continue;

      // Skip generic system messages
      if (/(Press enter|Make your choice|Enter the game)/i.test(trimmed)) continue;

      // Skip TIP messages that might be on their own line
      if (/^TIP:/i.test(trimmed)) continue;

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
   * Extract variations (alternative names) from help text
   * Looks for "Also see:", "Related:", "Aliases:", etc.
   */
  private extractVariations(helpText: string): string[] {
    const variations: string[] = [];
    const lines = helpText.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      const lowerLine = trimmed.toLowerCase();
      
      // Look for alias/variation indicators
      if (lowerLine.includes('also see:') || 
          lowerLine.includes('related:') ||
          lowerLine.includes('aliases:') ||
          lowerLine.includes('see also:')) {
        
        // Extract the terms after the colon
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex > -1) {
          const termsText = trimmed.substring(colonIndex + 1).trim();
          // Split on common delimiters
          const terms = termsText.split(/[,;]/)
            .map(t => t.trim())
            .filter(t => t.length > 0 && t.length < 30);
          variations.push(...terms);
        }
      }
    }
    
    return [...new Set(variations)]; // Remove duplicates
  }

  /**
   * Store help entry in database (help_entries table)
   */
  private async storeHelpEntry(topic: string, helpText: string): Promise<void> {
    try {
      // Filter the help text to remove artifacts
      const cleanedHelpText = this.filterHelpText(helpText);
      
      // Extract any variations/aliases
      const variations = this.extractVariations(cleanedHelpText);

      // Check if entry already exists using cache
      const existingEntry = this.existingEntriesCache.get(topic.toLowerCase());

      if (existingEntry) {
        // Update existing entry
        const updateData: any = {
          helpText: cleanedHelpText,
          updatedAt: new Date().toISOString()
        };

        // Add variations if we found new ones
        if (variations.length > 0) {
          const existingVariations = existingEntry.variations || [];
          const allVariations = [...new Set([...existingVariations, ...variations])];
          updateData.variations = allVariations;
        }

        await this.config.api.updateEntity('help_entries', existingEntry.id, updateData);
        
        // Update cache
        this.existingEntriesCache.set(topic.toLowerCase(), {
          ...existingEntry,
          ...updateData
        });
        
        logger.info(`  ✓ Updated existing help entry: ${topic}`);
      } else {
        // Create new entry
        const helpEntryData: any = {
          name: topic,
          helpText: cleanedHelpText,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Add variations if found
        if (variations.length > 0) {
          helpEntryData.variations = variations;
        }

        // Save to help_entries table using generic entity API
        await this.config.api.saveEntity('help_entries', helpEntryData);
        
        // Add to cache
        this.existingEntriesCache.set(topic.toLowerCase(), helpEntryData);
        
        logger.info(`  ✓ Created new help entry: ${topic}${variations.length > 0 ? ` (${variations.length} variations)` : ''}`);
      }
    } catch (error) {
      logger.error(`  ⚠️  Could not store to help_entries table:`, error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('🧹 Cleaning up document help task...');
  }
}
