import { MUDClient } from './mudClient';
import logger from './logger';

export interface CharacterStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  vitality: number;
  maxVitality: number;
  isHungry: boolean;
  isThirsty: boolean;
}

export interface MaintenanceConfig {
  minManaForRest: number;        // Rest when mana drops below this
  targetManaAfterRest: number;    // Wake up when mana reaches this
  hungerThreshold: number;        // How often to check/eat (in commands)
  marketSquareRoomName: string;   // Name of room with fountain
  breadItemName: string;          // Name of bread item
  bladderItemName: string;        // Name of water container
}

/**
 * Handles character maintenance: rest/wake for mana, eat/drink for hunger/thirst
 */
export class CharacterMaintenance {
  private client: MUDClient;
  private config: MaintenanceConfig;
  private lastStats: CharacterStats | null = null;
  private commandsSinceLastCheck = 0;

  constructor(client: MUDClient, config?: Partial<MaintenanceConfig>) {
    this.client = client;
    this.config = {
      minManaForRest: 20,
      targetManaAfterRest: 150,
      hungerThreshold: 50,
      marketSquareRoomName: 'Market Square',
      breadItemName: 'bread',
      bladderItemName: 'bladder',
      ...config
    };
  }

  /**
   * Parse character stats from MUD response
   * Format: < 197H 286M 134V >
   */
  parseStats(text: string): CharacterStats | null {
    const statMatch = text.match(/<\s*(\d+)H\s+(\d+)M\s+(\d+)V/);
    if (!statMatch) {
      return null;
    }

    const health = parseInt(statMatch[1]);
    const mana = parseInt(statMatch[2]);
    const vitality = parseInt(statMatch[3]);

    // Check for hunger/thirst messages
    const isHungry = /you are hungry/i.test(text);
    const isThirsty = /you are thirsty/i.test(text);

    const stats: CharacterStats = {
      health,
      maxHealth: health, // We'd need to track this separately for actual max
      mana,
      maxMana: 300, // Approximate - could be calculated from observations
      vitality,
      maxVitality: 150, // Approximate
      isHungry,
      isThirsty
    };

    this.lastStats = stats;
    return stats;
  }

  /**
   * Get the last known character stats
   */
  getLastStats(): CharacterStats | null {
    return this.lastStats;
  }

  /**
   * Check if character needs rest based on mana
   */
  needsRest(): boolean {
    if (!this.lastStats) return false;
    return this.lastStats.mana < this.config.minManaForRest;
  }

  /**
   * Check if character needs food or water
   */
  needsFood(): boolean {
    if (!this.lastStats) return false;
    return this.lastStats.isHungry;
  }

  needsWater(): boolean {
    if (!this.lastStats) return false;
    return this.lastStats.isThirsty;
  }

  /**
   * Rest until mana is restored
   * @returns true if successfully rested, false if interrupted/failed
   */
  async rest(): Promise<boolean> {
    if (!this.lastStats) {
      logger.warn('⚠️  Cannot rest - no stats available');
      return false;
    }

    const startMana = this.lastStats.mana;
    logger.info(`💤 Resting to restore mana (current: ${startMana}M, target: ${this.config.targetManaAfterRest}M)`);

    // Send rest command
    const restResponse = await this.client.sendAndWait('rest', 1000);
    
    // Check if rest was successful
    if (/you (can't|cannot) rest/i.test(restResponse)) {
      logger.warn('⚠️  Cannot rest here');
      return false;
    }

    if (/you (sit|lie) down and rest/i.test(restResponse)) {
      logger.info('   Resting...');
    }

    // Wait for mana to regenerate, checking periodically
    let attempts = 0;
    const maxAttempts = 60; // Max 60 checks (about 5 minutes at 5-second intervals)
    
    while (attempts < maxAttempts) {
      await this.delay(5000); // Wait 5 seconds
      
      // Check current stats by sending a no-op command
      const checkResponse = await this.client.sendAndWait('score', 1000);
      const currentStats = this.parseStats(checkResponse);
      
      if (currentStats) {
        logger.info(`   Mana: ${currentStats.mana}M / ${this.config.targetManaAfterRest}M`);
        
        if (currentStats.mana >= this.config.targetManaAfterRest) {
          logger.info(`✅ Mana restored! (${startMana}M → ${currentStats.mana}M)`);
          
          // Wake up
          await this.client.sendAndWait('wake', 500);
          await this.client.sendAndWait('stand', 500);
          
          return true;
        }
      }
      
      attempts++;
    }

    logger.warn(`⚠️  Rest timeout after ${maxAttempts * 5} seconds`);
    
    // Wake up anyway
    await this.client.sendAndWait('wake', 500);
    await this.client.sendAndWait('stand', 500);
    
    return false;
  }

  /**
   * Drink water from bladder or fountain
   * @param atFountain - if true, drink from fountain; if false, drink from bladder
   */
  async drink(atFountain: boolean = false): Promise<boolean> {
    logger.info(`💧 Drinking water ${atFountain ? 'from fountain' : 'from bladder'}`);

    let drinkResponse: string;
    if (atFountain) {
      drinkResponse = await this.client.sendAndWait('drink fountain', 1000);
    } else {
      drinkResponse = await this.client.sendAndWait(`drink ${this.config.bladderItemName}`, 1000);
    }

    const success = /you drink|you take a drink|refreshing|no longer thirsty/i.test(drinkResponse);
    
    if (success) {
      logger.info('   ✅ Drank water');
      if (this.lastStats) {
        this.lastStats.isThirsty = false;
      }
      return true;
    } else {
      logger.warn(`   ⚠️  Could not drink: ${drinkResponse.substring(0, 100)}`);
      return false;
    }
  }

  /**
   * Eat bread
   */
  async eat(): Promise<boolean> {
    logger.info('🍞 Eating bread');

    const eatResponse = await this.client.sendAndWait(`eat ${this.config.breadItemName}`, 1000);
    
    const success = /you eat|you consume|you finish eating|no longer hungry/i.test(eatResponse);
    
    if (success) {
      logger.info('   ✅ Ate bread');
      if (this.lastStats) {
        this.lastStats.isHungry = false;
      }
      return true;
    } else {
      logger.warn(`   ⚠️  Could not eat: ${eatResponse.substring(0, 100)}`);
      return false;
    }
  }

  /**
   * Fill bladder at fountain
   */
  async fillBladder(): Promise<boolean> {
    logger.info('💧 Filling bladder at fountain');

    const fillResponse = await this.client.sendAndWait(`fill ${this.config.bladderItemName} fountain`, 1500);
    
    const success = /you fill|filled|water|container/i.test(fillResponse);
    
    if (success) {
      logger.info('   ✅ Filled bladder');
      return true;
    } else {
      logger.warn(`   ⚠️  Could not fill bladder: ${fillResponse.substring(0, 100)}`);
      return false;
    }
  }

  /**
   * Perform complete maintenance at Market Square fountain
   * This should be called when at Market Square
   */
  async performMaintenanceAtFountain(): Promise<boolean> {
    logger.info('🔧 Performing maintenance at fountain');

    let success = true;

    // Drink from fountain if thirsty
    if (this.needsWater()) {
      success = await this.drink(true) && success;
    }

    // Fill bladder
    const fillResult = await this.fillBladder();
    success = fillResult && success;

    // Eat if hungry
    if (this.needsFood()) {
      success = await this.eat() && success;
    }

    return success;
  }

  /**
   * Check and handle maintenance needs
   * Call this periodically during crawling
   * @param currentRoomName - name of current room
   * @param navigateToMarketSquare - callback function to navigate to Market Square
   * @returns true if maintenance was performed, false otherwise
   */
  async checkAndMaintain(
    currentRoomName: string,
    navigateToMarketSquare?: () => Promise<boolean>
  ): Promise<boolean> {
    this.commandsSinceLastCheck++;

    // Parse stats from recent response if available
    const buffer = this.client.getBuffer();
    this.parseStats(buffer);

    // Check if we need rest (high priority)
    if (this.needsRest()) {
      logger.info('⚠️  Low mana detected - resting');
      await this.rest();
      return true;
    }

    // Check hunger/thirst every N commands or when explicitly needed
    const shouldCheckFood = 
      this.commandsSinceLastCheck >= this.config.hungerThreshold ||
      this.needsFood() ||
      this.needsWater();

    if (!shouldCheckFood) {
      return false;
    }

    this.commandsSinceLastCheck = 0;

    let maintenancePerformed = false;

    // Try to handle needs locally first (no navigation required)
    
    // If thirsty, try drinking from bladder first
    if (this.needsWater()) {
      logger.info('⚠️  Thirsty - trying to drink from bladder');
      const drankFromBladder = await this.drink(false); // false = from bladder
      
      if (drankFromBladder) {
        logger.info('   ✅ Satisfied thirst from bladder');
        maintenancePerformed = true;
        // Still thirsty? Bladder might be empty
        if (!this.needsWater()) {
          // Thirst satisfied, check if we still need food
          if (!this.needsFood()) {
            return true; // All needs met without navigation!
          }
        }
      } else {
        logger.info('   ⚠️  Bladder empty or unavailable - will need fountain');
      }
    }

    // If hungry, try eating bread (no navigation needed)
    if (this.needsFood()) {
      logger.info('⚠️  Hungry - trying to eat bread');
      const ate = await this.eat();
      
      if (ate) {
        logger.info('   ✅ Satisfied hunger');
        maintenancePerformed = true;
        // If we satisfied hunger and aren't thirsty, we're done
        if (!this.needsWater()) {
          return true; // All needs met without navigation!
        }
      } else {
        logger.info('   ⚠️  No bread or cannot eat - will need to restock');
      }
    }

    // If we still need water (bladder was empty) or need to refill, go to fountain
    const needsFountain = this.needsWater() || maintenancePerformed; // Refill if we used supplies
    
    if (needsFountain) {
      // Navigate to Market Square if not already there
      if (currentRoomName !== this.config.marketSquareRoomName) {
        logger.info('⚠️  Need fountain access - navigating to Market Square');
        
        if (!navigateToMarketSquare) {
          logger.warn('⚠️  No navigation function provided - cannot reach Market Square');
          return maintenancePerformed;
        }

        const navigated = await navigateToMarketSquare();
        if (!navigated) {
          logger.warn('⚠️  Failed to navigate to Market Square');
          return maintenancePerformed;
        }
      }

      // Perform fountain maintenance (drink if still thirsty, fill bladder, eat if still hungry)
      await this.performMaintenanceAtFountain();
      return true;
    }

    return maintenancePerformed;
  }

  /**
   * Update config settings
   */
  updateConfig(config: Partial<MaintenanceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
