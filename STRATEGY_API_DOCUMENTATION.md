# Strategy Creation API Documentation

## Overview
This document describes the complete backend flow for time-based strategy creation, including order legs, risk management, and multi-broker support.

## API Endpoints

### 1. Strategy CRUD Operations

#### Create Strategy
```http
POST /api/strategies
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Nifty Options Strategy",
  "type": "time_based",
  "instrument": "TCS-EQUITY-NSE",
  "order_type": "MIS",
  "start_time": "09:15",
  "square_off_time": "15:30",
  "trading_days": {
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": false,
    "sunday": false
  },
  "order_legs": [
    {
      "action": "SELL",
      "quantity": 35,
      "instrument_type": "PE",
      "expiry": "Weekly",
      "strike_price_reference": "ATM pt",
      "strike_price_selection": "ATM",
      "stop_loss_percentage": 30,
      "stop_loss_value": 30,
      "stop_loss_type": "On Price",
      "take_profit_percentage": 0,
      "take_profit_value": 0,
      "take_profit_type": "On Price"
    }
  ],
  "risk_management": {
    "exit_profit_amount": 5000,
    "exit_loss_amount": 3000,
    "no_trade_after_time": "14:30",
    "profit_trailing": {
      "type": "trail_profit",
      "on_every_increase_of": 1000,
      "trail_profit_by": 500
    }
  },
  "broker": "angel"
}
```

#### Get All Strategies
```http
GET /api/strategies?status=active&type=time_based&page=1&limit=10
Authorization: Bearer <token>
```

#### Get Specific Strategy
```http
GET /api/strategies/:id
Authorization: Bearer <token>
```

#### Update Strategy
```http
PUT /api/strategies/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Strategy Name",
  "risk_management": {
    "exit_profit_amount": 6000
  }
}
```

#### Delete Strategy
```http
DELETE /api/strategies/:id
Authorization: Bearer <token>
```

### 2. Strategy Management

#### Start/Stop Strategy
```http
POST /api/strategies/:id/toggle
Authorization: Bearer <token>
Content-Type: application/json

{
  "action": "start" // or "stop"
}
```

#### Get Strategy Performance
```http
GET /api/strategies/:id/performance
Authorization: Bearer <token>
```

#### Validate Strategy
```http
POST /api/strategies/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Test Strategy",
  "type": "time_based",
  "instrument": "TCS-EQUITY-NSE",
  "start_time": "09:15",
  "square_off_time": "15:30",
  "order_legs": [...],
  "broker": "angel"
}
```

## Data Models

### Strategy Schema
```javascript
{
  name: String,                    // Strategy name
  type: "time_based",              // Strategy type
  instrument: String,              // Universal instrument ID
  order_type: "MIS",               // Order type (MIS/NRML/CNC)
  start_time: "09:15",             // Start time (HH:MM)
  square_off_time: "15:30",        // Square off time (HH:MM)
  trading_days: {                  // Trading days selection
    monday: Boolean,
    tuesday: Boolean,
    wednesday: Boolean,
    thursday: Boolean,
    friday: Boolean,
    saturday: Boolean,
    sunday: Boolean
  },
  order_legs: [OrderLeg],          // Array of order legs
  risk_management: RiskManagement, // Risk management settings
  status: "draft",                 // Strategy status
  created_by: ObjectId,            // User ID
  broker: "angel",                 // Broker selection
  execution_history: [Execution],  // Execution tracking
  total_trades: Number,            // Performance metrics
  successful_trades: Number,
  total_profit: Number,
  total_loss: Number,
  net_pnl: Number
}
```

### Order Leg Schema
```javascript
{
  action: "SELL",                  // BUY or SELL
  quantity: 35,                    // Quantity
  instrument_type: "PE",           // CE, PE, FUT, EQ
  expiry: "Weekly",                // Weekly, Monthly, Quarterly
  strike_price_reference: "ATM pt", // ATM pt, ATM %, CP, CP >=, CP <=
  strike_price_selection: "ATM",   // ATM, ITM 100-1700, OTM 100-1700
  stop_loss_percentage: 30,        // Stop loss percentage
  stop_loss_value: 30,             // Stop loss value
  stop_loss_type: "On Price",      // On Price, On Percentage, On Points
  take_profit_percentage: 0,       // Take profit percentage
  take_profit_value: 0,            // Take profit value
  take_profit_type: "On Price"     // On Price, On Percentage, On Points
}
```

### Risk Management Schema
```javascript
{
  exit_profit_amount: 5000,        // Exit when profit reaches (INR)
  exit_loss_amount: 3000,          // Exit when loss reaches (INR)
  no_trade_after_time: "14:30",    // No trade after time (HH:MM)
  profit_trailing: {
    type: "trail_profit",          // no_trailing, lock_fix_profit, trail_profit
    // For lock_fix_profit
    profit_reaches: 1000,          // If profit reaches
    lock_profit_at: 500,           // Lock profit at
    // For trail_profit
    on_every_increase_of: 1000,    // On every increase of
    trail_profit_by: 500           // Trail profit by
  }
}
```

## Frontend Integration Flow

### 1. Instrument Selection
```javascript
// Get available multi-broker instruments
const instruments = await fetch('/api/instruments/multi-broker', {
  headers: { Authorization: 'Bearer ' + token }
});

// User selects instrument from modal
const selectedInstrument = {
  id: 'TCS-EQUITY-NSE',
  symbol: 'TCS',
  name: 'TATA CONSULTANCY SERVICES LTD'
};
```

### 2. Strategy Form Validation
```javascript
// Validate strategy before creation
const validation = await fetch('/api/strategies/validate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(strategyData)
});

if (!validation.valid) {
  // Show validation errors
  console.log('Validation failed:', validation.validations);
}
```

### 3. Strategy Creation
```javascript
// Create strategy
const response = await fetch('/api/strategies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify(strategyData)
});

const strategy = await response.json();
console.log('Strategy created:', strategy.data._id);
```

### 4. Strategy Management
```javascript
// Start strategy
await fetch('/api/strategies/' + strategyId + '/toggle', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({ action: 'start' })
});

// Get strategy performance
const performance = await fetch('/api/strategies/' + strategyId + '/performance', {
  headers: { Authorization: 'Bearer ' + token }
});
```

## Multi-Broker Support

### Universal Instrument System
- All strategies use universal instrument IDs (e.g., `TCS-EQUITY-NSE`)
- Broker-specific tokens are resolved at execution time
- Strategies work across multiple brokers without modification

### Broker Token Resolution
```javascript
// Get broker token for execution
const tokenResponse = await fetch('/api/instruments/' + instrumentId + '/token?broker=angel');
const tokenData = tokenResponse.data;

// Execute trade with broker-specific token
const order = {
  symbol: tokenData.symbol,
  token: tokenData.token,
  exchange: tokenData.exchange,
  action: 'BUY',
  quantity: 1 * tokenData.lot_size
};
```

## Error Handling

### Common Error Responses
```javascript
// Validation Error
{
  "success": false,
  "message": "Strategy validation failed",
  "error": "Invalid time format. Use HH:MM format"
}

// Not Found Error
{
  "success": false,
  "message": "Strategy not found"
}

// Authorization Error
{
  "success": false,
  "message": "Unauthorized"
}
```

## Testing

### Test Script
Run the complete test suite:
```bash
node scripts/test-strategy-creation.js
```

### Manual Testing
1. Register/Login user
2. Get available instruments
3. Validate strategy
4. Create strategy
5. Update strategy
6. Start/Stop strategy
7. Get performance
8. Delete strategy

## Security

- All endpoints require user authentication
- Users can only access their own strategies
- Active strategies cannot be modified
- Broker compatibility is validated before creation

## Performance

- Strategies are paginated for large datasets
- Execution history is limited to recent entries
- Database indexes optimize query performance
- Multi-broker validation is cached

## Future Enhancements

- Indicator-based strategies
- Real-time strategy execution
- Advanced risk management
- Strategy templates
- Backtesting integration
- Performance analytics
