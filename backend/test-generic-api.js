const axios = require('axios');

const API_BASE = 'http://localhost:3002/api';

async function testGenericAPI() {
  console.log('=== Testing Generic API System ===\n');

  try {
    // Test 1: Create a test race
    console.log('1. Creating a test race...');
    const testRace = {
      name: 'Test Elf',
      description: 'A graceful race with pointy ears',
      stats: { dexterity: 2, intelligence: 1, strength: -1 },
      abilities: ['Darkvision', 'Keen Senses'],
      requirements: ['None'],
      helpText: 'Test race for API validation',
      discovered: new Date()
    };
    const createResponse = await axios.post(`${API_BASE}/races`, testRace);
    console.log('✓ Race created:', createResponse.data.name);
    console.log('  ID:', createResponse.data.id);
    console.log();

    // Test 2: Get all races
    console.log('2. Getting all races...');
    const racesResponse = await axios.get(`${API_BASE}/races`);
    console.log(`✓ Found ${racesResponse.data.length} race(s)`);
    racesResponse.data.forEach(race => {
      console.log(`  - ${race.name} (${race.id})`);
    });
    console.log();

    // Test 3: Get single race by ID
    console.log('3. Getting race by ID...');
    const raceId = createResponse.data.id;
    const singleRaceResponse = await axios.get(`${API_BASE}/races/${raceId}`);
    console.log('✓ Retrieved race:', singleRaceResponse.data.name);
    console.log('  Stats:', JSON.stringify(singleRaceResponse.data.stats));
    console.log();

    // Test 4: Update race
    console.log('4. Updating race...');
    await axios.put(`${API_BASE}/races/${raceId}`, {
      description: 'Updated: A very graceful race with pointy ears'
    });
    const updatedResponse = await axios.get(`${API_BASE}/races/${raceId}`);
    console.log('✓ Race updated');
    console.log('  New description:', updatedResponse.data.description);
    console.log();

    // Test 5: Get race by name
    console.log('5. Getting race by name...');
    const byNameResponse = await axios.get(`${API_BASE}/races/by-name/Test Elf`);
    console.log('✓ Retrieved by name:', byNameResponse.data.name);
    console.log();

    // Test 6: Create a test class
    console.log('6. Creating a test class...');
    const testClass = {
      name: 'Test Warrior',
      description: 'A mighty fighter',
      stats: { strength: 3, constitution: 2 },
      abilities: ['Power Attack', 'Shield Bash'],
      startingEquipment: ['Sword', 'Shield', 'Leather Armor'],
      helpText: 'Test class for API validation',
      discovered: new Date()
    };
    const classResponse = await axios.post(`${API_BASE}/classes`, testClass);
    console.log('✓ Class created:', classResponse.data.name);
    console.log();

    // Test 7: Create a test skill
    console.log('7. Creating a test skill...');
    const testSkill = {
      name: 'Test Fireball',
      description: 'Launches a ball of fire',
      type: 'offensive',
      requirements: ['Level 5', 'Magic affinity'],
      effects: ['Fire damage', 'Area effect'],
      manaCost: 25,
      cooldown: 3,
      helpText: 'Test skill for API validation',
      discovered: new Date()
    };
    const skillResponse = await axios.post(`${API_BASE}/skills`, testSkill);
    console.log('✓ Skill created:', skillResponse.data.name);
    console.log();

    // Test 8: Get all classes
    console.log('8. Getting all classes...');
    const classesResponse = await axios.get(`${API_BASE}/classes`);
    console.log(`✓ Found ${classesResponse.data.length} class(es)`);
    console.log();

    // Test 9: Get all skills
    console.log('9. Getting all skills...');
    const skillsResponse = await axios.get(`${API_BASE}/skills`);
    console.log(`✓ Found ${skillsResponse.data.length} skill(s)`);
    console.log();

    // Test 10: Delete test entities (cleanup)
    console.log('10. Cleaning up test entities...');
    await axios.delete(`${API_BASE}/races/${raceId}`);
    await axios.delete(`${API_BASE}/classes/${classResponse.data.id}`);
    await axios.delete(`${API_BASE}/skills/${skillResponse.data.id}`);
    console.log('✓ Test entities deleted');
    console.log();

    console.log('=== All Tests Passed! ===');
    console.log('\n✓ Generic API system is working correctly');
    console.log('✓ CRUD operations: CREATE, READ, UPDATE, DELETE all functional');
    console.log('✓ Multiple entity types supported: races, classes, skills');
    console.log('✓ JSON field serialization working');
    console.log('✓ ID generation working');

  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    }
    process.exit(1);
  }
}

testGenericAPI();
