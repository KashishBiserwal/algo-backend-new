// Test script to verify the trading engine endpoint
const axios = require('axios');

async function testTradingEndpoint() {
  try {
    console.log('🧪 Testing Trading Engine Endpoint...\n');
    
    // Test the endpoint without authentication first
    console.log('📡 Testing endpoint: GET /api/trading/strategies/active');
    
    const response = await axios.get('http://localhost:4000/api/trading/strategies/active', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response received:', response.status);
    console.log('📊 Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    if (error.response) {
      console.log('❌ Error Response:', error.response.status);
      console.log('📋 Error Data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n✅ Endpoint exists but requires authentication (expected)');
        console.log('🔐 This is the correct behavior - the endpoint is working!');
      } else if (error.response.status === 404) {
        console.log('\n❌ Endpoint not found - route not properly mounted');
      } else {
        console.log('\n⚠️ Unexpected error status:', error.response.status);
      }
    } else {
      console.log('❌ Network Error:', error.message);
    }
  }
}

testTradingEndpoint();
