const axios = require('axios');

async function testUpdate() {
  try {
    console.log('Testing PUT /api/player_actions/affected without id field...');
    const response = await axios.put('http://localhost:3002/api/player_actions/affected', {
      testResults: [{
        command_result: 'test output',
        tested_by_character: 'TestChar',
        tested_at: new Date().toISOString(),
        character_class: 'TestClass'
      }]
    });
    console.log('✅ Success:', response.status, response.data);
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data);
  }
}

testUpdate();