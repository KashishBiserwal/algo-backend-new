const moment = require('moment-timezone');

/**
 * Calculate realistic option price with market factors
 */
function getRealisticOptionPrice(underlyingSymbol, strikePrice, underlyingPrice, timeToExpiry, optionType, quantity, marketFactors = {}) {
  const { volatility = 0.2, liquidity = 'normal' } = marketFactors;
  
  // Calculate intrinsic value
  let intrinsicValue = 0;
  if (optionType === 'CE') {
    intrinsicValue = Math.max(0, underlyingPrice - strikePrice);
  } else if (optionType === 'PE') {
    intrinsicValue = Math.max(0, strikePrice - underlyingPrice);
  }

  // Calculate time value (simplified Black-Scholes approximation)
  const timeValue = calculateTimeValue(underlyingPrice, strikePrice, timeToExpiry, volatility, optionType);
  
  // Base option price
  const theoreticalPrice = intrinsicValue + timeValue;
  
  // Apply market factors
  const liquidityMultiplier = getLiquidityMultiplier(liquidity);
  const marketPrice = theoreticalPrice * liquidityMultiplier;
  
  // Calculate transaction costs
  const transactionCosts = calculateTransactionCosts(marketPrice * quantity);
  
  // Calculate slippage based on quantity and liquidity
  const slippage = calculateSlippage(quantity, liquidity, marketPrice);
  
  // Final price with slippage
  const finalPrice = marketPrice + slippage;
  
  return {
    price: Math.max(0.1, finalPrice), // Ensure price is never negative
    theoreticalPrice: theoreticalPrice,
    intrinsicValue: intrinsicValue,
    timeValue: timeValue,
    transactionCosts: transactionCosts,
    slippage: slippage,
    marketFactors: {
      volatility,
      liquidity,
      liquidityMultiplier
    }
  };
}

/**
 * Calculate time value using simplified Black-Scholes approximation
 */
function calculateTimeValue(underlyingPrice, strikePrice, timeToExpiry, volatility, optionType) {
  if (timeToExpiry <= 0) return 0;
  
  // Moneyness
  const moneyness = underlyingPrice / strikePrice;
  
  // Time decay factor
  const timeDecay = Math.sqrt(timeToExpiry);
  
  // Volatility factor
  const volFactor = volatility * underlyingPrice * 0.01;
  
  // Base time value
  let timeValue = volFactor * timeDecay;
  
  // Adjust for moneyness
  if (optionType === 'CE') {
    if (moneyness > 1.1) { // Deep ITM
      timeValue *= 0.3;
    } else if (moneyness > 1.05) { // ITM
      timeValue *= 0.6;
    } else if (moneyness > 0.95) { // ATM
      timeValue *= 1.0;
    } else if (moneyness > 0.9) { // OTM
      timeValue *= 0.8;
    } else { // Deep OTM
      timeValue *= 0.4;
    }
  } else { // PE
    if (moneyness < 0.9) { // Deep ITM
      timeValue *= 0.3;
    } else if (moneyness < 0.95) { // ITM
      timeValue *= 0.6;
    } else if (moneyness < 1.05) { // ATM
      timeValue *= 1.0;
    } else if (moneyness < 1.1) { // OTM
      timeValue *= 0.8;
    } else { // Deep OTM
      timeValue *= 0.4;
    }
  }
  
  return Math.max(0.1, timeValue);
}

/**
 * Get liquidity multiplier for different market conditions
 */
function getLiquidityMultiplier(liquidity) {
  const multipliers = {
    'high': 1.0,
    'normal': 1.05,
    'low': 1.15,
    'very_low': 1.3
  };
  return multipliers[liquidity] || 1.05;
}

/**
 * Calculate transaction costs
 */
function calculateTransactionCosts(tradeValue) {
  // Brokerage charges (simplified)
  const brokerageRate = 0.0003; // 0.03%
  const brokerage = Math.max(20, tradeValue * brokerageRate); // Minimum Rs 20
  
  // STT (Securities Transaction Tax)
  const sttRate = 0.0005; // 0.05% for options
  const stt = tradeValue * sttRate;
  
  // Exchange charges
  const exchangeRate = 0.0001; // 0.01%
  const exchangeCharges = tradeValue * exchangeRate;
  
  // SEBI charges
  const sebiRate = 0.000001; // 0.0001%
  const sebiCharges = tradeValue * sebiRate;
  
  // Stamp duty
  const stampDuty = Math.max(1, tradeValue * 0.00015); // 0.015%
  
  return brokerage + stt + exchangeCharges + sebiCharges + stampDuty;
}

/**
 * Calculate slippage based on quantity and liquidity
 */
function calculateSlippage(quantity, liquidity, price) {
  const liquidityFactors = {
    'high': 0.001,
    'normal': 0.002,
    'low': 0.005,
    'very_low': 0.01
  };
  
  const baseSlippageRate = liquidityFactors[liquidity] || 0.002;
  
  // Increase slippage for larger quantities
  const quantityFactor = Math.min(2.0, 1 + (quantity - 1) * 0.1);
  
  const slippageRate = baseSlippageRate * quantityFactor;
  return price * slippageRate;
}

/**
 * Calculate strike price based on reference and selection
 */
function calculateStrikePrice(underlyingPrice, strikeReference, strikeSelection, underlyingSymbol) {
  const strikeDiff = getStrikeDifference(underlyingSymbol);
  
  // Calculate ATM strike
  const atmStrike = Math.round(underlyingPrice / strikeDiff) * strikeDiff;
  
  // Parse strike selection
  if (strikeSelection === 'ATM') {
    return atmStrike;
  }
  
  // Parse ITM/OTM selections
  const match = strikeSelection.match(/(ITM|OTM)\s+(\d+)/);
  if (match) {
    const [, type, points] = match;
    const pointsValue = parseInt(points);
    
    if (type === 'ITM') {
      return atmStrike - pointsValue;
    } else if (type === 'OTM') {
      return atmStrike + pointsValue;
    }
  }
  
  // Fallback to ATM
  return atmStrike;
}

/**
 * Get strike difference for different instruments
 */
function getStrikeDifference(underlyingSymbol) {
  const strikeDiffs = {
    'NIFTY50': 50,
    'NIFTY': 50,
    'BANKNIFTY': 100,
    'NIFTY BANK': 100,
    'FINNIFTY': 50,
    'NIFTY FINANCIAL': 50,
    'SENSEX': 100
  };
  
  return strikeDiffs[underlyingSymbol] || 50;
}

/**
 * Validate strike price
 */
function validateStrike(strikePrice, underlyingSymbol) {
  const strikeDiff = getStrikeDifference(underlyingSymbol);
  return strikePrice % strikeDiff === 0 && strikePrice > 0;
}

/**
 * Calculate weekly expiry date
 */
function getWeeklyExpiry(tradeDate) {
  const date = moment(tradeDate).tz('Asia/Kolkata');
  const thursday = 4; // moment().day() -> 0=Sun, 1=Mon, ..., 4=Thu
  
  // Find next Thursday
  if (date.day() > thursday) {
    return date.day(thursday + 7);
  } else if (date.day() === thursday) {
    // If it's Thursday, check if it's before 3:30 PM (market close)
    if (date.hour() < 15 || (date.hour() === 15 && date.minute() < 30)) {
      return date.day(thursday);
    } else {
      return date.day(thursday + 7);
    }
  } else {
    return date.day(thursday);
  }
}

/**
 * Generate option symbol in NSE format
 */
function getOptionSymbol(underlying, expiryDate, strikePrice, optionType) {
  const year = expiryDate.format("YY");
  const month = expiryDate.format("MMM").toUpperCase();
  const day = expiryDate.format("DD");
  
  // Proper NSE option symbol format
  const shortUnderlying = underlying.endsWith("50") ? underlying.slice(0, -2) : underlying;
  return `${shortUnderlying}${day}${month}${year}${strikePrice}${optionType}`;
}

module.exports = {
  getRealisticOptionPrice,
  calculateTimeValue,
  getLiquidityMultiplier,
  calculateTransactionCosts,
  calculateSlippage,
  calculateStrikePrice,
  getStrikeDifference,
  validateStrike,
  getWeeklyExpiry,
  getOptionSymbol
};
