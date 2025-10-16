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
    // The user info is already attached by the auth middleware
    const user = await userModel.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error getting user info:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  adminRegister,
  adminLogin,
  getMe,
};
