# Algo Trading Authentication & Instruments Server

A comprehensive server for the algo trading platform that provides both authentication functionality and multi-broker instrument management.

## Features

### Authentication
- **User Authentication**: Register and login for regular users
- **Admin Authentication**: Separate admin registration and login
- **JWT Token Management**: Secure token-based authentication
- **Session Management**: Express session support
- **Role-based Access Control**: USER and ADMIN roles
- **Password Hashing**: Secure password storage using bcrypt

### Instruments Management
- **Multi-Broker Support**: Angel One and Dhan instrument data
- **Unified Schema**: Normalized instrument data across brokers
- **Daily Updates**: Automated cron job for instrument synchronization
- **Search & Pagination**: Efficient instrument search with pagination
- **Category-based Access**: Organized by Options, Indices, Equity, Futures
- **Broker Mapping**: Universal symbols mapped to broker-specific tokens

## API Endpoints

### Authentication Routes (`/api/auth`)
- `POST /register` - Register a new user
- `POST /login` - User login
- `POST /admin-register` - Register a new admin
- `POST /admin-login` - Admin login
- `GET /auth/me` - Get current user info (requires authentication)

### Instrument Routes (`/api/instruments`)

#### Public Routes
- `GET /popular` - Get popular instruments for frontend tabs
- `GET /search` - Search instruments with pagination
  - Query params: `query`, `category`, `page`, `limit`, `broker`
- `GET /category/:category` - Get instruments by category (options, indices, equity, futures)
- `GET /symbols/:category` - Get all symbols for a category
- `GET /stats` - Get instrument statistics
- `GET /:id` - Get instrument by ID

#### Admin Routes (requires authentication)
- `POST /update` - Manually update instruments
  - Query params: `broker` (angel, dhan, or both)
- `GET /admin/history` - Get instrument update history

### Utility Routes
- `GET /health` - Health check endpoint
- `GET /` - Server information

## Database Schema

### Instruments Collection
```javascript
{
  "_id": "RELIANCE-EQ-NSE",           // Universal identifier
  "symbol": "RELIANCE",
  "name": "RELIANCE INDUSTRIES LTD",
  "exchange": "NSE",
  "segment": "EQ",
  "instrument_type": "EQUITY",
  "lot_size": 1,
  "expiry": null,
  "strike_price": null,
  "tick_size": 0.05,
  "brokers": {
    "angel": {
      "token": "12345",
      "tradable": true,
      "last_updated": "2025-01-03T05:00:00.000Z"
    },
    "dhan": {
      "token": "67890",
      "tradable": true,
      "last_updated": "2025-01-03T05:00:00.000Z"
    }
  }
}
```

### Instrument Updates Collection
```javascript
{
  "_id": "2025-01-03-angel",
  "exchange": "ALL",
  "broker": "angel",
  "updated_at": "2025-01-03T05:00:00.000Z",
  "count": 1450,
  "new_entries": 12,
  "updated_entries": 1438,
  "status": "success"
}
```

## Frontend Integration

### Instrument Selection Modal
The API is designed to support a 4-tab instrument selection modal:

1. **Options Tab**: NIFTY, BANKNIFTY, FINNIFTY, SENSEX
2. **Indices Tab**: NIFTY 50, NIFTY BANK, NIFTY FIN SERVICE
3. **Equity Tab**: All available equity instruments
4. **Futures Tab**: All available futures instruments

### Search Implementation
- Use `/api/instruments/search` with pagination for large datasets
- Use `/api/instruments/symbols/:category` for search dropdowns
- Implement debounced search for better performance

### Example Frontend Usage
```javascript
// Get popular instruments for tabs
const popularInstruments = await fetch('/api/instruments/popular');

// Search with pagination
const searchResults = await fetch('/api/instruments/search?query=RELIANCE&category=equity&page=1&limit=20');

// Get all symbols for search dropdown
const symbols = await fetch('/api/instruments/symbols/equity');
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create `.env` file with:
   ```
   MONGO_URL=mongodb://localhost:27017/algo-auth
   JWT_SECRET=your_secure_jwt_secret
   SESSION_SECRET=your_secure_session_secret
   PORT=4001
   FRONTEND_ORIGIN=http://localhost:3000
   ```

3. **Start the Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

4. **Initial Instrument Update**
   ```bash
   # Update all instruments (admin required)
   curl -X POST http://localhost:4001/api/instruments/update \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

## Automated Updates

The server includes a cron job that automatically updates instruments daily at 6:00 AM IST:
- Fetches latest data from Angel One (JSON)
- Fetches latest data from Dhan (CSV)
- Merges and normalizes data into unified schema
- Logs update history for monitoring

## Multi-Broker Strategy

### Universal Symbol System
- Each instrument has a universal ID (e.g., `RELIANCE-EQ-NSE`)
- Brokers are mapped under the `brokers` field
- Strategy engine uses universal symbols
- Execution layer resolves broker-specific tokens

### Adding New Brokers
To add a new broker (e.g., Zerodha):
1. Add broker field to instruments schema
2. Update instrument service to fetch from new broker
3. Modify cron job to include new broker
4. Update frontend to support new broker selection

## Security Features

- Password hashing with bcrypt (salt rounds: 10)
- JWT tokens with 7-day expiration
- CORS configuration for frontend integration
- Session management for additional security
- Input validation using express-validator
- Admin-only routes for sensitive operations

## Development

The server runs on port 4001 by default and provides a comprehensive solution for both authentication and instrument management in the algo trading platform.

## Monitoring

- Health check endpoint for server status
- Update history tracking for instrument synchronization
- Detailed logging for debugging and monitoring
- Statistics endpoint for data insights