# Angel One Integration Setup Guide

## 1. Get Angel One API Credentials

### Step 1: Create Angel One Developer Account
1. Go to [Angel One SmartAPI](https://smartapi.angelbroking.com/)
2. Sign up for a developer account
3. Create a new app to get your API credentials

### Step 2: Get Required Credentials
You'll need:
- **API Key**: Your app's API key
- **Client Code**: Your Angel One trading account client code
- **Password**: Your Angel One trading account password

## 2. Environment Variables Setup

Create a `.env` file in the root directory with:

```env
# Database
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Secret
JWT_SECRET=your_jwt_secret_here

# Server Configuration
PORT=4000
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:3000

# Angel One API Configuration
ANGEL_API_KEY=your_angel_one_api_key_here
ANGEL_REDIRECT_URI=http://localhost:3000/broker/callback/angel
```

## 3. Frontend Integration

### Step 1: Create Broker Connection Page
Create a page at `/broker/connect` in your frontend with:

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BrokerConnection = () => {
  const [availableBrokers, setAvailableBrokers] = useState([]);
  const [connectedBrokers, setConnectedBrokers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableBrokers();
    fetchConnectedBrokers();
  }, []);

  const fetchAvailableBrokers = async () => {
    try {
      const response = await axios.get('/api/brokers/available', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAvailableBrokers(response.data.data);
    } catch (error) {
      console.error('Error fetching brokers:', error);
    }
  };

  const fetchConnectedBrokers = async () => {
    try {
      const response = await axios.get('/api/brokers/connected', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setConnectedBrokers(response.data.data);
    } catch (error) {
      console.error('Error fetching connected brokers:', error);
    }
  };

  const connectToAngelOne = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/brokers/angel/connect', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      // Redirect to Angel One login
      window.location.href = response.data.data.loginUrl;
    } catch (error) {
      console.error('Error connecting to Angel One:', error);
      alert('Failed to connect to Angel One');
    } finally {
      setLoading(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get('/api/brokers/angel/status', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.data.connected) {
        alert('Connected to Angel One!');
        fetchConnectedBrokers(); // Refresh the list
      } else {
        alert('Not connected to Angel One');
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  return (
    <div className="broker-connection-page">
      <h1>Broker Connections</h1>
      
      <div className="available-brokers">
        <h2>Available Brokers</h2>
        {availableBrokers.map(broker => (
          <div key={broker.id} className="broker-card">
            <h3>{broker.name}</h3>
            <p>{broker.description}</p>
            <div className="features">
              {broker.features.map(feature => (
                <span key={feature} className="feature-tag">{feature}</span>
              ))}
            </div>
            {broker.id === 'angel' && (
              <button 
                onClick={connectToAngelOne} 
                disabled={loading}
                className="connect-btn"
              >
                {loading ? 'Connecting...' : 'Connect to Angel One'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="connected-brokers">
        <h2>Connected Brokers</h2>
        {connectedBrokers.length === 0 ? (
          <p>No brokers connected</p>
        ) : (
          connectedBrokers.map(broker => (
            <div key={broker.id} className="connected-broker">
              <h3>{broker.name}</h3>
              <p>Connected: {new Date(broker.connectedAt).toLocaleDateString()}</p>
              <button onClick={checkConnectionStatus}>Check Status</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BrokerConnection;
```

### Step 2: Create Callback Handler
Create a page at `/broker/callback/angel` to handle the OAuth callback:

```jsx
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const AngelOneCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (code && state) {
        try {
          // The backend will handle the token exchange
          // Just redirect back to the broker page
          navigate('/broker/connect');
        } catch (error) {
          console.error('Callback error:', error);
          navigate('/broker/connect?error=callback_failed');
        }
      } else {
        navigate('/broker/connect?error=missing_params');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="callback-page">
      <h2>Processing Angel One Connection...</h2>
      <p>Please wait while we complete the connection.</p>
    </div>
  );
};

export default AngelOneCallback;
```

## 4. Testing the Connection

### Step 1: Start the Server
```bash
npm start
```

### Step 2: Test the API Endpoints
```bash
# Test available brokers
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:4000/api/brokers/available

# Test Angel One connection initiation
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:4000/api/brokers/angel/connect

# Check connection status
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:4000/api/brokers/angel/status
```

## 5. API Endpoints Available

### Broker Management
- `GET /api/brokers/available` - Get available brokers
- `GET /api/brokers/connected` - Get user's connected brokers
- `GET /api/brokers/:id` - Get specific broker details

### Angel One Specific
- `GET /api/brokers/angel/connect` - Initiate Angel One connection
- `GET /api/brokers/angel/callback` - Handle OAuth callback
- `GET /api/brokers/angel/status` - Check connection status
- `GET /api/brokers/angel/profile` - Get user profile
- `DELETE /api/brokers/angel/disconnect` - Disconnect Angel One

## 6. Trading Operations (After Connection)

Once connected, you can use the Angel One client for trading:

```javascript
// Example: Place an order
const orderPayload = {
  tradingsymbol: 'NIFTY25DEC2455800CE',
  symboltoken: '12345',
  transactiontype: 'BUY',
  exchange: 'NFO',
  ordertype: 'MARKET',
  producttype: 'INTRADAY',
  quantity: '75'
};

const result = await angelClient.placeOrder(orderPayload);
```

## 7. Security Notes

- Never expose your API keys in frontend code
- Use environment variables for all sensitive data
- Implement proper error handling
- Validate all user inputs
- Use HTTPS in production

## 8. Troubleshooting

### Common Issues:
1. **API Key not configured**: Make sure `ANGEL_API_KEY` is set in `.env`
2. **CORS issues**: Ensure `FRONTEND_ORIGIN` is correctly set
3. **Session issues**: Check if express-session is properly configured
4. **Database connection**: Verify MongoDB connection string

### Debug Steps:
1. Check server logs for errors
2. Verify environment variables
3. Test API endpoints individually
4. Check browser network tab for failed requests
