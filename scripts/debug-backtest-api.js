const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';
let strategyId = '';

async function debugBacktestAPI() {
  try {
    console.log('🔍 Debugging backtest API issue...\n');
    
    // Step 1: Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'systemtest@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Step 2: Get existing strategy
    const strategiesResponse = await axios.get(`${BASE_URL}/strategies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (strategiesResponse.data.data.strategies.length > 0) {
      strategyId = strategiesResponse.data.data.strategies[0]._id;
      console.log('✅ Found strategy:', strategyId);
    } else {
      console.log('❌ No strategies found');
      return;
    }
    
    // Step 3: Test backtest with detailed error logging
    console.log('🔄 Testing backtest with detailed error logging...');
    try {
      const backtestResponse = await axios.post(`${BASE_URL}/backtest/${strategyId}`, {
        period: '1m',
        initialCapital: 100000
      }, {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 30000 // 30 second timeout
      });
      
      console.log('✅ Backtest successful!');
      console.log('📋 Result:', backtestResponse.data);
      
    } catch (backtestError) {
      console.log('❌ Backtest failed with detailed error:');
      console.log('📋 Status:', backtestError.response?.status);
      console.log('📋 Status Text:', backtestError.response?.statusText);
      console.log('📋 Headers:', backtestError.response?.headers);
      console.log('📋 Data:', backtestError.response?.data);
      console.log('📋 Request URL:', backtestError.config?.url);
      console.log('📋 Request Method:', backtestError.config?.method);
      console.log('📋 Request Data:', backtestError.config?.data);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugBacktestAPI();
