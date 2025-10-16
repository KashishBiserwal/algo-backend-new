const userModel = require("../models/userModel");
const adminModel = require("../models/adminModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const JWT_SECRET = process.env.JWT_SECRET || "Aniket@1234";

// Register a new user
const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new userModel({
      username,
      email,
      password: hashedPassword,
      role: "USER", // Default role for new users
    });

    await newUser.save();

    // Create a JWT token
    const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Login a user
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await userModel.findOne({ email, role: "USER" });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Compare the password with the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Create a JWT token
    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin register
const adminRegister = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if admin already exists
    const existingAdmin = await adminModel.findOne({ email, role: "ADMIN" });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new admin
    const newAdmin = new adminModel({
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
    });

    await newAdmin.save();

    res.status(201).json({
      message: "Admin registered successfully",
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error("Error registering admin:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Admin login
const adminLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Check if admin exists
    const admin = await adminModel.findOne({ email, role: "ADMIN" });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("✅ Admin login successful for:", admin.email);
    res.status(200).json({
      message: "Admin login successful",
      token: token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Error logging in admin:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get current user info (for token verification)
const getMe = async (req, res) => {
  try {
    console.log("🔍 getMe called for user:", req.user.id, "role:", req.user.role);
    
    // The user info is already attached by the auth middleware
    let user;
    
    // Check if this is an admin request
    if (req.user.role === "ADMIN") {
      console.log("🔍 Looking up admin user...");
      user = await adminModel.findById(req.user.id).select('-password');
    } else {
      console.log("🔍 Looking up regular user...");
      user = await userModel.findById(req.user.id).select('-password');
    }
    
    if (!user) {
      console.log("❌ User not found");
      return res.status(404).json({ message: "User not found" });
    }
    
    console.log("✅ User found:", user.email);
    
    // Generate response based on user type
    let userResponse;
    
    if (req.user.role === "ADMIN") {
      // Admin user response
      userResponse = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      };
    } else {
      // Regular user response
      const referralLink = `https://web.algorooms.com/login?referral_code=${user.referralCode}`;
      userResponse = {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        profileImage: user.profileImage,
        walletAmount: user.walletAmount,
        backtestCredit: user.backtestCredit,
        plan: user.plan,
        referralCode: user.referralCode,
        referralLink: referralLink,
        totalReferrals: user.totalReferrals,
        referralEarnings: user.referralEarnings,
        joinedDate: user.createdAt,
        lastLogin: user.lastLogin,
        role: user.role,
        risk_disclaimer_accepted: user.risk_disclaimer_accepted,
      };
    }
    
    res.status(200).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    console.error("Error getting user info:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { username, phone, profileImage } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (username) updateData.username = username;
    if (phone) updateData.phone = phone;
    if (profileImage) updateData.profileImage = profileImage;

    const user = await userModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        walletAmount: user.walletAmount,
        backtestCredit: user.backtestCredit,
        plan: user.plan,
        referralCode: user.referralCode,
        totalReferrals: user.totalReferrals,
        referralEarnings: user.referralEarnings,
        joinedDate: user.createdAt,
        lastLogin: user.lastLogin,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user referrals
const getUserReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const referrals = await userModel.find({ referredBy: userId })
      .select('username email createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      referrals: referrals.map(ref => ({
        id: ref._id,
        username: ref.username,
        email: ref.email,
        joinedDate: ref.createdAt,
      })),
      totalReferrals: referrals.length,
    });
  } catch (error) {
    console.error("Error getting referrals:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user notifications (placeholder for future implementation)
const getUserNotifications = async (req, res) => {
  try {
    // This is a placeholder - you can implement actual notifications later
    res.status(200).json({
      success: true,
      notifications: [],
      message: "No notifications yet"
    });
  } catch (error) {
    console.error("Error getting notifications:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get user subscriptions (placeholder for future implementation)
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userModel.findById(userId).select('plan createdAt');
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // This is a placeholder - you can implement actual subscription logic later
    res.status(200).json({
      success: true,
      subscriptions: [{
        plan: user.plan,
        status: "Active",
        startDate: user.createdAt,
        endDate: null, // For free plan, no end date
        features: user.plan === "Free Plan" ? ["Basic Backtesting", "Limited Strategies"] : ["All Features"]
      }],
      message: user.plan === "Free Plan" ? "Free plan active" : "Premium plan active"
    });
  } catch (error) {
    console.error("Error getting subscriptions:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Change admin password
const changeAdminPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    console.log("🔐 Admin password change requested for:", adminId);

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Current password and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "New password must be at least 6 characters long" 
      });
    }

    // Find the admin
    const admin = await adminModel.findById(adminId);
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Current password is incorrect" 
      });
    }

    // Check if new password is different from current password
    const isSamePassword = await bcrypt.compare(newPassword, admin.password);
    if (isSamePassword) {
      return res.status(400).json({ 
        success: false, 
        message: "New password must be different from current password" 
      });
    }

    // Hash the new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update the password
    await adminModel.findByIdAndUpdate(adminId, { 
      password: hashedNewPassword 
    });

    console.log("✅ Admin password changed successfully for:", admin.email);

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });
  } catch (error) {
    console.error("Error changing admin password:", error.message);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error" 
    });
  }
};

// Update risk disclaimer acceptance
const updateRiskDisclaimerAcceptance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { accepted } = req.body;

    console.log("📋 Risk disclaimer acceptance update requested for user:", userId, "accepted:", accepted);

    // Validate input
    if (typeof accepted !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Accepted field must be a boolean value"
      });
    }

    // Update user's risk disclaimer acceptance
    const user = await userModel.findByIdAndUpdate(
      userId,
      { risk_disclaimer_accepted: accepted },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    console.log("✅ Risk disclaimer acceptance updated successfully for user:", userId);

    res.status(200).json({
      success: true,
      message: "Risk disclaimer acceptance updated successfully",
      data: {
        risk_disclaimer_accepted: user.risk_disclaimer_accepted
      }
    });

  } catch (error) {
    console.error("❌ Error updating risk disclaimer acceptance:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

module.exports = {
  register,
  login,
  adminRegister,
  adminLogin,
  getMe,
  updateProfile,
  getUserReferrals,
  getUserNotifications,
  getUserSubscriptions,
  changeAdminPassword,
  updateRiskDisclaimerAcceptance,
};
