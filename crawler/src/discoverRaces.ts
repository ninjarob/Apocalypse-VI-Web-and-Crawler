import { MUDClient } from './mudClient';
import { BackendAPI } from './api';
import { RaceDiscovery } from './raceDiscovery';
import logger from './logger';

/**
 * Standalone script to discover all races in the game
 * Run with: npm run discover-races
 */
async function main() {
  const client = new MUDClient(
    process.env.MUD_HOST || 'apocalypse6.com',
    parseInt(process.env.MUD_PORT || '6000'),
    process.env.MUD_USERNAME || 'Pocket',
    process.env.MUD_PASSWORD || 'P0ck3t'
  );

  const api = new BackendAPI('http://localhost:3002/api');
  const raceDiscovery = new RaceDiscovery(client, api);

  try {
    // Connect to MUD
    console.log('Connecting to MUD server...');
    await client.connect();
    console.log('✓ Connected and logged in\n');

    // Wait a moment for any initial messages to clear
    await new Promise(resolve => setTimeout(resolve, 2000));
    client.clearBuffer();

    // Run race discovery
    await raceDiscovery.discoverRaces();

    // Get summary of what was discovered
    const races = await api.getAllRaces();
    console.log(`\n=== Summary ===`);
    console.log(`Total races in database: ${races.length}`);
    if (races.length > 0) {
      console.log('Races:', races.map(r => r.name).join(', '));
    }

    // Disconnect
    await client.disconnect();
    console.log('\n✓ Race discovery completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during race discovery:', error);
    await client.disconnect();
    process.exit(1);
  }
}

main();
