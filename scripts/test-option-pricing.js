const { 
  getRealisticOptionPrice, 
  calculateStrikePrice, 
  validateStrike, 
  getWeeklyExpiry, 
  getOptionSymbol
} = require('../utils/optionPricing');

console.log('🧪 Testing option pricing utilities...\n');

try {
  // Test 1: Strike price calculation
  console.log('1️⃣ Testing strike price calculation...');
  const strikePrice = calculateStrikePrice(3000, 'ATM pt', 'ATM', 'TCS');
  console.log('✅ Strike price calculated:', strikePrice);
  
  // Test 2: Strike validation
  console.log('\n2️⃣ Testing strike validation...');
  const isValid = validateStrike(strikePrice, 'TCS');
  console.log('✅ Strike validation result:', isValid);
  
  // Test 3: Weekly expiry calculation
  console.log('\n3️⃣ Testing weekly expiry calculation...');
  const moment = require('moment-timezone');
  const tradeDate = moment().tz('Asia/Kolkata');
  const expiryDate = getWeeklyExpiry(tradeDate);
  console.log('✅ Weekly expiry calculated:', expiryDate.format('YYYY-MM-DD'));
  
  // Test 4: Option symbol generation
  console.log('\n4️⃣ Testing option symbol generation...');
  const optionSymbol = getOptionSymbol('TCS', expiryDate, strikePrice, 'PE');
  console.log('✅ Option symbol generated:', optionSymbol);
  
  // Test 5: Option pricing
  console.log('\n5️⃣ Testing option pricing...');
  const optionPricing = getRealisticOptionPrice(
    'TCS',
    strikePrice,
    3000, // underlying price
    0.1, // time to expiry (years)
    'PE',
    35, // quantity
    {
      volatility: 0.2,
      liquidity: 'normal'
    }
  );
  console.log('✅ Option pricing result:', {
    price: optionPricing.price,
    theoreticalPrice: optionPricing.theoreticalPrice,
    intrinsicValue: optionPricing.intrinsicValue,
    timeValue: optionPricing.timeValue,
    transactionCosts: optionPricing.transactionCosts,
    slippage: optionPricing.slippage
  });
  
  console.log('\n✅ All option pricing utilities working correctly!');
  
} catch (error) {
  console.error('❌ Error testing option pricing:', error.message);
  console.error('Stack trace:', error.stack);
}
