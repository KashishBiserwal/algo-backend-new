const instrumentService = require('../services/instrumentService');

async function manualUpdate() {
  try {
    console.log('🚀 Starting manual instrument update...');
    
    // Update Angel One first
    console.log('\n📊 Updating Angel One instruments...');
    const angelResult = await instrumentService.updateAngelInstruments();
    console.log('Angel One result:', angelResult);
    
    // Update Dhan
    console.log('\n📊 Updating Dhan instruments...');
    const dhanResult = await instrumentService.updateDhanInstruments();
    console.log('Dhan result:', dhanResult);
    
    console.log('\n✅ Manual update completed!');
    
  } catch (error) {
    console.error('❌ Manual update failed:', error);
  }
  
  process.exit(0);
}

manualUpdate();
