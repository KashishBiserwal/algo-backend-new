const express = require('express');
const router = express.Router();
const backtestController = require('../controllers/backtestController');
const { userAuth, adminAuth } = require('../utils/authMiddleware');

// All backtest routes require user authentication
router.use(userAuth);

// Backtest execution
router.post('/:strategyId', backtestController.runEnhancedBacktest);

// Data management
router.get('/data/:instrument', backtestController.checkBacktestData);
router.post('/data/:instrument', backtestController.fetchBacktestData);

// Results
router.get('/results/:strategyId', backtestController.getBacktestResults);

module.exports = router;
