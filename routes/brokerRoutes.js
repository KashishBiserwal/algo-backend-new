const express = require('express');
const router = express.Router();
const brokerController = require('../controllers/brokerController');
const { userAuth } = require('../utils/authMiddleware');

// All broker routes require user authentication
router.use(userAuth);

// General broker routes
router.get('/available', brokerController.getAvailableBrokers);
router.get('/connected', brokerController.getConnectedBrokers);
router.get('/:id', brokerController.getBrokerDetails);

// Angel One specific routes
router.get('/angel/connect', brokerController.connectAngelOne);
router.get('/angel/callback', brokerController.handleAngelOneCallback);
router.get('/angel/status', brokerController.checkAngelOneConnection);
router.get('/angel/profile', brokerController.getAngelOneProfile);
router.delete('/angel/disconnect', brokerController.disconnectAngelOne);

// Dhan specific routes
router.get('/dhan/connect', brokerController.connectDhan);
router.get('/dhan/callback', brokerController.handleDhanCallback);
router.get('/dhan/status', brokerController.checkDhanConnection);
router.get('/dhan/profile', brokerController.getDhanProfile);
router.delete('/dhan/disconnect', brokerController.disconnectDhan);

module.exports = router;
