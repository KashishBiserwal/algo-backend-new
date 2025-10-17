// Test script to check specific strategy instruments and their Dhan tokens
const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api';

// Test function to check strategy instruments
const testStrategyInstruments = async () => {
  try {
    console.log('🔍 Testing strategy instrument validation...\n');

    // First, let's get some strategies to see what instruments they use
    console.log('📊 Fetching strategies...');
    
    try {
      // We need authentication for this, so let's try a different approach
      console.log('⚠️  Note: This requires authentication. Let me check the validation logic instead.\n');
      
      // Let's check what instruments are available and their token status
      const response = await axios.get(`${API_BASE_URL}/instruments/popular`);
      
      if (response.data.success) {
        const instruments = response.data.data;
        
        console.log('📋 AVAILABLE INSTRUMENTS WITH TOKENS:');
        console.log('=====================================\n');
        
        // Check equity instruments
        if (instruments.equity && instruments.equity.length > 0) {
          console.log('📈 EQUITY INSTRUMENTS:');
          instruments.equity.forEach(instrument => {
            const hasAngel = instrument.brokers?.angel?.token;
            const hasDhan = instrument.brokers?.dhan?.token;
            const dhanTradable = instrument.brokers?.dhan?.tradable;
            
            console.log(`📊 ${instrument.symbol} (${instrument.name})`);
            console.log(`   Angel Token: ${hasAngel ? '✅ ' + hasAngel : '❌ MISSING'}`);
            console.log(`   Dhan Token: ${hasDhan ? '✅ ' + hasDhan : '❌ MISSING'}`);
            console.log(`   Dhan Tradable: ${dhanTradable ? '✅ Yes' : '❌ No'}`);
            console.log('');
          });
        }
        
        // Check futures instruments
        if (instruments.futures && instruments.futures.length > 0) {
          console.log('📈 FUTURES INSTRUMENTS:');
          instruments.futures.forEach(instrument => {
            const hasAngel = instrument.brokers?.angel?.token;
            const hasDhan = instrument.brokers?.dhan?.token;
            const dhanTradable = instrument.brokers?.dhan?.tradable;
            
            console.log(`📊 ${instrument.symbol} (${instrument.name})`);
            console.log(`   Angel Token: ${hasAngel ? '✅ ' + hasAngel : '❌ MISSING'}`);
            console.log(`   Dhan Token: ${hasDhan ? '✅ ' + hasDhan : '❌ MISSING'}`);
            console.log(`   Dhan Tradable: ${dhanTradable ? '✅ Yes' : '❌ No'}`);
            console.log('');
          });
        }
        
        // Summary
        const allInstruments = [
          ...(instruments.equity || []),
          ...(instruments.futures || []),
          ...(instruments.options || []),
          ...(instruments.indices || [])
        ];
        
        const withDhanTokens = allInstruments.filter(inst => 
          inst.brokers?.dhan?.token && inst.brokers?.dhan?.tradable
        );
        
        console.log('📊 SUMMARY:');
        console.log('===========');
        console.log(`Total instruments: ${allInstruments.length}`);
        console.log(`Instruments with Dhan tokens: ${withDhanTokens.length}`);
        console.log(`Instruments ready for Dhan trading: ${withDhanTokens.length}`);
        
        if (withDhanTokens.length > 0) {
          console.log('\n✅ INSTRUMENTS READY FOR DHAN TRADING:');
          withDhanTokens.forEach(inst => {
            console.log(`   📊 ${inst.symbol} - ${inst.brokers.dhan.token}`);
          });
        }
        
      }
      
    } catch (error) {
      console.log('❌ Error fetching instruments:', error.message);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
  }
};

// Test function to simulate strategy validation
const simulateStrategyValidation = async () => {
  console.log('\n🔍 SIMULATING STRATEGY VALIDATION:');
  console.log('===================================\n');
  
  console.log('The "Missing Dhan instrument tokens" error occurs when:');
  console.log('');
  console.log('1. Strategy uses instruments that don\'t have Dhan tokens');
  console.log('2. Strategy uses instruments where Dhan tradable = false');
  console.log('3. Strategy uses instruments that don\'t exist in database');
  console.log('');
  console.log('🔧 DEBUGGING STEPS:');
  console.log('===================');
  console.log('');
  console.log('1. Check your strategy configuration:');
  console.log('   - What instruments does your strategy use?');
  console.log('   - Are they in the database?');
  console.log('   - Do they have Dhan tokens?');
  console.log('');
  console.log('2. Check the strategy validation logic:');
  console.log('   - Look at validateDhanInstrumentTokens function');
  console.log('   - Check if it\'s finding the instruments correctly');
  console.log('   - Verify the token validation logic');
  console.log('');
  console.log('3. Common issues:');
  console.log('   - Instrument symbol mismatch');
  console.log('   - Missing Dhan token in database');
  console.log('   - Dhan tradable flag set to false');
  console.log('   - Instrument not found in database');
  console.log('');
  console.log('💡 QUICK FIX:');
  console.log('=============');
  console.log('If you see instruments with Dhan tokens above, try:');
  console.log('1. Create a strategy using TCS (which has Dhan tokens)');
  console.log('2. Deploy that strategy to Dhan');
  console.log('3. If it works, the issue is with your specific strategy instruments');
  console.log('4. If it doesn\'t work, the issue is in the validation logic');
};

// Main execution
const main = async () => {
  console.log('🧪 Testing Strategy Instrument Validation\n');
  
  await testStrategyInstruments();
  await simulateStrategyValidation();
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('==============');
  console.log('1. Check what instruments your "DhanTest" strategy uses');
  console.log('2. Verify those instruments have Dhan tokens in the database');
  console.log('3. If missing, add Dhan tokens to those specific instruments');
  console.log('4. Try deploying the strategy again');
  console.log('');
  console.log('📋 To check your specific strategy:');
  console.log('1. Go to My Strategies page');
  console.log('2. Check what instruments "DhanTest" uses');
  console.log('3. Verify those instruments appear in the list above with Dhan tokens');
};

// Run the test
main();
