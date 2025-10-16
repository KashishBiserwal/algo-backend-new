const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategyController');
const { userAuth } = require('../utils/authMiddleware');

// All strategy routes require user authentication
router.use(userAuth);

// Strategy CRUD operations
router.post('/', strategyController.createStrategy);
router.get('/', strategyController.getStrategies);
router.get('/:id', strategyController.getStrategy);
router.put('/:id', strategyController.updateStrategy);
router.delete('/:id', strategyController.deleteStrategy);

// Strategy management
router.post('/:id/toggle', strategyController.toggleStrategyStatus);
router.get('/:id/performance', strategyController.getStrategyPerformance);

// Strategy validation
router.post('/validate', strategyController.validateStrategy);

module.exports = router;
