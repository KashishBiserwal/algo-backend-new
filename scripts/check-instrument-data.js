const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';

async function checkInstrumentData() {
  try {
    console.log('🔍 Checking instrument data...\n');
    
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'backtest@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Step 2: Get instrument data
    const instrumentResponse = await axios.get(`${BASE_URL}/instruments/TCS-EQUITY-NSE`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('📋 Instrument data:');
    console.log('   ID:', instrumentResponse.data.data._id);
    console.log('   Symbol:', instrumentResponse.data.data.symbol);
    console.log('   Name:', instrumentResponse.data.data.name);
    console.log('   Exchange:', instrumentResponse.data.data.exchange);
    console.log('   Segment:', instrumentResponse.data.data.segment);
    console.log('   Instrument Type:', instrumentResponse.data.data.instrument_type);
    console.log('   Brokers:', instrumentResponse.data.data.brokers);
    
  } catch (error) {
    console.error('❌ Error checking instrument data:', error.response?.data || error.message);
  }
}

checkInstrumentData();
