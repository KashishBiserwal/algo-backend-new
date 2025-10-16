const router = require('express').Router();
const { userAuth } = require('../utils/authMiddleware');
const { getUserStats, getUserBrokers } = require('../controllers/userController');

// Get user dashboard stats
router.get('/stats', userAuth, getUserStats);

// Get user's brokers
router.get('/brokers', userAuth, getUserBrokers);

module.exports = router;
