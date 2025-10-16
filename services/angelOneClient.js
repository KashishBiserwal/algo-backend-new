const axios = require('axios');
const WebSocket = require('ws');

class AngelOneClient {
  constructor({ clientCode, apiKey, accessToken, feedToken, logger = console }) {
    this.clientCode = clientCode;
    this.apiKey = apiKey;
    this.accessToken = accessToken;
    this.feedToken = feedToken;
    this.log = logger;

    // WebSocket connection
    this.ws = null;
    this.wsReady = false;
    this.subscribed = new Set();
    this.tickHandlers = new Set();
    this.ticks = new Map();

    // Connection settings
    this.baseUrl = 'https://apiconnect.angelbroking.com';
    this.wsUrl = 'wss://smartapisocket.angelone.in/smart-stream';
    this.minBackoff = 1000;
    this.maxBackoff = 10000;
    this.backoff = this.minBackoff;
    this.pingTimer = null;
  }

  // Create REST API client with proper headers
  rest() {
    return axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress': '2560AF60-1DBC-4D80-BEB4-328CB16EC699',
        'X-PrivateKey': this.apiKey,
        'Authorization': `Bearer ${this.accessToken}`,
        'X-ClientCode': this.clientCode
      }
    });
  }

  // Test connection by fetching user profile
  async testConnection() {
    try {
      this.log.info('[Angel One] Testing connection...');
      const response = await this.rest().get('/rest/secure/angelbroking/user/v1/getProfile');
      
      if (response.data && response.data.status) {
        this.log.info('[Angel One] Connection test successful');
        return {
          success: true,
          profile: response.data.data
        };
      } else {
        this.log.error('[Angel One] Connection test failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Connection test failed'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Connection test error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Place order
  async placeOrder(payload) {
    try {
      this.log.info('[Angel One] Placing order:', payload);
      
      const angelPayload = {
        variety: 'NORMAL',
        tradingsymbol: payload.tradingsymbol,
        symboltoken: payload.symboltoken,
        transactiontype: payload.transactiontype, // BUY/SELL
        exchange: payload.exchange || 'NFO',
        ordertype: payload.ordertype || 'MARKET',
        producttype: payload.producttype || 'INTRADAY',
        duration: 'DAY',
        quantity: payload.quantity.toString(),
        price: payload.price ? payload.price.toString() : '0',
        triggerprice: payload.triggerprice ? payload.triggerprice.toString() : '0',
        squareoff: payload.squareoff ? payload.squareoff.toString() : '0',
        stoploss: payload.stoploss ? payload.stoploss.toString() : '0',
        trailingstoploss: payload.trailingstoploss ? payload.trailingstoploss.toString() : '0'
      };

      const response = await this.rest().post('/rest/secure/angelbroking/order/v1/placeOrder', angelPayload);
      
      if (response.data && response.data.status) {
        this.log.info('[Angel One] Order placed successfully:', response.data.data);
        return {
          success: true,
          orderId: response.data.data.orderid,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Order placement failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Order placement failed'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Order placement error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Modify order
  async modifyOrder(payload) {
    try {
      this.log.info('[Angel One] Modifying order:', payload);
      
      const response = await this.rest().post('/rest/secure/angelbroking/order/v1/modifyOrder', payload);
      
      if (response.data && response.data.status) {
        this.log.info('[Angel One] Order modified successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Order modification failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Order modification failed'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Order modification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Cancel order
  async cancelOrder(orderId) {
    try {
      this.log.info('[Angel One] Cancelling order:', orderId);
      
      const response = await this.rest().post('/rest/secure/angelbroking/order/v1/cancelOrder', { orderId });
      
      if (response.data && response.data.status) {
        this.log.info('[Angel One] Order cancelled successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Order cancellation failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Order cancellation failed'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Order cancellation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get positions
  async getPositions() {
    try {
      this.log.info('[Angel One] Fetching positions...');
      
      const response = await this.rest().get('/rest/secure/angelbroking/portfolio/v1/getPosition');
      
      if (response.data && response.data.status) {
        this.log.info('[Angel One] Positions fetched successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Failed to fetch positions:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch positions'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Error fetching positions:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get order book
  async getOrderBook() {
    try {
      this.log.info('[Angel One] Fetching order book...');
      
      const response = await this.rest().get('/rest/secure/angelbroking/order/v1/getOrderBook');
      
      if (response.data && response.data.status) {
        this.log.info('[Angel One] Order book fetched successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Failed to fetch order book:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch order book'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Error fetching order book:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get trade book
  async getTradeBook() {
    try {
      this.log.info('[Angel One] Fetching trade book...');
      
      const response = await this.rest().get('/rest/secure/angelbroking/order/v1/getTradeBook');
      
      if (response.data && response.data.status) {
        this.log.info('[Angel One] Trade book fetched successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Failed to fetch trade book:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch trade book'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Error fetching trade book:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get LTP (Last Traded Price)
  async getLTP(symboltoken, exchange = 'NFO', tradingsymbol = null) {
    try {
      this.log.info(`[Angel One] Fetching LTP for token ${symboltoken}, exchange ${exchange}`);
      
      const payload = {
        exchange: exchange,
        symboltoken: symboltoken
      };
      
      if (tradingsymbol) {
        payload.tradingsymbol = tradingsymbol;
      }
      
      const response = await this.rest().post('/order-service/rest/secure/angelbroking/order/v1/getLtpData', payload);
      
      if (response.data && response.data.status) {
        this.log.info(`[Angel One] LTP fetched successfully: ${response.data.data.ltp}`);
        return {
          success: true,
          ltp: response.data.data.ltp,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Failed to fetch LTP:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch LTP'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Error fetching LTP:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Search instruments
  async searchInstruments(exchange, searchValue) {
    try {
      this.log.info(`[Angel One] Searching instruments: ${searchValue} on ${exchange}`);
      
      const payload = {
        exchange: exchange,
        searchscrip: searchValue
      };
      
      const response = await this.rest().post('/rest/secure/angelbroking/order/v1/searchScrip', payload);
      
      if (response.data && response.data.status) {
        this.log.info(`[Angel One] Found ${response.data.data.length} instruments`);
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Angel One] Search failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Search failed'
        };
      }
    } catch (error) {
      this.log.error('[Angel One] Search error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // WebSocket connection for real-time data
  async connectWebSocket() {
    if (this.ws) return;
    
    this.log.info('[Angel One] Connecting to WebSocket...');
    
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.wsUrl}?clientCode=${this.clientCode}&feedToken=${this.feedToken}&apiKey=${this.apiKey}`;
      
      this.ws = new WebSocket(wsUrl);
      let resolved = false;
      let timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.log.error('[Angel One] WebSocket connection timeout');
          reject(new Error('WebSocket connection timeout'));
        }
      }, 10000);

      this.ws.on('open', () => {
        this.log.info('[Angel One] WebSocket connected');
        this.wsReady = true;
        this.backoff = this.minBackoff;
        this.startHeartbeat();
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve();
        }
      });

      this.ws.on('error', (error) => {
        this.log.error('[Angel One] WebSocket error:', error);
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(error);
        }
      });

      this.ws.on('close', (code, reason) => {
        this.log.warn(`[Angel One] WebSocket closed: ${code} ${reason}`);
        this.wsReady = false;
        this.stopHeartbeat();
        this.ws = null;
        
        if (!resolved) {
          setTimeout(() => this.connectWebSocket().catch(() => {}), this.backoff);
          this.backoff = Math.min(this.backoff * 2, this.maxBackoff);
        }
      });

      this.ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          
          if (msg.action === 'feed' && msg.data) {
            const tick = {
              token: msg.data.token || msg.data.instrument_token,
              ltp: Number(msg.data.ltp || msg.data.last_traded_price),
              bid: Number(msg.data.bid || 0),
              ask: Number(msg.data.ask || 0),
              volume: Number(msg.data.volume || 0),
              timestamp: Date.now()
            };
            
            if (tick.ltp > 0) {
              this.ticks.set(String(tick.token), tick);
              this.emit('tick', tick);
            }
          }
        } catch (error) {
          this.log.error('[Angel One] Error parsing WebSocket message:', error);
        }
      });
    });
  }

  // Subscribe to tokens for real-time data
  async subscribe(tokens) {
    if (!tokens?.length) return;
    
    this.log.info(`[Angel One] Subscribing to tokens: ${tokens.join(', ')}`);
    
    tokens.forEach(t => this.subscribed.add(String(t)));

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log.warn('[Angel One] WebSocket not ready, cannot subscribe');
      return;
    }

    const payload = {
      action: 'subscribe',
      params: {
        mode: 'LTP',
        tokenList: tokens.map(String)
      }
    };
    
    this.ws.send(JSON.stringify(payload));
    this.log.info(`[Angel One] Subscription request sent for tokens: ${tokens.join(', ')}`);
  }

  // Heartbeat management
  startHeartbeat() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try { this.ws.ping?.(); } catch (e) {}
      }
    }, 15000);
  }

  stopHeartbeat() {
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
  }

  // Event handling
  emit(event, data) {
    if (event === 'tick') {
      this.tickHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          this.log.error('[Angel One] Error in tick handler:', error);
        }
      });
    }
  }

  onTick(handler) {
    this.tickHandlers.add(handler);
    return () => this.tickHandlers.delete(handler);
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stopHeartbeat();
    this.wsReady = false;
    this.log.info('[Angel One] WebSocket disconnected');
  }
}

module.exports = AngelOneClient;
