const router = require('express').Router();
const instrumentController = require('../controllers/instrumentController');
const { adminAuth } = require('../utils/authMiddleware');

// Public routes (no authentication required)
router.get('/popular', instrumentController.getPopularInstruments);
router.get('/search', instrumentController.searchInstruments);
router.get('/category/:category', instrumentController.getInstrumentsByCategory);
router.get('/symbols/:category', instrumentController.getSymbolsForCategory);
router.get('/stats', instrumentController.getInstrumentStats);
router.get('/multi-broker', instrumentController.getMultiBrokerInstruments);
router.get('/:id/token', instrumentController.getBrokerToken);
router.get('/:id/brokers', instrumentController.getAvailableBrokers);
router.get('/:id', instrumentController.getInstrumentById);

// Admin routes (authentication required)
router.post('/update', adminAuth, instrumentController.updateInstruments);
router.get('/admin/history', adminAuth, instrumentController.getUpdateHistory);

// Strategy validation route
router.post('/validate-strategy', instrumentController.validateStrategyForBroker);

module.exports = router;
