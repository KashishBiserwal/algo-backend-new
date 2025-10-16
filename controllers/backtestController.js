const Strategy = require('../models/strategyModel');
const Bar = require('../models/barModel');
const BacktestResult = require('../models/backtestResultModel');
const Instrument = require('../models/instrumentModel');
const moment = require('moment-timezone');
const historicalDataService = require('../services/historicalDataService');
const { 
  getRealisticOptionPrice, 
  calculateStrikePrice, 
  validateStrike, 
  getWeeklyExpiry, 
  getOptionSymbol,
  calculateTransactionCosts
} = require('../utils/optionPricing');

/**
 * Enhanced backtest with realistic option pricing and transaction costs
 */
const runEnhancedBacktest = async (req, res) => {
  try {
    const { period, initialCapital = 100000 } = req.body;
    const { strategyId } = req.params;
    const userId = req.user.id;

    console.log(`🚀 Starting backtest for strategy: ${strategyId}, user: ${userId}, period: ${period}`);
    console.log(`📊 Request body:`, req.body);
    console.log(`📊 Request params:`, req.params);

    if (!period) {
      console.log(`❌ Missing period parameter`);
      return res.status(400).json({
        success: false,
        error: "The 'period' field is required (e.g., '1m', '3m', '6m', '1y')."
      });
    }

    // Get strategy - try with user first, then without user constraint
    let strategy = await Strategy.findOne({ _id: strategyId, created_by: userId });
    
    // If not found with user constraint, try without (for strategies with undefined created_by)
    if (!strategy) {
      strategy = await Strategy.findOne({ _id: strategyId });
      if (strategy && !strategy.created_by) {
        // Update the strategy with the current user
        strategy.created_by = userId;
        await strategy.save();
        console.log(`✅ Updated strategy ${strategyId} with user ${userId}`);
      }
    }
    
    if (!strategy) {
      console.log(`❌ Strategy not found: ${strategyId}`);
      return res.status(404).json({ 
        success: false,
        error: "Strategy not found" 
      });
    }

    console.log(`✅ Strategy found: ${strategy.name}`);
    console.log(`📊 Strategy type: ${strategy.type}`);
    console.log(`📊 Strategy order legs:`, strategy.order_legs?.length || 0);
    console.log(`📊 Strategy instruments:`, strategy.instruments?.length || 0);
    console.log(`📊 Strategy entry conditions:`, strategy.entry_conditions?.length || 0);

    // Validate strategy based on type
    if (strategy.type === 'time_based') {
      if (!strategy.order_legs || strategy.order_legs.length === 0) {
        console.log(`❌ Time-based strategy has no order legs`);
        return res.status(400).json({ 
          success: false,
          error: "Time-based strategy has no order legs to backtest." 
        });
      }
    } else if (strategy.type === 'indicator_based') {
      if (!strategy.instruments || strategy.instruments.length === 0) {
        console.log(`❌ Indicator-based strategy has no instruments`);
        return res.status(400).json({ 
          success: false,
          error: "Indicator-based strategy has no instruments to backtest." 
        });
      }
      if (!strategy.entry_conditions || strategy.entry_conditions.length === 0) {
        console.log(`❌ Indicator-based strategy has no entry conditions`);
        return res.status(400).json({ 
          success: false,
          error: "Indicator-based strategy has no entry conditions to backtest." 
        });
      }
    } else {
      console.log(`❌ Unknown strategy type: ${strategy.type}`);
      return res.status(400).json({ 
        success: false,
        error: "Unknown strategy type." 
      });
    }

    // Get instrument details - handle predefined instruments
    const predefinedInstruments = {
      'nifty-50-idx-nse': {
        _id: 'nifty-50-idx-nse',
        symbol: 'NIFTY 50',
        name: 'NIFTY 50',
        exchange: 'NSE',
        segment: 'IDX',
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'NIFTY50' },
          dhan: { tradable: true, token: 'NIFTY50' }
        }
      },
      'nifty-bank-idx-nse': {
        _id: 'nifty-bank-idx-nse',
        symbol: 'NIFTY BANK',
        name: 'NIFTY BANK',
        exchange: 'NSE',
        segment: 'IDX',
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'BANKNIFTY' },
          dhan: { tradable: true, token: 'BANKNIFTY' }
        }
      },
      'nifty-fin-service-idx-nse': {
        _id: 'nifty-fin-service-idx-nse',
        symbol: 'NIFTY FIN SERVICE',
        name: 'NIFTY FIN SERVICE',
        exchange: 'NSE',
        segment: 'IDX',
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'FINNIFTY' },
          dhan: { tradable: true, token: 'FINNIFTY' }
        }
      },
      'sensex-idx-bse': {
        _id: 'sensex-idx-bse',
        symbol: 'SENSEX',
        name: 'SENSEX',
        exchange: 'BSE',
        segment: 'IDX',
        instrument_type: 'INDEX',
        lot_size: 1,
        tick_size: 0.05,
        brokers: {
          angel: { tradable: true, token: 'SENSEX' },
          dhan: { tradable: true, token: 'SENSEX' }
        }
      }
    };

    // Handle different strategy types
    let instruments = [];
    let underlyingSymbol;

    if (strategy.type === 'time_based') {
      // For time-based strategies, use single instrument
      let instrument;
      if (predefinedInstruments[strategy.instrument]) {
        instrument = predefinedInstruments[strategy.instrument];
        console.log(`✅ Using predefined instrument: ${instrument.symbol}`);
      } else {
        instrument = await Instrument.findById(strategy.instrument);
        if (!instrument) {
          // Try to create a mock instrument for common formats
          if (strategy.instrument.includes('-EQUITY') || strategy.instrument.includes('-EQUITY-')) {
            const parts = strategy.instrument.split('-');
            let symbol, exchange, segment;
            
            if (parts.length === 3) {
              // Format: SYMBOL-EXCHANGE-SEGMENT (e.g., RELIANCE-NSE-EQUITY)
              symbol = parts[0];
              exchange = parts[1];
              segment = parts[2];
            } else if (parts.length === 4) {
              // Format: SYMBOL-SEGMENT-EXCHANGE (e.g., TCS-EQUITY-NSE)
              symbol = parts[0];
              segment = parts[1];
              exchange = parts[3];
            } else {
              throw new Error(`Invalid instrument format: ${strategy.instrument}`);
            }
            
            instrument = {
              _id: strategy.instrument,
              symbol: symbol,
              name: symbol,
              exchange: exchange,
              segment: segment,
              instrument_type: segment,
              lot_size: 1,
              tick_size: 0.05
            };
            console.log(`✅ Created mock instrument for: ${symbol} on ${exchange} (${segment})`);
          } else {
            return res.status(404).json({
              success: false,
              error: `Instrument not found: ${strategy.instrument}`
            });
          }
        } else {
          console.log(`✅ Using database instrument: ${instrument.symbol}`);
        }
      }
      instruments = [instrument];
      underlyingSymbol = instrument.symbol;
    } else if (strategy.type === 'indicator_based') {
      // For indicator-based strategies, use multiple instruments
      console.log(`🔍 Processing ${strategy.instruments.length} instruments for indicator-based strategy`);
      
      for (const strategyInstrument of strategy.instruments) {
        let instrument;
        if (predefinedInstruments[strategyInstrument.instrument_id]) {
          instrument = predefinedInstruments[strategyInstrument.instrument_id];
          console.log(`✅ Using predefined instrument: ${instrument.symbol}`);
        } else {
          instrument = await Instrument.findById(strategyInstrument.instrument_id);
          if (!instrument) {
            // Try to create a mock instrument for common formats
            if (strategyInstrument.instrument_id.includes('-EQUITY') || strategyInstrument.instrument_id.includes('-EQUITY-')) {
              const parts = strategyInstrument.instrument_id.split('-');
              let symbol, exchange, segment;
              
              if (parts.length === 3) {
                // Format: SYMBOL-EXCHANGE-SEGMENT (e.g., INFY-NSE-EQUITY)
                symbol = parts[0];
                exchange = parts[1];
                segment = parts[2];
              } else if (parts.length === 4) {
                // Format: SYMBOL-SEGMENT-EXCHANGE (e.g., TCS-EQUITY-NSE)
                symbol = parts[0];
                segment = parts[1];
                exchange = parts[3];
              } else {
                throw new Error(`Invalid instrument format: ${strategyInstrument.instrument_id}`);
              }
              
              instrument = {
                _id: strategyInstrument.instrument_id,
                symbol: symbol,
                name: symbol,
                exchange: exchange,
                segment: segment,
                instrument_type: segment,
                lot_size: 1,
                tick_size: 0.05
              };
              console.log(`✅ Created mock instrument for: ${symbol} on ${exchange} (${segment})`);
            } else {
              return res.status(404).json({
                success: false,
                error: `Instrument not found: ${strategyInstrument.instrument_id}`
              });
            }
          } else {
            console.log(`✅ Using database instrument: ${instrument.symbol}`);
          }
        }
        instruments.push(instrument);
      }
      
      // For indicator-based strategies, use the first instrument as the primary symbol for data fetching
      underlyingSymbol = instruments[0].symbol;
      console.log(`📊 Primary symbol for data fetching: ${underlyingSymbol}`);
    }

    // --- AUTOMATIC DATA FETCHING: Check and fetch data if missing ---
    console.log(`🔍 Checking data availability for ${underlyingSymbol}...`);
    
    const dataCheckResult = await historicalDataService.ensureDataAvailable(underlyingSymbol, {
      minRecords: 100,
      startDate: '2023-01-01'
    });

    console.log(`📊 Data check result:`, dataCheckResult);

    if (!dataCheckResult.success) {
      console.log(`❌ Data check failed: ${dataCheckResult.message}`);
      return res.status(400).json({
        success: false,
        error: `Failed to ensure data for ${underlyingSymbol}: ${dataCheckResult.message}`
      });
    }

    if (dataCheckResult.fetched) {
      console.log(`✅ Data automatically fetched for ${underlyingSymbol}: ${dataCheckResult.dataInfo.totalBars} records`);
    } else {
      console.log(`✅ Data already available for ${underlyingSymbol}: ${dataCheckResult.dataInfo.totalBars} records`);
    }

    // --- Determine the latest available data point for the underlying ---
    const latestBar = await Bar.findOne({ symbol: underlyingSymbol }).sort({
      timestamp: -1,
    });

    if (!latestBar) {
      return res.status(400).json({
        success: false,
        error: `No historical data found for ${underlyingSymbol} after automatic fetch attempt.`
      });
    }

    // --- Calculate Date Range from Period, relative to latest available data ---
    const backtestEndDate = moment(latestBar.timestamp).tz("Asia/Kolkata");
    let backtestStartDate;
    switch (period) {
      case "1m":
        backtestStartDate = backtestEndDate.clone().subtract(1, "months");
        break;
      case "3m":
        backtestStartDate = backtestEndDate.clone().subtract(3, "months");
        break;
      case "6m":
        backtestStartDate = backtestEndDate.clone().subtract(6, "months");
        break;
      case "1y":
        backtestStartDate = backtestEndDate.clone().subtract(1, "year");
        break;
      default:
        return res.status(400).json({ 
          success: false,
          error: "Invalid period. Use '1m', '3m', '6m', or '1y'." 
        });
    }

    // --- Fetch all relevant bars ---
    const allBars = await Bar.find({
      symbol: underlyingSymbol,
      timestamp: {
        $gte: backtestStartDate.toDate(),
        $lte: backtestEndDate.toDate(),
      },
    }).sort({ timestamp: 1 });

    if (allBars.length === 0) {
      const errorMsg = `No historical data found for ${underlyingSymbol} in the calculated period: ${backtestStartDate.format(
        "YYYY-MM-DD"
      )} to ${backtestEndDate.format(
        "YYYY-MM-DD"
      )}. This might indicate a data gap or insufficient data for the requested period from the latest available date.`;
      console.error(errorMsg);
      return res.status(400).json({ 
        success: false,
        error: errorMsg 
      });
    }

    // --- Enhanced Backtest State Initialization ---
    let portfolio = { 
      cash: initialCapital, 
      pnl: 0, 
      trades: [],
      totalTransactionCosts: 0,
      totalSlippage: 0
    };
    const equityCurve = [];
    const tradingDays = strategy.trading_days;
    const performanceMetrics = {
      maxDrawdown: 0,
      maxDrawdownDate: null,
      peakEquity: initialCapital,
      sharpeRatio: 0,
      winStreak: 0,
      lossStreak: 0,
      currentStreak: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0
    };

    // --- Enhanced Main Backtesting Loop ---
    for (const bar of allBars) {
      const day = moment(bar.timestamp).tz("Asia/Kolkata");
      const dayStr = day.format("YYYY-MM-DD");
      const dayOfWeek = day.format("dddd").toLowerCase();

      // Skip if it's not a designated trading day
      if (!tradingDays[dayOfWeek]) {
        equityCurve.push({ date: dayStr, equity: portfolio.cash });
        continue;
      }

      // Skip if outside trading hours (simplified check)
      const currentTime = day.format("HH:mm");
      if (currentTime < strategy.start_time || currentTime > strategy.square_off_time) {
        equityCurve.push({ date: dayStr, equity: portfolio.cash });
        continue;
      }

      const underlyingOpen = bar.open;
      const underlyingHigh = bar.high;
      const underlyingLow = bar.low;
      const underlyingClose = bar.close;
      
      let dailyPositions = new Map();

      // Handle different strategy types
      if (strategy.type === 'time_based') {
        // 1. ENHANCED ENTRY LOGIC: Enter all legs at market open with realistic pricing
        for (const leg of strategy.order_legs) {
        // Calculate strike price using enhanced logic
        const strikePrice = calculateStrikePrice(
          underlyingOpen, 
          leg.strike_price_reference, 
          leg.strike_price_selection, 
          underlyingSymbol
        );

        // Validate strike
        if (!validateStrike(strikePrice, underlyingSymbol)) {
          console.warn(`Invalid strike price: ${strikePrice} for ${underlyingSymbol}`);
          continue;
        }

        const expiryDate = getWeeklyExpiry(day);
        const timeToExpiry = expiryDate.diff(day, 'days') / 365; // Convert to years
        
        // Skip if option is too close to expiry (less than 1 day)
        if (timeToExpiry < 1/365) {
          console.warn(`Option too close to expiry, skipping: ${timeToExpiry} years`);
          continue;
        }

        const optionSymbol = getOptionSymbol(
          underlyingSymbol,
          expiryDate,
          strikePrice,
          leg.instrument_type
        );

        // Get realistic option price with market factors
        const optionPricing = getRealisticOptionPrice(
          underlyingSymbol,
          strikePrice,
          underlyingOpen,
          timeToExpiry,
          leg.instrument_type,
          leg.quantity,
          {
            volatility: 0.2, // Market volatility
            liquidity: 'normal' // Market liquidity
          }
        );

        if (optionPricing.price > 0) {
          const trade = {
            symbol: optionSymbol,
            qty: leg.action === "BUY" ? leg.quantity : -leg.quantity,
            entryPrice: optionPricing.price,
            theoreticalPrice: optionPricing.theoreticalPrice,
            exitPrice: null,
            entryTime: day.toDate(),
            exitTime: null,
            pnl: 0,
            stopLoss: leg.stop_loss_value,
            target: leg.take_profit_value,
            reason: "Open",
            transactionCosts: optionPricing.transactionCosts,
            slippage: optionPricing.slippage,
            strikePrice: strikePrice,
            timeToExpiry: timeToExpiry
          };
          
          dailyPositions.set(optionSymbol, trade);
          
          // Enhanced cash handling with transaction costs
          const tradeAmount = trade.qty * trade.entryPrice;
          portfolio.cash -= tradeAmount;
          portfolio.cash -= trade.transactionCosts;
          portfolio.totalTransactionCosts += trade.transactionCosts;
          portfolio.totalSlippage += Math.abs(trade.slippage);
        }
      }

      // 2. ENHANCED EXIT LOGIC: Check for SL/TP using realistic pricing
      for (const [symbol, pos] of dailyPositions.entries()) {
        const timeToExpiry = pos.timeToExpiry;
        
        // Calculate option prices at different underlying levels
        const optionHigh = getRealisticOptionPrice(
          underlyingSymbol,
          pos.strikePrice,
          underlyingHigh,
          timeToExpiry,
          pos.instrument_type || 'CE',
          Math.abs(pos.qty)
        );
        
        const optionLow = getRealisticOptionPrice(
          underlyingSymbol,
          pos.strikePrice,
          underlyingLow,
          timeToExpiry,
          pos.instrument_type || 'CE',
          Math.abs(pos.qty)
        );
        
        const optionClose = getRealisticOptionPrice(
          underlyingSymbol,
          pos.strikePrice,
          underlyingClose,
          timeToExpiry,
          pos.instrument_type || 'CE',
          Math.abs(pos.qty)
        );

        let exitPrice = optionClose.price;
        let exitReason = `Square-off`;

        // Enhanced PnL calculation with transaction costs
        const pnlAtLow = (optionLow.price - pos.entryPrice) * (pos.qty > 0 ? 1 : -1);
        const pnlAtHigh = (optionHigh.price - pos.entryPrice) * (pos.qty > 0 ? 1 : -1);

        // Enhanced Stop Loss check
        if (pos.stopLoss > 0 && pnlAtLow <= -pos.stopLoss) {
          exitPrice = optionLow.price;
          exitReason = `StopLoss hit`;
        }
        // Enhanced Target Profit check
        else if (pos.target > 0 && pnlAtHigh >= pos.target) {
          exitPrice = optionHigh.price;
          exitReason = `Target hit`;
        }

        // Close position with enhanced tracking
        closeEnhancedPosition(pos, exitPrice, day, portfolio, exitReason);
      }
      } else if (strategy.type === 'indicator_based') {
        // INDICATOR-BASED STRATEGY EXECUTION
        console.log(`🔍 Evaluating entry conditions for ${dayStr}`);
        
        // Check if entry conditions are met
        const entryConditionsMet = await evaluateEntryConditions(
          strategy.entry_conditions, 
          bar, 
          allBars, 
          day
        );
        
        if (entryConditionsMet) {
          console.log(`✅ Entry conditions met for ${dayStr}, executing trades`);
          
          // Execute trades for each instrument in the strategy
          for (const strategyInstrument of strategy.instruments) {
            const instrument = instruments.find(inst => inst._id === strategyInstrument.instrument_id);
            if (!instrument) continue;
            
            // Create a simple equity trade for indicator-based strategies
            const trade = {
              symbol: instrument.symbol,
              qty: strategyInstrument.quantity,
              entryPrice: underlyingClose, // Use close price for entry
              entryTime: day.toDate(),
              exitPrice: null,
              exitTime: null,
              pnl: 0,
              stopLoss: 0,
              target: 0,
              reason: "Entry condition met",
              theoreticalPrice: underlyingClose,
              transactionCosts: 0,
              slippage: 0,
              strikePrice: 0,
              timeToExpiry: 0,
              totalTransactionCosts: 0
            };
            
            // Calculate transaction costs
            const tradeAmount = trade.qty * trade.entryPrice;
            trade.transactionCosts = tradeAmount * 0.001; // 0.1% transaction cost
            trade.totalTransactionCosts = trade.transactionCosts;
            
            // Add to portfolio
            portfolio.trades.push(trade);
            portfolio.cash -= tradeAmount;
            portfolio.cash -= trade.transactionCosts;
            portfolio.totalTransactionCosts += trade.transactionCosts;
            
            console.log(`📊 Executed trade: ${trade.symbol} x${trade.qty} @ ${trade.entryPrice}`);
          }
        } else {
          console.log(`❌ Entry conditions not met for ${dayStr}`);
        }
      }

      // Update performance metrics
      updatePerformanceMetrics(portfolio, performanceMetrics, dayStr);

      // Record equity at the end of the day
      equityCurve.push({ date: dayStr, equity: portfolio.cash });
    }

    // --- Enhanced Final Results Calculation ---
    const finalEquity = portfolio.cash;
    const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;
    
    // Calculate total trades based on strategy type
    let totalTrades;
    if (strategy.type === 'time_based') {
      totalTrades = portfolio.trades.length / strategy.order_legs.length;
    } else if (strategy.type === 'indicator_based') {
      // For indicator-based strategies, each trade represents one complete strategy execution
      totalTrades = portfolio.trades.length;
    } else {
      totalTrades = portfolio.trades.length;
    }
    
    const totalPnl = portfolio.trades.reduce((acc, trade) => acc + trade.pnl, 0);

    const winningLegs = portfolio.trades.filter((t) => t.pnl > 0).length;
    const losingLegs = portfolio.trades.filter((t) => t.pnl < 0).length;
    const winRate = winningLegs + losingLegs > 0 ? (winningLegs / (winningLegs + losingLegs)) * 100 : 0;

    // Calculate Sharpe Ratio
    const returns = equityCurve.slice(1).map((point, index) => 
      (point.equity - equityCurve[index].equity) / equityCurve[index].equity
    );
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const returnStdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(252) : 0; // Annualized

    const resultData = {
      initialCapital,
      finalEquity,
      totalReturnPct: totalReturnPct.toFixed(2),
      totalPnl: totalPnl.toFixed(2),
      totalTrades: Math.round(totalTrades),
      winningLegs: winningLegs,
      losingLegs: losingLegs,
      winRate: winRate.toFixed(2),
      trades: portfolio.trades,
      equityCurve,
      period,
      // Enhanced metrics
      totalTransactionCosts: portfolio.totalTransactionCosts.toFixed(2),
      totalSlippage: portfolio.totalSlippage.toFixed(2),
      netReturn: (totalReturnPct - (portfolio.totalTransactionCosts / initialCapital * 100)).toFixed(2),
      sharpeRatio: sharpeRatio.toFixed(2),
      maxDrawdown: performanceMetrics.maxDrawdown.toFixed(2),
      maxDrawdownDate: performanceMetrics.maxDrawdownDate,
      consecutiveWins: performanceMetrics.consecutiveWins,
      consecutiveLosses: performanceMetrics.consecutiveLosses
    };

    // --- Save the enhanced backtest result ---
    // Determine instrument field based on strategy type
    let instrumentField;
    if (strategy.type === 'time_based') {
      instrumentField = underlyingSymbol;
    } else if (strategy.type === 'indicator_based') {
      // For indicator-based strategies, show all instruments
      instrumentField = instruments.map(inst => inst.symbol).join(', ');
    } else {
      instrumentField = underlyingSymbol;
    }

    const backtestResult = new BacktestResult({
      strategyId: strategy._id,
      userId: userId,
      instrument: instrumentField,
      strategyName: strategy.name,
      ...resultData,
    });
    await backtestResult.save();

    // --- Update Strategy metadata (but preserve deployment status) ---
    // Only update lastRunAt, don't change status to avoid interfering with deployment
    strategy.lastRunAt = new Date();
    await strategy.save();
    
    console.log(`✅ Backtest completed. Strategy status remains: ${strategy.status}`);

    res.status(200).json({
      success: true,
      message: 'Backtest completed successfully',
      data: resultData
    });

  } catch (err) {
    console.error("❌ Enhanced backtest error:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({
      success: false,
      error: "An internal server error occurred during the enhanced backtest.",
      details: err.message,
      stack: err.stack
    });
  }
};

/**
 * Enhanced position closing with detailed tracking
 */
function closeEnhancedPosition(position, exitPrice, exitTime, portfolio, reason) {
  position.exitPrice = exitPrice;
  position.exitTime = exitTime.toDate();
  position.reason = reason;
  position.pnl = (position.exitPrice - position.entryPrice) * position.qty;

  // Enhanced cash handling with transaction costs
  const tradeAmount = position.qty * position.exitPrice;
  portfolio.cash += tradeAmount;
  
  // Add exit transaction costs
  const exitTransactionCosts = calculateTransactionCosts(tradeAmount);
  portfolio.cash -= exitTransactionCosts;
  portfolio.totalTransactionCosts += exitTransactionCosts;
  
  // Update total PnL with transaction costs
  position.pnl -= position.transactionCosts + exitTransactionCosts;
  position.totalTransactionCosts = position.transactionCosts + exitTransactionCosts;

  portfolio.trades.push(position);
}

/**
 * Update performance metrics during backtesting
 */
function updatePerformanceMetrics(portfolio, metrics, date) {
  const currentEquity = portfolio.cash;
  
  // Update peak equity and drawdown
  if (currentEquity > metrics.peakEquity) {
    metrics.peakEquity = currentEquity;
  }
  
  const currentDrawdown = ((metrics.peakEquity - currentEquity) / metrics.peakEquity) * 100;
  if (currentDrawdown > metrics.maxDrawdown) {
    metrics.maxDrawdown = currentDrawdown;
    metrics.maxDrawdownDate = date;
  }
  
  // Update win/loss streaks
  const lastTrade = portfolio.trades[portfolio.trades.length - 1];
  if (lastTrade) {
    if (lastTrade.pnl > 0) {
      metrics.consecutiveWins++;
      metrics.consecutiveLosses = 0;
    } else if (lastTrade.pnl < 0) {
      metrics.consecutiveLosses++;
      metrics.consecutiveWins = 0;
    }
  }
}

// Check data availability for backtesting
const checkBacktestData = async (req, res) => {
  try {
    const { instrument } = req.params;
    
    if (!instrument) {
      return res.status(400).json({
        success: false,
        message: "Instrument parameter is required"
      });
    }

    const dataCheck = await historicalDataService.checkDataAvailability(instrument);

    res.status(200).json({
      success: true,
      message: dataCheck.available ? `Data available for ${instrument}` : `No data found for ${instrument}`,
      data: dataCheck
    });

  } catch (error) {
    console.error('Error checking backtest data:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Fetch data for backtesting
const fetchBacktestData = async (req, res) => {
  try {
    const { instrument } = req.params;
    
    if (!instrument) {
      return res.status(400).json({
        success: false,
        message: "Instrument parameter is required"
      });
    }

    console.log(`📊 Fetching data for ${instrument}...`);
    
    const result = await historicalDataService.fetchAndSaveHistoricalData(instrument);
    
    res.status(200).json({
      success: true,
      message: `Historical data fetched for ${instrument}`,
      data: result
    });

  } catch (error) {
    console.error('Error fetching backtest data:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get backtest results for a strategy
const getBacktestResults = async (req, res) => {
  try {
    const { strategyId } = req.params;
    const userId = req.user.id;

    const results = await BacktestResult.find({ 
      strategyId: strategyId, 
      userId: userId 
    }).sort({ runAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Backtest results fetched successfully',
      data: results
    });

  } catch (error) {
    console.error('Error fetching backtest results:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper function to evaluate entry conditions for indicator-based strategies
async function evaluateEntryConditions(entryConditions, currentBar, allBars, currentDay) {
  try {
    console.log(`🔍 Evaluating ${entryConditions.length} entry conditions`);
    
    // For now, implement a simple condition evaluation
    // This is a placeholder - you can expand this based on your specific indicator logic
    
    for (const condition of entryConditions) {
      console.log(`📊 Evaluating condition: ${condition.indicator1} ${condition.comparator} ${condition.indicator2}`);
      
      // Simple example: Check if price is above a moving average
      if (condition.indicator1 === 'Price' && condition.comparator === 'Higher than' && condition.indicator2 === 'Moving Average') {
        // Calculate simple moving average (placeholder logic)
        const lookbackPeriod = condition.period || 20;
        const recentBars = allBars.slice(-lookbackPeriod);
        const sma = recentBars.reduce((sum, bar) => sum + bar.close, 0) / recentBars.length;
        
        console.log(`📈 Current price: ${currentBar.close}, SMA(${lookbackPeriod}): ${sma.toFixed(2)}`);
        
        if (currentBar.close > sma) {
          console.log(`✅ Condition met: Price > SMA`);
          return true;
        } else {
          console.log(`❌ Condition not met: Price <= SMA`);
        }
      }
      
      // Add more indicator conditions here as needed
      // For now, return true for any condition to test the system
      console.log(`⚠️ Using placeholder logic - condition will be considered met`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Error evaluating entry conditions:', error);
    return false;
  }
}

module.exports = {
  runEnhancedBacktest,
  checkBacktestData,
  fetchBacktestData,
  getBacktestResults
};
