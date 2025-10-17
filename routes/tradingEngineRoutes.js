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

// Strategy Trade Engine Control
router.post('/strategies/:strategyId/start', userAuth, tradingEngineController.startStrategyTradeEngine);
router.post('/strategies/:strategyId/stop', userAuth, tradingEngineController.stopStrategyTradeEngine);
router.get('/strategies/:strategyId/validate', userAuth, tradingEngineController.validateStrategyDeployment);

// User Strategy Management
router.get('/strategies/active', userAuth, tradingEngineController.getUserActiveStrategies);

// Strategy Trade Data
router.get('/strategies/:strategyId/trades', userAuth, tradingEngineController.getStrategyTrades);
router.get('/strategies/:strategyId/trade-stats', userAuth, tradingEngineController.getStrategyTradeStats);

// Portfolio & Performance
router.get('/portfolio', userAuth, tradingEngineController.getUserPortfolio);
router.get('/strategies/:strategyId/performance', userAuth, tradingEngineController.getStrategyPerformance);

// Order Management
router.get('/orders', userAuth, tradingEngineController.getUserOrders);
router.get('/orders/:orderId', userAuth, tradingEngineController.getOrderDetails);
router.get('/orders/statistics', userAuth, tradingEngineController.getOrderStatistics);

// Strategy Terminal & Debug
router.get('/strategy-terminal/:strategyId', userAuth, tradingEngineController.getStrategyTerminal);
router.get('/strategy-status/:strategyId', userAuth, tradingEngineController.getStrategyStatus);
router.get('/debug', userAuth, tradingEngineController.getDebugInfo);
router.post('/start-stop-trade-engine', userAuth, tradingEngineController.startStopTradeEngine);

module.exports = router;
