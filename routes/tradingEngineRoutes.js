const express = require('express');
const router = express.Router();
const tradingEngineController = require('../controllers/tradingEngineController');
const { userAuth, adminAuth } = require('../utils/authMiddleware');

// Trading Engine Management (Admin only)
router.post('/start', adminAuth, tradingEngineController.startTradingEngine);
router.post('/stop', adminAuth, tradingEngineController.stopTradingEngine);
router.get('/status', userAuth, tradingEngineController.getTradingEngineStatus);

// Strategy Management
router.post('/strategies/:strategyId/add', userAuth, tradingEngineController.addStrategyToEngine);
router.delete('/strategies/:strategyId/remove', userAuth, tradingEngineController.removeStrategyFromEngine);
router.post('/strategies/:strategyId/execute', userAuth, tradingEngineController.executeStrategy);

// Portfolio & Performance
router.get('/portfolio', userAuth, tradingEngineController.getUserPortfolio);
router.get('/strategies/:strategyId/performance', userAuth, tradingEngineController.getStrategyPerformance);

// Order Management
router.get('/orders', userAuth, tradingEngineController.getUserOrders);
router.get('/orders/:orderId', userAuth, tradingEngineController.getOrderDetails);
router.get('/orders/statistics', userAuth, tradingEngineController.getOrderStatistics);

module.exports = router;
