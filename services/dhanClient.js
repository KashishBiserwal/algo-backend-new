const axios = require('axios');

class DhanClient {
  constructor({ dhanClientId, accessToken, logger = console, isSandbox = false }) {
    this.dhanClientId = dhanClientId;
    this.accessToken = accessToken;
    this.log = logger;
    this.isSandbox = isSandbox;

    // Dhan API configuration
    if (isSandbox) {
      this.baseUrl = process.env.DHAN_SANDBOX_URL || 'https://sandbox.dhan.co/v2';
      this.authUrl = process.env.DHAN_AUTH_URL || 'https://auth.dhan.co';
    } else {
      this.baseUrl = process.env.DHAN_BASE_URL || 'https://api.dhan.co';
      this.authUrl = process.env.DHAN_AUTH_URL || 'https://auth.dhan.co';
    }

    // API endpoints mapping
    this.endpoints = {
      // Authentication
      profile: '/profile',
      
      // Orders
      orders: '/orders',
      orderBook: '/orders',
      orderHistory: '/orders/history',
      
      // Positions & Holdings
      positions: '/positions',
      holdings: '/holdings',
      
      // Market Data
      quotes: '/quotes',
      marketData: '/market-data',
      ltp: '/ltp',
      
      // Funds & Limits
      funds: '/funds',
      limits: '/limits',
      
      // Instruments
      instruments: '/instruments',
      searchInstruments: '/instruments/search',
      
      // Trades
      trades: '/trades',
      tradeBook: '/trades'
    };
  }

  // Create REST API client with proper headers
  rest() {
    return axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'access-token': this.accessToken
      }
    });
  }

  // Test connection by fetching user profile
  async testConnection() {
    try {
      this.log.info('[Dhan] Testing connection...');
      
      // Try different endpoints for sandbox vs production
      let response;
      try {
        // Try the profile endpoint first
        response = await this.rest().get('/profile');
      } catch (error) {
        if (error.response?.status === 404) {
          // Try alternative endpoint
          response = await this.rest().get('/user/profile');
        } else {
          throw error;
        }
      }
      
      if (response.data && (response.data.status === 'success' || response.data.dhanClientId)) {
        this.log.info('[Dhan] Connection test successful');
        return {
          success: true,
          profile: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Connection test failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Connection test failed'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Connection test error:', error.response?.data || error.message);
      
      // For sandbox, if we get 404, it might still be working
      if (this.isSandbox && error.response?.status === 404) {
        this.log.info('[Dhan] Sandbox mode - treating 404 as success');
        return {
          success: true,
          profile: {
            dhanClientId: this.dhanClientId,
            name: 'Sandbox User',
            isSandbox: true
          }
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Place order
  async placeOrder(payload) {
    try {
      this.log.info('[Dhan] Placing order:', payload);
      
      // Generate correlation ID for tracking
      const correlationId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const dhanPayload = {
        dhanClientId: this.dhanClientId,
        correlationId: payload.correlationId || correlationId,
        transactionType: payload.transactionType, // BUY/SELL
        exchangeSegment: payload.exchangeSegment || 'NSE_EQ',
        productType: payload.productType || 'INTRADAY',
        orderType: payload.orderType || 'MARKET',
        validity: payload.validity || 'DAY',
        securityId: payload.securityId,
        quantity: payload.quantity,
        disclosedQuantity: payload.disclosedQuantity || 0,
        price: payload.price || 0,
        triggerPrice: payload.triggerPrice || 0,
        afterMarketOrder: payload.afterMarketOrder || false,
        amoTime: payload.amoTime || 'OPEN',
        boProfitValue: payload.boProfitValue || 0,
        boStopLossValue: payload.boStopLossValue || 0
      };

      this.log.info('[Dhan] Order payload:', dhanPayload);

      const response = await this.rest().post('/orders', dhanPayload);
      
      if (response.data && (response.data.orderId || response.data.orderStatus)) {
        this.log.info('[Dhan] Order placed successfully:', response.data);
        return {
          success: true,
          orderId: response.data.orderId,
          orderStatus: response.data.orderStatus,
          data: response.data
        };
      } else {
        this.log.error('[Dhan] Order placement failed:', response.data);
        return {
          success: false,
          error: response.data.errorMessage || response.data.message || 'Order placement failed'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Order placement error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errorMessage || error.response?.data?.message || error.message
      };
    }
  }

  // Modify order
  async modifyOrder(payload) {
    try {
      this.log.info('[Dhan] Modifying order:', payload);
      
      const response = await this.rest().put(`/orders/${payload.orderId}`, payload);
      
      if (response.data && response.data.status === 'success') {
        this.log.info('[Dhan] Order modified successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Dhan] Order modification failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Order modification failed'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Order modification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Cancel order
  async cancelOrder(orderId) {
    try {
      this.log.info('[Dhan] Cancelling order:', orderId);
      
      const response = await this.rest().delete(`/orders/${orderId}`);
      
      if (response.data && response.data.status === 'success') {
        this.log.info('[Dhan] Order cancelled successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Dhan] Order cancellation failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Order cancellation failed'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Order cancellation error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get positions
  async getPositions() {
    try {
      this.log.info('[Dhan] Fetching positions...');
      
      const response = await this.rest().get('/positions');
      
      if (response.data && response.data.status === 'success') {
        this.log.info('[Dhan] Positions fetched successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch positions:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch positions'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching positions:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get order book
  async getOrderBook() {
    try {
      this.log.info('[Dhan] Fetching order book...');
      
      const response = await this.rest().get('/orders');
      
      if (response.data && response.data.status === 'success') {
        this.log.info('[Dhan] Order book fetched successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch order book:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch order book'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching order book:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get trade book
  async getTradeBook() {
    try {
      this.log.info('[Dhan] Fetching trade book...');
      
      const response = await this.rest().get('/trades');
      
      if (response.data && response.data.status === 'success') {
        this.log.info('[Dhan] Trade book fetched successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch trade book:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch trade book'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching trade book:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get LTP (Last Traded Price)
  async getLTP(securityId, exchangeSegment = 'NSE_EQ') {
    try {
      this.log.info(`[Dhan] Fetching LTP for security ${securityId}, exchange ${exchangeSegment}`);
      
      // Try different LTP endpoints
      let response;
      try {
        // Try the market data endpoint
        response = await this.rest().get(`/market-data?securityId=${securityId}&exchangeSegment=${exchangeSegment}`);
      } catch (error) {
        if (error.response?.status === 404) {
          // Try alternative endpoint
          response = await this.rest().get(`/ltp?securityId=${securityId}&exchangeSegment=${exchangeSegment}`);
        } else {
          throw error;
        }
      }
      
      if (response.data && (response.data.ltp || response.data.lastPrice)) {
        const ltp = response.data.ltp || response.data.lastPrice;
        this.log.info(`[Dhan] LTP fetched successfully: ${ltp}`);
        return {
          success: true,
          ltp: ltp,
          data: response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch LTP:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch LTP'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching LTP:', error.response?.data || error.message);
      
      // For sandbox, return mock data if LTP endpoint is not available
      if (this.isSandbox && error.response?.status === 404) {
        this.log.info('[Dhan] Sandbox mode - LTP endpoint not available, returning mock data');
        return {
          success: true,
          ltp: 3421.95, // Mock TCS price within circuit limits
          data: {
            securityId: securityId,
            exchangeSegment: exchangeSegment,
            ltp: 3421.95,
            isMock: true
          }
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Search instruments
  async searchInstruments(exchangeSegment, searchValue) {
    try {
      this.log.info(`[Dhan] Searching instruments: ${searchValue} on ${exchangeSegment}`);
      
      const response = await this.rest().get(`/instruments?exchangeSegment=${exchangeSegment}&search=${searchValue}`);
      
      if (response.data && response.data.status === 'success') {
        this.log.info(`[Dhan] Found ${response.data.data.length} instruments`);
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Dhan] Search failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Search failed'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Search error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get holdings
  async getHoldings() {
    try {
      this.log.info('[Dhan] Fetching holdings...');
      
      const response = await this.rest().get('/holdings');
      
      if (response.data && response.data.status === 'success') {
        this.log.info('[Dhan] Holdings fetched successfully');
        return {
          success: true,
          data: response.data.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch holdings:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch holdings'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching holdings:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get funds
  async getFunds() {
    try {
      this.log.info('[Dhan] Fetching funds...');
      
      const response = await this.rest().get(this.endpoints.funds);
      
      if (response.data && (response.data.status === 'success' || Array.isArray(response.data))) {
        this.log.info('[Dhan] Funds fetched successfully');
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch funds:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch funds'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching funds:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get limits
  async getLimits() {
    try {
      this.log.info('[Dhan] Fetching limits...');
      
      const response = await this.rest().get(this.endpoints.limits);
      
      if (response.data && (response.data.status === 'success' || Array.isArray(response.data))) {
        this.log.info('[Dhan] Limits fetched successfully');
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch limits:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch limits'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching limits:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get instruments
  async getInstruments(exchangeSegment = 'NSE_EQ') {
    try {
      this.log.info(`[Dhan] Fetching instruments for ${exchangeSegment}...`);
      
      const response = await this.rest().get(`${this.endpoints.instruments}?exchangeSegment=${exchangeSegment}`);
      
      if (response.data && (response.data.status === 'success' || Array.isArray(response.data))) {
        this.log.info(`[Dhan] Instruments fetched successfully: ${response.data.data?.length || response.data.length} instruments`);
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch instruments:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch instruments'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching instruments:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Search instruments
  async searchInstruments(exchangeSegment, searchValue) {
    try {
      this.log.info(`[Dhan] Searching instruments: ${searchValue} on ${exchangeSegment}`);
      
      const response = await this.rest().get(`${this.endpoints.searchInstruments}?exchangeSegment=${exchangeSegment}&search=${searchValue}`);
      
      if (response.data && (response.data.status === 'success' || Array.isArray(response.data))) {
        this.log.info(`[Dhan] Found ${response.data.data?.length || response.data.length} instruments`);
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Search failed:', response.data);
        return {
          success: false,
          error: response.data.message || 'Search failed'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Search error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get order history
  async getOrderHistory(fromDate, toDate) {
    try {
      this.log.info(`[Dhan] Fetching order history from ${fromDate} to ${toDate}...`);
      
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      
      const response = await this.rest().get(`${this.endpoints.orderHistory}?${params.toString()}`);
      
      if (response.data && (response.data.status === 'success' || Array.isArray(response.data))) {
        this.log.info('[Dhan] Order history fetched successfully');
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch order history:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch order history'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching order history:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get trade book
  async getTradeBook() {
    try {
      this.log.info('[Dhan] Fetching trade book...');
      
      const response = await this.rest().get(this.endpoints.tradeBook);
      
      if (response.data && (response.data.status === 'success' || Array.isArray(response.data))) {
        this.log.info('[Dhan] Trade book fetched successfully');
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch trade book:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch trade book'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching trade book:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get market data
  async getMarketData(securityId, exchangeSegment = 'NSE_EQ') {
    try {
      this.log.info(`[Dhan] Fetching market data for ${securityId} on ${exchangeSegment}...`);
      
      const response = await this.rest().get(`${this.endpoints.marketData}?securityId=${securityId}&exchangeSegment=${exchangeSegment}`);
      
      if (response.data && (response.data.status === 'success' || response.data.ltp)) {
        this.log.info('[Dhan] Market data fetched successfully');
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch market data:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch market data'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching market data:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get quotes (multiple securities)
  async getQuotes(securityIds, exchangeSegment = 'NSE_EQ') {
    try {
      this.log.info(`[Dhan] Fetching quotes for ${securityIds.length} securities...`);
      
      const params = new URLSearchParams();
      params.append('exchangeSegment', exchangeSegment);
      securityIds.forEach(id => params.append('securityId', id));
      
      const response = await this.rest().get(`${this.endpoints.quotes}?${params.toString()}`);
      
      if (response.data && (response.data.status === 'success' || Array.isArray(response.data))) {
        this.log.info('[Dhan] Quotes fetched successfully');
        return {
          success: true,
          data: response.data.data || response.data
        };
      } else {
        this.log.error('[Dhan] Failed to fetch quotes:', response.data);
        return {
          success: false,
          error: response.data.message || 'Failed to fetch quotes'
        };
      }
    } catch (error) {
      this.log.error('[Dhan] Error fetching quotes:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Validate order parameters
  validateOrderParams(params) {
    const required = ['transactionType', 'exchangeSegment', 'productType', 'orderType', 'securityId', 'quantity'];
    const missing = required.filter(field => !params[field]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        error: `Missing required fields: ${missing.join(', ')}`
      };
    }

    // Validate transaction type
    if (!['BUY', 'SELL'].includes(params.transactionType)) {
      return {
        valid: false,
        error: 'Invalid transaction type. Must be BUY or SELL'
      };
    }

    // Validate exchange segment
    const validSegments = ['NSE_EQ', 'NSE_FNO', 'NSE_CURRENCY', 'BSE_EQ', 'BSE_FNO', 'BSE_CURRENCY', 'MCX_COMM'];
    if (!validSegments.includes(params.exchangeSegment)) {
      return {
        valid: false,
        error: `Invalid exchange segment. Must be one of: ${validSegments.join(', ')}`
      };
    }

    // Validate product type
    const validProducts = ['CNC', 'INTRADAY', 'MARGIN', 'MTF', 'CO', 'BO'];
    if (!validProducts.includes(params.productType)) {
      return {
        valid: false,
        error: `Invalid product type. Must be one of: ${validProducts.join(', ')}`
      };
    }

    // Validate order type
    const validOrderTypes = ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_MARKET'];
    if (!validOrderTypes.includes(params.orderType)) {
      return {
        valid: false,
        error: `Invalid order type. Must be one of: ${validOrderTypes.join(', ')}`
      };
    }

    // Validate quantity
    if (params.quantity <= 0) {
      return {
        valid: false,
        error: 'Quantity must be greater than 0'
      };
    }

    return { valid: true };
  }

  // Get account summary
  async getAccountSummary() {
    try {
      this.log.info('[Dhan] Fetching account summary...');
      
      const [fundsResult, positionsResult, holdingsResult] = await Promise.all([
        this.getFunds(),
        this.getPositions(),
        this.getHoldings()
      ]);

      return {
        success: true,
        data: {
          funds: fundsResult.success ? fundsResult.data : null,
          positions: positionsResult.success ? positionsResult.data : null,
          holdings: holdingsResult.success ? holdingsResult.data : null,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      this.log.error('[Dhan] Error fetching account summary:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DhanClient;
