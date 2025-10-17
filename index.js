const express = require("express");
const cors = require("cors");
const session = require("express-session");
const http = require("http");
const { WebSocketServer } = require("ws");
const db = require("./config/db");

// Load environment variables from .env file
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const instrumentRoutes = require("./routes/instrumentRoutes");
const strategyRoutes = require("./routes/strategyRoutes");
const backtestRoutes = require("./routes/backtestRoutes");
const brokerRoutes = require("./routes/brokerRoutes");
const tradingEngineRoutes = require("./routes/tradingEngineRoutes");
const adminRoutes = require("./routes/adminRoutes");

// Import services
const cronService = require("./services/cronService");
const dhanTokenRefreshService = require("./services/dhanTokenRefreshService");

// Initialize Express app
const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 4001;

// Connect to database
db();

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'algo_auth_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/instruments", instrumentRoutes);
app.use("/api/strategies", strategyRoutes);
app.use("/api/backtest", backtestRoutes);
app.use("/api/brokers", brokerRoutes);
app.use("/api/trading", tradingEngineRoutes);
app.use("/api/admin", adminRoutes);

// WebSocket Server for Market Data
const wss = new WebSocketServer({ 
  server,
  path: '/ws/market-data'
});

// Store connected clients
const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log('📡 New WebSocket client connected');
  clients.add(ws);

  // Send initial market data
  const initialMarketData = [
    { name: "NIFTY50", value: "19,832.05", change: "+125.30", changeType: "positive", symbol: "NSE:NIFTY50" },
    { name: "BANKNIFTY", value: "44,567.80", change: "+89.45", changeType: "positive", symbol: "NSE:BANKNIFTY" },
    { name: "FINNIFTY", value: "20,123.40", change: "-45.20", changeType: "negative", symbol: "NSE:FINNIFTY" },
  ];

  ws.send(JSON.stringify({
    type: 'market_data_batch',
    data: initialMarketData
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('📨 Received WebSocket message:', data);

      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('📡 WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
    clients.delete(ws);
  });
});

// Simulate market data updates every 5 seconds
setInterval(() => {
  if (clients.size > 0) {
    const marketData = [
      { 
        name: "NIFTY50", 
        value: (19832.05 + (Math.random() - 0.5) * 100).toFixed(2), 
        change: (Math.random() - 0.5) * 200 > 0 ? `+${(Math.random() * 200).toFixed(2)}` : `${(Math.random() * -200).toFixed(2)}`, 
        changeType: Math.random() > 0.5 ? "positive" : "negative", 
        symbol: "NSE:NIFTY50" 
      },
      { 
        name: "BANKNIFTY", 
        value: (44567.80 + (Math.random() - 0.5) * 200).toFixed(2), 
        change: (Math.random() - 0.5) * 400 > 0 ? `+${(Math.random() * 400).toFixed(2)}` : `${(Math.random() * -400).toFixed(2)}`, 
        changeType: Math.random() > 0.5 ? "positive" : "negative", 
        symbol: "NSE:BANKNIFTY" 
      },
      { 
        name: "FINNIFTY", 
        value: (20123.40 + (Math.random() - 0.5) * 100).toFixed(2), 
        change: (Math.random() - 0.5) * 200 > 0 ? `+${(Math.random() * 200).toFixed(2)}` : `${(Math.random() * -200).toFixed(2)}`, 
        changeType: Math.random() > 0.5 ? "positive" : "negative", 
        symbol: "NSE:FINNIFTY" 
      },
    ];

    const message = JSON.stringify({
      type: 'market_data_update',
      data: marketData
    });

    clients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(message);
      }
    });
  }
}, 5000);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    ok: true, 
    message: "Authentication server is running",
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Algo Trading Authentication Server",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      health: "/health"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Authentication server is running on http://localhost:${port}`);
  console.log(`📋 Available endpoints:`);
  console.log(`   Authentication:`);
  console.log(`   - POST /api/auth/register - User registration`);
  console.log(`   - POST /api/auth/login - User login`);
  console.log(`   - POST /api/auth/admin-register - Admin registration`);
  console.log(`   - POST /api/auth/admin-login - Admin login`);
  console.log(`   - GET  /api/auth/auth/me - Get current user (requires auth)`);
  console.log(`   Instruments:`);
  console.log(`   - GET  /api/instruments/popular - Get popular instruments for tabs`);
  console.log(`   - GET  /api/instruments/search - Search instruments with pagination`);
  console.log(`   - GET  /api/instruments/category/:category - Get instruments by category`);
  console.log(`   - GET  /api/instruments/symbols/:category - Get symbols for category`);
  console.log(`   - GET  /api/instruments/stats - Get instrument statistics`);
  console.log(`   - GET  /api/instruments/:id - Get instrument by ID`);
  console.log(`   - POST /api/instruments/update - Update instruments (admin only)`);
  console.log(`   - GET  /api/instruments/admin/history - Get update history (admin only)`);
  console.log(`   Strategies:`);
  console.log(`   - POST /api/strategies - Create new strategy`);
  console.log(`   - GET  /api/strategies - Get user strategies`);
  console.log(`   - GET  /api/strategies/:id - Get specific strategy`);
  console.log(`   - PUT  /api/strategies/:id - Update strategy`);
  console.log(`   - DELETE /api/strategies/:id - Delete strategy`);
  console.log(`   - POST /api/strategies/:id/toggle - Start/Stop strategy`);
  console.log(`   - GET  /api/strategies/:id/performance - Get strategy performance`);
  console.log(`   - POST /api/strategies/validate - Validate strategy`);
  console.log(`   Backtesting:`);
  console.log(`   - POST /api/backtest/:strategyId - Run enhanced backtest`);
  console.log(`   - GET  /api/backtest/data/:instrument - Check data availability`);
  console.log(`   - POST /api/backtest/data/:instrument - Fetch historical data`);
  console.log(`   - GET  /api/backtest/results/:strategyId - Get backtest results`);
      console.log(`   Brokers:`);
      console.log(`   - GET  /api/brokers/available - Get available brokers`);
      console.log(`   - GET  /api/brokers/connected - Get connected brokers`);
      console.log(`   - GET  /api/brokers/:id - Get broker details`);
      console.log(`   Angel One:`);
      console.log(`   - GET  /api/brokers/angel/connect - Connect to Angel One`);
      console.log(`   - GET  /api/brokers/angel/callback - Angel One callback`);
      console.log(`   - GET  /api/brokers/angel/status - Check Angel One status`);
      console.log(`   - GET  /api/brokers/angel/profile - Get Angel One profile`);
      console.log(`   - DELETE /api/brokers/angel/disconnect - Disconnect Angel One`);
      console.log(`   Dhan:`);
      console.log(`   - GET  /api/brokers/dhan/connect - Connect to Dhan`);
      console.log(`   - GET  /api/brokers/dhan/callback - Dhan callback`);
      console.log(`   - GET  /api/brokers/dhan/status - Check Dhan status`);
      console.log(`   - GET  /api/brokers/dhan/profile - Get Dhan profile`);
      console.log(`   - DELETE /api/brokers/dhan/disconnect - Disconnect Dhan`);
      console.log(`   Trading Engine:`);
      console.log(`   - POST /api/trading/start - Start trading engine (admin)`);
      console.log(`   - POST /api/trading/stop - Stop trading engine (admin)`);
      console.log(`   - GET  /api/trading/status - Get trading engine status`);
      console.log(`   - POST /api/trading/strategies/:id/add - Add strategy to engine`);
      console.log(`   - DELETE /api/trading/strategies/:id/remove - Remove strategy from engine`);
      console.log(`   - POST /api/trading/strategies/:id/execute - Execute strategy manually`);
      console.log(`   - GET  /api/trading/portfolio - Get user portfolio`);
      console.log(`   - GET  /api/trading/strategies/:id/performance - Get strategy performance`);
      console.log(`   - GET  /api/trading/orders - Get user orders`);
      console.log(`   - GET  /api/trading/orders/:id - Get order details`);
      console.log(`   - GET  /api/trading/orders/statistics - Get order statistics`);
  console.log(`   WebSocket:`);
  console.log(`   - WS   /ws/market-data - Real-time market data stream`);
  console.log(`   - GET  /health - Health check`);
  
  // Start cron jobs
  cronService.startAllJobs();
  
  // Start Dhan token refresh service
  dhanTokenRefreshService.start();
});
