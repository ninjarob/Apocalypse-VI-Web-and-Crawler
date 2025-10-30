/**
 * Test script for error handling layer
 * Tests various error scenarios with custom error responses
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
  console.log('🧪 Testing Error Handling Layer\n');
  console.log('=' .repeat(60));

  // Test 1: 404 - Entity Not Found
  await testRequest(
    'GET',
    '/abilities/999',
    null,
    'Test 1: 404 Not Found - Non-existent ability ID'
  );

  // Test 2: 400 - Bad Request (Unknown entity type)
  await testRequest(
    'GET',
    '/invalid_entity_type',
    null,
    'Test 2: 400 Bad Request - Unknown entity type'
  );

  // Test 3: 400 - Bad Request (Invalid data)
  await testRequest(
    'POST',
    '/abilities',
    { short_name: 'TST' }, // Missing required 'name' field
    'Test 3: 400 Bad Request - Missing required field'
  );

  // Test 4: 400 - Bad Request (Validation failure)
  await testRequest(
    'POST',
    '/zones',
    { name: 'Test', difficulty: 99 }, // Difficulty out of range
    'Test 4: 400 Bad Request - Validation error (difficulty > 10)'
  );

  // Test 5: 404 - Not Found by name
  await testRequest(
    'GET',
    '/rooms/by-name/NonexistentRoom',
    null,
    'Test 5: 404 Not Found - Room by name'
  );

  // Test 6: 404 - Entity not found for update
  await testRequest(
    'PUT',
    '/zones/9999',
    { name: 'Updated Zone' },
    'Test 6: 404 Not Found - Update non-existent zone'
  );

  // Test 7: 404 - Entity not found for delete
  await testRequest(
    'DELETE',
    '/zones/9999',
    null,
    'Test 7: 404 Not Found - Delete non-existent zone'
  );

  // Test 8: 400 - Invalid enum value
  await testRequest(
    'POST',
    '/player_actions',
    {
      name: 'test_action',
      type: 'invalid_type' // Not in enum
    },
    'Test 8: 400 Bad Request - Invalid enum value for type'
  );

  // Test 9: 400 - Custom validation (min > max)
  await testRequest(
    'POST',
    '/zone_areas',
    {
      zone_id: 1,
      name: 'Bad Area',
      min_level: 50,
      max_level: 10 // min > max
    },
    'Test 9: 400 Bad Request - Custom validation (min_level > max_level)'
  );

  // Test 10: 400 - Invalid direction in room exit
  await testRequest(
    'POST',
    '/room_exits',
    {
      from_room_id: 1,
      to_room_id: 2,
      direction: 'sideways' // Invalid direction
    },
    'Test 10: 400 Bad Request - Invalid direction enum'
  );

  // Test 11: 404 - GET specific entity that doesn't exist
  await testRequest(
    'GET',
    '/zones/999999',
    null,
    'Test 11: 404 Not Found - Specific zone by ID'
  );

  // Test 12: 404 - Unmatched route (should hit notFoundHandler)
  await testRequest(
    'GET',
    '/completely/invalid/route',
    null,
    'Test 12: 404 Not Found - Completely invalid route'
  );

  // Test 13: Valid request (should succeed with 200/201)
  await testRequest(
    'GET',
    '/abilities',
    null,
    'Test 13: 200 Success - GET all abilities (control test)'
  );

  // Test 14: Valid create (should succeed with 201)
  await testRequest(
    'POST',
    '/saving_throws',
    {
      name: 'Test Save',
      description: 'A test saving throw'
    },
    'Test 14: 201 Created - Valid entity creation (control test)'
  );

  // Test 15: 400 - String too long
  await testRequest(
    'POST',
    '/abilities',
    {
      name: 'A'.repeat(200), // Exceeds 100 char limit
      description: 'Test'
    },
    'Test 15: 400 Bad Request - String exceeds max length'
  );

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Error handling testing complete!');
  console.log('\nExpected Results:');
  console.log('  - All 404 errors should have statusCode: 404');
  console.log('  - All 400 errors should have statusCode: 400');
  console.log('  - Error responses should have consistent format');
  console.log('  - Error messages should be descriptive');
  console.log('  - Validation errors should show field details');
}

// Run tests
runTests().catch(console.error);
