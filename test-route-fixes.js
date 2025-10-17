// Test script to verify all route fixes are working
const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';
const STRATEGY_ID = '68f1fad2e5bb308dd0e99b3d';

// Test all the fixed routes
const testAllRoutes = async () => {
  try {
    console.log('🧪 Testing All Route Fixes\n');

    const routes = [
      {
        name: 'Strategy Terminal',
        method: 'GET',
        url: `/trading/strategy-terminal/${STRATEGY_ID}`,
        expectedError: 'Authentication required'
      },
      {
        name: 'Strategy Status',
        method: 'GET', 
        url: `/trading/strategy-status/${STRATEGY_ID}`,
        expectedError: 'Authentication required'
      },
      {
        name: 'Debug Info',
        method: 'GET',
        url: `/trading/debug`,
        expectedError: 'Authentication required'
      },
      {
        name: 'Start/Stop Trade Engine',
        method: 'POST',
        url: `/trading/start-stop-trade-engine`,
        data: {
          TradeEngineName: 'test-engine',
          BrokerClientId: 'dhan',
          ConnectOptions: 'Start'
        },
        expectedError: 'Authentication required'
      },
      {
        name: 'Strategy Deployment',
        method: 'POST',
        url: `/trading/strategies/${STRATEGY_ID}/add`,
        data: { broker: 'dhan' },
        expectedError: 'Authentication required'
      }
    ];

    for (const route of routes) {
      console.log(`🔍 Testing ${route.name}...`);
      
      try {
        let response;
        if (route.method === 'GET') {
          response = await axios.get(`${API_BASE_URL}${route.url}`);
        } else {
          response = await axios.post(`${API_BASE_URL}${route.url}`, route.data);
        }
        
        console.log(`✅ ${route.name}: Route found (Status: ${response.status})`);
        console.log(`   Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
        
      } catch (error) {
        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.message || error.response.data?.Message || 'Unknown error';
          
          if (status === 401 && message.includes('token')) {
            console.log(`✅ ${route.name}: Route found (Authentication required - expected)`);
          } else if (status === 404) {
            console.log(`❌ ${route.name}: Route not found (404)`);
          } else {
            console.log(`⚠️  ${route.name}: Route found but error (${status}: ${message})`);
          }
        } else {
          console.log(`❌ ${route.name}: Network error - ${error.message}`);
        }
      }
      
      console.log(''); // Empty line for readability
    }

  } catch (error) {
    console.error('❌ Error testing routes:', error);
  }
};

// Test the old incorrect routes to make sure they're not working
const testOldRoutes = async () => {
  try {
    console.log('🔍 Testing Old Incorrect Routes (should fail)...\n');

    const oldRoutes = [
      {
        name: 'Old Strategy Terminal',
        url: `/trading-engine/strategy-terminal/${STRATEGY_ID}`
      },
      {
        name: 'Old Strategy Status', 
        url: `/trading-engine/strategy-status/${STRATEGY_ID}`
      },
      {
        name: 'Old Debug Info',
        url: `/trading-engine/debug`
      },
      {
        name: 'Old Start/Stop Trade Engine',
        url: `/trading-engine/start-stop-trade-engine`
      }
    ];

    for (const route of oldRoutes) {
      console.log(`🔍 Testing ${route.name}...`);
      
      try {
        const response = await axios.get(`${API_BASE_URL}${route.url}`);
        console.log(`❌ ${route.name}: Route still exists (should be removed)`);
        
      } catch (error) {
        if (error.response?.status === 404) {
          console.log(`✅ ${route.name}: Route correctly removed (404)`);
        } else {
          console.log(`⚠️  ${route.name}: Unexpected error - ${error.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error testing old routes:', error);
  }
};

// Main execution
const main = async () => {
  console.log('🧪 Testing Route Fixes\n');
  
  await testAllRoutes();
  await testOldRoutes();
  
  console.log('🎯 SUMMARY:');
  console.log('===========');
  console.log('✅ Fixed frontend URLs from /trading-engine/ to /trading/');
  console.log('✅ Added missing backend routes:');
  console.log('   - /trading/strategy-terminal/:strategyId');
  console.log('   - /trading/strategy-status/:strategyId');
  console.log('   - /trading/debug');
  console.log('   - /trading/start-stop-trade-engine');
  console.log('✅ Added corresponding controller methods');
  console.log('');
  console.log('🚀 READY TO TEST:');
  console.log('=================');
  console.log('1. The "Route not found" error should be fixed');
  console.log('2. Strategy terminal should work now');
  console.log('3. Strategy status should work now');
  console.log('4. Debug panel should work now');
  console.log('5. Trade engine controls should work now');
  console.log('');
  console.log('💡 Try accessing the strategy terminal from the frontend now!');
};

// Run the test
main().catch(console.error);
