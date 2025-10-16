const router = require('express').Router();
const { 
  register, 
  login, 
  adminLogin, 
  adminRegister, 
  getMe, 
  updateProfile, 
  getUserReferrals, 
  getUserNotifications, 
  getUserSubscriptions,
  changeAdminPassword,
  updateRiskDisclaimerAcceptance
} = require('../controllers/authController');
const { adminAuth, userAuth } = require('../utils/authMiddleware');

// Route for user registration
router.post('/register', register);

// Route for user login
router.post('/login', login);

// Route to register a new admin
router.post("/admin-register", adminRegister);

// Route to login an admin
router.post("/admin-login", adminLogin);

// Route to get current user info (token verification)
router.get("/me", userAuth, getMe);

// Route to get current admin info (token verification)
router.get("/admin/me", adminAuth, getMe);

// Admin password change route
router.put("/admin/change-password", adminAuth, changeAdminPassword);

// Profile management routes
router.put("/profile", userAuth, updateProfile);
router.get("/referrals", userAuth, getUserReferrals);
router.get("/notifications", userAuth, getUserNotifications);
router.get("/subscriptions", userAuth, getUserSubscriptions);

// Risk disclaimer acceptance route
router.put("/risk-disclaimer", userAuth, updateRiskDisclaimerAcceptance);

// Export the router
module.exports = router;
