import { CrawlerTask, TaskConfig } from './TaskManager';
import logger from '../logger';
import { Room } from '../../../shared/types';

interface RoomData {
  name: string;
  description: string;
  exits: string[];
  objects: Map<string, string>; // object name -> description
  zone: string;
}

interface ExitData {
  direction: string;
  description: string;
  is_hidden: boolean;
  is_door: boolean;
  door_name?: string;
  door_description?: string;
  is_locked?: boolean;
  look_description?: string;
}

/**
 * DocumentRoomTask - Thoroughly document the current room
 *
 * This task:
 * 1. Looks at the current room
 * 2. Checks visible exits with "exits" command
 * 3. Extracts interesting words from description for "look" commands
 * 4. Checks non-visible exits by trying directions not in exits list
 * 5. Examines obvious room objects
 * 6. Associates room with zone via "who -z"
 * 7. Persists everything to database
 * 8. Disconnects
 */
export class DocumentRoomTask implements CrawlerTask {
  name = 'Document Current Room';
  description = 'Thoroughly document the current room and its features';

  private config: TaskConfig;
  private roomData: RoomData | null = null;
  private exitData: ExitData[] = [];
  private actionsUsed: number = 0;

  constructor(config: TaskConfig) {
    this.config = config;
  }

  async run(): Promise<void> {
    logger.info('🏠 Starting current room documentation...');

    try {
      // Step 1: Look at current room
      logger.info('Step 1: Examining current room...');
      await this.delay(1000); // Keep longer delay right after login
      const lookResponse = await this.config.mudClient.sendAndWait('look', 500);
      this.actionsUsed++;

      this.roomData = this.parseLookOutput(lookResponse);
      logger.info(`📍 Current room: ${this.roomData.name}`);

      // Step 2: Check visible exits
      logger.info('Step 2: Checking visible exits...');
      await this.delay(500); // Reduced from 1000ms
      const exitsResponse = await this.config.mudClient.sendAndWait('exits', 500);
      this.actionsUsed++;

      const visibleExits = this.parseExitsOutput(exitsResponse);
      for (const exit of visibleExits) {
        this.exitData.push({
          ...exit,
          is_hidden: false,
          is_door: false
        });
      }
      logger.info(`   Found ${visibleExits.length} visible exits`);

      // Scan room description for visible doors
      this.scanDescriptionForDoors();

      // Step 3: Extract and examine interesting words from description
      logger.info('Step 3: Examining description keywords...');
      await this.examineDescriptionKeywords();

      // Step 4: Check all directions for exits and look descriptions
      logger.info('Step 4: Checking all directions for exits and descriptions...');
      await this.checkAllDirections(visibleExits);

      // Step 5: Examine room objects
      logger.info('Step 5: Examining room objects...');
      await this.examineRoomObjects();

      // Step 6: Associate with zone
      logger.info('Step 6: Associating with zone...');
      await this.delay(500); // Reduced from 1000ms
      const zoneResponse = await this.config.mudClient.sendAndWait('who -z', 500);
      this.actionsUsed++;

      this.roomData.zone = this.extractCurrentZone(zoneResponse);
      logger.info(`   Zone: ${this.roomData.zone}`);

      // Step 7: Save to database
      logger.info('Step 7: Saving to database...');
      await this.saveRoomData();

      // Step 8: Summary
      logger.info('\n📊 Room Documentation Summary:');
      logger.info(`   Room: ${this.roomData.name}`);
      logger.info(`   Zone: ${this.roomData.zone}`);
      logger.info(`   Visible Exits: ${visibleExits.length}`);
      logger.info(`   Hidden Exits Found: ${this.exitData.filter(e => e.is_hidden).length}`);
      logger.info(`   Objects Examined: ${this.roomData.objects.size}`);
      logger.info(`   Actions Used: ${this.actionsUsed}`);

    } catch (error) {
      logger.error('❌ Error during room documentation:', error);
      throw error;
    }
  }

  /**
   * Parse "look" command output
   */
  private parseLookOutput(output: string): RoomData {
    const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let name = '';
    let description = '';
    let exits: string[] = [];
    let objects = new Map<string, string>();

    // First non-empty line is usually the room name
    if (lines.length > 0) {
      name = this.filterOutput(lines[0]);
    }

    // Find description and exits
    let inDescription = true;
    let descriptionLines: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      // Check for exits line - this marks end of description
      if (line.match(/\[EXITS?:/i)) {
        inDescription = false;
        const exitMatch = line.match(/\[EXITS?:\s*([^\]]+)\]/i);
        if (exitMatch) {
          exits = exitMatch[1].split(/\s+/).filter(e => e && e.length > 0);
        }
        continue;
      }

      // Check for status line (skip)
      if (line.match(/^<\s*\d+H\s+\d+M\s+\d+V/)) {
        inDescription = false;
        continue;
      }

      // If we're still in description section, add to description
      if (inDescription) {
        descriptionLines.push(line);
        continue;
      }

      // After description, look for actual room objects (not mobs, not items on ground)
      // Only lines that look like object descriptions should be treated as objects
      if (line.match(/^(A|An|The)\s+.+?\s+(is here|sits here|stands here|lies here)/i)) {
        const objectName = this.extractObjectName(line);
        if (objectName) {
          objects.set(objectName, line);
        }
      }
    }

    description = descriptionLines.join(' ').trim();

    return {
      name,
      description,
      exits,
      objects,
      zone: ''
    };
  }

  /**
   * Extract object name from a room description line
   */
  private extractObjectName(line: string): string {
    // Look for patterns like:
    // "A large fountain sits in the center."
    // "An ancient altar rests here."
    // "A marble statue stands tall."

    const patterns = [
      /^(A|An|The)\s+([^.]+)/i,
      /^([A-Z][a-z]+\s+[a-z]+)/
    ];

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[match.length - 1].trim();
      }
    }

    return '';
  }

  /**
   * Parse "exits" command output
   */
  private parseExitsOutput(output: string): Array<{ direction: string; description: string }> {
    const exits: Array<{ direction: string; description: string }> = [];
    const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      // Look for patterns like:
      // "north     - Grand Gates of the Temple"
      // "south     - Market Square"
      const match = line.match(/^([a-z]+)\s*-\s*(.+)$/i);
      if (match) {
        exits.push({
          direction: match[1].toLowerCase(),
          description: match[2].trim()
        });
      }
    }

    return exits;
  }

  /**
   * Extract interesting keywords from room description for examination using AI
   */
  private async examineDescriptionKeywords(): Promise<void> {
    if (!this.roomData) return;

    // Use AI to identify significant objects worth examining
    const aiKeywords = await this.extractKeywordsWithAI(this.roomData.description);

    for (const keyword of aiKeywords) {
      logger.info(`   Examining AI-suggested object: ${keyword}`);
      await this.delay(500); // Optimized for speed after login

      const examineResponse = await this.config.mudClient.sendAndWait(`look ${keyword}`, 500);
      this.actionsUsed++;

      // If we get a useful response, store it
      if (examineResponse && examineResponse.length > 50 && !examineResponse.match(/You don't see/i)) {
        const cleanDesc = this.filterOutput(examineResponse);
        this.roomData.objects.set(keyword, cleanDesc);
        logger.info(`   ✓ Found description for: ${keyword}`);
      }
    }
  }

  /**
   * Use AI to identify significant objects in room description worth examining
   */
  private async extractKeywordsWithAI(description: string): Promise<string[]> {
    const prompt = `You are analyzing a room description from a MUD (text-based RPG) game. Your task is to identify the SINGLE MOST IMPORTANT object or feature to examine with "look [word]".

Room Description:
${description}

CRITICAL REQUIREMENTS:
- Return ONLY ONE single word (no spaces, no multi-word phrases)
- Choose the most significant, examinable object in the room
- Prefer concrete objects like: fountain, altar, statue, sign, board, well, chest, throne
- Avoid: generic words, directions, or multi-word names like "pipe entrance"
- If no suitable single-word object exists, return nothing

Return ONLY the single word, or empty if none found. No explanations, no punctuation.

Single word:`;

    try {
      const response = await this.config.aiAgent.extractKeywords(description, 1);

      logger.info(`   AI identified object to examine: ${response.join(', ')}`);
      return response;

    } catch (error) {
      logger.warn('AI keyword extraction failed, falling back to basic patterns:', error);
      // Fallback to basic pattern matching if AI fails
      return this.extractKeywordsWithPatterns(description);
    }
  }

  /**
   * Fallback method using pattern matching if AI is unavailable
   */
  private extractKeywordsWithPatterns(description: string): string[] {
    const keywords: string[] = [];

    // Basic patterns for common interesting objects
    const patterns = [
      /\b(fountain|altar|statue|sign|board|door|gate|portal|well|chest|throne|pedestal|pillar|column|arch|bridge)\b/gi
    ];

    for (const pattern of patterns) {
      const matches = description.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleanMatch = match.toLowerCase();
          if (!keywords.includes(cleanMatch)) {
            keywords.push(cleanMatch);
          }
        }
      }
    }

    // Limit to first 3 keywords
    return keywords.slice(0, 3);
  }

  /**
   * Check all directions for exits and look descriptions
   */
  private async checkAllDirections(visibleExits: Array<{ direction: string; description: string }>): Promise<void> {
    if (!this.roomData) return;

    // Get list of known directions
    const knownDirections = new Set(visibleExits.map(exit => exit.direction.toLowerCase()));

    // Common directions to check (only basic directions, no diagonals)
    const directionsToCheck = [
      'north', 'south', 'east', 'west', 'up', 'down'
    ];

    for (const direction of directionsToCheck) {
      logger.info(`   Checking direction: ${direction}`);
      
      // Get a look description (this is our only action - no movement)
      let lookDescription = '';
      try {
        await this.delay(500); // Already optimized for speed
        const lookResponse = await this.config.mudClient.sendAndWait(`look ${direction}`, 500);
        this.actionsUsed++;
        
        if (!lookResponse.match(/You see nothing special/i) &&
            !lookResponse.match(/You don't see anything/i) &&
            !lookResponse.match(/There is nothing/i)) {
          lookDescription = this.extractLookDescription(lookResponse);
          logger.info(`   ✓ Got look description for ${direction}: ${lookDescription.substring(0, 50)}...`);
        } else {
          lookDescription = 'You see nothing special.';
          logger.info(`   ∅ Nothing special in direction: ${direction}`);
        }
      } catch (error) {
        logger.warn(`   Failed to look ${direction}:`, error);
      }

      // Analyze the look response to detect doors or blockages (no movement attempts)
      if (lookDescription && lookDescription !== 'You see nothing special.') {
        const blockageInfo = await this.analyzeBlockageWithAI(lookDescription, direction);

        if (blockageInfo.isDoor) {
          logger.info(`   🚪 Found door: ${blockageInfo.doorName} (${direction})`);

          // Test opening and closing the door
          const doorTestResults = await this.testDoorFunctionality(blockageInfo.doorName, direction);

          // Get door description if we have a door name
          let doorDescription = '';
          if (blockageInfo.doorName) {
            await this.delay(500); // Optimized for speed
            const lookResponse = await this.config.mudClient.sendAndWait(`look ${blockageInfo.doorName}`, 500);
            this.actionsUsed++;
            doorDescription = this.extractDoorDescription(lookResponse);
          }

          // Store door information with the look description and test results
          let fullDoorDescription = doorDescription;
          if (lookDescription && lookDescription !== 'You see nothing special.') {
            if (fullDoorDescription) {
              fullDoorDescription += ` | ${lookDescription}`;
            } else {
              fullDoorDescription = lookDescription;
            }
          }

          // Add door test results to description
          if (doorTestResults) {
            let testSummary = '';
            if (doorTestResults.isLocked) {
              testSummary = 'LOCKED';
            } else if (doorTestResults.canOpen && doorTestResults.canClose) {
              testSummary = 'Can open/close';
            } else if (doorTestResults.canOpen && !doorTestResults.canClose) {
              testSummary = 'Can open, cannot close';
            } else {
              testSummary = 'Cannot open';
            }

            if (doorTestResults.openLookDescription && doorTestResults.openLookDescription !== 'You see nothing special.') {
              testSummary += ` | Open view: ${doorTestResults.openLookDescription}`;
            }
            if (doorTestResults.closedLookDescription && doorTestResults.closedLookDescription !== 'You see nothing special.') {
              testSummary += ` | Closed view: ${doorTestResults.closedLookDescription}`;
            }

            fullDoorDescription += ` | Door tests: ${testSummary}`;
          }

          this.exitData.push({
            direction,
            description: blockageInfo.doorName || `Door to the ${direction}`,
            is_hidden: false,
            is_door: true,
            door_name: blockageInfo.doorName,
            door_description: fullDoorDescription,
            is_locked: doorTestResults?.isLocked || false
          });

        } else if (blockageInfo.description && blockageInfo.description !== `Blocked path to the ${direction}`) {
          // Some other kind of feature (not just "nothing special")
          logger.info(`   📝 Found feature: ${blockageInfo.description} (${direction})`);

          this.exitData.push({
            direction,
            description: blockageInfo.description,
            is_hidden: false,
            is_door: false
          });
        }
      }

      // Only record directions that are actual exits (not "nothing special")
      // If we got "You see nothing special.", this direction is not an exit and should not be persisted
    }
  }

  /**
   * Examine obvious room objects
   */
  private async examineRoomObjects(): Promise<void> {
    if (!this.roomData) return;

    for (const [objectName, shortDesc] of this.roomData.objects) {
      // Skip if we already examined this during keyword extraction
      if (shortDesc.length > 100) continue; // Already have detailed description

      logger.info(`   Examining object: ${objectName}`);
      await this.delay(500); // Optimized for speed after login

      const examineResponse = await this.config.mudClient.sendAndWait(`look ${objectName}`, 500);
      this.actionsUsed++;

      // Update description if we got more detail
      if (examineResponse && examineResponse.length > 50 && !examineResponse.match(/You don't see/i)) {
        const cleanDesc = this.filterOutput(examineResponse);
        this.roomData.objects.set(objectName, cleanDesc);
        logger.info(`   ✓ Detailed description for: ${objectName}`);
      }
    }
  }

  /**
   * Extract current zone from "who -z" output
   */
  private extractCurrentZone(response: string): string {
    const patterns = [
      /You are in[:\s]+(.+?)[\r\n]/i,
      /Zone[:\s]+(.+?)[\r\n]/i,
      /\[([^\]]+)\]/,
      /Current zone[:\s]+(.+?)[\r\n]/i
    ];

  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) {
      let zoneName = match[1].trim();
      // Clean up "Current Zone:" prefix if present
      zoneName = zoneName.replace(/^Current Zone:\s*/i, '');
      return this.filterOutput(zoneName);
    }
  }    return 'Unknown Zone';
  }

  /**
   * Check if movement was completely blocked (cannot go that way)
   */
  private isMovementBlocked(response: string): boolean {
    const blockedPatterns = [
      /cannot go that way/i,
      /can't go that way/i,
      /you can't go that way/i,
      /you cannot go that way/i,
      /there is no way/i,
      /you are already/i
    ];

    return blockedPatterns.some(pattern => response.match(pattern));
  }

  /**
   * Use AI to analyze what blocked the movement
   */
  private async analyzeBlockageWithAI(response: string, direction: string): Promise<{ isDoor: boolean; doorName?: string; description: string }> {
    // First, try regex-based detection as it's more reliable for obvious cases
    const fallbackDoorInfo = this.parseDoorResponse(response);
    if (fallbackDoorInfo.isDoor) {
      logger.info(`   🔄 Regex detected door, using fallback: ${fallbackDoorInfo.doorName}`);
      return {
        isDoor: true,
        doorName: fallbackDoorInfo.doorName,
        description: fallbackDoorInfo.doorName || `Door to the ${direction}`
      };
    }

    const prompt = `You are analyzing a MUD game response from a "look ${direction}" command. Your task is to determine if there is a door or blockage in that direction.

Look Response:
${response}

CRITICAL INSTRUCTIONS:
- If you see ANY words like: door, gate, portal, entrance, hatch, trapdoor, secret door, hidden door - it IS a door
- If you see phrases like "is closed", "is locked", "is open" after mentioning a door/gate/hatch - it IS a door
- "The hatch is closed" means there IS a hatch door blocking the view
- "You see the sewers. The hatch is closed." means the hatch is a door you can open
- Only return isDoor=false if there's clearly a solid wall, barrier, or magical field with NO mention of doors/gates/hatches

Return your analysis as valid JSON with this exact format (no extra text):
{"isDoor": true/false, "doorName": "name of door if applicable", "description": "brief description of what blocks the view"}

Examples:
- "The hatch is closed." → {"isDoor": true, "doorName": "hatch", "description": "A closed hatch blocks the way"}
- "You see the sewers. The hatch is closed." → {"isDoor": true, "doorName": "hatch", "description": "A closed hatch leads to the sewers"}

Analysis:`;

    try {
      const analysisText = await this.config.aiAgent.analyzeWithAI(prompt, 200);
      logger.info(`   🔍 AI analysis for ${direction}: "${analysisText}"`);

      // Clean up the response - remove any extra text before/after JSON
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        logger.info(`   📋 Parsed AI result: isDoor=${analysis.isDoor}, doorName="${analysis.doorName}", description="${analysis.description}"`);
        return {
          isDoor: analysis.isDoor || false,
          doorName: analysis.doorName || undefined,
          description: analysis.description || `Blocked path to the ${direction}`
        };
      } else {
        throw new Error('No JSON found in AI response');
      }

    } catch (error) {
      logger.warn(`AI blockage analysis failed for ${direction}, using fallback:`, error);
      // Fallback: use regex-based detection
      logger.info(`   🔄 Fallback result for ${direction}: isDoor=${fallbackDoorInfo.isDoor}, doorName="${fallbackDoorInfo.doorName}"`);
      return {
        isDoor: fallbackDoorInfo.isDoor,
        doorName: fallbackDoorInfo.doorName,
        description: fallbackDoorInfo.doorName || `Blocked path to the ${direction}`
      };
    }
  }

  /**
   * Test if a door can be opened
   */
  private async testDoorOpening(doorName?: string): Promise<boolean> {
    if (!doorName) return false;

    await this.delay(500);
    const openResponse = await this.config.mudClient.sendAndWait(`open ${doorName}`, 500);
    this.actionsUsed++;

    // Check if opening succeeded
    if (openResponse.match(/(?:opens?|unlocks?|clicks?)/i) && !openResponse.match(/(?:can't|cannot|won't|doesn't)/i)) {
      logger.info(`   🔓 Successfully opened door: ${doorName}`);
      return false; // Not locked
    } else if (openResponse.match(/(?:locked|key|permission|no key)/i)) {
      logger.info(`   🔒 Door is locked: ${doorName}`);
      return true; // Is locked
    } else {
      logger.info(`   ❓ Door state unclear: ${doorName}`);
      return false; // Assume not locked
    }
  }

  /**
   * Test door functionality by opening, looking, closing, and looking again
   */
  private async testDoorFunctionality(doorName: string | undefined, direction: string): Promise<{ isLocked: boolean; openLookDescription?: string; closedLookDescription?: string; canOpen: boolean; canClose: boolean } | null> {
    if (!doorName) return null;

    logger.info(`   🧪 Testing door functionality: ${doorName} (${direction})`);

    const results = {
      isLocked: false,
      canOpen: false,
      canClose: false,
      openLookDescription: undefined as string | undefined,
      closedLookDescription: undefined as string | undefined
    };

    try {
      // First, try to open the door
      await this.delay(500); // Optimized for speed
      const openResponse = await this.config.mudClient.sendAndWait(`open ${doorName}`, 500);
      this.actionsUsed++;

      if (openResponse.match(/(?:opens?|unlocks?|clicks?)/i) && !openResponse.match(/(?:can't|cannot|won't|doesn't)/i)) {
        results.canOpen = true;
        results.isLocked = false;
        logger.info(`   ✅ Door opened successfully: ${doorName}`);

        // Look in the direction after opening
        await this.delay(500); // Optimized for speed
        const openLookResponse = await this.config.mudClient.sendAndWait(`look ${direction}`, 500);
        this.actionsUsed++;

        if (!openLookResponse.match(/You see nothing special/i) &&
            !openLookResponse.match(/You don't see anything/i) &&
            !openLookResponse.match(/There is nothing/i)) {
          results.openLookDescription = this.extractLookDescription(openLookResponse);
          logger.info(`   👁️  After opening: ${results.openLookDescription?.substring(0, 50)}...`);
        } else {
          results.openLookDescription = 'You see nothing special.';
          logger.info(`   👁️  After opening: nothing special`);
        }

        // Now try to close the door
        await this.delay(500); // Optimized for speed
        const closeResponse = await this.config.mudClient.sendAndWait(`close ${doorName}`, 500);
        this.actionsUsed++;

        if (closeResponse.match(/(?:closes?|shuts?|clicks?)/i) && !closeResponse.match(/(?:can't|cannot|won't|doesn't)/i)) {
          results.canClose = true;
          logger.info(`   ✅ Door closed successfully: ${doorName}`);

          // Look in the direction after closing
          await this.delay(500); // Optimized for speed
          const closedLookResponse = await this.config.mudClient.sendAndWait(`look ${direction}`, 500);
          this.actionsUsed++;

          if (!closedLookResponse.match(/You see nothing special/i) &&
              !closedLookResponse.match(/You don't see anything/i) &&
              !closedLookResponse.match(/There is nothing/i)) {
            results.closedLookDescription = this.extractLookDescription(closedLookResponse);
            logger.info(`   👁️  After closing: ${results.closedLookDescription?.substring(0, 50)}...`);
          } else {
            results.closedLookDescription = 'You see nothing special.';
            logger.info(`   👁️  After closing: nothing special`);
          }
        } else {
          logger.info(`   ❌ Could not close door: ${doorName}`);
        }

      } else if (openResponse.match(/(?:locked|key|permission|no key)/i)) {
        results.isLocked = true;
        results.canOpen = false;
        logger.info(`   🔒 Door is locked: ${doorName}`);
      } else {
        results.canOpen = false;
        logger.info(`   ❓ Door open attempt unclear: ${doorName}`);
      }

    } catch (error) {
      logger.warn(`   Failed to test door ${doorName}:`, error);
    }

    return results;
  }

  /**
   * Parse response to detect if a door was encountered
   */
  private parseDoorResponse(response: string): { isDoor: boolean; doorName?: string; isLocked?: boolean } {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      const doorPatterns = [
        /(?:You see|There is)\s+(?:a|an)\s+(.+?)\s+(?:door|gate|portal|entrance|hatch)/i,
        /(?:The|This)\s+(.+?)\s+(?:is|blocks|bars)\s+(?:the way|your path|your view)/i,
        /(?:A|An|The)\s+(.+?)\s+(?:door|gate|portal|hatch)\s+(?:stands|is)/i,
        /(?:The|This)\s+(.+?)\s+(?:seems to be|is)\s+(?:closed|locked|barred|open)/i,
        /(?:The|This)\s+(?:door|gate|portal|hatch)\s+(?:is|seems)\s+(.+?)/i,
        /\b(hatch|door|gate|portal)\b.*\b(is|seems|appears)\b.*\b(closed|locked|open|barred)/i,
        /(?:The|This)\s+(hatch|door|gate|portal)\s+is\s+(closed|locked|open|barred)/i
      ];

      for (const pattern of doorPatterns) {
        const match = line.match(pattern);
        if (match) {
          // Extract door name - could be in different capture groups depending on pattern
          let doorName = match[1] || match[2] || 'door';
          if (doorName === 'door' || doorName === 'gate' || doorName === 'portal' || doorName === 'hatch') {
            doorName = doorName; // Use the generic term
          } else {
            doorName = doorName.trim();
          }

          const isLocked = line.match(/(?:locked|closed|barred)/i) !== null && !line.match(/(?:open|unlocked)/i);
          return { isDoor: true, doorName, isLocked };
        }
      }
    }

    return { isDoor: false };
  }

  /**
   * Extract look description from look response
   */
  private extractLookDescription(response: string): string {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // The look description is typically the first non-empty, non-status line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip status lines completely
      if (line.match(/^<\s*\d+H\s+\d+M\s+\d+V/)) {
        continue;
      }

      // Skip "You see/don't see" messages
      if (line.match(/You (?:see|don't see|can't|cannot)/i)) {
        continue;
      }

      // Skip obvious system messages or prompts
      if (line.match(/^\[/) || line.match(/Return to continue/i) || line.match(/^>/) || line.match(/^\s*$/)) {
        continue;
      }

      // First valid line should be the look description
      if (line.length > 2) {
        return line.trim();
      }
    }

    return '';
  }

  /**
   * Extract door description from look response
   */
  private extractDoorDescription(response: string): string {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    logger.info(`🔍 Extracting door description from ${lines.length} lines:`);
    lines.forEach((line, idx) => logger.info(`  [${idx}]: "${line}"`));

    // The door description is typically the first non-empty, non-status line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip status lines completely
      if (line.match(/^<\s*\d+H\s+\d+M\s+\d+V/)) {
        logger.info(`  Skipping status line: "${line}"`);
        continue;
      }

      // Skip "You see/don't see" messages
      if (line.match(/You (?:see|don't see|can't|cannot)/i)) {
        logger.info(`  Skipping "You see" line: "${line}"`);
        continue;
      }

      // Skip obvious system messages or prompts
      if (line.match(/^\[/) || line.match(/Return to continue/i) || line.match(/^>/) || line.match(/^\s*$/)) {
        logger.info(`  Skipping system/empty line: "${line}"`);
        continue;
      }

      // First valid line should be the door description
      if (line.length > 2) {
        logger.info(`  ✓ Found door description: "${line}"`);
        return line.trim();
      }
    }

    logger.info(`  ✗ No valid door description found`);
    return '';
  }

  /**
   * Scan room description for visible doors and associate with exits
   */
  private scanDescriptionForDoors(): void {
    if (!this.roomData) return;

    const description = this.roomData.description.toLowerCase();
    
    // Look for patterns like "a large iron door stands to the north"
    const doorPatterns = [
      /a\s+(.+?)\s+door\s+stands?\s+to\s+the\s+(north|south|east|west|up|down)/gi,
      /a\s+(.+?)\s+door\s+is\s+to\s+the\s+(north|south|east|west|up|down)/gi,
      /the\s+(.+?)\s+door\s+leads?\s+to\s+the\s+(north|south|east|west|up|down)/gi,
      /(.+?)\s+door\s+blocks?\s+the\s+(north|south|east|west|up|down)/gi
    ];
    
    for (const pattern of doorPatterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const doorName = match[1].trim() + ' door';
        const direction = match[2];
        
        // Find the exit with this direction
        const exit = this.exitData.find(e => e.direction === direction);
        if (exit && !exit.is_door) { // Don't override hidden door detection
          exit.is_door = true;
          exit.door_name = doorName;
          exit.door_description = match[0]; // The full matched text as description
          logger.info(`   📝 Found visible door: ${doorName} to the ${direction}`);
        }
      }
    }
  }

  /**
   * Detect if response indicates a room change
   */
  private detectRoomChange(response: string): { roomName?: string } | null {
    const lines = response.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // If the response contains common movement failure messages, it's not a room change
    const failurePatterns = [
      /cannot go that way/i,
      /can't go that way/i,
      /you can't go that way/i,
      /you cannot go that way/i,
      /seems to be closed/i,
      /you are already/i,
      /there is no way/i
    ];

    for (const p of failurePatterns) {
      if (response.match(p)) return null;
    }

    // Ignore lines that are clearly NPC/action messages (arrivals, departures, combat, etc.)
    const noisePatterns = [/arriv(es|ed)? from/i, /arriv(es|ed)?/i, /leav(es|ed)?/i, /enters? from/i, /comes? from/i, /is here/i, /You (?:are|feel)/i];

    for (const line of lines) {
      // skip status bar lines
      if (line.match(/^<\s*\d+H/)) continue;

      // skip lines that are clearly noise
      if (noisePatterns.some(p => line.match(p))) continue;

      // skip lines that look like door/gate descriptions or other non-room text
      if (line.match(/(?:door|gate|portal|hatch|closed|locked)/i)) continue;

      // Room names are usually Title Case and reasonably short. Be conservative.
      if (line.length >= 3 && line.length <= 120 && line.match(/^[A-Z0-9][A-Za-z0-9 \-:\'\.]+$/)) {
        // Also avoid lines that start with common pronouns/verbs
        if (line.match(/^(You|There|Someone|Nothing)\b/i)) continue;

        return { roomName: this.filterOutput(line) };
      }
    }

    return null;
  }

  /**
   * Get opposite direction
   */
  private getOppositeDirection(direction: string): string | null {
    const opposites: Record<string, string> = {
      'north': 'south', 'south': 'north', 'east': 'west', 'west': 'east',
      'up': 'down', 'down': 'up', 'in': 'out', 'out': 'in',
      'enter': 'exit', 'exit': 'enter'
    };
    return opposites[direction.toLowerCase()] || null;
  }

  /**
   * Filter unwanted MUD artifacts
   */
  private filterOutput(output: string): string {
    let filtered = output;
    filtered = filtered.replace(/\x1B\[[0-9;]*[mGKH]/g, '');
    filtered = filtered.replace(/<\s*\d+H\s+\d+M\s+\d+V[^>]*>/g, '');
    filtered = filtered.replace(/You are (hungry|thirsty)\./g, '');
    filtered = filtered.replace(/The sky (darkens|lightens)[^.]*\./g, '');
    filtered = filtered.replace(/\[.*?Return to continue.*?\]/g, '');
    filtered = filtered.replace(/\r/g, '');
    filtered = filtered.replace(/\n{3,}/g, '\n\n');
    return filtered.trim();
  }

  /**
   * Save room data to database
   */
  private async saveRoomData(): Promise<void> {
    if (!this.roomData) return;

    try {
      // Get or create zone
      let zoneId = 2; // Default to Midgaard zone
      try {
        const zones = await this.config.api.getAllEntities('zones');
        const zone = zones.find((z: any) => z.name.includes(this.roomData!.zone) || this.roomData!.zone.includes(z.name));
        if (zone) {
          zoneId = zone.id;
        } else {
          // Create new zone
          await this.config.api.saveEntity('zones', {
            name: this.roomData.zone,
            description: `Zone discovered during room documentation: ${this.roomData.zone}`,
            author: 'Crawler',
            difficulty: 'Unknown',
            min_level: 1,
            max_level: 50,
            vnum_range_start: 0,
            vnum_range_end: 0,
            reset_time_minutes: 0
          });
          // For new zones, we'll use the default ID since saveEntity returns void
        }
      } catch (error) {
        logger.warn('Could not get/create zone, using default');
      }

      // Check if room already exists
      const existingRoom = await this.config.api.getRoomByName(this.roomData.name);

      let savedRoom: Room;
      if (existingRoom) {
        // Update existing room with latest data
        logger.info(`📝 Updating existing room: ${this.roomData.name}`);

        // Merge existing data with new findings
        const updatedRoomData = {
          description: this.filterOutput(this.roomData.description),
          zone_id: zoneId,
          visitCount: (existingRoom.visitCount || 0) + 1,
          lastVisited: new Date(),
          rawText: `${this.roomData.name}\n${this.roomData.description}`,
          terrain: await this.inferTerrain(this.roomData.description)
        };

        // Use generic update method since saveRoom only creates
        await this.config.api.updateEntity('rooms', existingRoom.id.toString(), updatedRoomData);
        savedRoom = { ...existingRoom, ...updatedRoomData };
        logger.info(`✓ Updated room: ${this.roomData.name} (visit #${savedRoom.visitCount})`);
      } else {
        // Create new room
        const roomData = {
          name: this.roomData.name,
          zone_id: zoneId,
          description: this.filterOutput(this.roomData.description),
          exits: this.roomData.exits.map(dir => ({ direction: dir })),
          npcs: [],
          items: [],
          visitCount: 1,
          firstVisited: new Date(),
          lastVisited: new Date(),
          rawText: `${this.roomData.name}\n${this.roomData.description}`,
          terrain: await this.inferTerrain(this.roomData.description)
        };

        const createdRoom = await this.config.api.saveRoom(roomData);
        if (!createdRoom) {
          logger.error('❌ Failed to save room - no data returned');
          throw new Error('Failed to save room');
        }
        savedRoom = createdRoom;
        logger.info(`✓ Created new room: ${this.roomData.name}`);
      }

      // Save room objects
      for (const [objectName, description] of this.roomData.objects) {
        try {
          await this.config.api.saveEntity('room_objects', {
            room_id: savedRoom.id,
            name: objectName,
            description: this.filterOutput(description),
            is_interactive: false
          });
        } catch (error) {
          logger.warn(`Failed to save object ${objectName}:`, error);
        }
      }

      // Save exits
      for (const exit of this.exitData) {
        try {
          // Try to find to_room
          const toRoom = await this.config.api.getRoomByName(exit.description);

          // Check if exit already exists
          const existingExits = await this.config.api.getAllEntities('room_exits', {
            from_room_id: savedRoom.id,
            direction: exit.direction
          });
          const existingExit = existingExits[0];

          logger.info(`   Debug: Looking for exit from_room_id=${savedRoom.id}, direction=${exit.direction}`);
          logger.info(`   Debug: Found ${existingExits.length} existing exits`);
          if (existingExit) {
            logger.info(`   Debug: Existing exit id=${existingExit.id}`);
          } else {
            logger.info(`   Debug: No existing exit found`);
          }

          if (existingExit) {
            // Update existing exit with latest data
            logger.info(`   📝 Updating existing exit: ${exit.direction}`);
            await this.config.api.updateEntity('room_exits', existingExit.id.toString(), {
              from_room_id: savedRoom.id,
              to_room_id: toRoom?.id || null,
              direction: exit.direction,
              exit_description: exit.description,
              door_name: exit.door_name || null,
              door_description: exit.door_description || null,
              is_door: exit.is_door || false,
              is_locked: exit.is_locked || false
            });
          } else {
            // Create new exit
            await this.config.api.saveEntity('room_exits', {
              from_room_id: savedRoom.id,
              to_room_id: toRoom?.id || null,
              direction: exit.direction,
              exit_description: exit.description,
              door_name: exit.door_name || null,
              door_description: exit.door_description || null,
              is_door: exit.is_door || false,
              is_locked: exit.is_locked || false
            });
          }
        } catch (error) {
          logger.warn(`Failed to save exit ${exit.direction}:`, error);
        }
      }

      logger.info(`✓ Saved ${this.roomData.objects.size} objects and ${this.exitData.length} exits`);

    } catch (error) {
      logger.error('❌ Failed to save room data:', error);
      throw error;
    }
  }

  /**
   * Infer terrain type from room description using AI
   */
  private async inferTerrain(description: string): Promise<string> {
    const prompt = `You are analyzing a room description from a MUD (text-based RPG) game. Your task is to determine the most appropriate terrain type for this location.

Room Description:
${description}

Available terrain types:
- city: Urban areas, towns, villages, streets, squares, populated settlements
- inside: Interior of buildings, houses, shops, temples, inns, caves, dungeons
- road: Roads, streets, paths, trails (outdoor travel routes)
- forest: Forests, woods, jungles, wooded areas
- mountain: Mountains, hills, peaks, rocky terrain
- desert: Deserts, sandy areas, arid landscapes
- water: Rivers, lakes, seas, oceans, beaches, waterfront
- field: Open plains, grasslands, meadows, farmlands, wilderness

CRITICAL: Return ONLY ONE WORD from the list above. No explanations, no quotes, no punctuation. Just the single terrain type word.

Example response: forest

Terrain type:`;

    try {
      const analysisText = await this.config.aiAgent.analyzeWithAI(prompt, 50);
      const terrain = analysisText.trim().toLowerCase();

      // Extract just the terrain type from the response (handle verbose responses)
      const validTerrains = ['city', 'inside', 'road', 'forest', 'mountain', 'desert', 'water', 'field'];
      let detectedTerrain = '';

      // First try exact match
      if (validTerrains.includes(terrain)) {
        detectedTerrain = terrain;
      } else {
        // Try to extract from quotes or find the first valid terrain word
        for (const validType of validTerrains) {
          if (terrain.includes(`"${validType}"`) || terrain.includes(`'${validType}'`) || terrain.includes(validType)) {
            detectedTerrain = validType;
            break;
          }
        }
      }

      if (detectedTerrain) {
        logger.info(`   AI determined terrain: ${detectedTerrain}`);
        return detectedTerrain;
      } else {
        logger.warn(`AI returned invalid terrain response: "${terrain}", falling back to keyword matching`);
        return this.inferTerrainWithKeywords(description);
      }
    } catch (error) {
      logger.warn('AI terrain analysis failed, falling back to keyword matching:', error);
      return this.inferTerrainWithKeywords(description);
    }
  }

  /**
   * Fallback method using keyword matching if AI is unavailable
   */
  private inferTerrainWithKeywords(description: string): string {
    const desc = description.toLowerCase();

    if (desc.includes('forest') || desc.includes('woods') || desc.includes('trees')) return 'forest';
    if (desc.includes('mountain') || desc.includes('mountains') || desc.includes('peak')) return 'mountain';
    if (desc.includes('desert') || desc.includes('sand') || desc.includes('dune')) return 'desert';
    if (desc.includes('water') || desc.includes('river') || desc.includes('lake') || desc.includes('sea')) return 'water';
    if (desc.includes('road') || desc.includes('street') || desc.includes('path')) return 'road';
    if (desc.includes('building') || desc.includes('house') || desc.includes('shop') || desc.includes('temple')) return 'inside';
    if (desc.includes('city') || desc.includes('town') || desc.includes('village')) return 'city';

    return 'field'; // Default
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    logger.info('✓ Room documentation task cleanup complete');
  }
}