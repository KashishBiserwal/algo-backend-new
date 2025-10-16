const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api';

console.log('🔧 Environment Check:');
console.log('   DHAN_SANDBOX_URL:', process.env.DHAN_SANDBOX_URL || '❌ Not set');
console.log('   DHAN_SANDBOX_TOKEN:', process.env.DHAN_SANDBOX_TOKEN ? '✅ Set' : '❌ Not set');
console.log('   DHAN_SANDBOX_CLIENT_ID:', process.env.DHAN_SANDBOX_CLIENT_ID || '❌ Not set');

async function testServerHealth() {
  console.log('\n🏥 Testing Server Health...');
  
  try {
    const response = await axios.get('http://localhost:4000/health');
    console.log('✅ Server is running');
    console.log('📊 Health:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('📝 Error:', error.message);
    return false;
  }
}

async function testAuthEndpoint() {
  console.log('\n🔐 Testing Auth Endpoint...');
  
  try {
    const response = await axios.get(`${BASE_URL}/auth/register`);
    console.log('✅ Auth endpoint is accessible');
    return true;
  } catch (error) {
    console.log('❌ Auth endpoint error:', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function testBrokerEndpoint() {
  console.log('\n🏦 Testing Broker Endpoint...');
  
  try {
    const response = await axios.get(`${BASE_URL}/brokers/available`);
    console.log('✅ Broker endpoint is accessible');
    console.log('📋 Available brokers:', response.data.data?.map(b => b.name).join(', ') || 'None');
    return true;
  } catch (error) {
    console.log('❌ Broker endpoint error:', error.response?.status, error.response?.data?.message || error.message);
    return false;
  }
}

async function testDhanClientDirectly() {
  console.log('\n🧪 Testing Dhan Client Directly...');
  
  try {
    const DhanClient = require('../services/dhanClient');
    
    const client = new DhanClient({
      dhanClientId: process.env.DHAN_SANDBOX_CLIENT_ID,
      accessToken: process.env.DHAN_SANDBOX_TOKEN,
      isSandbox: true
    });
    
    console.log('✅ DhanClient created successfully');
    console.log('🌐 Base URL:', client.baseUrl);
    console.log('🔑 Client ID:', client.dhanClientId);
    
    // Test a simple API call
    console.log('\n🔗 Testing Dhan API call...');
    const testResult = await client.testConnection();
    console.log('📊 API Test Result:', testResult);
    
    return true;
  } catch (error) {
    console.log('❌ DhanClient test failed:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️ Testing Database Connection...');
  
  try {
    const mongoose = require('mongoose');
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const User = require('../models/userModel');
    const userCount = await User.countDocuments();
    console.log('📊 Total users in database:', userCount);
    
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return false;
  }
}

async function runCompleteTest() {
  console.log('🚀 Starting Complete Dhan Integration Test...\n');
  
  const tests = [
    { name: 'Server Health', fn: testServerHealth },
    { name: 'Auth Endpoint', fn: testAuthEndpoint },
    { name: 'Broker Endpoint', fn: testBrokerEndpoint },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Dhan Client', fn: testDhanClientDirectly }
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
    console.log('\n🎉 All tests passed! Your Dhan sandbox integration is ready!');
    console.log('\n📝 Next Steps:');
    console.log('1. Create a user account through your frontend');
    console.log('2. Connect to Dhan sandbox using the /api/brokers/dhan/connect endpoint');
    console.log('3. Test trading operations with your strategies');
    console.log('4. Implement real-time data feeds');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure MongoDB is running and accessible');
    console.log('2. Check that all environment variables are set correctly');
    console.log('3. Verify the server is running on port 4000');
    console.log('4. Check server logs for detailed error messages');
  }
}

runCompleteTest().catch(console.error);
