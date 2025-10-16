const axios = require('axios');

async function testServer() {
  const baseUrl = 'http://localhost:4001';
  
  console.log('🔍 Testing if server is running...\n');
  
  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await axios.get(`${baseUrl}/health`, { timeout: 5000 });
    console.log('✅ Health endpoint working:', healthResponse.status);
    console.log('Response:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running. Please start it with: npm start');
    }
  }
  
  try {
    // Test root endpoint
    console.log('\nTesting root endpoint...');
    const rootResponse = await axios.get(`${baseUrl}/`, { timeout: 5000 });
    console.log('✅ Root endpoint working:', rootResponse.status);
    console.log('Response:', rootResponse.data);
  } catch (error) {
    console.log('❌ Root endpoint failed:', error.message);
  }
  
  try {
    // Test auth register endpoint
    console.log('\nTesting auth register endpoint...');
    const authResponse = await axios.post(`${baseUrl}/api/auth/register`, {
      username: 'test',
      email: 'test@test.com',
      password: 'test123',
      confirmPassword: 'test123'
    }, { timeout: 5000 });
    console.log('✅ Auth register endpoint working:', authResponse.status);
  } catch (error) {
    console.log('❌ Auth register endpoint failed:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    }
  }
}

testServer().catch(console.error);
