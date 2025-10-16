// routes/admin/brokerAdminRoutes.js
const express = require("express");
const router = express.Router();
const brokerAdminController = require("../controllers/adminController");
const adminStrategyController = require("../controllers/adminStrategyController");
const { adminAuth } = require("../utils/authMiddleware");
const upload = require("../utils/multerConfig");

//  all user

router.get("/users", adminAuth, brokerAdminController.getAllUsers);
router.get("/users/:id", adminAuth, brokerAdminController.getUserById);

// user management
router.get(
  "/user/strategies/:userId",
  adminAuth,
  adminStrategyController.getUserStrategies
);
router.get(
  "/user/strategies/:id",
  adminAuth,
  adminStrategyController.getStrategyById
);

// Broker management
router.post(
  "/brokers",
  adminAuth,
  upload.single("image"),
  brokerAdminController.createBroker
);
router.get("/brokers", adminAuth, brokerAdminController.getAllBrokers);
router.get("/brokers/:id", adminAuth, brokerAdminController.getBrokerById);
router.put(
  "/brokers/:id",
  adminAuth,
  upload.single("image"),
  brokerAdminController.updateBroker
);

// Submissions management
router.get(
  "/brokers/:brokerId/submissions",
  adminAuth,
  brokerAdminController.getBrokerSubmissions
);
router.get(
  "/submissions/:id",
  adminAuth,
  brokerAdminController.getSubmissionDetails
);
router.put(
  "/submissions/:id/status",
  adminAuth,
  brokerAdminController.updateSubmissionStatus
);

// Strategy management
router.get("/strategies", adminAuth, adminStrategyController.getAllStrategies);
router.get("/strategies/stats", adminAuth, adminStrategyController.getStrategyStats);
router.get("/strategies/:id", adminAuth, adminStrategyController.getStrategyById);
router.put("/strategies/:id", adminAuth, adminStrategyController.updateStrategy);
router.delete("/strategies/:id", adminAuth, adminStrategyController.deleteStrategy);
router.get("/strategies/:strategyId/orders", adminAuth, adminStrategyController.getStrategyOrders);
router.put("/strategies/:id/status", adminAuth, adminStrategyController.updateStrategyStatus);
router.get("/users/:userId/strategies", adminAuth, adminStrategyController.getUserStrategies);

// Package management
router.post(
  "/create-package",
  adminAuth,
  brokerAdminController.createPackage
);

router.put(
  "/update-package",
  adminAuth,
  brokerAdminController.updatePackage
);


module.exports = router;
