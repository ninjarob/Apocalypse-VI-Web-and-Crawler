#!/usr/bin/env ts-node

import { MudLogParser } from './dist/crawler/src/mudLogParser.js';
import * as path from 'path';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🗺️  MUD Log Parser - Convert session logs to database entries

Usage: npm run parse-logs <log-file> [options]

Options:
  --zone-id <id>      Default zone ID for rooms (optional - will auto-detect from log)
  --export <file>     Export parsed data to JSON file
  --dry-run          Parse and show stats only, don't save to database

Examples:
  # Parse and save with auto-detected zone
  npm run parse-logs midgaard-session.txt

  # Parse and save Midgaard exploration with explicit zone
  npm run parse-logs midgaard-session.txt --zone-id 2

  # Parse and export to JSON for review
  npm run parse-logs midgaard-session.txt --export midgaard-rooms.json --dry-run

  # Parse and both save and export
  npm run parse-logs midgaard-session.txt --export midgaard-rooms.json

Log File Format:
  Your log file should contain the raw output from your MUD session, including:
  - Room titles and descriptions
  - Exit lists
  - Movement commands
  - NPCs and items (optional)
  
  The parser will automatically detect room boundaries and extract all information.
  `);
  process.exit(1);
}

const logFile = args[0];
const zoneId = args.includes('--zone-id') 
  ? parseInt(args[args.indexOf('--zone-id') + 1]) 
  : undefined;
const exportFile = args.includes('--export') 
  ? args[args.indexOf('--export') + 1] 
  : null;
const dryRun = args.includes('--dry-run');

(async () => {
  try {
    console.log('🚀 Starting MUD Log Parser\n');
    
    const parser = new MudLogParser();
    
    // Parse the log file
    await parser.parseLogFile(logFile);
    
    // Export if requested
    if (exportFile) {
      parser.exportToJson(exportFile);
    }
    
    // Save to database unless dry-run
    if (!dryRun) {
      // Zone ID is now optional - will auto-detect from log
      await parser.resolveZones(zoneId);
      await parser.saveToDatabase(zoneId);
    } else {
      console.log('\n🔍 Dry run complete - no data saved to database');
    }
    
    console.log('\n✨ Done!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
