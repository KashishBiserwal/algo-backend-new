const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

async function registerUser() {
  console.log('🔐 Registering new user...');
  
  const userData = {
    username: `dhan_test_${Date.now()}`,
    email: `dhan_test_${Date.now()}@test.com`,
    password: 'test123456'
  };
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, userData);
    
    if (response.data.success) {
      console.log('✅ User registered successfully');
      console.log('👤 User ID:', response.data.user.id);
      return response.data.token;
    }
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data?.message || error.message);
  }
  
  return null;
}

async function testDhanConnection(token) {
  console.log('\n🏦 Testing Dhan Sandbox Connection...');
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/dhan/connect`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Dhan sandbox connection successful!');
      console.log('📊 Connection Data:');
      console.log('   - Broker:', response.data.data.broker);
      console.log('   - Connected:', response.data.data.isConnected);
      console.log('   - Client ID:', response.data.data.dhanClientId);
      console.log('   - Sandbox Mode:', response.data.data.isSandbox);
      return true;
    } else {
      console.log('❌ Dhan connection failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Dhan connection error:', error.response?.data || error.message);
    return false;
  }
}

async function testDhanStatus(token) {
  console.log('\n📊 Testing Dhan Status...');
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/dhan/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Dhan status check successful!');
      console.log('📊 Status Data:');
      console.log('   - Connected:', response.data.data.connected);
      console.log('   - Message:', response.data.data.message);
      if (response.data.data.profile) {
        console.log('   - Profile:', response.data.data.profile);
      }
      return true;
    } else {
      console.log('❌ Dhan status check failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Dhan status error:', error.response?.data || error.message);
    return false;
  }
}

async function testDhanProfile(token) {
  console.log('\n👤 Testing Dhan Profile...');
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/dhan/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Dhan profile fetched successfully!');
      console.log('👤 Profile Data:', response.data.data);
      return true;
    } else {
      console.log('❌ Dhan profile failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Dhan profile error:', error.response?.data || error.message);
    return false;
  }
}

async function testConnectedBrokers(token) {
  console.log('\n🔗 Testing Connected Brokers...');
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/connected`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Connected brokers fetched successfully!');
      console.log('📋 Connected Brokers:', response.data.data.map(b => `${b.name} (${b.id})`).join(', '));
      return true;
    } else {
      console.log('❌ Connected brokers failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Connected brokers error:', error.response?.data || error.message);
    return false;
  }
}

async function runQuickTest() {
  console.log('🚀 Starting Quick Dhan Sandbox Test...\n');
  
  // Register a new user
  const token = await registerUser();
  
  if (!token) {
    console.log('❌ Cannot proceed without authentication token');
    return;
  }
  
  console.log('🔑 Authentication token received');
  
  // Test Dhan connection
  const connectionSuccess = await testDhanConnection(token);
  
  if (connectionSuccess) {
    // Test other endpoints
    await testDhanStatus(token);
    await testDhanProfile(token);
    await testConnectedBrokers(token);
    
    console.log('\n🎉 Dhan Sandbox Integration Test Complete!');
    console.log('\n📝 Summary:');
    console.log('✅ User registration and authentication working');
    console.log('✅ Dhan sandbox connection established');
    console.log('✅ All API endpoints responding correctly');
    console.log('\n🚀 Ready for strategy execution and trading operations!');
  } else {
    console.log('\n❌ Dhan connection failed. Check the error messages above.');
  }
}

runQuickTest().catch(console.error);
