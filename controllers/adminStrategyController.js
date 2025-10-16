const Strategy = require("../models/strategyModel");
const User = require("../models/userModel");
const Order = require("../models/orderModel");

// Get all strategies with user details
exports.getAllStrategies = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { _id: { $regex: search, $options: 'i' } }
      ];
    }

    const strategies = await Strategy.find(filter)
      .populate('created_by', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Strategy.countDocuments(filter);

    res.json({
      success: true,
      data: strategies,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get strategy by ID with full details
exports.getStrategyById = async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id)
      .populate('created_by', 'username email');

    if (!strategy) {
      return res.status(404).json({ success: false, error: "Strategy not found" });
    }

    // Get recent orders for this strategy
    const recentOrders = await Order.find({ strategyId: strategy._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        ...strategy.toObject(),
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update strategy (admin can modify on behalf of user)
exports.updateStrategy = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated by admin
    delete updates._id;
    delete updates.created_by;
    delete updates.createdAt;

    const strategy = await Strategy.findByIdAndUpdate(
      id,
      { 
        ...updates,
        lastModifiedBy: req.admin.id, // Track who modified it
        lastModifiedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('created_by', 'username email');

    if (!strategy) {
      return res.status(404).json({ success: false, error: "Strategy not found" });
    }

    res.json({
      success: true,
      data: strategy,
      message: "Strategy updated successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete strategy
exports.deleteStrategy = async (req, res) => {
  try {
    const strategy = await Strategy.findByIdAndDelete(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ success: false, error: "Strategy not found" });
    }

    // Also delete related orders
    await Order.deleteMany({ strategyId: req.params.id });

    res.json({
      success: true,
      message: "Strategy and related orders deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get strategies by user ID
exports.getUserStrategies = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const strategies = await Strategy.find({ created_by: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Strategy.countDocuments({ created_by: userId });

    res.json({
      success: true,
      data: strategies,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get strategy statistics
exports.getStrategyStats = async (req, res) => {
  try {
    const totalStrategies = await Strategy.countDocuments();
    const activeStrategies = await Strategy.countDocuments({ status: 'active' });
    const pausedStrategies = await Strategy.countDocuments({ status: 'paused' });
    const totalUsers = await User.countDocuments({ role: 'USER' });

    // Get strategies by type
    const timeBasedStrategies = await Strategy.countDocuments({ type: 'time_based' });
    const indicatorBasedStrategies = await Strategy.countDocuments({ type: 'indicator_based' });

    // Get recent activity
    const recentStrategies = await Strategy.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('created_by', 'username email');

    res.json({
      success: true,
      data: {
        totalStrategies,
        activeStrategies,
        pausedStrategies,
        totalUsers,
        timeBasedStrategies,
        indicatorBasedStrategies,
        recentStrategies
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get orders for a specific strategy
exports.getStrategyOrders = async (req, res) => {
  try {
    const { strategyId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ strategyId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments({ strategyId });

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update strategy status (activate/deactivate)
exports.updateStrategyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'paused', 'stopped'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid status. Must be 'active', 'paused', or 'stopped'" 
      });
    }

    const strategy = await Strategy.findByIdAndUpdate(
      id,
      { 
        status,
        lastModifiedBy: req.admin.id,
        lastModifiedAt: new Date()
      },
      { new: true }
    ).populate('created_by', 'username email');

    if (!strategy) {
      return res.status(404).json({ success: false, error: "Strategy not found" });
    }

    res.json({
      success: true,
      data: strategy,
      message: `Strategy ${status} successfully`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
