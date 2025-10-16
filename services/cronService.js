const cron = require('node-cron');
const instrumentService = require('./instrumentService');

class CronService {
  constructor() {
    this.jobs = new Map();
  }

  // Start daily instrument update job (runs at 6:00 AM every day)
  startInstrumentUpdateJob() {
    const job = cron.schedule('0 6 * * *', async () => {
      console.log('🕕 Starting scheduled instrument update...');
      try {
        const result = await instrumentService.updateAllInstruments();
        console.log('✅ Scheduled instrument update completed:', result);
      } catch (error) {
        console.error('❌ Scheduled instrument update failed:', error);
      }
    }, {
      scheduled: false,
      timezone: "Asia/Kolkata"
    });

    this.jobs.set('instrumentUpdate', job);
    job.start();
    console.log('📅 Instrument update cron job started (daily at 6:00 AM IST)');
  }

  // Start all cron jobs
  startAllJobs() {
    this.startInstrumentUpdateJob();
    console.log('🚀 All cron jobs started');
  }

  // Stop all cron jobs
  stopAllJobs() {
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`⏹️ Stopped cron job: ${name}`);
    });
    this.jobs.clear();
  }

  // Stop specific job
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      console.log(`⏹️ Stopped cron job: ${jobName}`);
    }
  }

  // Get job status
  getJobStatus() {
    const status = {};
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });
    return status;
  }
}

module.exports = new CronService();
