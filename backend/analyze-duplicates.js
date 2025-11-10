const fs = require('fs');

// Read the rooms.json file
const rooms = JSON.parse(fs.readFileSync('rooms.json', 'utf-8'));

// Group rooms by name
const roomsByName = {};
rooms.forEach(room => {
  if (!roomsByName[room.name]) {
    roomsByName[room.name] = [];
  }
  roomsByName[room.name].push(room);
});

// Find duplicates
const duplicates = Object.entries(roomsByName).filter(([name, rooms]) => rooms.length > 1);

console.log(`\n📊 Duplicate Room Analysis\n${'='.repeat(80)}\n`);
console.log(`Total unique room names: ${Object.keys(roomsByName).length}`);
console.log(`Duplicate room names: ${duplicates.length}`);
console.log(`Total rooms: ${rooms.length}\n`);

console.log(`\n🔍 Detailed Duplicate Analysis\n${'='.repeat(80)}\n`);

duplicates.forEach(([name, roomList]) => {
  console.log(`📍 "${name}" (${roomList.length} instances):`);
  roomList.forEach(room => {
    const portalKey = room.portal_key || 'NO KEY';
    const keyStatus = room.portal_key ? '✅' : '❌';
    console.log(`   ${keyStatus} ID ${room.id}: portal_key="${portalKey}"`);
  });
  
  // Check if any have portal keys
  const withKeys = roomList.filter(r => r.portal_key);
  const withoutKeys = roomList.filter(r => !r.portal_key);
  
  if (withKeys.length > 0 && withoutKeys.length > 0) {
    console.log(`   ⚠️  MIXED: ${withKeys.length} with keys, ${withoutKeys.length} without keys`);
  } else if (withoutKeys.length === roomList.length) {
    console.log(`   ⚠️  ALL WITHOUT KEYS - duplicates created!`);
  } else if (withKeys.length === roomList.length) {
    console.log(`   ✅ All have portal keys (different keys = different rooms)`);
  }
  console.log('');
});

// Summary
const problemRooms = duplicates.filter(([name, roomList]) => {
  const withKeys = roomList.filter(r => r.portal_key);
  const withoutKeys = roomList.filter(r => !r.portal_key);
  return withKeys.length > 0 && withoutKeys.length > 0;
});

const allWithoutKeys = duplicates.filter(([name, roomList]) => {
  return roomList.every(r => !r.portal_key);
});

console.log(`\n📈 Summary\n${'='.repeat(80)}\n`);
console.log(`Rooms with MIXED portal key status: ${problemRooms.length}`);
console.log(`Rooms ALL WITHOUT portal keys: ${allWithoutKeys.length}`);
console.log(`\n💡 Root Cause: Rooms without portal keys are being duplicated because`);
console.log(`   the parser uses "namedesc:{name}|||{description}" as the key,`);
console.log(`   and descriptions might vary slightly (NPCs, items, etc.)`);
