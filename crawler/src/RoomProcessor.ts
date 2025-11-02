import { TaskConfig } from './tasks/TaskManager';
import logger from './logger';

export interface RoomData {
  name: string;
  description: string;
  exits: string[];
  objects: Map<string, string>; // object name -> description
  zone: string;
}

export interface ExitData {
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
 * RoomProcessor - Shared logic for processing individual rooms
 *
 * This class contains the sophisticated room processing logic that was
 * originally in DocumentRoomTask, abstracted so it can be used by
 * both DocumentRoomTask and DocumentZoneTask.
 */
export class RoomProcessor {
  private config: TaskConfig;
  private actionsUsed: number = 0;

  constructor(config: TaskConfig) {
    this.config = config;
  }

  /**
   * Get the number of actions used by this processor
   */
  getActionsUsed(): number {
    return this.actionsUsed;
  }

  /**
   * Reset the action counter
   */
  resetActionCounter(): void {
    this.actionsUsed = 0;
  }

  /**
   * Process a single room comprehensively
   */
  async processRoom(currentRoomName?: string): Promise<{ roomData: RoomData; exitData: ExitData[] }> {
    logger.info('🏠 Processing current room...');

    // Step 1: Look at current room
    logger.info('Step 1: Examining current room...');
    await this.delay(1000);
    const lookResponse = await this.config.mudClient.sendAndWait('look', 500);
    this.actionsUsed++;

    const roomData = this.parseLookOutput(lookResponse);
    if (currentRoomName && roomData.name !== currentRoomName) {
      logger.warn(`Room name mismatch: expected "${currentRoomName}", got "${roomData.name}"`);
    }
    logger.info(`📍 Current room: ${roomData.name}`);

    // Step 2: Check visible exits
    logger.info('Step 2: Checking visible exits...');
    await this.delay(500);
    const exitsResponse = await this.config.mudClient.sendAndWait('exits', 500);
    this.actionsUsed++;

    const visibleExits = this.parseExitsOutput(exitsResponse);
    const exitData: ExitData[] = visibleExits.map(exit => ({
      ...exit,
      is_hidden: false,
      is_door: false
    }));
    logger.info(`   Found ${visibleExits.length} visible exits`);

    // Scan room description for visible doors
    this.scanDescriptionForDoors(roomData, exitData);

    // Step 3: Extract and examine interesting words from description
    logger.info('Step 3: Examining description keywords...');
    await this.examineDescriptionKeywords(roomData);

    // Step 4: Check all directions for exits and look descriptions
    logger.info('Step 4: Checking all directions for exits and descriptions...');
    await this.checkAllDirections(exitData);

    // Step 5: Examine room objects
    logger.info('Step 5: Examining room objects...');
    await this.examineRoomObjects(roomData);

    // Step 6: Associate with zone
    logger.info('Step 6: Associating with zone...');
    await this.delay(500);
    const zoneResponse = await this.config.mudClient.sendAndWait('who -z', 500);
    this.actionsUsed++;

    roomData.zone = this.extractCurrentZone(zoneResponse);
    logger.info(`   Zone: ${roomData.zone}`);

    return { roomData, exitData };
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

    // Find the room name - skip filtered lines like "You are hungry/thirsty"
    for (let i = 0; i < lines.length; i++) {
      const filteredLine = this.filterOutput(lines[i]);
      if (filteredLine.length > 0) {
        name = filteredLine;
        break;
      }
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
  private async examineDescriptionKeywords(roomData: RoomData): Promise<void> {
    if (!roomData) return;

    // Use AI to identify significant objects worth examining
    const aiKeywords = await this.extractKeywordsWithAI(roomData.description);

    for (const keyword of aiKeywords) {
      logger.info(`   Examining AI-suggested object: ${keyword}`);
      await this.delay(500);

      const examineResponse = await this.config.mudClient.sendAndWait(`look ${keyword}`, 500);
      this.actionsUsed++;

      // If we get a useful response, store it
      if (examineResponse && examineResponse.length > 50 && !examineResponse.match(/You don't see/i)) {
        const cleanDesc = this.filterOutput(examineResponse);
        roomData.objects.set(keyword, cleanDesc);
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
  private async checkAllDirections(exitData: ExitData[]): Promise<void> {
    // Get list of known directions
    const knownDirections = new Set(exitData.map(exit => exit.direction.toLowerCase()));

    // Common directions to check (only basic directions, no diagonals)
    const directionsToCheck = [
      'north', 'south', 'east', 'west', 'up', 'down'
    ];

    for (const direction of directionsToCheck) {
      logger.info(`   Checking direction: ${direction}`);

      // Get a look description (this is our only action - no movement)
      let lookDescription = '';
      try {
        await this.delay(500);
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
            await this.delay(500);
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

          exitData.push({
            direction,
            description: lookDescription, // Use the actual look description for what players see
            is_hidden: false,
            is_door: true,
            door_name: blockageInfo.doorName,
            door_description: fullDoorDescription,
            is_locked: doorTestResults?.isLocked || false
          });

        } else if (blockageInfo.description && blockageInfo.description !== `Blocked path to the ${direction}`) {
          // Some other kind of feature (not just "nothing special")
          logger.info(`   📝 Found feature: ${blockageInfo.description} (${direction})`);

          exitData.push({
            direction,
            description: lookDescription, // Use the actual look description, not AI interpretation
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
  private async examineRoomObjects(roomData: RoomData): Promise<void> {
    for (const [objectName, shortDesc] of roomData.objects) {
      // Skip if we already examined this during keyword extraction
      if (shortDesc.length > 100) continue; // Already have detailed description

      logger.info(`   Examining object: ${objectName}`);
      await this.delay(500);

      const examineResponse = await this.config.mudClient.sendAndWait(`look ${objectName}`, 500);
      this.actionsUsed++;

      // Update description if we got more detail
      if (examineResponse && examineResponse.length > 50 && !examineResponse.match(/You don't see/i)) {
        const cleanDesc = this.filterOutput(examineResponse);
        roomData.objects.set(objectName, cleanDesc);
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
    }
    return 'Unknown Zone';
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
      await this.delay(500);
      const openResponse = await this.config.mudClient.sendAndWait(`open ${doorName}`, 500);
      this.actionsUsed++;

      if (openResponse.match(/(?:opens?|unlocks?|clicks?)/i) && !openResponse.match(/(?:can't|cannot|won't|doesn't)/i)) {
        results.canOpen = true;
        results.isLocked = false;
        logger.info(`   ✅ Door opened successfully: ${doorName}`);

        // Look in the direction after opening
        await this.delay(500);
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
        await this.delay(500);
        const closeResponse = await this.config.mudClient.sendAndWait(`close ${doorName}`, 500);
        this.actionsUsed++;

        if (closeResponse.match(/(?:closes?|shuts?|clicks?)/i) && !closeResponse.match(/(?:can't|cannot|won't|doesn't)/i)) {
          results.canClose = true;
          logger.info(`   ✅ Door closed successfully: ${doorName}`);

          // Look in the direction after closing
          await this.delay(500);
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
      logger.info(`  Checking line for door: "${line}"`);
      // Simple and reliable door detection patterns
      const doorPatterns = [
        // "The hatch is closed/open" - capture the door name
        /(?:The|This|A|An)\s+(hatch|door|gate|portal|trapdoor|secret door)\s+(?:is|seems|appears)\s+(closed|open|locked|barred)/i,
        // "You see a hatch blocking the way" - capture the door name
        /(?:You see|There is)\s+(?:a|an)?\s*(hatch|door|gate|portal|trapdoor|secret door)/i,
        // "hatch is closed" - simple pattern
        /\b(hatch|door|gate|portal|trapdoor|secret door)\s+(?:is|seems|appears)\s+(closed|open|locked|barred)/i
      ];

      for (let patternIndex = 0; patternIndex < doorPatterns.length; patternIndex++) {
        const pattern = doorPatterns[patternIndex];
        const match = line.match(pattern);
        if (match) {
          logger.info(`    Pattern ${patternIndex} matched: ${match}`);
          // Extract door name - first capture group is always the door name
          let doorName = match[1];
          logger.info(`    Extracted doorName: "${doorName}"`);
          
          const isLocked = line.match(/(?:locked|closed|barred)/i) !== null && !line.match(/(?:open|unlocked)/i);
          logger.info(`    Final doorName: "${doorName}", isLocked: ${isLocked}`);
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

    // For exit look descriptions, we want to capture what the player sees
    // including "You see" messages which indicate the actual view
    let descriptionLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip status lines completely
      if (line.match(/<\s*\d+H\s+\d+M\s+\d+V.*>/)) {
        continue;
      }

      // Skip obvious system messages or prompts
      if (line.match(/^\[/) || line.match(/Return to continue/i) || line.match(/^>/) || line.match(/^\s*$/)) {
        continue;
      }

      // Include "You see" messages for exit descriptions - this is what the player actually sees
      // But skip "You don't see" or "You can't see" error messages
      if (line.match(/You (?:don't see|can't|cannot)/i)) {
        continue;
      }

      // Collect valid description lines until we hit a status line or prompt
      if (line.length > 2) {
        descriptionLines.push(line);
      }
    }

    return this.filterOutput(descriptionLines.join(' ').trim());
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
      if (line.match(/<\s*\d+H\s+\d+M\s+\d+V.*>/)) {
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
        return this.filterOutput(line.trim());
      }
    }

    logger.info(`  ✗ No valid door description found`);
    return '';
  }

  /**
   * Scan room description for visible doors and associate with exits
   */
  private scanDescriptionForDoors(roomData: RoomData, exitData: ExitData[]): void {
    const description = roomData.description.toLowerCase();

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
        const exit = exitData.find(e => e.direction === direction);
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}