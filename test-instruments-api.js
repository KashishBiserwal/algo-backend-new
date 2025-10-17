// Test script to check instrument tokens via API endpoints
const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';

// Test function to check instruments via API
const testInstrumentsAPI = async () => {
  try {
    console.log('🔍 Testing instruments via API endpoints...\n');

    // First, let's try to get some instruments
    console.log('📊 Fetching instruments from API...');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/instruments/popular`);
      console.log('✅ API Response Status:', response.status);
      console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log('❌ Error fetching instruments:', error.message);
      if (error.response) {
        console.log('📋 Error Response:', error.response.status, error.response.data);
      }
    }

    console.log('\n🔍 Testing broker endpoints...');
    
    try {
      const brokersResponse = await axios.get(`${API_BASE_URL}/brokers/available`);
      console.log('✅ Available Brokers:', JSON.stringify(brokersResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Error fetching available brokers:', error.message);
    }

    try {
      const connectedResponse = await axios.get(`${API_BASE_URL}/brokers/connected`);
      console.log('✅ Connected Brokers:', JSON.stringify(connectedResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Error fetching connected brokers:', error.message);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
};

// Test function to check if server is running
const testServerConnection = async () => {
  try {
    console.log('🔍 Testing server connection...');
    
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Server is running:', response.data);
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('💡 Make sure to start the backend server with: npm start');
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Testing Instruments and Brokers via API\n');
  
  const serverRunning = await testServerConnection();
  
  if (serverRunning) {
    await testInstrumentsAPI();
  } else {
    console.log('\n📋 MANUAL INSTRUMENT TOKEN CHECK:');
    console.log('==================================');
    console.log('Since the server is not running, here are the steps to check instrument tokens:');
    console.log('');
    console.log('1. Start the backend server:');
    console.log('   cd D:\\techninza\\algo-backend-new');
    console.log('   npm start');
    console.log('');
    console.log('2. Check MongoDB connection:');
    console.log('   - Make sure MongoDB is running');
    console.log('   - Check MONGO_URL in .env file');
    console.log('');
    console.log('3. Run this script again:');
    console.log('   node test-instruments-api.js');
    console.log('');
    console.log('4. Or check instruments directly in MongoDB:');
    console.log('   - Connect to MongoDB');
    console.log('   - Check the instruments collection');
    console.log('   - Look for brokers.dhan.token field');
    console.log('');
    console.log('🔧 QUICK FIX FOR MISSING DHAN TOKENS:');
    console.log('=====================================');
    console.log('If instruments are missing Dhan tokens, you can:');
    console.log('');
    console.log('1. Update instruments manually in MongoDB:');
    console.log('   db.instruments.updateMany({}, {');
    console.log('     $set: {');
    console.log('       "brokers.dhan.token": "NSE|SYMBOL",');
    console.log('       "brokers.dhan.tradable": true,');
    console.log('       "brokers.dhan.last_updated": new Date()');
    console.log('     }');
    console.log('   })');
    console.log('');
    console.log('2. Or run the update script after starting the server:');
    console.log('   node update-dhan-tokens.js');
  }
  
  console.log('\n🎯 EXPECTED INSTRUMENT STRUCTURE:');
  console.log('=================================');
  console.log('Instruments should have this structure:');
  console.log('{');
  console.log('  "symbol": "NIFTY",');
  console.log('  "name": "NIFTY 50",');
  console.log('  "brokers": {');
  console.log('    "angel": {');
  console.log('      "token": "NSE|NIFTY 50",');
  console.log('      "tradable": true');
  console.log('    },');
  console.log('    "dhan": {');
  console.log('      "token": "NSE|NIFTY 50",');
  console.log('      "tradable": true,');
  console.log('      "last_updated": "2024-01-01T10:00:00Z"');
  console.log('    }');
  console.log('  }');
  console.log('}');
};

// Run the test
main();
