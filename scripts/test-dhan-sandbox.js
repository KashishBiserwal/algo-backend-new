const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let userToken = '';
let userId = '';

// Test user credentials
const testUser = {
  username: 'dhan_sandbox_test',
  email: 'dhan_sandbox@test.com',
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

async function testDhanSandboxConnection() {
  console.log('\n🏦 Testing Dhan Sandbox Connection...');
  
  const result = await makeRequest('GET', '/brokers/dhan/connect', null, {
    'Authorization': `Bearer ${userToken}`
  });
  
  if (result && result.success) {
    console.log('✅ Dhan sandbox connection successful');
    console.log('📊 Connection Data:', result.data);
    
    if (result.data.isSandbox) {
      console.log('🎯 Sandbox mode detected');
    }
    
    return true;
  } else {
    console.log('❌ Failed to connect to Dhan sandbox');
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

async function testDhanClient() {
  console.log('\n🧪 Testing Dhan Client with Sandbox...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    // Create sandbox client
    const client = new DhanClient({
      dhanClientId: process.env.DHAN_SANDBOX_CLIENT_ID || '2509247548',
      accessToken: process.env.DHAN_SANDBOX_TOKEN || 'test_token',
      isSandbox: true
    });
    
    console.log('✅ DhanClient created with sandbox configuration');
    console.log('🌐 Base URL:', client.baseUrl);
    console.log('🔑 Client ID:', client.dhanClientId);
    console.log('📋 Available methods:', Object.getOwnPropertyNames(DhanClient.prototype).filter(name => name !== 'constructor'));
    
    // Test connection
    const testResult = await client.testConnection();
    console.log('🔗 Connection test result:', testResult);
    
    return true;
  } catch (error) {
    console.log('❌ Failed to test DhanClient:', error.message);
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

async function runSandboxTest() {
  console.log('🚀 Starting Dhan Sandbox Test Suite...\n');
  
  // Check environment variables
  console.log('🔧 Environment Check:');
  console.log('   DHAN_SANDBOX_URL:', process.env.DHAN_SANDBOX_URL ? '✅ Set' : '❌ Not set');
  console.log('   DHAN_SANDBOX_TOKEN:', process.env.DHAN_SANDBOX_TOKEN ? '✅ Set' : '❌ Not set');
  console.log('   DHAN_SANDBOX_CLIENT_ID:', process.env.DHAN_SANDBOX_CLIENT_ID ? '✅ Set' : '❌ Not set');
  
  const tests = [
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Dhan Sandbox Connection', fn: testDhanSandboxConnection },
    { name: 'Dhan Status Check', fn: testDhanStatus },
    { name: 'Dhan Profile', fn: testDhanProfile },
    { name: 'Dhan Client Test', fn: testDhanClient },
    { name: 'Connected Brokers', fn: testConnectedBrokers }
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
    console.log('\n🎉 All tests passed! Dhan sandbox integration is working correctly.');
    console.log('\n📝 Next Steps:');
    console.log('1. Test trading operations (place order, get positions, etc.)');
    console.log('2. Integrate with your strategy execution engine');
    console.log('3. Add real-time data feeds');
    console.log('4. Implement order management features');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run the test suite
runSandboxTest().catch(console.error);
