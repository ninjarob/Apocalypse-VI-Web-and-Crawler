/**
 * Test script for validation layer
 * Tests various API endpoints with valid and invalid data
 */

const API_BASE = 'http://localhost:3002/api';

// Helper function to make API requests
async function testRequest(method, endpoint, data, description) {
  console.log(`\n=== ${description} ===`);
  console.log(`${method} ${endpoint}`);
  if (data) {
    console.log('Data:', JSON.stringify(data, null, 2));
  }

  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const result = await response.json();

    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(result, null, 2));

    return { status: response.status, result };
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

async function runTests() {
  console.log('🧪 Testing Validation Layer\n');
  console.log('=' .repeat(60));

  // Test 1: Valid ability creation
  await testRequest(
    'POST',
    '/abilities',
    {
      name: 'Agility',
      short_name: 'AGI',
      description: 'Measures nimbleness and reflexes',
    },
    'Test 1: Valid ability creation (should succeed)'
  );

  // Test 2: Invalid ability - missing required field
  await testRequest(
    'POST',
    '/abilities',
    {
      short_name: 'LCK',
      description: 'Good fortune',
    },
    'Test 2: Invalid ability - missing name (should fail)'
  );

  // Test 3: Invalid ability - name too long
  await testRequest(
    'POST',
    '/abilities',
    {
      name: 'A'.repeat(200), // Too long (max 100)
      short_name: 'TST',
    },
    'Test 3: Invalid ability - name exceeds max length (should fail)'
  );

  // Test 4: Valid player action creation
  await testRequest(
    'POST',
    '/player_actions',
    {
      name: 'testcommand',
      type: 'command',
      category: 'testing',
      description: 'A test command for validation',
      documented: true,
      timesUsed: 0,
    },
    'Test 4: Valid player action creation (should succeed)'
  );

  // Test 5: Invalid player action - wrong type enum value
  await testRequest(
    'POST',
    '/player_actions',
    {
      name: 'badaction',
      type: 'invalid_type', // Not in enum
      category: 'testing',
    },
    'Test 5: Invalid player action - wrong type enum (should fail)'
  );

  // Test 6: Valid zone creation
  await testRequest(
    'POST',
    '/zones',
    {
      name: 'Test Zone',
      description: 'A testing zone',
      author: 'TestBot',
      difficulty: 5,
    },
    'Test 6: Valid zone creation (should succeed)'
  );

  // Test 7: Invalid zone - difficulty out of range
  await testRequest(
    'POST',
    '/zones',
    {
      name: 'Bad Zone',
      difficulty: 15, // Max is 10
    },
    'Test 7: Invalid zone - difficulty exceeds max (should fail)'
  );

  // Test 8: Valid zone area creation
  await testRequest(
    'POST',
    '/zone_areas',
    {
      zone_id: 1,
      name: 'Test Area',
      min_level: 10,
      max_level: 20,
    },
    'Test 8: Valid zone area creation (should succeed)'
  );

  // Test 9: Invalid zone area - min_level > max_level
  await testRequest(
    'POST',
    '/zone_areas',
    {
      zone_id: 1,
      name: 'Invalid Area',
      min_level: 30,
      max_level: 20, // Less than min_level
    },
    'Test 9: Invalid zone area - min > max (should fail)'
  );

  // Test 10: Valid room exit creation
  await testRequest(
    'POST',
    '/room_exits',
    {
      from_room_id: 1,
      to_room_id: 2,
      direction: 'north',
      description: 'A passage to the north',
      is_door: false,
    },
    'Test 10: Valid room exit creation (should succeed)'
  );

  // Test 11: Invalid room exit - invalid direction
  await testRequest(
    'POST',
    '/room_exits',
    {
      from_room_id: 1,
      to_room_id: 2,
      direction: 'diagonal', // Not a valid direction
    },
    'Test 11: Invalid room exit - invalid direction (should fail)'
  );

  // Test 12: Valid class creation
  await testRequest(
    'POST',
    '/classes',
    {
      name: 'Test Warrior',
      class_group_id: 1,
      description: 'A test warrior class',
      hp_regen: 5,
      mana_regen: 2,
      move_regen: 3,
    },
    'Test 12: Valid class creation (should succeed)'
  );

  // Test 13: Invalid class - negative regen value
  await testRequest(
    'POST',
    '/classes',
    {
      name: 'Bad Class',
      hp_regen: -5, // Can't be negative
    },
    'Test 13: Invalid class - negative hp_regen (should fail)'
  );

  // Test 14: Valid ability score creation
  await testRequest(
    'POST',
    '/ability_scores',
    {
      ability_id: 1,
      score: 15,
      effects: { bonus: '+2', description: 'Standard bonus' },
    },
    'Test 14: Valid ability score creation (should succeed)'
  );

  // Test 15: Invalid ability score - score out of range
  await testRequest(
    'POST',
    '/ability_scores',
    {
      ability_id: 1,
      score: 50, // Max is 26
      effects: {},
    },
    'Test 15: Invalid ability score - score too high (should fail)'
  );

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Validation testing complete!');
}

// Run tests
runTests().catch(console.error);
