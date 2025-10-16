const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/instruments';

async function testMultiBrokerAPIs() {
  try {
    console.log('🚀 Testing Multi-Broker APIs...\n');
    
    // Test 1: Get popular multi-broker instruments
    console.log('1️⃣ Testing popular multi-broker instruments...');
    try {
      const response = await axios.get(`${BASE_URL}/popular`);
      console.log('✅ Popular instruments API working');
      console.log('📊 Data structure:', {
        options: response.data.data.options?.length || 0,
        indices: response.data.data.indices?.length || 0,
        equity: response.data.data.equity?.length || 0,
        futures: response.data.data.futures?.length || 0
      });
      
      // Show sample instruments
      if (response.data.data.equity && response.data.data.equity.length > 0) {
        console.log('📋 Sample equity instrument:', {
          id: response.data.data.equity[0].id,
          symbol: response.data.data.equity[0].symbol,
          angelToken: response.data.data.equity[0].brokers?.angel?.token || 'N/A',
          dhanToken: response.data.data.equity[0].brokers?.dhan?.token || 'N/A'
        });
      }
    } catch (error) {
      console.error('❌ Popular instruments API failed:', error.response?.data || error.message);
    }
    
    // Test 2: Get multi-broker instruments only
    console.log('\n2️⃣ Testing multi-broker instruments endpoint...');
    try {
      const response = await axios.get(`${BASE_URL}/multi-broker?limit=5`);
      console.log('✅ Multi-broker instruments API working');
      console.log('📊 Found instruments:', response.data.data.length);
      
      if (response.data.data.length > 0) {
        const sample = response.data.data[0];
        console.log('📋 Sample multi-broker instrument:', {
          id: sample.id,
          symbol: sample.symbol,
          exchange: sample.exchange,
          angelToken: sample.brokers?.angel?.token || 'N/A',
          dhanToken: sample.brokers?.dhan?.token || 'N/A'
        });
      }
    } catch (error) {
      console.error('❌ Multi-broker instruments API failed:', error.response?.data || error.message);
    }
    
    // Test 3: Get broker token for an instrument
    console.log('\n3️⃣ Testing broker token resolution...');
    try {
      // First get a multi-broker instrument
      const instrumentsResponse = await axios.get(`${BASE_URL}/multi-broker?limit=1`);
      if (instrumentsResponse.data.data.length > 0) {
        const instrumentId = instrumentsResponse.data.data[0].id;
        
        // Test Angel One token
        const angelResponse = await axios.get(`${BASE_URL}/${instrumentId}/token?broker=angel`);
        console.log('✅ Angel One token API working');
        console.log('📋 Angel token data:', angelResponse.data.data);
        
        // Test Dhan token
        const dhanResponse = await axios.get(`${BASE_URL}/${instrumentId}/token?broker=dhan`);
        console.log('✅ Dhan token API working');
        console.log('📋 Dhan token data:', dhanResponse.data.data);
      } else {
        console.log('⚠️ No multi-broker instruments found for token testing');
      }
    } catch (error) {
      console.error('❌ Broker token API failed:', error.response?.data || error.message);
    }
    
    // Test 4: Get available brokers for an instrument
    console.log('\n4️⃣ Testing available brokers endpoint...');
    try {
      const instrumentsResponse = await axios.get(`${BASE_URL}/multi-broker?limit=1`);
      if (instrumentsResponse.data.data.length > 0) {
        const instrumentId = instrumentsResponse.data.data[0].id;
        const response = await axios.get(`${BASE_URL}/${instrumentId}/brokers`);
        console.log('✅ Available brokers API working');
        console.log('📋 Available brokers:', response.data.data.brokers);
      } else {
        console.log('⚠️ No multi-broker instruments found for broker testing');
      }
    } catch (error) {
      console.error('❌ Available brokers API failed:', error.response?.data || error.message);
    }
    
    // Test 5: Validate strategy for broker
    console.log('\n5️⃣ Testing strategy validation...');
    try {
      const instrumentsResponse = await axios.get(`${BASE_URL}/multi-broker?limit=1`);
      if (instrumentsResponse.data.data.length > 0) {
        const instrumentId = instrumentsResponse.data.data[0].id;
        
        const response = await axios.post(`${BASE_URL}/validate-strategy`, {
          symbol: instrumentId,
          broker: 'angel'
        });
        console.log('✅ Strategy validation API working');
        console.log('📋 Validation result:', response.data.data);
      } else {
        console.log('⚠️ No multi-broker instruments found for validation testing');
      }
    } catch (error) {
      console.error('❌ Strategy validation API failed:', error.response?.data || error.message);
    }
    
    console.log('\n✅ Multi-broker API testing completed!');
    console.log('\n📋 Available endpoints for strategy creation:');
    console.log('   - GET /api/instruments/popular - Multi-broker popular instruments');
    console.log('   - GET /api/instruments/multi-broker - All multi-broker instruments');
    console.log('   - GET /api/instruments/:id/token?broker=angel - Get Angel One token');
    console.log('   - GET /api/instruments/:id/token?broker=dhan - Get Dhan token');
    console.log('   - GET /api/instruments/:id/brokers - Get available brokers');
    console.log('   - POST /api/instruments/validate-strategy - Validate strategy for broker');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testMultiBrokerAPIs();
