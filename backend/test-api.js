const axios = require('axios');

async function testAPI() {
  try {
    const response = await axios.get('http://localhost:3002/api/player_actions');
    console.log('Response status:', response.status);
    console.log('Response data length:', response.data.length);
    console.log('First few items:');
    response.data.slice(0, 3).forEach(item => {
      console.log(`  ${item.id}: ${item.name} (${item.type})`);
    });

    const affected = response.data.find(action => action.name === 'affected');
    console.log('Found affected:', affected ? 'yes' : 'no');
    if (affected) {
      console.log('Affected item:', affected);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();