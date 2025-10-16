const axios = require('axios');

const BASE_URL = 'http://localhost:4001/api';

// Test function to check if server is running
async function testServerHealth() {
  try {
    const response = await axios.get(`${BASE_URL.replace('/api', '')}/health`);
    console.log('✅ Server is running:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Server is not running:', error.message);
    return false;
  }
}

// Test popular instruments endpoint
async function testPopularInstruments() {
  try {
    console.log('\n🔄 Testing popular instruments...');
    const response = await axios.get(`${BASE_URL}/instruments/popular`);
    console.log('✅ Popular instruments fetched successfully');
    console.log('📊 Data structure:', {
      options: response.data.data.options?.length || 0,
      indices: response.data.data.indices?.length || 0,
      equity: response.data.data.equity?.length || 0,
      futures: response.data.data.futures?.length || 0
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching popular instruments:', error.response?.data || error.message);
    return null;
  }
}

// Test search functionality
async function testSearchInstruments() {
  try {
    console.log('\n🔄 Testing instrument search...');
    const response = await axios.get(`${BASE_URL}/instruments/search`, {
      params: {
        query: 'NIFTY',
        category: 'options',
        page: 1,
        limit: 5
      }
    });
    console.log('✅ Search completed successfully');
    console.log('📊 Results:', {
      count: response.data.data.length,
      pagination: response.data.pagination
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error searching instruments:', error.response?.data || error.message);
    return null;
  }
}

// Test category endpoint
async function testCategoryInstruments() {
  try {
    console.log('\n🔄 Testing category instruments...');
    const response = await axios.get(`${BASE_URL}/instruments/category/equity`, {
      params: {
        page: 1,
        limit: 10
      }
    });
    console.log('✅ Category instruments fetched successfully');
    console.log('📊 Results:', {
      count: response.data.data.length,
      pagination: response.data.pagination
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching category instruments:', error.response?.data || error.message);
    return null;
  }
}

// Test symbols endpoint
async function testSymbolsEndpoint() {
  try {
    console.log('\n🔄 Testing symbols endpoint...');
    const response = await axios.get(`${BASE_URL}/instruments/symbols/equity`);
    console.log('✅ Symbols fetched successfully');
    console.log('📊 Total symbols:', response.data.data.length);
    console.log('📋 Sample symbols:', response.data.data.slice(0, 10));
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching symbols:', error.response?.data || error.message);
    return null;
  }
}

// Test statistics endpoint
async function testStatistics() {
  try {
    console.log('\n🔄 Testing statistics endpoint...');
    const response = await axios.get(`${BASE_URL}/instruments/stats`);
    console.log('✅ Statistics fetched successfully');
    console.log('📊 Stats:', response.data.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching statistics:', error.response?.data || error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting instrument API tests...\n');
  
  // Check if server is running
  const isServerRunning = await testServerHealth();
  if (!isServerRunning) {
    console.log('\n❌ Server is not running. Please start the server first with: npm start');
    return;
  }

  // Run all tests
  await testPopularInstruments();
  await testSearchInstruments();
  await testCategoryInstruments();
  await testSymbolsEndpoint();
  await testStatistics();

  console.log('\n✅ All tests completed!');
  console.log('\n📋 Available endpoints for frontend integration:');
  console.log('   - GET /api/instruments/popular - For tab initialization');
  console.log('   - GET /api/instruments/search - For search with pagination');
  console.log('   - GET /api/instruments/category/:category - For category-specific data');
  console.log('   - GET /api/instruments/symbols/:category - For search dropdowns');
  console.log('   - GET /api/instruments/stats - For dashboard statistics');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testServerHealth,
  testPopularInstruments,
  testSearchInstruments,
  testCategoryInstruments,
  testSymbolsEndpoint,
  testStatistics,
  runTests
};
