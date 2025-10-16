const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';
let authToken = '';
let userId = '';
let strategyId = '';

// Test data
const testUser = {
  username: 'backtestuser',
  email: 'backtest@example.com',
  password: 'password123'
};

const sampleStrategy = {
  name: 'Nifty Options Backtest Strategy',
  type: 'time_based',
  instrument: 'TCS-EQUITY-NSE', // Using our multi-broker instrument
  order_type: 'MIS',
  start_time: '09:15',
  square_off_time: '15:30',
  trading_days: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false
  },
  order_legs: [
    {
      action: 'SELL',
      quantity: 35,
      instrument_type: 'PE',
      expiry: 'Weekly',
      strike_price_reference: 'ATM pt',
      strike_price_selection: 'ATM',
      stop_loss_percentage: 30,
      stop_loss_value: 30,
      stop_loss_type: 'On Price',
      take_profit_percentage: 0,
      take_profit_value: 0,
      take_profit_type: 'On Price'
    }
  ],
  risk_management: {
    exit_profit_amount: 5000,
    exit_loss_amount: 3000,
    no_trade_after_time: '14:30',
    profit_trailing: {
      type: 'trail_profit',
      on_every_increase_of: 1000,
      trail_profit_by: 500
    }
  },
  broker: 'angel'
};

async function testBacktestingSystem() {
  try {
    console.log('🚀 Testing Complete Backtesting System\n');
    
    // Step 1: Setup user authentication
    console.log('1️⃣ Setting up user authentication...');
    await setupUser();
    
    // Step 2: Create a strategy for backtesting
    console.log('\n2️⃣ Creating strategy for backtesting...');
    strategyId = await createStrategy();
    
    // Step 3: Check data availability
    console.log('\n3️⃣ Checking historical data availability...');
    await checkDataAvailability();
    
    // Step 4: Fetch historical data if needed
    console.log('\n4️⃣ Fetching historical data...');
    await fetchHistoricalData();
    
    // Step 5: Run backtest
    console.log('\n5️⃣ Running enhanced backtest...');
    await runBacktest();
    
    // Step 6: Get backtest results
    console.log('\n6️⃣ Getting backtest results...');
    await getBacktestResults();
    
    // Step 7: Clean up
    console.log('\n7️⃣ Cleaning up test data...');
    await cleanup();
    
    console.log('\n✅ Complete backtesting system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

async function setupUser() {
  try {
    // Try to login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    authToken = loginResponse.data.token;
    userId = loginResponse.data.user.id;
    console.log('✅ User logged in successfully');
    
  } catch (error) {
    // If login fails, register new user
    console.log('⚠️ Login failed, registering new user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, testUser);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
    console.log('✅ User registered and logged in successfully');
  }
}

async function createStrategy() {
  const response = await axios.post(`${BASE_URL}/strategies`, sampleStrategy, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Strategy created successfully');
  console.log('📋 Strategy ID:', response.data.data._id);
  console.log('📋 Strategy name:', response.data.data.name);
  
  return response.data.data._id;
}

async function checkDataAvailability() {
  const response = await axios.get(`${BASE_URL}/backtest/data/TCS`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Data availability check completed');
  console.log('📋 Data available:', response.data.data.available);
  if (response.data.data.available) {
    console.log('📋 Total bars:', response.data.data.totalBars);
    console.log('📋 Date range:', response.data.data.dateRange);
    console.log('📋 Latest price:', response.data.data.latestPrice);
  }
  
  return response.data.data;
}

async function fetchHistoricalData() {
  const response = await axios.post(`${BASE_URL}/backtest/data/TCS`, {}, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Historical data fetch completed');
  console.log('📋 Fetch result:', response.data.data);
}

async function runBacktest() {
  const backtestData = {
    period: '1m', // 1 month
    initialCapital: 100000
  };
  
  const response = await axios.post(`${BASE_URL}/backtest/${strategyId}`, backtestData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Backtest completed successfully');
  console.log('📋 Backtest results:');
  console.log(`   Initial Capital: ₹${response.data.data.initialCapital}`);
  console.log(`   Final Equity: ₹${response.data.data.finalEquity}`);
  console.log(`   Total Return: ${response.data.data.totalReturnPct}%`);
  console.log(`   Total P&L: ₹${response.data.data.totalPnl}`);
  console.log(`   Total Trades: ${response.data.data.totalTrades}`);
  console.log(`   Win Rate: ${response.data.data.winRate}%`);
  console.log(`   Winning Legs: ${response.data.data.winningLegs}`);
  console.log(`   Losing Legs: ${response.data.data.losingLegs}`);
  console.log(`   Transaction Costs: ₹${response.data.data.totalTransactionCosts}`);
  console.log(`   Net Return: ${response.data.data.netReturn}%`);
  console.log(`   Sharpe Ratio: ${response.data.data.sharpeRatio}`);
  console.log(`   Max Drawdown: ${response.data.data.maxDrawdown}%`);
  console.log(`   Consecutive Wins: ${response.data.data.consecutiveWins}`);
  console.log(`   Consecutive Losses: ${response.data.data.consecutiveLosses}`);
  
  if (response.data.data.trades && response.data.data.trades.length > 0) {
    console.log('📋 Sample trades:');
    response.data.data.trades.slice(0, 3).forEach((trade, index) => {
      console.log(`   ${index + 1}. ${trade.symbol} - P&L: ₹${trade.pnl.toFixed(2)} (${trade.reason})`);
    });
  }
  
  if (response.data.data.equityCurve && response.data.data.equityCurve.length > 0) {
    console.log('📋 Equity curve points:', response.data.data.equityCurve.length);
    console.log('📋 Sample equity curve:');
    response.data.data.equityCurve.slice(0, 5).forEach((point, index) => {
      console.log(`   ${point.date}: ₹${point.equity.toFixed(2)}`);
    });
  }
}

async function getBacktestResults() {
  const response = await axios.get(`${BASE_URL}/backtest/results/${strategyId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  console.log('✅ Backtest results retrieved');
  console.log('📋 Total backtest runs:', response.data.data.length);
  
  if (response.data.data.length > 0) {
    const latestResult = response.data.data[0];
    console.log('📋 Latest backtest:');
    console.log(`   Run Date: ${new Date(latestResult.runAt).toLocaleString()}`);
    console.log(`   Period: ${latestResult.period}`);
    console.log(`   Total Return: ${latestResult.totalReturnPct}%`);
    console.log(`   Win Rate: ${latestResult.winRate}%`);
  }
}

async function cleanup() {
  try {
    // Delete the test strategy
    await axios.delete(`${BASE_URL}/strategies/${strategyId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Test strategy deleted');
  } catch (error) {
    console.log('⚠️ Could not delete test strategy:', error.response?.data?.message || error.message);
  }
}

// Frontend integration example
function showFrontendIntegration() {
  console.log('\n🌐 Frontend Integration Example:');
  console.log(`
// 1. Check data availability before backtesting
const dataCheck = await fetch('/api/backtest/data/TCS', {
  headers: { Authorization: 'Bearer ' + userToken }
});

if (!dataCheck.available) {
  // Fetch data if not available
  await fetch('/api/backtest/data/TCS', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + userToken }
  });
}

// 2. Run backtest
const backtestResult = await fetch('/api/backtest/' + strategyId, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({
    period: '3m', // 1m, 3m, 6m, 1y
    initialCapital: 100000
  })
});

const result = await backtestResult.json();

// 3. Display results
console.log('Backtest Results:');
console.log('Total Return:', result.data.totalReturnPct + '%');
console.log('Win Rate:', result.data.winRate + '%');
console.log('Total Trades:', result.data.totalTrades);
console.log('Max Drawdown:', result.data.maxDrawdown + '%');
console.log('Sharpe Ratio:', result.data.sharpeRatio);

// 4. Get all backtest results for a strategy
const allResults = await fetch('/api/backtest/results/' + strategyId, {
  headers: { Authorization: 'Bearer ' + userToken }
});

const results = await allResults.json();
console.log('All backtest runs:', results.data.length);
  `);
}

// Run the test
testBacktestingSystem().then(() => {
  showFrontendIntegration();
});
