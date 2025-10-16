const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';
let strategyId = '';

async function debugBacktest() {
  try {
    console.log('🔍 Debugging backtest issue...\n');
    
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'backtest@example.com',
      password: 'password123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Logged in successfully');
    
    // Step 2: Get existing strategy
    console.log('\n2️⃣ Getting existing strategies...');
    const strategiesResponse = await axios.get(`${BASE_URL}/strategies`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (strategiesResponse.data.data.strategies.length > 0) {
      strategyId = strategiesResponse.data.data.strategies[0]._id;
      console.log('✅ Found existing strategy:', strategyId);
    } else {
      console.log('❌ No strategies found');
      return;
    }
    
    // Step 3: Check data availability
    console.log('\n3️⃣ Checking data availability...');
    const dataCheck = await axios.get(`${BASE_URL}/backtest/data/TCS`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('📋 Data check result:', dataCheck.data);
    
    // Step 4: Try a simple backtest with minimal data
    console.log('\n4️⃣ Running simple backtest...');
    const backtestData = {
      period: '1m',
      initialCapital: 100000
    };
    
    try {
      const backtestResponse = await axios.post(`${BASE_URL}/backtest/${strategyId}`, backtestData, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log('✅ Backtest successful!');
      console.log('📋 Result:', backtestResponse.data);
      
    } catch (backtestError) {
      console.log('❌ Backtest failed:');
      console.log('📋 Error response:', backtestError.response?.data);
      console.log('📋 Error status:', backtestError.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

debugBacktest();
