// controllers/admin/brokerAdminController.js
const Broker = require("../models/brokerModel");
const BrokerSubmission = require("../models/brokerSubmissionModel");
const { uploadImage } = require("../utils/fileUpload");
const Package = require("../models/packageModel");
const User = require("../models/userModel");

// get all users and by id user

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new broker type with fields
exports.createBroker = async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    let imageUrl = "";

    //  console.log('req.body:', req.body);
    // console.log('req.file:', req.file);

    if (req.file) {
      imageUrl = await uploadImage(req.file);
    }

    const broker = new Broker({
      name,
      description,
      image: imageUrl,
      fields: JSON.parse(fields), // Assuming fields is sent as JSON string
    });

    await broker.save();
    res.status(201).json(broker);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all brokers
exports.getAllBrokers = async (req, res) => {
  try {
    const brokers = await Broker.find({});
    res.json(brokers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get broker by ID
exports.getBrokerById = async (req, res) => {
  try {
    const broker = await Broker.findById(req.params.id);
    if (!broker) {
      return res.status(404).json({ error: "Broker not found" });
    }
    res.json(broker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update broker
exports.updateBroker = async (req, res) => {
  try {
    const { name, description, fields } = req.body;
    const updateData = { name, description, fields: JSON.parse(fields) };

    if (req.file) {
      updateData.image = await uploadImage(req.file);
    }

    const broker = await Broker.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });

    res.json(broker);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all submissions for a broker
exports.getBrokerSubmissions = async (req, res) => {
  try {
    const submissions = await BrokerSubmission.find({
      brokerId: req.params.brokerId,
    }).populate("userId", "username email");

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get submission details
exports.getSubmissionDetails = async (req, res) => {
  try {
    const submission = await BrokerSubmission.findById(req.params.id)
      .populate("userId", "username email")
      .populate("brokerId", "name description");

    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update submission status
exports.updateSubmissionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const submission = await BrokerSubmission.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    res.json(submission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.createPackage = async (req, res) => {
  try {
    const { name, pricingPerDay, features, mostPopular, isActive, order } =
      req.body;
    console.log("Creating package with data:", req.body);

    // Validate required fields
    if (
      !pricingPerDay ||
      pricingPerDay.monthly === undefined ||
      pricingPerDay.quarterly === undefined ||
      pricingPerDay.yearly === undefined
    ) {
      return res
        .status(400)
        .json({ message: "Missing required pricing fields" });
    }

    // Check if package already exists
    const existing = await Package.findOne({ name });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Package with this name already exists" });
    }

    const newPackage = new Package({
      name,
      pricingPerDay,
      features,
      mostPopular: mostPopular || false,
      isActive: isActive !== undefined ? isActive : true,
      order: order || 0,
    });

    await newPackage.save();

    res
      .status(201)
      .json({ message: "Package created successfully", package: newPackage });
  } catch (err) {
    console.error("Create Package Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updatePackage = async (req, res) => {
  try {
    const {
      name,
      pricingPerDay,
      features,
      mostPopular,
      order,
      isActive = true,
    } = req.body;

    if (!name || !pricingPerDay || !features) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const existingPackage = await Package.findOne({ name });
    if (!existingPackage) {
      return res.status(404).json({ message: "Package not found." });
    }

    // Validate and apply updates
    existingPackage.pricingPerDay = {
      monthly: Number(pricingPerDay.monthly) || 0,
      quarterly: Number(pricingPerDay.quarterly) || 0,
      yearly: Number(pricingPerDay.yearly) || 0,
    };

    existingPackage.features = features.map((f) => ({
      name: f.name,
      value: f.value || "",
      enabled: !!f.enabled,
    }));

    existingPackage.mostPopular = !!mostPopular;
    existingPackage.order = typeof order === "number" ? order : existingPackage.order;
    existingPackage.isActive = !!isActive;

    await existingPackage.save();

    res.status(200).json({ message: "Package updated successfully." });
  } catch (error) {
    console.error("Error updating package:", error);
    res.status(500).json({ message: "Internal server error." });
  }
}
