const instrumentService = require('../services/instrumentService');

async function updateDhanOnly() {
  try {
    console.log('🚀 Updating Dhan instruments only...');
    
    const result = await instrumentService.updateDhanInstruments();
    console.log('✅ Dhan update result:', result);
    
  } catch (error) {
    console.error('❌ Dhan update failed:', error);
  }
  
  process.exit(0);
}

updateDhanOnly();
