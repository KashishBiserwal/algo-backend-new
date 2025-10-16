const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "Aniket@1234";

// 🔐 Base JWT verification
const verifyToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("No token provided");
  }
  const token = authHeader.split(" ")[1];
  const payload = jwt.verify(token, JWT_SECRET);
  return payload;
};

// 🛡️ Admin middleware
const adminAuth = (req, res, next) => {
  try {
    const payload = verifyToken(req);
    console.log("🔐 Admin payload:", payload);

    if (payload.role !== "ADMIN") {
      console.log("❌ Invalid admin role:", payload.role);
      return res.status(403).json({ success: false, message: "Admins only" });
    }
    
    req.user = { id: payload.userId, role: payload.role };
    console.log("✅ Admin auth successful for user:", payload.userId);
    next();
  } catch (err) {
    console.error("❌ Admin auth error:", err.message);
    return res
      .status(401)
      .json({ success: false, message: err.message || "Unauthorized" });
  }
};

// 👤 User middleware
const userAuth = (req, res, next) => {
  try {
    const payload = verifyToken(req);
    console.log('🔍 JWT Payload:', payload);
    
    if (payload.role !== "USER") {
      console.log('❌ Invalid role:', payload.role);
      return res.status(403).json({ success: false, message: "Users only" });
    }
    
    // Handle different possible user ID field names
    const userId = payload.userId || payload.id || payload._id;
    console.log('🔍 Extracted user ID:', userId);
    
    req.user = { id: userId, role: payload.role };
    next();
  } catch (err) {
    console.error('❌ Auth error:', err.message);
    return res
      .status(401)
      .json({ success: false, message: err.message || "Unauthorized" });
  }
};

module.exports = {
  userAuth,
  adminAuth,
};
