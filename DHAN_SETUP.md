# Dhan Integration Setup Guide

This guide outlines the complete process to set up and integrate Dhan API with your `algo-backend-new` application.

## 1. Obtain Dhan API Credentials

### For Individual Traders:
1. **Login to Dhan Web**: Go to [web.dhan.co](https://web.dhan.co) and login with your Dhan account
2. **Navigate to API Access**: Click on "My Profile" → "Access DhanHQ APIs"
3. **Generate API Key & Secret**: 
   - Toggle to "API key" section
   - Enter your app name (e.g., "My Trading App")
   - Set Redirect URL: `http://localhost:3000/broker/callback/dhan`
   - Set Postback URL (optional): `http://localhost:4000/api/brokers/dhan/postback`
   - Click "Generate" to get your API Key and Secret

### For Partners:
1. **Contact Dhan**: Fill out the form on [DhanHQ website](https://dhan.co) for partner integration
2. **Get Partner Credentials**: You'll receive `partner_id` and `partner_secret`
3. **Configure Redirect URLs**: Set up your redirect URLs with Dhan

## 2. Configure Environment Variables

Create or update your `.env` file in the root of your `algo-backend-new` project:

```env
# Dhan API Credentials (Individual)
DHAN_API_KEY=YOUR_DHAN_API_KEY_HERE
DHAN_API_SECRET=YOUR_DHAN_API_SECRET_HERE
DHAN_REDIRECT_URI=http://localhost:3000/broker/callback/dhan

# Dhan API Credentials (Partner - if applicable)
# DHAN_PARTNER_ID=YOUR_PARTNER_ID_HERE
# DHAN_PARTNER_SECRET=YOUR_PARTNER_SECRET_HERE

# Frontend URL (for redirects)
FRONTEND_ORIGIN=http://localhost:3000

# Other existing variables
MONGO_URL=mongodb://localhost:27017/algodb
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
PORT=4000
```

**Replace the placeholder values with your actual Dhan API credentials.**

## 3. Dhan Authentication Flow

The Dhan integration uses a **3-step OAuth flow**:

### Step 1: Generate Consent
- User initiates connection via `/api/brokers/dhan/connect`
- Backend calls Dhan's consent generation API
- Returns a `consentAppId` and login URL

### Step 2: Browser-based Login
- User is redirected to Dhan's login page
- User enters Dhan credentials and completes 2FA
- Dhan redirects back with a `tokenId`

### Step 3: Consume Consent
- Backend exchanges `tokenId` for access token
- Access token is stored securely in database
- User is redirected to success page

## 4. API Endpoints

### Connection Management:
```javascript
// Initiate Dhan connection
GET /api/brokers/dhan/connect
// Response: { loginUrl, consentAppId, state }

// Handle Dhan callback (automatic)
GET /api/brokers/dhan/callback?tokenId=xxx&state=xxx

// Check connection status
GET /api/brokers/dhan/status
// Response: { connected: true/false, profile: {...} }

// Get user profile
GET /api/brokers/dhan/profile
// Response: { dhanClientId, dhanClientName, ... }

// Disconnect Dhan
DELETE /api/brokers/dhan/disconnect
```

### Trading Operations (via DhanClient):
```javascript
// Place order
await dhanClient.placeOrder({
  transactionType: 'BUY',
  tradingSymbol: 'RELIANCE',
  securityId: '11536',
  quantity: 1,
  orderType: 'MARKET'
});

// Get positions
await dhanClient.getPositions();

// Get order book
await dhanClient.getOrderBook();

// Get LTP
await dhanClient.getLTP('11536', 'NSE_EQ');
```

## 5. Frontend Integration

### Initiate Connection:
```javascript
// Frontend code to start Dhan connection
const connectToDhan = async () => {
  try {
    const response = await fetch('/api/brokers/dhan/connect', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success && data.data.loginUrl) {
      // Redirect user to Dhan login page
      window.location.href = data.data.loginUrl;
    }
  } catch (error) {
    console.error('Failed to connect to Dhan:', error);
  }
};
```

### Handle Callback:
```javascript
// This will be handled automatically by the backend
// User will be redirected to: http://localhost:3000/broker/dhan/success
```

### Check Status:
```javascript
const checkDhanStatus = async () => {
  try {
    const response = await fetch('/api/brokers/dhan/status', {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Dhan Status:', data.data);
      // data.data.connected - boolean
      // data.data.profile - user profile info
    }
  } catch (error) {
    console.error('Failed to check Dhan status:', error);
  }
};
```

## 6. Database Schema

The `BrokerConnection` model stores Dhan-specific data:

```javascript
{
  userId: ObjectId,
  broker: 'dhan',
  dhanClientId: '1000000001',
  dhanAccessToken: 'jwt_access_token',
  isConnected: true,
  isActive: true,
  connectedAt: Date,
  expiresAt: Date, // Token expiry time
  profile: {
    name: 'JOHN DOE',
    clientCode: 'CEFE4265',
    dhanClientId: '1000000001',
    givenPowerOfAttorney: true
  }
}
```

## 7. Security Considerations

### Token Management:
- Access tokens expire after 24 hours
- System automatically checks token expiry
- Users need to reconnect when tokens expire

### Session Security:
- Unique session IDs prevent CSRF attacks
- Session data is cleaned up after successful connection
- State parameter validates callback authenticity

### Data Protection:
- All credentials are stored securely in MongoDB
- Access tokens are not logged
- Profile data is encrypted in transit

## 8. Error Handling

### Common Error Scenarios:
```javascript
// Token expired
{
  "success": true,
  "data": {
    "connected": false,
    "message": "Dhan access token expired",
    "error": "TOKEN_EXPIRED"
  }
}

// Connection failed
{
  "success": true,
  "data": {
    "connected": false,
    "message": "Dhan connection failed",
    "error": "Invalid credentials"
  }
}

// API credentials not configured
{
  "success": false,
  "message": "Dhan API credentials not configured"
}
```

## 9. Testing the Integration

### Test Script:
```bash
# Run the comprehensive test
node scripts/test-broker-connection.js
```

### Manual Testing:
1. **Start the server**: `npm start`
2. **Register/Login**: Create a user account
3. **Connect to Dhan**: Call `/api/brokers/dhan/connect`
4. **Complete OAuth**: Follow the redirect flow
5. **Verify Connection**: Check `/api/brokers/dhan/status`
6. **Test Trading**: Use DhanClient methods

## 10. Production Deployment

### Environment Setup:
- Set `NODE_ENV=production`
- Use secure session secrets
- Configure proper redirect URLs
- Set up SSL certificates

### Monitoring:
- Monitor token expiry
- Track connection failures
- Log trading operations
- Set up alerts for API errors

## 11. Troubleshooting

### Common Issues:

**1. "Dhan API credentials not configured"**
- Check `.env` file has `DHAN_API_KEY` and `DHAN_API_SECRET`
- Restart the server after adding credentials

**2. "Failed to generate consent"**
- Verify API key and secret are correct
- Check if Dhan account is active
- Ensure redirect URL matches Dhan configuration

**3. "Invalid or expired session"**
- Session expires after 10 minutes
- User needs to restart connection process
- Check session configuration in server

**4. "Access token expired"**
- Dhan tokens expire after 24 hours
- User needs to reconnect
- Implement automatic token refresh (future enhancement)

### Debug Mode:
```javascript
// Enable detailed logging
const logger = {
  info: console.log,
  error: console.error,
  warn: console.warn
};

const client = new DhanClient({
  dhanClientId: 'your_client_id',
  accessToken: 'your_token',
  logger: logger
});
```

## 12. Next Steps

After successful Dhan integration:

1. **Implement Strategy Execution**: Use DhanClient in your trading engine
2. **Add Real-time Data**: Integrate Dhan's WebSocket feeds
3. **Portfolio Management**: Implement position tracking
4. **Risk Management**: Add order validation and limits
5. **Multi-broker Support**: Extend to other brokers

## Support

For Dhan API support:
- **Documentation**: [DhanHQ API Docs](https://dhan.co/api-docs)
- **Support**: Contact Dhan support team
- **Community**: Join Dhan developer community

---

**Note**: This integration follows Dhan's official API documentation and best practices for secure broker integration.
