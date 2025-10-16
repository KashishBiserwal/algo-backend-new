const axios = require('axios');

async function quickTest() {
  const baseUrl = 'http://localhost:4000';
  
  console.log('🚀 Quick API Test for algo-backend-new\n');
  console.log(`Testing: ${baseUrl}\n`);
  
  const tests = [
    { name: 'Health Check', method: 'GET', url: '/health' },
    { name: 'Root Endpoint', method: 'GET', url: '/' },
    { name: 'Popular Instruments', method: 'GET', url: '/api/instruments/popular' },
    { name: 'Instrument Stats', method: 'GET', url: '/api/instruments/stats' },
    { name: 'Available Brokers', method: 'GET', url: '/api/brokers/available' },
    { name: 'User Registration', method: 'POST', url: '/api/auth/register', data: {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'TestPass123!',
      confirmPassword: 'TestPass123!'
    }}
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`Testing ${test.name}...`);
      
      const config = {
        method: test.method,
        url: `${baseUrl}${test.url}`,
        timeout: 5000
      };
      
      if (test.data) {
        config.data = test.data;
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      console.log(`✅ ${test.name} - Status: ${response.status}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name} - ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        if (error.response.data && error.response.data.message) {
          console.log(`   Message: ${error.response.data.message}`);
        }
      }
      failed++;
    }
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
}

quickTest().catch(console.error);
