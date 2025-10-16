const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

console.log('🔧 Environment Variables Check:');
console.log('   DHAN_SANDBOX_URL:', process.env.DHAN_SANDBOX_URL || '❌ Not set');
console.log('   DHAN_SANDBOX_TOKEN:', process.env.DHAN_SANDBOX_TOKEN ? '✅ Set (length: ' + process.env.DHAN_SANDBOX_TOKEN.length + ')' : '❌ Not set');
console.log('   DHAN_SANDBOX_CLIENT_ID:', process.env.DHAN_SANDBOX_CLIENT_ID || '❌ Not set');
console.log('   MONGO_URL:', process.env.MONGO_URL || '❌ Not set');
console.log('   JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Not set');

async function testLogin() {
  console.log('\n🔐 Testing Login with existing user...');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'dhan_sandbox@test.com',
      password: 'test123456'
    });
    
    if (response.data.success) {
      console.log('✅ Login successful');
      console.log('🔑 Token received:', response.data.token ? 'Yes' : 'No');
      return response.data.token;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
  }
  
  // Try with different user
  console.log('\n🔐 Trying with different user...');
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (response.data.success) {
      console.log('✅ Login successful with test user');
      return response.data.token;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
  }
  
  return null;
}

async function testDhanConnection(token) {
  if (!token) {
    console.log('❌ No token available for Dhan test');
    return;
  }
  
  console.log('\n🏦 Testing Dhan Connection...');
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/dhan/connect`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Dhan connection successful');
      console.log('📊 Response:', response.data.data);
    } else {
      console.log('❌ Dhan connection failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Dhan connection error:', error.response?.data || error.message);
  }
}

async function testDhanStatus(token) {
  if (!token) {
    console.log('❌ No token available for status test');
    return;
  }
  
  console.log('\n📊 Testing Dhan Status...');
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/dhan/status`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Dhan status check successful');
      console.log('📊 Status:', response.data.data);
    } else {
      console.log('❌ Dhan status check failed:', response.data.message);
    }
  } catch (error) {
    console.log('❌ Dhan status error:', error.response?.data || error.message);
  }
}

async function runTest() {
  console.log('🚀 Starting Environment and Login Test...\n');
  
  const token = await testLogin();
  await testDhanConnection(token);
  await testDhanStatus(token);
  
  console.log('\n📝 Next Steps:');
  if (!process.env.DHAN_SANDBOX_TOKEN) {
    console.log('1. Add your Dhan sandbox credentials to .env file');
    console.log('2. Restart the server');
  } else {
    console.log('1. Environment variables are set correctly');
    console.log('2. Test the Dhan API endpoints');
  }
}

runTest().catch(console.error);
