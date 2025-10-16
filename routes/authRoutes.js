const router = require('express').Router();
const { register, login, adminLogin, adminRegister, getMe } = require('../controllers/authController');
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
router.get("/auth/me", userAuth, getMe);

// Export the router
module.exports = router;
