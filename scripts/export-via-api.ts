#!/usr/bin/env tsx
/**
 * Export Rooms and Exits to JSON Files via API
 * 
 * Fetches rooms and room_exits from the backend API and saves to JSON files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:3002/api';
const dataDir = path.join(__dirname, '../data');

console.log('📤 Exporting rooms and exits via API...\n');

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

async function exportZoneData() {
  try {
    // Get all zones
    console.log('📊 Fetching zones...');
    const zones = await fetchJson(`${API_BASE}/zones`);
    console.log(`✅ Found ${zones.length} zones\n`);

    // Get zones that have rooms
    const zonesWithRooms = [];
    
    for (const zone of zones) {
      const rooms = await fetchJson(`${API_BASE}/rooms?zone_id=${zone.id}`);
      
      if (rooms.length > 0) {
        zonesWithRooms.push({ zone, rooms });
        console.log(`✅ Zone ${zone.id} (${zone.name}): ${rooms.length} rooms`);
        
        // Save rooms to file
        const roomsFile = path.join(dataDir, `rooms_for_zone_${zone.id}.json`);
        fs.writeFileSync(roomsFile, JSON.stringify(rooms, null, 2));
        console.log(`   📝 Saved to rooms_for_zone_${zone.id}.json`);
        
        // Get exits for all rooms in this zone using zone_id filter
        try {
          const exits = await fetchJson(`${API_BASE}/room_exits?zone_id=${zone.id}`);
          
          if (exits.length > 0) {
            const exitsFile = path.join(dataDir, `room_exits_for_zone_${zone.id}.json`);
            fs.writeFileSync(exitsFile, JSON.stringify(exits, null, 2));
            console.log(`   📝 Saved ${exits.length} exits to room_exits_for_zone_${zone.id}.json\n`);
          } else {
            console.log(`   ⚠️  No exits found for zone ${zone.id}\n`);
          }
        } catch (error) {
          console.log(`   ⚠️  Error fetching exits for zone ${zone.id}: ${error}\n`);
        }
      }
    }

    console.log(`\n✨ Export complete! Processed ${zonesWithRooms.length} zones with rooms\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

exportZoneData();
