const axios = require('axios');

async function debugAngelOneAPI() {
  try {
    console.log('🔄 Fetching Angel One API response...');
    const response = await axios.get('https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json');
    const data = response.data;
    
    console.log('📊 Angel One API Response:');
    console.log('Total records:', data.length);
    console.log('First record:', JSON.stringify(data[0], null, 2));
    console.log('Sample field names:', Object.keys(data[0]));
    
    return data[0];
  } catch (error) {
    console.error('❌ Error fetching Angel One API:', error.message);
    return null;
  }
}

async function debugDhanAPI() {
  try {
    console.log('\n🔄 Fetching Dhan CSV response...');
    const response = await axios.get('https://images.dhan.co/api-data/api-scrip-master-detailed.csv', {
      responseType: 'text'
    });
    
    const lines = response.data.split('\n');
    const headers = lines[0].split(',');
    const firstRow = lines[1].split(',');
    
    console.log('📊 Dhan CSV Response:');
    console.log('Total lines:', lines.length);
    console.log('Headers:', headers);
    console.log('First row:', firstRow);
    
    // Create object from headers and first row
    const sampleObject = {};
    headers.forEach((header, index) => {
      sampleObject[header] = firstRow[index];
    });
    
    console.log('Sample object:', JSON.stringify(sampleObject, null, 2));
    
    return sampleObject;
  } catch (error) {
    console.error('❌ Error fetching Dhan CSV:', error.message);
    return null;
  }
}

async function runDebug() {
  console.log('🚀 Debugging API responses...\n');
  
  const angelSample = await debugAngelOneAPI();
  const dhanSample = await debugDhanAPI();
  
  console.log('\n✅ Debug completed!');
  console.log('\n📋 Field mapping needed:');
  
  if (angelSample) {
    console.log('Angel One fields:', Object.keys(angelSample));
  }
  
  if (dhanSample) {
    console.log('Dhan fields:', Object.keys(dhanSample));
  }
}

runDebug().catch(console.error);
