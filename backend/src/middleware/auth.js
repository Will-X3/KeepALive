const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// Consumers browse with no account — this middleware only ever gates the
// business/admin surfaces.
const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401);
    throw new Error("Missing or malformed Authorization header");
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.sub).select("-passwordHash");

    if (!user) {
      res.status(401);
      throw new Error("User no longer exists");
    }

    req.user = user; // full Mongoose doc, so controllers can use user._id, user.role, etc.
    next();
  } catch (err) {
    res.status(401);
    throw new Error("Invalid or expired token");
  }
});

// Usage: authorize("admin") or authorize("business_owner", "admin")
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error("Insufficient permissions");
    }
    next();
  };
}

module.exports = { protect, authorize };
