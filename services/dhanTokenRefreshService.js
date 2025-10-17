const cron = require('node-cron');
const { refreshAllDhanTokens } = require('../controllers/brokerController');

class DhanTokenRefreshService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.nextRun = null;
  }

  // Start the daily token refresh cron job
  start() {
    if (this.isRunning) {
      console.log('⚠️ Dhan token refresh service is already running');
      return;
    }

    // Run every day at 9:00 AM IST (3:30 AM UTC)
    // Format: second minute hour day month dayOfWeek
    this.cronJob = cron.schedule('0 0 3 * * *', async () => {
      try {
        console.log('🕘 Daily Dhan token refresh triggered at:', new Date().toISOString());
        await this.refreshTokens();
      } catch (error) {
        console.error('❌ Error in scheduled Dhan token refresh:', error);
      }
    }, {
      scheduled: false,
      timezone: "Asia/Kolkata"
    });

    this.cronJob.start();
    this.isRunning = true;
    
    // Calculate next run time
    this.calculateNextRun();
    
    console.log('✅ Dhan token refresh service started');
    console.log(`📅 Next refresh scheduled for: ${this.nextRun}`);
  }

  // Stop the cron job
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('⏹️ Dhan token refresh service stopped');
  }

  // Manually trigger token refresh
  async refreshTokens() {
    try {
      console.log('🔄 Starting manual Dhan token refresh...');
      this.lastRun = new Date();
      
      const result = await refreshAllDhanTokens();
      
      console.log('✅ Manual Dhan token refresh completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in manual Dhan token refresh:', error);
      throw error;
    }
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.nextRun,
      cronExpression: '0 0 3 * * *', // Daily at 3:00 AM UTC (9:00 AM IST)
      timezone: 'Asia/Kolkata'
    };
  }

  // Calculate next run time
  calculateNextRun() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(3, 0, 0, 0); // 3:00 AM UTC
    
    this.nextRun = tomorrow;
  }

  // Test the service (for development)
  async test() {
    console.log('🧪 Testing Dhan token refresh service...');
    try {
      const result = await this.refreshTokens();
      console.log('✅ Test completed successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const dhanTokenRefreshService = new DhanTokenRefreshService();

module.exports = dhanTokenRefreshService;
