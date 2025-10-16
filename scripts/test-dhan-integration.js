const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let userToken = '';
let userId = '';

// Test user credentials
const testUser = {
  username: 'dhan_test_user',
  email: 'dhan@test.com',
  password: 'test123456'
};

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ ${method} ${endpoint} failed:`, error.response?.data || error.message);
    return null;
  }
}

async function testUserRegistration() {
  console.log('\n🔐 Testing User Registration...');
  
  const result = await makeRequest('POST', '/auth/register', testUser);
  
  if (result && result.success) {
    console.log('✅ User registration successful');
    userToken = result.token;
    userId = result.user.id;
    return true;
  } else {
    console.log('❌ User registration failed');
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔐 Testing User Login...');
  
  const result = await makeRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  
  if (result && result.success) {
    console.log('✅ User login successful');
    userToken = result.token;
    userId = result.user.id;
    return true;
  } else {
    console.log('❌ User login failed');
    return false;
  }
}

async function testAvailableBrokers() {
  console.log('\n🏦 Testing Available Brokers...');
  
  const result = await makeRequest('GET', '/brokers/available', null, {
    'Authorization': `Bearer ${userToken}`
  });
  
  if (result && result.success) {
    console.log('✅ Available brokers fetched successfully');
    console.log('📋 Available brokers:', result.data.map(b => `${b.name} (${b.id})`).join(', '));
    
    const dhanBroker = result.data.find(b => b.id === 'dhan');
    if (dhanBroker && dhanBroker.isAvailable) {
      console.log('✅ Dhan broker is available');
      return true;
    } else {
      console.log('❌ Dhan broker is not available');
      return false;
    }
  } else {
    console.log('❌ Failed to fetch available brokers');
    return false;
  }
}

async function testDhanConnection() {
  console.log('\n🔗 Testing Dhan Connection Initiation...');
  
  const result = await makeRequest('GET', '/brokers/dhan/connect', null, {
    'Authorization': `Bearer ${userToken}`
  });
  
  if (result && result.success) {
    console.log('✅ Dhan connection initiated successfully');
    console.log('🔗 Login URL:', result.data.loginUrl);
    console.log('🆔 Consent App ID:', result.data.consentAppId);
    console.log('🔑 State:', result.data.state);
    return true;
  } else {
    console.log('❌ Failed to initiate Dhan connection');
    if (result && result.message) {
      console.log('📝 Error:', result.message);
    }
    return false;
  }
}

async function testDhanStatus() {
  console.log('\n📊 Testing Dhan Status Check...');
  
  const result = await makeRequest('GET', '/brokers/dhan/status', null, {
    'Authorization': `Bearer ${userToken}`
  });
  
  if (result && result.success) {
    console.log('✅ Dhan status check successful');
    console.log('📊 Connection Status:', result.data.connected ? 'Connected' : 'Not Connected');
    
    if (result.data.connected) {
      console.log('👤 Profile:', result.data.profile);
    } else {
      console.log('📝 Message:', result.data.message);
    }
    return true;
  } else {
    console.log('❌ Failed to check Dhan status');
    return false;
  }
}

async function testConnectedBrokers() {
  console.log('\n🔗 Testing Connected Brokers...');
  
  const result = await makeRequest('GET', '/brokers/connected', null, {
    'Authorization': `Bearer ${userToken}`
  });
  
  if (result && result.success) {
    console.log('✅ Connected brokers fetched successfully');
    console.log('📋 Connected brokers:', result.data.map(b => `${b.name} (${b.id})`).join(', '));
    return true;
  } else {
    console.log('❌ Failed to fetch connected brokers');
    return false;
  }
}

async function testDhanProfile() {
  console.log('\n👤 Testing Dhan Profile...');
  
  const result = await makeRequest('GET', '/brokers/dhan/profile', null, {
    'Authorization': `Bearer ${userToken}`
  });
  
  if (result && result.success) {
    console.log('✅ Dhan profile fetched successfully');
    console.log('👤 Profile Data:', result.data);
    return true;
  } else {
    console.log('❌ Failed to fetch Dhan profile');
    if (result && result.message) {
      console.log('📝 Error:', result.message);
    }
    return false;
  }
}

async function testDhanDisconnect() {
  console.log('\n🔌 Testing Dhan Disconnect...');
  
  const result = await makeRequest('DELETE', '/brokers/dhan/disconnect', null, {
    'Authorization': `Bearer ${userToken}`
  });
  
  if (result && result.success) {
    console.log('✅ Dhan disconnected successfully');
    return true;
  } else {
    console.log('❌ Failed to disconnect Dhan');
    if (result && result.message) {
      console.log('📝 Error:', result.message);
    }
    return false;
  }
}

async function testDhanClient() {
  console.log('\n🧪 Testing Dhan Client (Mock)...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    // Create a mock client (won't work without real credentials)
    const client = new DhanClient({
      dhanClientId: 'test_client',
      accessToken: 'test_token'
    });
    
    console.log('✅ DhanClient class loaded successfully');
    console.log('📋 Available methods:', Object.getOwnPropertyNames(DhanClient.prototype).filter(name => name !== 'constructor'));
    return true;
  } catch (error) {
    console.log('❌ Failed to load DhanClient:', error.message);
    return false;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Dhan Integration Test Suite...\n');
  
  const tests = [
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Available Brokers', fn: testAvailableBrokers },
    { name: 'Dhan Connection Initiation', fn: testDhanConnection },
    { name: 'Dhan Status Check', fn: testDhanStatus },
    { name: 'Connected Brokers', fn: testConnectedBrokers },
    { name: 'Dhan Profile', fn: testDhanProfile },
    { name: 'Dhan Client Class', fn: testDhanClient },
    { name: 'Dhan Disconnect', fn: testDhanDisconnect }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Dhan integration is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Configure DHAN_API_KEY and DHAN_API_SECRET in .env file');
  console.log('2. Test the complete OAuth flow with real Dhan credentials');
  console.log('3. Implement strategy execution using DhanClient');
  console.log('4. Add real-time data feeds and order management');
}

// Run the test suite
runComprehensiveTest().catch(console.error);
