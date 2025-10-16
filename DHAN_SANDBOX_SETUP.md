# Dhan Sandbox Setup Guide

## Quick Setup for Sandbox Testing

### 1. Create your .env file

Create a `.env` file in the root directory (`algo-backend-new/.env`) with your sandbox credentials:

```env
# Database Configuration
MONGO_URL=mongodb://localhost:27017/algodb

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_key_here

# Server Configuration
PORT=4000
NODE_ENV=development

# Frontend Configuration
FRONTEND_ORIGIN=http://localhost:3000

# Dhan Sandbox API Configuration
DHAN_API_KEY=your_dhan_sandbox_api_key_here
DHAN_API_SECRET=your_dhan_sandbox_api_secret_here
DHAN_REDIRECT_URI=http://localhost:3000/broker/callback/dhan

# Optional: Custom sandbox URLs (if different from default)
# DHAN_BASE_URL=https://api-sandbox.dhan.co
# DHAN_AUTH_URL=https://auth-sandbox.dhan.co
```

### 2. Replace the placeholder values:

- `your_dhan_sandbox_api_key_here` → Your actual Dhan sandbox API key
- `your_dhan_sandbox_api_secret_here` → Your actual Dhan sandbox API secret
- `your_jwt_secret_key_here` → Any random string for JWT signing
- `your_session_secret_key_here` → Any random string for session management

### 3. Start the server

```bash
npm start
```

### 4. Test the integration

```bash
node scripts/test-dhan-integration.js
```

## Dhan Sandbox Authentication Flow

The system will use your sandbox credentials to:

1. **Generate Consent** → Creates a session with Dhan sandbox
2. **Browser Login** → Redirects to Dhan sandbox login page
3. **Get Access Token** → Exchanges login for sandbox access token
4. **Store Credentials** → Saves sandbox credentials in database

## API Endpoints Available

### Connection Management:
- `GET /api/brokers/dhan/connect` - Start Dhan sandbox connection
- `GET /api/brokers/dhan/callback` - Handle Dhan callback (automatic)
- `GET /api/brokers/dhan/status` - Check connection status
- `GET /api/brokers/dhan/profile` - Get user profile
- `DELETE /api/brokers/dhan/disconnect` - Disconnect from Dhan

### Testing:
- `GET /api/brokers/available` - List all available brokers
- `GET /api/brokers/connected` - List user's connected brokers

## Frontend Integration Example

```javascript
// Connect to Dhan sandbox
const connectToDhan = async () => {
  const response = await fetch('/api/brokers/dhan/connect', {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  
  const data = await response.json();
  if (data.success) {
    window.location.href = data.data.loginUrl; // Redirect to Dhan sandbox
  }
};

// Check connection status
const checkStatus = async () => {
  const response = await fetch('/api/brokers/dhan/status', {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });
  
  const data = await response.json();
  console.log('Dhan Status:', data.data);
};
```

## What You Need to Provide

Please provide your Dhan sandbox credentials:

1. **API Key** - Your Dhan sandbox API key
2. **API Secret** - Your Dhan sandbox API secret
3. **Redirect URL** - Should be set to `http://localhost:3000/broker/callback/dhan` in your Dhan app settings

Once you provide these, I can help you:
- Update the .env file with your actual credentials
- Test the complete OAuth flow
- Verify the integration is working
- Set up strategy execution with Dhan

## Next Steps After Setup

1. **Test Connection** - Verify you can connect to Dhan sandbox
2. **Test Trading APIs** - Place test orders, get positions, etc.
3. **Integrate with Strategies** - Use DhanClient in your trading engine
4. **Add Real-time Data** - Implement WebSocket feeds
5. **Production Setup** - Switch to live credentials when ready

Let me know your sandbox credentials and I'll help you get everything set up!
