const crypto = require('crypto');
const BrokerConnection = require('../models/brokerConnectionModel');
const AngelOneClient = require('../services/angelOneClient');
const DhanClient = require('../services/dhanClient');

// Angel One API configuration
const ANGEL_API_KEY = process.env.ANGEL_API_KEY;
const ANGEL_REDIRECT_URI = process.env.ANGEL_REDIRECT_URI || 'http://localhost:3000/broker/callback/angel';

// Dhan API configuration
const DHAN_API_KEY = process.env.DHAN_API_KEY;
const DHAN_API_SECRET = process.env.DHAN_API_SECRET;
const DHAN_REDIRECT_URI = process.env.DHAN_REDIRECT_URI || 'http://localhost:3000/broker/callback/dhan';
const DHAN_SANDBOX_TOKEN = process.env.DHAN_SANDBOX_TOKEN;
const DHAN_SANDBOX_CLIENT_ID = process.env.DHAN_SANDBOX_CLIENT_ID;

// Get available brokers
const getAvailableBrokers = async (req, res) => {
  try {
    const brokers = [
      {
        id: 'angel',
        name: 'Angel One',
        description: 'Angel One SmartAPI for trading',
        logo: '/images/brokers/angel-one.png',
        features: ['Equity', 'F&O', 'Currency', 'Commodity'],
        isAvailable: true,
        authUrl: '/api/brokers/angel/connect'
      },
      {
        id: 'dhan',
        name: 'Dhan',
        description: 'Dhan API for trading',
        logo: '/images/brokers/dhan.png',
        features: ['Equity', 'F&O', 'Currency'],
        isAvailable: true,
        authUrl: '/api/brokers/dhan/connect'
      }
    ];

    res.status(200).json({
      success: true,
      message: 'Available brokers fetched successfully',
      data: brokers
    });
  } catch (error) {
    console.error('Error fetching available brokers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available brokers',
      error: error.message
    });
  }
};

// Get user's connected brokers
const getConnectedBrokers = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const connections = await BrokerConnection.findActiveConnections(userId);
    
    const connectedBrokers = connections.map(conn => ({
      id: conn.broker,
      name: conn.broker === 'angel' ? 'Angel One' : 'Dhan',
      isConnected: conn.isConnected,
      connectedAt: conn.connectedAt,
      lastUsedAt: conn.lastUsedAt,
      profile: conn.profile,
      hasError: !!conn.lastError
    }));

    res.status(200).json({
      success: true,
      message: 'Connected brokers fetched successfully',
      data: connectedBrokers
    });
  } catch (error) {
    console.error('Error fetching connected brokers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch connected brokers',
      error: error.message
    });
  }
};

// Get broker details
const getBrokerDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const connection = await BrokerConnection.findByUserAndBroker(userId, id);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Broker connection not found'
      });
    }

    // Don't return sensitive information
    const safeConnection = {
      broker: connection.broker,
      isConnected: connection.isConnected,
      isActive: connection.isActive,
      connectedAt: connection.connectedAt,
      lastUsedAt: connection.lastUsedAt,
      profile: connection.profile,
      lastError: connection.lastError
    };

    res.status(200).json({
      success: true,
      message: 'Broker details fetched successfully',
      data: safeConnection
    });
  } catch (error) {
    console.error('Error fetching broker details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broker details',
      error: error.message
    });
  }
};

// Connect to Angel One
const connectAngelOne = async (req, res) => {
  try {
    if (!ANGEL_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Angel One API key not configured'
      });
    }

    const userId = req.user.id;
    
    // Generate a unique session ID for this user
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Store the user ID in session with the session ID as key
    req.session[`angelone_${sessionId}`] = userId;
    
    // Create a temporary database record as fallback
    const tempRecord = new BrokerConnection({
      userId: userId,
      broker: 'angel',
      accessToken: sessionId, // Use sessionId as temporary accessToken
      isConnected: false,
      isActive: true
    });
    await tempRecord.save();

    // Generate Angel One login URL
    const state = sessionId;
    const loginUrl = `https://smartapi.angelbroking.com/publisher-login?api_key=${ANGEL_API_KEY}&response_type=code&state=${state}&redirect_uri=${encodeURIComponent(ANGEL_REDIRECT_URI)}`;
    
    console.log(`Generated Angel One login URL for user ${userId}: ${loginUrl}`);
    
    res.status(200).json({
      success: true,
      message: 'Angel One login URL generated successfully',
      data: {
        loginUrl,
        state
      }
    });
  } catch (error) {
    console.error('Error connecting to Angel One:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to Angel One',
      error: error.message
    });
  }
};

// Handle Angel One callback
const handleAngelOneCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing authorization code or state'
      });
    }

    // Get user ID from session
    const userId = req.session[`angelone_${state}`];
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '2560AF60-1DBC-4D80-BEB4-328CB16EC699',
        'X-PrivateKey': ANGEL_API_KEY
      },
      body: JSON.stringify({
        clientcode: code,
        password: state // Using state as temporary password
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.status) {
      return res.status(400).json({
        success: false,
        message: tokenData.message || 'Failed to get access token'
      });
    }

    // Extract client code from JWT token
    let clientCode = '';
    try {
      const jwtPayload = JSON.parse(Buffer.from(tokenData.data.jwtToken.split('.')[1], 'base64').toString());
      clientCode = jwtPayload.username || jwtPayload.clientcode || '';
    } catch (error) {
      console.warn('Could not extract client code from JWT token:', error.message);
    }

    // Save or update broker connection
    const existingConnection = await BrokerConnection.findByUserAndBroker(userId, 'angel');
    
    if (existingConnection) {
      // Update existing connection
      existingConnection.clientCode = clientCode;
      existingConnection.apiKey = ANGEL_API_KEY;
      existingConnection.accessToken = tokenData.data.jwtToken;
      existingConnection.refreshToken = tokenData.data.refreshToken;
      existingConnection.feedToken = tokenData.data.feedToken;
      existingConnection.jwtToken = tokenData.data.jwtToken;
      existingConnection.isConnected = true;
      existingConnection.isActive = true;
      existingConnection.connectedAt = new Date();
      existingConnection.lastUsedAt = new Date();
      existingConnection.clearError();
      
      await existingConnection.save();
      console.log(`✅ Updated Angel One credentials for user ${userId}`);
    } else {
      // Create new connection
      const newConnection = new BrokerConnection({
        userId: userId,
        broker: 'angel',
        clientCode: clientCode,
        apiKey: ANGEL_API_KEY,
        accessToken: tokenData.data.jwtToken,
        refreshToken: tokenData.data.refreshToken,
        feedToken: tokenData.data.feedToken,
        jwtToken: tokenData.data.jwtToken,
        isConnected: true,
        isActive: true,
        connectedAt: new Date(),
        lastUsedAt: new Date()
      });
      
      await newConnection.save();
      console.log(`✅ Created Angel One credentials for user ${userId}`);
    }

    // Clean up session
    delete req.session[`angelone_${state}`];

    res.status(200).json({
      success: true,
      message: 'Angel One connection established successfully',
      data: {
        broker: 'angel',
        isConnected: true,
        clientCode: clientCode
      }
    });
  } catch (error) {
    console.error('Error handling Angel One callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to establish Angel One connection',
      error: error.message
    });
  }
};

// Check Angel One connection status
const checkAngelOneConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await BrokerConnection.findByUserAndBroker(userId, 'angel');
    
    if (!connection || !connection.isConnected) {
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: 'Not connected to Angel One'
        }
      });
    }

    // Test the connection
    const client = new AngelOneClient({
      clientCode: connection.clientCode,
      apiKey: connection.apiKey,
      accessToken: connection.accessToken,
      feedToken: connection.feedToken
    });

    const testResult = await client.testConnection();
    
    if (testResult.success) {
      // Update profile information
      connection.profile = testResult.profile;
      connection.lastUsedAt = new Date();
      connection.clearError();
      await connection.save();
      
      res.status(200).json({
        success: true,
        data: {
          connected: true,
          message: 'Connected to Angel One',
          profile: testResult.profile
        }
      });
    } else {
      // Mark connection as failed
      connection.setError(testResult.error, 'CONNECTION_FAILED');
      await connection.save();
      
      res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: 'Angel One connection failed',
          error: testResult.error
        }
      });
    }
  } catch (error) {
    console.error('Error checking Angel One connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Angel One connection',
      error: error.message
    });
  }
};

// Disconnect Angel One
const disconnectAngelOne = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await BrokerConnection.findByUserAndBroker(userId, 'angel');
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Angel One connection not found'
      });
    }

    // Mark as disconnected and inactive
    connection.isConnected = false;
    connection.isActive = false;
    connection.lastUsedAt = new Date();
    await connection.save();

    res.status(200).json({
      success: true,
      message: 'Angel One disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Angel One:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Angel One',
      error: error.message
    });
  }
};

// Get Angel One profile
const getAngelOneProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await BrokerConnection.findByUserAndBroker(userId, 'angel');
    
    if (!connection || !connection.isConnected) {
      return res.status(404).json({
        success: false,
        message: 'Angel One not connected'
      });
    }

    const client = new AngelOneClient({
      clientCode: connection.clientCode,
      apiKey: connection.apiKey,
      accessToken: connection.accessToken,
      feedToken: connection.feedToken
    });

    const testResult = await client.testConnection();
    
    if (testResult.success) {
      res.status(200).json({
        success: true,
        message: 'Profile fetched successfully',
        data: testResult.profile
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch profile',
        error: testResult.error
      });
    }
  } catch (error) {
    console.error('Error fetching Angel One profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// Connect to Dhan
const connectDhan = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if we have sandbox credentials (direct token)
    if (DHAN_SANDBOX_TOKEN && DHAN_SANDBOX_CLIENT_ID) {
      console.log('Using Dhan sandbox credentials for user:', userId);
      
      // Save or update broker connection with sandbox credentials
      const existingConnection = await BrokerConnection.findByUserAndBroker(userId, 'dhan');
      
      if (existingConnection) {
        // Update existing connection
        existingConnection.dhanClientId = DHAN_SANDBOX_CLIENT_ID;
        existingConnection.dhanAccessToken = DHAN_SANDBOX_TOKEN;
        existingConnection.isConnected = true;
        existingConnection.isActive = true;
        existingConnection.connectedAt = new Date();
        existingConnection.lastUsedAt = new Date();
        existingConnection.profile = {
          name: 'Sandbox User',
          clientCode: DHAN_SANDBOX_CLIENT_ID,
          dhanClientId: DHAN_SANDBOX_CLIENT_ID,
          givenPowerOfAttorney: true,
          isSandbox: true
        };
        existingConnection.clearError();
        
        await existingConnection.save();
        console.log(`✅ Updated Dhan sandbox credentials for user ${userId}`);
      } else {
        // Create new connection
        const newConnection = new BrokerConnection({
          userId: userId,
          broker: 'dhan',
          dhanClientId: DHAN_SANDBOX_CLIENT_ID,
          dhanAccessToken: DHAN_SANDBOX_TOKEN,
          isConnected: true,
          isActive: true,
          connectedAt: new Date(),
          lastUsedAt: new Date(),
          profile: {
            name: 'Sandbox User',
            clientCode: DHAN_SANDBOX_CLIENT_ID,
            dhanClientId: DHAN_SANDBOX_CLIENT_ID,
            givenPowerOfAttorney: true,
            isSandbox: true
          }
        });
        
        await newConnection.save();
        console.log(`✅ Created Dhan sandbox credentials for user ${userId}`);
      }

      return res.status(200).json({
        success: true,
        message: 'Dhan sandbox connection established successfully',
        data: {
          broker: 'dhan',
          isConnected: true,
          dhanClientId: DHAN_SANDBOX_CLIENT_ID,
          dhanClientName: 'Sandbox User',
          isSandbox: true
        }
      });
    }
    
    // Fallback to OAuth flow if no sandbox credentials
    if (!DHAN_API_KEY || !DHAN_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: 'Dhan API credentials not configured'
      });
    }

    // Generate a unique session ID for this user
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Store the user ID in session with the session ID as key
    req.session[`dhan_${sessionId}`] = userId;
    
    // Create a temporary database record as fallback
    const tempRecord = new BrokerConnection({
      userId: userId,
      broker: 'dhan',
      dhanAccessToken: sessionId, // Use sessionId as temporary accessToken
      isConnected: false,
      isActive: true
    });
    await tempRecord.save();

    // Step 1: Generate Consent
    const authUrl = process.env.DHAN_AUTH_URL || 'https://auth.dhan.co';
    const consentResponse = await fetch(`${authUrl}/app/generate-consent`, {
      method: 'POST',
      headers: {
        'app_id': DHAN_API_KEY,
        'app_secret': DHAN_API_SECRET
      }
    });

    const consentData = await consentResponse.json();
    
    if (!consentData.consentAppId) {
      return res.status(400).json({
        success: false,
        message: 'Failed to generate consent'
      });
    }

    // Store consentAppId in session
    req.session[`dhan_consent_${sessionId}`] = consentData.consentAppId;

    // Generate Dhan login URL
    const loginUrl = `${authUrl}/login/consentApp-login?consentAppId=${consentData.consentAppId}`;
    
    console.log(`Generated Dhan login URL for user ${userId}: ${loginUrl}`);
    
    res.status(200).json({
      success: true,
      message: 'Dhan login URL generated successfully',
      data: {
        loginUrl,
        consentAppId: consentData.consentAppId,
        state: sessionId
      }
    });
  } catch (error) {
    console.error('Error connecting to Dhan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to Dhan',
      error: error.message
    });
  }
};

// Handle Dhan callback
const handleDhanCallback = async (req, res) => {
  try {
    const { tokenId, state } = req.query;
    
    if (!tokenId || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing tokenId or state'
      });
    }

    // Get user ID from session
    const userId = req.session[`dhan_${state}`];
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Get consentAppId from session
    const consentAppId = req.session[`dhan_consent_${state}`];
    if (!consentAppId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired consent session'
      });
    }

    // Step 3: Consume Consent to get access token
    const authUrl = process.env.DHAN_AUTH_URL || 'https://auth.dhan.co';
    const tokenResponse = await fetch(`${authUrl}/app/consumeApp-consent?tokenId=${tokenId}`, {
      method: 'GET',
      headers: {
        'app_id': DHAN_API_KEY,
        'app_secret': DHAN_API_SECRET
      }
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.accessToken) {
      return res.status(400).json({
        success: false,
        message: tokenData.message || 'Failed to get access token'
      });
    }

    // Save or update broker connection
    const existingConnection = await BrokerConnection.findByUserAndBroker(userId, 'dhan');
    
    if (existingConnection) {
      // Update existing connection
      existingConnection.dhanClientId = tokenData.dhanClientId;
      existingConnection.dhanAccessToken = tokenData.accessToken;
      existingConnection.isConnected = true;
      existingConnection.isActive = true;
      existingConnection.connectedAt = new Date();
      existingConnection.lastUsedAt = new Date();
      existingConnection.profile = {
        name: tokenData.dhanClientName,
        clientCode: tokenData.dhanClientUcc,
        dhanClientId: tokenData.dhanClientId,
        givenPowerOfAttorney: tokenData.givenPowerOfAttorney
      };
      existingConnection.expiresAt = new Date(tokenData.expiryTime);
      existingConnection.clearError();
      
      await existingConnection.save();
      console.log(`✅ Updated Dhan credentials for user ${userId}`);
    } else {
      // Create new connection
      const newConnection = new BrokerConnection({
        userId: userId,
        broker: 'dhan',
        dhanClientId: tokenData.dhanClientId,
        dhanAccessToken: tokenData.accessToken,
        isConnected: true,
        isActive: true,
        connectedAt: new Date(),
        lastUsedAt: new Date(),
        expiresAt: new Date(tokenData.expiryTime),
        profile: {
          name: tokenData.dhanClientName,
          clientCode: tokenData.dhanClientUcc,
          dhanClientId: tokenData.dhanClientId,
          givenPowerOfAttorney: tokenData.givenPowerOfAttorney
        }
      });
      
      await newConnection.save();
      console.log(`✅ Created Dhan credentials for user ${userId}`);
    }

    // Clean up session
    delete req.session[`dhan_${state}`];
    delete req.session[`dhan_consent_${state}`];

    res.status(200).json({
      success: true,
      message: 'Dhan connection established successfully',
      data: {
        broker: 'dhan',
        isConnected: true,
        dhanClientId: tokenData.dhanClientId,
        dhanClientName: tokenData.dhanClientName,
        expiryTime: tokenData.expiryTime
      }
    });
  } catch (error) {
    console.error('Error handling Dhan callback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to establish Dhan connection',
      error: error.message
    });
  }
};

// Check Dhan connection status
const checkDhanConnection = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await BrokerConnection.findByUserAndBroker(userId, 'dhan');
    
    if (!connection || !connection.isConnected) {
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: 'Not connected to Dhan'
        }
      });
    }

    // Check if token is expired
    if (connection.expiresAt && new Date() > connection.expiresAt) {
      connection.isConnected = false;
      connection.setError('Access token expired', 'TOKEN_EXPIRED');
      await connection.save();
      
      return res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: 'Dhan access token expired',
          error: 'TOKEN_EXPIRED'
        }
      });
    }

    // Test the connection
    const client = new DhanClient({
      dhanClientId: connection.dhanClientId,
      accessToken: connection.dhanAccessToken,
      isSandbox: connection.profile?.isSandbox || false
    });

    const testResult = await client.testConnection();
    
    if (testResult.success) {
      // Update profile information
      connection.profile = { ...connection.profile, ...testResult.profile };
      connection.lastUsedAt = new Date();
      connection.clearError();
      await connection.save();
      
      res.status(200).json({
        success: true,
        data: {
          connected: true,
          message: 'Connected to Dhan',
          profile: connection.profile
        }
      });
    } else {
      // Mark connection as failed
      connection.setError(testResult.error, 'CONNECTION_FAILED');
      await connection.save();
      
      res.status(200).json({
        success: true,
        data: {
          connected: false,
          message: 'Dhan connection failed',
          error: testResult.error
        }
      });
    }
  } catch (error) {
    console.error('Error checking Dhan connection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Dhan connection',
      error: error.message
    });
  }
};

// Disconnect Dhan
const disconnectDhan = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await BrokerConnection.findByUserAndBroker(userId, 'dhan');
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Dhan connection not found'
      });
    }

    // Mark as disconnected and inactive
    connection.isConnected = false;
    connection.isActive = false;
    connection.lastUsedAt = new Date();
    await connection.save();

    res.status(200).json({
      success: true,
      message: 'Dhan disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Dhan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Dhan',
      error: error.message
    });
  }
};

// Get Dhan profile
const getDhanProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const connection = await BrokerConnection.findByUserAndBroker(userId, 'dhan');
    
    if (!connection || !connection.isConnected) {
      return res.status(404).json({
        success: false,
        message: 'Dhan not connected'
      });
    }

    const client = new DhanClient({
      dhanClientId: connection.dhanClientId,
      accessToken: connection.dhanAccessToken,
      isSandbox: connection.profile?.isSandbox || false
    });

    const testResult = await client.testConnection();
    
    if (testResult.success) {
      res.status(200).json({
        success: true,
        message: 'Profile fetched successfully',
        data: testResult.profile
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to fetch profile',
        error: testResult.error
      });
    }
  } catch (error) {
    console.error('Error fetching Dhan profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

module.exports = {
  getAvailableBrokers,
  getConnectedBrokers,
  getBrokerDetails,
  connectAngelOne,
  handleAngelOneCallback,
  checkAngelOneConnection,
  disconnectAngelOne,
  getAngelOneProfile,
  connectDhan,
  handleDhanCallback,
  checkDhanConnection,
  disconnectDhan,
  getDhanProfile
};
